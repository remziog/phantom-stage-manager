import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  parseCsv,
  validateAssetHeaders,
  validateAssetRow,
  rowsToCsv,
  ASSET_REQUIRED_HEADERS,
  ASSET_OPTIONAL_HEADERS,
  type ValidatedAssetRow,
} from "@/lib/csv";
import { importAssets, type ImportProgress } from "@/services/assets";
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, Download, FileText, Loader2, Undo2, Redo2 } from "lucide-react";

const SAMPLE_CSV = `name,sku,category,quantity,unit_price,location,status
Shure SM58,MIC-SM58,Microphone,10,99.00,Warehouse A,available
QSC K12.2,SPK-K122,Speaker,4,899.00,Warehouse A,available
`;

export default function AssetsImportPage() {
  const { user, company } = useAuth();
  const cid = company?.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Wraps the file/preview block so we can scroll + focus after a re-upload.
  const importStepRef = useRef<HTMLDivElement>(null);
  // Snapshot of the originally-parsed raw values per line, captured the first
  // time a file is validated. Used to power the per-row and global "Undo
  // edits" actions on the Row errors card.
  const originalRawByLine = useRef<Map<number, Record<string, string>>>(new Map());
  // Stack of inline edits in the order they were made. Each entry captures
  // the value *before* the change so Cmd/Ctrl+Z can step back one edit at a
  // time. Cleared whenever a new file is loaded or all edits are reverted.
  interface EditHistoryEntry { lineNumber: number; field: string; prevValue: string; }
  const editHistory = useRef<EditHistoryEntry[]>([]);
  // Mirror stack for redo. We push the value that was undone (so it can be
  // re-applied) and clear it whenever the user makes a fresh edit, mirroring
  // standard text-editor behaviour where a new edit forks the history.
  interface RedoHistoryEntry { lineNumber: number; field: string; nextValue: string; }
  const redoHistory = useRef<RedoHistoryEntry[]>([]);
  // Mirror the ref-backed stack lengths into state so the visible Undo/Redo
  // counters re-render whenever an edit, undo, redo, or revert happens.
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const syncHistoryCounts = () => {
    setUndoCount(editHistory.current.length);
    setRedoCount(redoHistory.current.length);
  };

  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [validated, setValidated] = useState<ValidatedAssetRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [allowPartial, setAllowPartial] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  // Resume support: when the user cancels mid-import we remember how many
  // valid rows were already processed (so we can replay just the rest) and
  // a snapshot of totals for the summary card.
  interface ResumeCheckpoint {
    fileName: string;
    /** Index into the *valid rows* array where the next attempt should start. */
    nextIndex: number;
    /** Total valid rows in the original batch (for the "X of Y" copy). */
    totalValid: number;
    /** Inserted/updated counts from the cancelled run (for the summary card). */
    inserted: number;
    updated: number;
  }
  const [resume, setResume] = useState<ResumeCheckpoint | null>(null);

  // Summary of the most recent completed import. When `wasResume` is true we
  // render a breakdown that separates rows saved in the previous (cancelled)
  // run from rows saved in the just-finished resumed run.
  interface FailedRowSnapshot {
    lineNumber: number;
    raw: Record<string, string>;
    message: string;
  }
  interface RunSummary {
    wasResume: boolean;
    previousInserted: number;
    previousUpdated: number;
    runInserted: number;
    runUpdated: number;
    failed: number;
    skipped: number;
    fileName: string;
    /** Headers captured at the time of the run, used for CSV export. */
    headers: string[];
    /** Per-row failures from the just-finished run, with error messages. */
    failedRows: FailedRowSnapshot[];
  }
  const [lastRunSummary, setLastRunSummary] = useState<RunSummary | null>(null);

  const headerCheck = useMemo(
    () => (headers.length ? validateAssetHeaders(headers) : null),
    [headers],
  );

  const validRows = useMemo(() => validated.filter((r) => r.errors.length === 0), [validated]);
  const invalidRows = useMemo(() => validated.filter((r) => r.errors.length > 0), [validated]);

  /** Asset columns that are present in the uploaded file — used to render the
   * inline editor. Header keys are lowercased to match how `validateAssetRow`
   * looks them up. */
  const editableColumns = useMemo(() => {
    const present = new Set(headers.map((h) => h.toLowerCase()));
    return [
      ...ASSET_REQUIRED_HEADERS,
      ...ASSET_OPTIONAL_HEADERS,
    ].filter((c) => present.has(c));
  }, [headers]);

  /** Per-field error lookup so we can highlight the offending input. */
  const errorsByLine = useMemo(() => {
    const m = new Map<number, Map<string, string>>();
    for (const r of invalidRows) {
      const fields = new Map<string, string>();
      for (const e of r.errors) fields.set(e.field, e.message);
      m.set(r.lineNumber, fields);
    }
    return m;
  }, [invalidRows]);

  // Holds the AbortController for the active import so the Cancel button
  // can stop the loop between rows. Stored in a ref so toggling it doesn't
  // re-render and tear down the in-flight mutation.
  const abortRef = useRef<AbortController | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const importMut = useMutation({
    /** `startIndex` lets us resume — defaults to 0 for a fresh import. */
    mutationFn: (startIndex: number = 0) => {
      const controller = new AbortController();
      abortRef.current = controller;
      // Clear any prior summary so it doesn't appear stale during the new run.
      setLastRunSummary(null);
      const slice = validRows.slice(startIndex).map((r) => r.parsed);
      return importAssets(cid, user!.id, slice, {
        onProgress: (p) => setProgress(p),
        signal: controller.signal,
      }).then((res) => ({ ...res, startIndex, sliceLength: slice.length }));
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["assets", cid] });
      abortRef.current = null;
      setIsCancelling(false);

      if (res.cancelled) {
        // Carry forward earlier progress when resuming a previously cancelled run.
        const carriedInserted = (resume?.inserted ?? 0) + res.inserted;
        const carriedUpdated = (resume?.updated ?? 0) + res.updated;
        // The service reports `processed` relative to the slice it was given —
        // translate back to an absolute offset across the full valid-rows list.
        const absoluteNext = res.startIndex + (progress?.processed ?? 0);

        setResume({
          fileName: fileName ?? "import.csv",
          nextIndex: absoluteNext,
          totalValid: validRows.length,
          inserted: carriedInserted,
          updated: carriedUpdated,
        });

        toast({
          title: "Import cancelled",
          description: `${carriedInserted} added, ${carriedUpdated} updated before stopping. ${
            validRows.length - absoluteNext
          } row(s) remain — you can resume below.`,
        });
        setProgress(null);
        return;
      }

      const skipped = invalidRows.length;
      const previousInserted = resume?.inserted ?? 0;
      const previousUpdated = resume?.updated ?? 0;
      const wasResume = !!resume;
      const totalInserted = previousInserted + res.inserted;
      const totalUpdated = previousUpdated + res.updated;
      const partial = res.failed.length > 0 ? `, ${res.failed.length} failed` : "";

      setLastRunSummary({
        wasResume,
        previousInserted,
        previousUpdated,
        runInserted: res.inserted,
        runUpdated: res.updated,
        failed: res.failed.length,
        skipped,
        fileName: fileName ?? "import.csv",
        headers,
        failedRows: res.failed.map((f) => {
          // `f.index` is relative to the slice handed to importAssets — translate
          // back to the original validRows index so we can recover the raw CSV row.
          const source = validRows[res.startIndex + f.index];
          return {
            lineNumber: source?.lineNumber ?? -1,
            raw: source?.raw ?? {},
            message: f.message,
          };
        }),
      });
      setResume(null);
      toast({
        title: wasResume ? "Resumed import complete" : "Import complete",
        description: wasResume
          ? `This run: +${res.inserted} added, ${res.updated} updated. Combined with the earlier run: ${totalInserted} added, ${totalUpdated} updated${partial}.`
          : `${totalInserted} added, ${totalUpdated} updated${
              skipped ? `, ${skipped} skipped` : ""
            }${partial}.`,
      });
      // After a fresh import we navigate away as before. After a resumed
      // import we stay on the page so the user can review the breakdown.
      if (!wasResume && res.failed.length === 0) navigate("/app/assets");
    },
    onError: (e) => {
      abortRef.current = null;
      setIsCancelling(false);
      setProgress(null);
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    },
  });

  /** Download the failed rows from the most recent run as a CSV, preserving
   * the original columns and appending `_line` and `_error` for diagnosis. */
  const downloadFailedRows = () => {
    const s = lastRunSummary;
    if (!s || s.failedRows.length === 0) return;
    const cols = [...s.headers, "_line", "_error"];
    const csv = rowsToCsv(
      cols,
      s.failedRows.map((r) => ({ ...r.raw, _line: String(r.lineNumber), _error: r.message })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = s.fileName.replace(/\.csv$/i, "");
    a.href = url;
    a.download = `${base}-failed-rows.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Re-feed the just-failed rows back into the importer as a synthesized
   * CSV file. Uses only the original headers so re-validation runs cleanly
   * (the diagnostic `_line`/`_error` columns from the download are dropped). */
  const reuploadFailedRows = async () => {
    const s = lastRunSummary;
    if (!s || s.failedRows.length === 0) return;
    const csv = rowsToCsv(
      s.headers,
      s.failedRows.map((r) => ({ ...r.raw })),
    );
    const base = s.fileName.replace(/\.csv$/i, "");
    const file = new File([csv], `${base}-failed-rows.csv`, { type: "text/csv" });
    // Clear the summary so it doesn't shadow the new upload state.
    setLastRunSummary(null);
    const result = await handleFile(file);
    if (result.ok) {
      const { total, valid, invalid } = result;
      toast({
        title: "Failed rows revalidated",
        description:
          invalid === 0
            ? `All ${valid} row${valid === 1 ? "" : "s"} passed validation — ready to re-import.`
            : `${valid} of ${total} row${total === 1 ? "" : "s"} passed; ${invalid} still ${invalid === 1 ? "has" : "have"} errors.`,
        variant: invalid > 0 ? "destructive" : "default",
      });
    } else {
      toast({
        title: "Could not revalidate",
        description: result.message,
        variant: "destructive",
      });
    }
    // Wait for the next paint so the freshly-mounted preview has dimensions,
    // then scroll the import step into view and move keyboard focus to it
    // so screen readers and keyboard users land on the revalidated rows.
    requestAnimationFrame(() => {
      const el = importStepRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus({ preventScroll: true });
    });
  };

  /** Build a fresh CSV containing only the rows that currently fail
   * validation, then feed it back through the importer so the user can fix
   * & retry without manual re-uploading. The original headers are kept so
   * re-validation runs against the same schema. */
  const retryInvalidRows = async () => {
    if (invalidRows.length === 0 || headers.length === 0) return;
    const csv = rowsToCsv(headers, invalidRows.map((r) => ({ ...r.raw })));
    const base = (fileName ?? "import.csv").replace(/\.csv$/i, "");
    const file = new File([csv], `${base}-still-failing.csv`, { type: "text/csv" });
    const count = invalidRows.length;
    const result = await handleFile(file);
    if (result.ok) {
      toast({
        title: "Retrying failed rows only",
        description:
          result.invalid === 0
            ? `All ${result.valid} row${result.valid === 1 ? "" : "s"} now pass — ready to import.`
            : `${result.valid} of ${count} row${count === 1 ? "" : "s"} now pass; ${result.invalid} still ${result.invalid === 1 ? "has" : "have"} errors.`,
        variant: result.invalid > 0 ? "destructive" : "default",
      });
    } else {
      toast({ title: "Could not revalidate", description: result.message, variant: "destructive" });
    }
    requestAnimationFrame(() => {
      const el = importStepRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus({ preventScroll: true });
    });
  };

  /** Patch a single cell in the parsed-rows model and re-validate just that
   * row in place. Updates flow back into `validated`, which feeds the valid /
   * invalid summaries — so a row can move to the valid bucket as soon as the
   * user fixes it. */
  const editCell = (lineNumber: number, field: string, value: string) => {
    // Capture the previous value from the live state BEFORE calling
    // setValidated, so the history bookkeeping happens exactly once even
    // under React 18 strict-mode (which double-invokes state updaters).
    const currentRow = validated.find((r) => r.lineNumber === lineNumber);
    if (!currentRow) return;
    const prevValue = currentRow.raw[field] ?? "";
    if (prevValue === value) return; // no-op
    editHistory.current.push({ lineNumber, field, prevValue });
    // A fresh edit invalidates the redo stack — same convention as most
    // text editors.
    redoHistory.current = [];
    syncHistoryCounts();
    setValidated((prev) =>
      prev.map((row) => {
        if (row.lineNumber !== lineNumber) return row;
        const nextRaw = { ...row.raw, [field]: value };
        // `validateAssetRow` is total — it returns errors instead of
        // throwing — so a failing validation still updates the row and
        // surfaces messages without desyncing the history stack.
        return validateAssetRow(nextRaw, lineNumber);
      }),
    );
  };

  /** Pop the most recent inline edit off the history stack and restore the
   * affected cell's previous value. Used by Cmd/Ctrl+Z. The undone change is
   * pushed onto the redo stack so it can be replayed. */
  const undoLastEdit = () => {
    const last = editHistory.current[editHistory.current.length - 1];
    if (!last) return false;
    const currentRow = validated.find((r) => r.lineNumber === last.lineNumber);
    if (!currentRow) {
      // Row no longer exists (e.g. file was reloaded mid-flight). Drop the
      // dangling entry and resync so the counter doesn't claim a bogus step.
      editHistory.current.pop();
      syncHistoryCounts();
      return false;
    }
    const currentValue = currentRow.raw[last.field] ?? "";
    editHistory.current.pop();
    redoHistory.current.push({
      lineNumber: last.lineNumber,
      field: last.field,
      nextValue: currentValue,
    });
    syncHistoryCounts();
    setValidated((prev) =>
      prev.map((row) => {
        if (row.lineNumber !== last.lineNumber) return row;
        const nextRaw = { ...row.raw, [last.field]: last.prevValue };
        return validateAssetRow(nextRaw, last.lineNumber);
      }),
    );
    return true;
  };

  /** Pop the most recently-undone edit and re-apply it. The re-applied
   * change is pushed back onto `editHistory` so further Cmd/Ctrl+Z continues
   * to work. */
  const redoLastEdit = () => {
    const next = redoHistory.current[redoHistory.current.length - 1];
    if (!next) return false;
    const currentRow = validated.find((r) => r.lineNumber === next.lineNumber);
    if (!currentRow) {
      redoHistory.current.pop();
      syncHistoryCounts();
      return false;
    }
    const currentValue = currentRow.raw[next.field] ?? "";
    redoHistory.current.pop();
    editHistory.current.push({
      lineNumber: next.lineNumber,
      field: next.field,
      prevValue: currentValue,
    });
    syncHistoryCounts();
    setValidated((prev) =>
      prev.map((row) => {
        if (row.lineNumber !== next.lineNumber) return row;
        const nextRaw = { ...row.raw, [next.field]: next.nextValue };
        return validateAssetRow(nextRaw, next.lineNumber);
      }),
    );
    return true;
  };

  /** True when the row's current raw values differ from the originally-parsed
   * snapshot for at least one editable field. */
  const isRowEdited = (lineNumber: number, currentRaw: Record<string, string>) => {
    const original = originalRawByLine.current.get(lineNumber);
    if (!original) return false;
    for (const c of editableColumns) {
      if ((currentRaw[c] ?? "") !== (original[c] ?? "")) return true;
    }
    return false;
  };

  /** Derived: true if any row in the table currently differs from its snapshot. */
  const hasAnyEdits = useMemo(
    () => validated.some((r) => isRowEdited(r.lineNumber, r.raw)),
    // `editableColumns` and the snapshot are stable for a given uploaded file;
    // recompute whenever the validated rows change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validated, editableColumns],
  );

  /** Safety net: whenever the validated rows change (per-row revert, undo
   * all, file reload, or any future code path that mutates `validated`),
   * prune dangling history entries that point to lines no longer present
   * AND re-mirror the stack lengths into the visible counters. This keeps
   * the Undo / Redo badges honest even if a future caller forgets to invoke
   * `syncHistoryCounts` directly. */
  useEffect(() => {
    const liveLines = new Set(validated.map((r) => r.lineNumber));
    let changed = false;
    const prunedEdits = editHistory.current.filter((h) => {
      if (liveLines.has(h.lineNumber)) return true;
      changed = true;
      return false;
    });
    const prunedRedos = redoHistory.current.filter((h) => {
      if (liveLines.has(h.lineNumber)) return true;
      changed = true;
      return false;
    });
    if (changed) {
      editHistory.current = prunedEdits;
      redoHistory.current = prunedRedos;
    }
    // Always re-mirror — cheap and idempotent.
    if (undoCount !== editHistory.current.length) {
      setUndoCount(editHistory.current.length);
    }
    if (redoCount !== redoHistory.current.length) {
      setRedoCount(redoHistory.current.length);
    }
  }, [validated, undoCount, redoCount]);
  /** Restore one row's raw values to the originally-parsed snapshot, then
   * re-validate it so the errors column refreshes. */
  const undoRow = (lineNumber: number) => {
    const original = originalRawByLine.current.get(lineNumber);
    if (!original) return;
    setValidated((prev) =>
      prev.map((row) =>
        row.lineNumber === lineNumber
          ? validateAssetRow({ ...original }, lineNumber)
          : row,
      ),
    );
    // Drop history entries for this row — they no longer reflect the live state.
    editHistory.current = editHistory.current.filter((h) => h.lineNumber !== lineNumber);
    redoHistory.current = redoHistory.current.filter((h) => h.lineNumber !== lineNumber);
    syncHistoryCounts();
  };

  /** Restore every row's raw values to the originally-parsed snapshot. */
  const undoAllEdits = () => {
    if (originalRawByLine.current.size === 0 || !hasAnyEdits) return;
    setValidated((prev) =>
      prev.map((row) => {
        const original = originalRawByLine.current.get(row.lineNumber);
        if (!original) return row;
        return validateAssetRow({ ...original }, row.lineNumber);
      }),
    );
    editHistory.current = [];
    redoHistory.current = [];
    syncHistoryCounts();
    toast({
      title: "Edits reverted",
      description: "Inline changes were rolled back to the originally uploaded values.",
    });
  };

  /** Find the first invalid input rendered inside the editor (DOM order
   * mirrors row → cell order, which is row-then-column), scroll it into
   * view, and move keyboard focus to it. The visual focus ring + the
   * existing inline error badge make the target unmistakable. */
  const goToFirstError = () => {
    if (invalidRows.length === 0) return;
    // Defer to the next frame so any pending re-validation has finished
    // committing to the DOM before we query.
    requestAnimationFrame(() => {
      const editor = document.querySelector('[data-csv-editor="true"]');
      const target = editor?.querySelector<HTMLInputElement>(
        'input[aria-invalid="true"]',
      );
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
      // Place the caret at the end so users can immediately start fixing.
      const len = target.value.length;
      try { target.setSelectionRange(len, len); } catch { /* number inputs etc. */ }
    });
  };

    if (!abortRef.current || isCancelling) return;
    setIsCancelling(true);
    abortRef.current.abort();
  };

  const handleResume = () => {
    if (!resume) return;
    importMut.mutate(resume.nextIndex);
  };

  const discardResume = () => {
    setResume(null);
    setLastRunSummary(null);
  };

  const isImporting = importMut.isPending;

  // Block browser nav (refresh / close tab) while a batch is in-flight.
  useEffect(() => {
    if (!isImporting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isImporting]);

  // Keyboard shortcuts for the inline editor:
  //   Cmd/Ctrl+Z         → undo the most recent inline edit
  //   Cmd/Ctrl+Y         → redo the last undone edit
  //   Shift+Cmd/Ctrl+Z   → also redo (matches standard editor conventions)
  // Only active while there are invalid rows being edited and we're not in
  // the middle of an import.
  useEffect(() => {
    if (invalidRows.length === 0 || isImporting) return;
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const isUndoKey = key === "z" && !e.shiftKey;
      const isRedoKey = key === "y" || (key === "z" && e.shiftKey);
      if (!isUndoKey && !isRedoKey) return;
      // Ignore when focus is on a non-editor field (e.g. another text input
      // outside the row-errors table) so we don't hijack the browser's
      // native undo elsewhere on the page.
      const target = e.target as HTMLElement | null;
      const insideEditor = !!target?.closest('[data-csv-editor="true"]');
      const onBody = target === document.body;
      if (!insideEditor && !onBody) return;
      if (isRedoKey) {
        if (redoHistory.current.length === 0) return;
        e.preventDefault();
        const redone = redoLastEdit();
        if (redone) {
          toast({
            title: "Edit redone",
            description: `${redoHistory.current.length} undone edit${redoHistory.current.length === 1 ? "" : "s"} remain available to redo.`,
          });
        }
      } else {
        if (editHistory.current.length === 0) return;
        e.preventDefault();
        const undone = undoLastEdit();
        if (undone) {
          toast({
            title: "Edit undone",
            description: `${editHistory.current.length} earlier edit${editHistory.current.length === 1 ? "" : "s"} remain in history.`,
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invalidRows.length, isImporting]);

  const canImport =
    !!cid &&
    !!user &&
    headerCheck?.ok === true &&
    validated.length > 0 &&
    (invalidRows.length === 0 || allowPartial) &&
    !isImporting;

  const handleFile = async (file: File) => {
    setParseError(null);
    setFileName(file.name);
    // A new file invalidates any previous resume checkpoint.
    setResume(null);
    setProgress(null);
    setLastRunSummary(null);
    // A new file resets the inline-edit history.
    editHistory.current = [];
    redoHistory.current = [];
    syncHistoryCounts();
    try {
      const text = await file.text();
      setRawText(text);
      const { headers: hs, rows } = parseCsv(text);
      setHeaders(hs);
      const v = rows.map((r, idx) => validateAssetRow(r, idx + 2)); // +2: header is line 1
      setValidated(v);
      // Snapshot the originally-parsed values so per-row / global undo can
      // restore them after inline edits. Cloning here is enough — we never
      // mutate the stored maps.
      const snap = new Map<number, Record<string, string>>();
      for (const row of v) snap.set(row.lineNumber, { ...row.raw });
      originalRawByLine.current = snap;
      const valid = v.filter((r) => r.errors.length === 0).length;
      return { ok: true as const, total: v.length, valid, invalid: v.length - valid };
    } catch (e) {
      setParseError((e as Error).message);
      setHeaders([]);
      setValidated([]);
      return { ok: false as const, message: (e as Error).message };
    }
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Export the currently still-failing rows as a clean CSV — only the
   * original columns, no `_errors` annotation — so the user can fix them
   * offline and re-upload the file directly. */
  const downloadStillFailing = () => {
    if (invalidRows.length === 0 || headers.length === 0) return;
    const csv = rowsToCsv(headers, invalidRows.map((r) => ({ ...r.raw })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = (fileName ?? "import.csv").replace(/\.csv$/i, "");
    a.href = url;
    a.download = `${base}-still-failing.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFileName(null);
    setRawText("");
    setHeaders([]);
    setValidated([]);
    setParseError(null);
    setResume(null);
    setProgress(null);
    setLastRunSummary(null);
    originalRawByLine.current = new Map();
    editHistory.current = [];
    redoHistory.current = [];
    syncHistoryCounts();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link to="/app/assets"><ArrowLeft className="h-4 w-4 mr-1" />Back to assets</Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-display">Import assets from CSV</h1>
            <p className="text-sm text-muted-foreground">
              Upload a CSV to bulk-add equipment. Rows with a matching SKU will be updated.
            </p>
          </div>
          <Button variant="outline" onClick={downloadSample}>
            <Download className="h-4 w-4 mr-2" />Download sample
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV format</CardTitle>
            <CardDescription>
              Required column:{" "}
              {ASSET_REQUIRED_HEADERS.map((h) => (
                <Badge key={h} variant="secondary" className="mr-1">{h}</Badge>
              ))}
              <br />
              Optional:{" "}
              {ASSET_OPTIONAL_HEADERS.map((h) => (
                <Badge key={h} variant="outline" className="mr-1">{h}</Badge>
              ))}
            </CardDescription>
          </CardHeader>
        </Card>

        <div
          ref={importStepRef}
          tabIndex={-1}
          aria-label="Import file and row preview"
          className="scroll-mt-4 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        >
          {!fileName ? (
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/50 p-12 text-center cursor-pointer hover:bg-card transition"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Click to choose a CSV, or drag &amp; drop</div>
              <div className="text-xs text-muted-foreground">UTF-8 encoded, comma-separated</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{fileName}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    ({(new Blob([rawText]).size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} disabled={isImporting}>Choose another file</Button>
              </CardHeader>
            </Card>
          )}
        </div>

        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could not parse CSV</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {headerCheck && !headerCheck.ok && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Missing required column(s)</AlertTitle>
            <AlertDescription>
              Add the following header{headerCheck.missing.length > 1 ? "s" : ""} to your CSV:{" "}
              <strong>{headerCheck.missing.join(", ")}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {headerCheck?.ok && headerCheck.unknown.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unknown column(s) will be ignored</AlertTitle>
            <AlertDescription>{headerCheck.unknown.join(", ")}</AlertDescription>
          </Alert>
        )}

        {validated.length > 0 && headerCheck?.ok && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Total rows</div>
                  <div className="text-2xl font-semibold tabular-nums">{validated.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />Valid
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-success">{validRows.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-destructive" />With errors
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-destructive">{invalidRows.length}</div>
                </CardContent>
              </Card>
            </div>

            {invalidRows.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Row errors</CardTitle>
                    <CardDescription>
                      Edit values directly below — rows are re-validated as you
                      type and move to the valid bucket once all errors clear. Or
                      fix them in your CSV and re-upload, or enable “Import valid
                      rows only”. Press{" "}
                      <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">⌘/Ctrl+Z</kbd>{" "}
                      to undo the last edit, or{" "}
                      <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">⌘/Ctrl+Y</kbd>{" "}
                      /{" "}
                      <kbd className="px-1 py-0.5 rounded border bg-muted text-[10px] font-mono">⇧⌘/Ctrl+Z</kbd>{" "}
                      to redo.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => undoLastEdit()}
                      disabled={undoCount === 0 || isImporting}
                      title={undoCount > 0 ? `Undo last edit (⌘/Ctrl+Z) — ${undoCount} available` : "Nothing to undo"}
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Undo
                      <Badge
                        variant="secondary"
                        className="ml-2 px-1.5 py-0 h-5 min-w-[1.25rem] justify-center tabular-nums"
                        aria-label={`${undoCount} undo step${undoCount === 1 ? "" : "s"} available`}
                      >
                        {undoCount}
                      </Badge>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => redoLastEdit()}
                      disabled={redoCount === 0 || isImporting}
                      title={redoCount > 0 ? `Redo last undone edit (⌘/Ctrl+Y) — ${redoCount} available` : "Nothing to redo"}
                    >
                      <Redo2 className="h-4 w-4 mr-2" />
                      Redo
                      <Badge
                        variant="secondary"
                        className="ml-2 px-1.5 py-0 h-5 min-w-[1.25rem] justify-center tabular-nums"
                        aria-label={`${redoCount} redo step${redoCount === 1 ? "" : "s"} available`}
                      >
                        {redoCount}
                      </Badge>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undoAllEdits}
                      disabled={!hasAnyEdits || isImporting}
                      title={hasAnyEdits ? "Revert all inline edits" : "No edits to undo"}
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Undo all edits
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto" data-csv-editor="true">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Line</TableHead>
                          {editableColumns.map((c) => (
                            <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>
                          ))}
                          <TableHead>Errors</TableHead>
                          <TableHead className="w-12 sr-only">Undo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invalidRows.slice(0, 100).map((r) => {
                          const fieldErrors = errorsByLine.get(r.lineNumber);
                          const edited = isRowEdited(r.lineNumber, r.raw);
                          return (
                            <TableRow key={r.lineNumber} className="align-top">
                              <TableCell className="tabular-nums text-muted-foreground pt-3">
                                {r.lineNumber}
                              </TableCell>
                              {editableColumns.map((c) => {
                                const errorMessage = fieldErrors?.get(c);
                                const hasError = !!errorMessage;
                                return (
                                  <TableCell key={c} className="min-w-[140px]">
                                    <Input
                                      value={r.raw[c] ?? ""}
                                      onChange={(e) => editCell(r.lineNumber, c, e.target.value)}
                                      aria-invalid={hasError ? true : undefined}
                                      aria-describedby={
                                        hasError ? `err-${r.lineNumber}-${c}` : undefined
                                      }
                                      aria-label={`${c} for line ${r.lineNumber}`}
                                      className={`h-8 ${hasError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                    />
                                    {hasError && (
                                      <Badge
                                        id={`err-${r.lineNumber}-${c}`}
                                        variant="destructive"
                                        role="alert"
                                        title={errorMessage}
                                        className="mt-1 max-w-full font-normal whitespace-normal text-left leading-tight"
                                      >
                                        <AlertCircle className="h-3 w-3 mr-1 shrink-0" />
                                        <span className="line-clamp-2">{errorMessage}</span>
                                      </Badge>
                                    )}
                                  </TableCell>
                                );
                              })}
                              <TableCell>
                                {(() => {
                                  // Only render errors here that aren't already
                                  // shown as inline badges next to their cells —
                                  // typically row-level issues whose `field`
                                  // doesn't map to an editable column.
                                  const editableSet = new Set<string>(editableColumns);
                                  const others = r.errors.filter(
                                    (e) => !editableSet.has(e.field),
                                  );
                                  if (others.length === 0) {
                                    return (
                                      <span className="text-xs text-muted-foreground pt-1 inline-block">
                                        See badges in cells →
                                      </span>
                                    );
                                  }
                                  return (
                                    <ul className="space-y-0.5 text-sm text-destructive pt-1">
                                      {others.map((e, i) => (
                                        <li key={i}><strong>{e.field}:</strong> {e.message}</li>
                                      ))}
                                    </ul>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="pt-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => undoRow(r.lineNumber)}
                                  disabled={!edited || isImporting}
                                  aria-label={`Undo edits for line ${r.lineNumber}`}
                                  title={edited ? "Revert this row to its original values" : "No edits on this row"}
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {invalidRows.length > 100 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                      Showing first 100 of {invalidRows.length} rows with errors.
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t">
                    <div className="flex items-center gap-2">
                      <Switch id="partial" checked={allowPartial} onCheckedChange={setAllowPartial} disabled={isImporting} />
                      <Label htmlFor="partial" className="cursor-pointer">
                        Import valid rows only ({validRows.length})
                      </Label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={retryInvalidRows}
                        disabled={isImporting}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Retry only failed rows ({invalidRows.length})
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadStillFailing}>
                        <Download className="h-4 w-4 mr-2" />
                        Export still-failing rows ({invalidRows.length})
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {validRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview ({validRows.length} valid row{validRows.length === 1 ? "" : "s"})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Line</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.slice(0, 20).map((r) => (
                        <TableRow key={r.lineNumber}>
                          <TableCell className="tabular-nums text-muted-foreground">{r.lineNumber}</TableCell>
                          <TableCell className="font-medium">{r.parsed.name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.parsed.sku || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{r.parsed.category || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.parsed.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.parsed.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">{r.parsed.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validRows.length > 20 && (
                    <div className="px-4 py-3 text-xs text-muted-foreground border-t">
                      Showing first 20 of {validRows.length} valid rows.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {lastRunSummary && !isImporting && (() => {
              const s = lastRunSummary;
              const totalInserted = s.previousInserted + s.runInserted;
              const totalUpdated = s.previousUpdated + s.runUpdated;
              return (
                <Card aria-live="polite">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {s.wasResume ? "Resumed import complete" : "Import complete"}
                    </CardTitle>
                    <CardDescription>
                      {s.wasResume
                        ? <>Combined results for <span className="font-medium">{s.fileName}</span> across the original and resumed runs.</>
                        : <>Results for <span className="font-medium">{s.fileName}</span>.</>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {s.wasResume ? (
                      <div className="overflow-hidden rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Run</TableHead>
                              <TableHead className="text-right">Added</TableHead>
                              <TableHead className="text-right">Updated</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="text-muted-foreground">Previous run (before cancel)</TableCell>
                              <TableCell className="text-right tabular-nums">{s.previousInserted}</TableCell>
                              <TableCell className="text-right tabular-nums">{s.previousUpdated}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-muted-foreground">This resumed run</TableCell>
                              <TableCell className="text-right tabular-nums text-success">+{s.runInserted}</TableCell>
                              <TableCell className="text-right tabular-nums text-primary">+{s.runUpdated}</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/30">
                              <TableCell className="font-medium">Total saved</TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">{totalInserted}</TableCell>
                              <TableCell className="text-right tabular-nums font-semibold">{totalUpdated}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                          <div className="text-xs text-muted-foreground">Added</div>
                          <div className="text-lg font-semibold tabular-nums text-success">{totalInserted}</div>
                        </div>
                        <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                          <div className="text-xs text-muted-foreground">Updated</div>
                          <div className="text-lg font-semibold tabular-nums text-primary">{totalUpdated}</div>
                        </div>
                      </div>
                    )}

                    {(s.failed > 0 || s.skipped > 0) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                          <div className="text-xs text-muted-foreground">Failed (this run)</div>
                          <div className={`text-lg font-semibold tabular-nums ${s.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {s.failed}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                          <div className="text-xs text-muted-foreground">Skipped (invalid rows)</div>
                          <div className="text-lg font-semibold tabular-nums text-muted-foreground">{s.skipped}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => navigate("/app/assets")}>
                        Go to assets
                      </Button>
                      {s.failedRows.length > 0 && (
                        <>
                          <Button size="sm" variant="default" onClick={reuploadFailedRows}>
                            <Upload className="h-4 w-4 mr-2" />
                            Re-upload these failed rows ({s.failedRows.length})
                          </Button>
                          <Button size="sm" variant="outline" onClick={downloadFailedRows}>
                            <Download className="h-4 w-4 mr-2" />
                            Download failed rows
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setLastRunSummary(null)}>
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {resume && !isImporting && (() => {
              const remaining = Math.max(resume.totalValid - resume.nextIndex, 0);
              const stillSameFile = fileName === resume.fileName;
              return (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Resume the cancelled import?</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p className="text-sm">
                      <strong>{resume.inserted}</strong> added and{" "}
                      <strong>{resume.updated}</strong> updated before you cancelled.{" "}
                      <strong>{remaining}</strong> of {resume.totalValid} valid row
                      {resume.totalValid === 1 ? "" : "s"} from{" "}
                      <span className="font-medium">{resume.fileName}</span> haven't been
                      saved yet.
                    </p>
                    {!stillSameFile && (
                      <p className="text-xs text-warning">
                        You loaded a different file ({fileName}). Resuming will use the
                        currently parsed rows — re-upload <strong>{resume.fileName}</strong>{" "}
                        first if that's not what you want.
                      </p>
                    )}
                    {stillSameFile && remaining > validRows.length - resume.nextIndex && (
                      <p className="text-xs text-warning">
                        The current file has fewer valid rows than when you started.
                        Resuming will only process the rows still present.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleResume}
                        disabled={validRows.length <= resume.nextIndex}
                      >
                        Resume — import remaining {Math.min(
                          remaining,
                          Math.max(validRows.length - resume.nextIndex, 0),
                        )}{" "}
                        row{remaining === 1 ? "" : "s"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={discardResume}>
                        Discard checkpoint
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })()}

            {isImporting && progress && (
              <Card aria-live="polite" aria-busy="true">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div>
                        <div className="text-sm font-medium">
                          {isCancelling
                            ? `Cancelling — finishing row ${progress.processed} of ${progress.total}…`
                            : progress.phase === "preparing"
                              ? "Preparing import…"
                              : progress.phase === "done"
                                ? "Finishing up…"
                                : `Importing row ${progress.processed} of ${progress.total}…`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isCancelling
                            ? "Already-saved rows will be kept."
                            : "Please keep this tab open until the import finishes."}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm tabular-nums text-muted-foreground">
                        {progress.total > 0
                          ? `${Math.round((progress.processed / progress.total) * 100)}%`
                          : "0%"}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isCancelling}
                        aria-label="Cancel import"
                      >
                        {isCancelling ? "Cancelling…" : "Cancel import"}
                      </Button>
                    </div>
                  </div>

                  <Progress
                    value={
                      progress.total > 0 ? (progress.processed / progress.total) * 100 : 0
                    }
                    aria-label="Import progress"
                  />

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Added</div>
                      <div className="text-lg font-semibold tabular-nums text-success">
                        {progress.inserted}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Updated</div>
                      <div className="text-lg font-semibold tabular-nums text-primary">
                        {progress.updated}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-card/50 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Failed</div>
                      <div
                        className={`text-lg font-semibold tabular-nums ${
                          progress.failed > 0 ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {progress.failed}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/app/assets")}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button disabled={!canImport} onClick={() => importMut.mutate(0)}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {progress
                      ? `Importing ${progress.processed}/${progress.total}…`
                      : "Importing…"}
                  </>
                ) : (
                  `Import ${validRows.length} row${validRows.length === 1 ? "" : "s"}`
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
