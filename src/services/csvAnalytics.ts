import { supabase } from "@/integrations/supabase/client";

/** Action types accepted by the `csv_edit_events` table.
 *  Mirror of the CHECK constraint in the migration. */
export type CsvEditAction = "edit" | "undo" | "redo" | "undo_row" | "undo_all";

interface CsvEditEventInput {
  companyId: string;
  userId: string;
  action: CsvEditAction;
  field?: string | null;
  lineNumber?: number | null;
}

// In-memory queue + flush timer. We coalesce rapid bursts (e.g. typing in a
// cell fires many `edit` events) into a single insert so we don't hammer the
// database. Events are best-effort: failures are logged but never surfaced
// to the user — analytics must not interfere with the import workflow.
const queue: CsvEditEventInput[] = [];
let flushTimer: number | null = null;
const FLUSH_DELAY_MS = 1500;
const MAX_QUEUE_BEFORE_FLUSH = 25;

const scheduleFlush = () => {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushCsvEditEvents();
  }, FLUSH_DELAY_MS);
};

/** Public entry point. Push an event onto the queue and trigger a flush
 *  shortly after. Safe to call from hot paths. */
export const logCsvEditEvent = (event: CsvEditEventInput) => {
  if (!event.companyId || !event.userId) return; // can't insert without scope
  queue.push(event);
  if (queue.length >= MAX_QUEUE_BEFORE_FLUSH) {
    void flushCsvEditEvents();
    return;
  }
  scheduleFlush();
};

/** Drain the in-memory queue into a single batch insert. Exposed so the
 *  page can flush on unmount, too. */
export const flushCsvEditEvents = async (): Promise<void> => {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length).map((e) => ({
    company_id: e.companyId,
    user_id: e.userId,
    action: e.action,
    field: e.field ?? null,
    line_number: e.lineNumber ?? null,
  }));
  const { error } = await supabase.from("csv_edit_events").insert(batch);
  if (error) {
    // Best-effort: don't re-queue (could loop forever on a permanent
    // failure). Just log so we can spot regressions in the console.
    console.warn("[csvAnalytics] failed to log events", error);
  }
};
