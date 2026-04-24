import { supabase } from "@/integrations/supabase/client";

export interface CsvActionTotals {
  edit: number;
  undo: number;
  redo: number;
  undo_row: number;
  undo_all: number;
  total: number;
}

export interface CsvFieldStat {
  field: string;
  edits: number;
  undos: number;
  redos: number;
}

export interface CsvEditEventRow {
  id: string;
  created_at: string;
  action: string;
  field: string | null;
  line_number: number | null;
  user_id: string;
}

const RANGE_DAYS_DEFAULT = 30;

const sinceIso = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

/** Aggregate count per action over the trailing window. RLS limits the
 *  result to the caller's company and to owners/admins, so we don't need
 *  to add a `company_id` filter here — but we do anyway for index-friendly
 *  query planning. */
export const fetchCsvActionTotals = async (
  companyId: string,
  rangeDays: number = RANGE_DAYS_DEFAULT,
): Promise<CsvActionTotals> => {
  const { data, error } = await supabase
    .from("csv_edit_events")
    .select("action")
    .eq("company_id", companyId)
    .gte("created_at", sinceIso(rangeDays));
  if (error) throw error;
  const totals: CsvActionTotals = {
    edit: 0, undo: 0, redo: 0, undo_row: 0, undo_all: 0, total: 0,
  };
  for (const row of data ?? []) {
    const a = row.action as keyof CsvActionTotals;
    if (a in totals && a !== "total") totals[a] += 1;
    totals.total += 1;
  }
  return totals;
};

/** Per-field breakdown of edit / undo / redo counts. Bulk actions
 *  (`undo_row`, `undo_all`) have no field and are excluded here. */
export const fetchCsvFieldStats = async (
  companyId: string,
  rangeDays: number = RANGE_DAYS_DEFAULT,
  limit: number = 10,
): Promise<CsvFieldStat[]> => {
  const { data, error } = await supabase
    .from("csv_edit_events")
    .select("action, field")
    .eq("company_id", companyId)
    .not("field", "is", null)
    .gte("created_at", sinceIso(rangeDays));
  if (error) throw error;
  const map = new Map<string, CsvFieldStat>();
  for (const row of data ?? []) {
    if (!row.field) continue;
    const cur = map.get(row.field) ?? { field: row.field, edits: 0, undos: 0, redos: 0 };
    if (row.action === "edit") cur.edits += 1;
    else if (row.action === "undo") cur.undos += 1;
    else if (row.action === "redo") cur.redos += 1;
    map.set(row.field, cur);
  }
  return Array.from(map.values())
    .sort((a, b) => (b.edits + b.undos + b.redos) - (a.edits + a.undos + a.redos))
    .slice(0, limit);
};

/** Most recent events for a quick activity feed. */
export const fetchCsvRecentEvents = async (
  companyId: string,
  limit: number = 25,
): Promise<CsvEditEventRow[]> => {
  const { data, error } = await supabase
    .from("csv_edit_events")
    .select("id, created_at, action, field, line_number, user_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CsvEditEventRow[];
};

/** Look up the caller's role inside the given company. Returns null if the
 *  user has no membership row (RLS will return zero rows in that case). */
export const fetchCurrentMemberRole = async (
  companyId: string,
  userId: string,
): Promise<string | null> => {
  const { data, error } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data?.role ?? null;
};
