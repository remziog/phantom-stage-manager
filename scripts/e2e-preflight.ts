/**
 * Preflight schema check for the E2E seed script.
 *
 * Verifies every table/column/enum value the seed + teardown scripts touch.
 * On mismatch:
 *   - Exits 1
 *   - Emits GitHub Actions annotations (::error:: / ::warning::) so failures
 *     show up inline on the PR / commit
 *   - Appends a concise Markdown diff table to GITHUB_STEP_SUMMARY
 *
 * Required env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 * Optional env: GITHUB_STEP_SUMMARY (set automatically by GitHub Actions)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;
const ON_CI = !!process.env.GITHUB_ACTIONS;
const SCRIPT_PATH = "scripts/e2e-seed.ts";
const SNAPSHOT_PATH = process.env.PREFLIGHT_SNAPSHOT_PATH ?? "preflight-report/schema-snapshot.json";
/** Optional path to a previous snapshot artifact to diff against. */
const BASELINE_PATH = process.env.PREFLIGHT_BASELINE_PATH ?? "";

/**
 * Sanitize the Supabase URL for the snapshot — keeps the project ref so you can
 * tell snapshots apart, but drops anything that could leak credentials.
 */
function sanitizeUrl(url: string | undefined): string {
  if (!url) return "unknown";
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return "invalid-url";
  }
}

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[preflight] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Tables + columns the seed/teardown scripts read or write. */
const REQUIRED_COLUMNS: Record<string, string[]> = {
  companies: [
    "id", "slug", "name", "created_by", "industry_type",
    "onboarding_completed", "currency", "settings",
  ],
  company_members: ["id", "company_id", "user_id", "role"],
  profiles: ["id", "user_id", "full_name", "current_company_id"],
  customers: ["id", "company_id", "created_by", "name", "email"],
  assets: ["id", "company_id", "created_by", "name", "category", "quantity", "unit_price"],
  transaction_items: ["id", "company_id"],
  transactions: ["id", "company_id"],
  invoices: ["id", "company_id"],
  module_change_log: ["id", "company_id"],
};

/** Enum values we send in inserts. */
const REQUIRED_ENUM_VALUES: { table: string; column: string; values: string[] }[] = [
  { table: "companies",       column: "industry_type", values: ["rental"] },
  { table: "company_members", column: "role",          values: ["owner", "operator"] },
];

type Severity = "error" | "warning";
interface Finding {
  severity: Severity;
  kind: "missing_table" | "missing_column" | "missing_enum_value" | "unknown";
  table: string;
  detail: string; // e.g. column name, enum value, or raw error
  rawError?: string;
}

const findings: Finding[] = [];

type ProbeStatus = "ok" | "missing" | "error";
interface ColumnSnapshot { name: string; status: ProbeStatus; error?: string }
interface TableSnapshot {
  name: string;
  status: ProbeStatus; // "missing" if the table itself isn't reachable
  error?: string;
  columns: ColumnSnapshot[];
}
interface EnumSnapshot {
  table: string;
  column: string;
  value: string;
  status: ProbeStatus;
  error?: string;
}

const tableSnapshots: TableSnapshot[] = [];
const enumSnapshots: EnumSnapshot[] = [];

/** Mask a string of unknown shape for safe console output. */
function safeMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function checkTable(table: string, columns: string[]): Promise<void> {
  const snap: TableSnapshot = { name: table, status: "ok", columns: [] };
  tableSnapshots.push(snap);

  // Step 1: probe the table itself with `select(id) limit 0`.
  const probe = await admin.from(table).select("id").limit(0);
  if (probe.error) {
    const msg = probe.error.message;
    if (
      probe.error.code === "PGRST205" ||
      /relation .* does not exist/i.test(msg) ||
      /could not find the table/i.test(msg)
    ) {
      snap.status = "missing";
      snap.error = msg;
      findings.push({
        severity: "error", kind: "missing_table", table, detail: table, rawError: msg,
      });
      // Still record the columns as "missing" so the snapshot stays uniform.
      for (const col of columns) snap.columns.push({ name: col, status: "missing" });
      return;
    }
    snap.status = "error";
    snap.error = msg;
    findings.push({
      severity: "error", kind: "unknown", table, detail: "probe failed", rawError: msg,
    });
    return;
  }

  // Step 2: probe each column individually so we can list every miss.
  for (const col of columns) {
    if (col === "id") {
      snap.columns.push({ name: col, status: "ok" });
      continue;
    }
    const { error } = await admin.from(table).select(col).limit(0);
    if (!error) {
      snap.columns.push({ name: col, status: "ok" });
      continue;
    }
    if (
      error.code === "42703" ||
      /column .* does not exist/i.test(error.message) ||
      /could not find the .* column/i.test(error.message)
    ) {
      snap.columns.push({ name: col, status: "missing", error: error.message });
      findings.push({
        severity: "error", kind: "missing_column", table, detail: col, rawError: error.message,
      });
    } else {
      snap.columns.push({ name: col, status: "error", error: error.message });
      findings.push({
        severity: "warning", kind: "unknown", table,
        detail: `column "${col}"`, rawError: error.message,
      });
    }
  }

  console.log(`[preflight] ✓ ${table} (${columns.length} columns checked)`);
}

async function checkEnumValue(table: string, column: string, value: string): Promise<void> {
  const { error } = await admin.from(table).select("id").eq(column, value).limit(0);
  if (!error) {
    enumSnapshots.push({ table, column, value, status: "ok" });
    console.log(`[preflight] ✓ enum ${table}.${column} accepts "${value}"`);
    return;
  }
  if (error.code === "22P02" || /invalid input value for enum/i.test(error.message)) {
    enumSnapshots.push({ table, column, value, status: "missing", error: error.message });
    findings.push({
      severity: "error", kind: "missing_enum_value", table,
      detail: `${column} = "${value}"`, rawError: error.message,
    });
    return;
  }
  enumSnapshots.push({ table, column, value, status: "error", error: error.message });
  findings.push({
    severity: "warning", kind: "unknown", table,
    detail: `enum probe ${column}="${value}"`, rawError: error.message,
  });
}

function writeSnapshot(): string {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const snapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    project: sanitizeUrl(SUPABASE_URL),
    scriptPath: SCRIPT_PATH,
    summary: {
      tablesChecked: tableSnapshots.length,
      columnsChecked: tableSnapshots.reduce((n, t) => n + t.columns.length, 0),
      enumValuesChecked: enumSnapshots.length,
      errors,
      warnings,
      ok: errors === 0,
    },
    tables: tableSnapshots,
    enums: enumSnapshots,
  };
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`[preflight] 📄 Wrote snapshot to ${SNAPSHOT_PATH}`);
  return SNAPSHOT_PATH;
}

function annotate(f: Finding): void {
  if (!ON_CI) return;
  // GitHub Actions workflow command — inlines on the PR diff (file/line is a stand-in
  // since the script doesn't know which exact line in the seed touches the column).
  const file = SCRIPT_PATH;
  const title =
    f.kind === "missing_table" ? `Missing table: ${f.table}` :
    f.kind === "missing_column" ? `Missing column: ${f.table}.${f.detail}` :
    f.kind === "missing_enum_value" ? `Missing enum value: ${f.table}.${f.detail}` :
    `Schema check warning (${f.table})`;
  const message = (f.rawError ?? f.detail).replace(/\r?\n/g, " ");
  // Encode per the GitHub workflow command spec.
  const enc = (s: string) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  console.log(
    `::${f.severity} file=${file},title=${enc(title)}::${enc(message)}`,
  );
}

// ───────────────────────── Baseline diff ─────────────────────────

interface SnapshotShape {
  tables: { name: string; status: string; columns: { name: string; status: string }[] }[];
  enums: { table: string; column: string; value: string; status: string }[];
}
interface SchemaDiff {
  addedTables: string[];
  removedTables: string[];
  addedColumns: string[];   // "table.column"
  removedColumns: string[]; // "table.column"
  addedEnums: string[];     // "table.column=value"
  removedEnums: string[];
  newlyMissing: string[];   // items present in baseline as ok but now missing/error
  nowFixed: string[];       // items missing in baseline but now ok
}

function loadBaseline(path: string): SnapshotShape | null {
  if (!path) return null;
  if (!existsSync(path)) {
    console.log(`[preflight] (no baseline at ${path}, skipping diff)`);
    return null;
  }
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as SnapshotShape;
  } catch (err) {
    console.warn(`[preflight] Could not parse baseline ${path}: ${safeMessage(err)}`);
    return null;
  }
}

function buildCurrentSnapshot(): SnapshotShape {
  return {
    tables: tableSnapshots.map((t) => ({
      name: t.name, status: t.status,
      columns: t.columns.map((c) => ({ name: c.name, status: c.status })),
    })),
    enums: enumSnapshots.map((e) => ({
      table: e.table, column: e.column, value: e.value, status: e.status,
    })),
  };
}

function diffSnapshots(baseline: SnapshotShape, current: SnapshotShape): SchemaDiff {
  const baseTables = new Map(baseline.tables.map((t) => [t.name, t] as const));
  const curTables = new Map(current.tables.map((t) => [t.name, t] as const));
  const baseEnums = new Map(
    baseline.enums.map((e) => [`${e.table}.${e.column}=${e.value}`, e] as const),
  );
  const curEnums = new Map(
    current.enums.map((e) => [`${e.table}.${e.column}=${e.value}`, e] as const),
  );

  const addedTables: string[] = [];
  const removedTables: string[] = [];
  const addedColumns: string[] = [];
  const removedColumns: string[] = [];
  const newlyMissing: string[] = [];
  const nowFixed: string[] = [];

  for (const name of curTables.keys()) if (!baseTables.has(name)) addedTables.push(name);
  for (const name of baseTables.keys()) if (!curTables.has(name)) removedTables.push(name);

  for (const [name, cur] of curTables) {
    const base = baseTables.get(name);
    if (!base) continue;
    const baseCols = new Map(base.columns.map((c) => [c.name, c.status] as const));
    const curCols = new Map(cur.columns.map((c) => [c.name, c.status] as const));
    for (const c of curCols.keys()) if (!baseCols.has(c)) addedColumns.push(`${name}.${c}`);
    for (const c of baseCols.keys()) if (!curCols.has(c)) removedColumns.push(`${name}.${c}`);
    for (const [c, status] of curCols) {
      const baseStatus = baseCols.get(c);
      if (baseStatus === "ok" && status !== "ok") newlyMissing.push(`column ${name}.${c}`);
      if (baseStatus && baseStatus !== "ok" && status === "ok") nowFixed.push(`column ${name}.${c}`);
    }
    if (base.status === "ok" && cur.status !== "ok") newlyMissing.push(`table ${name}`);
    if (base.status !== "ok" && cur.status === "ok") nowFixed.push(`table ${name}`);
  }

  const addedEnums: string[] = [];
  const removedEnums: string[] = [];
  for (const k of curEnums.keys()) if (!baseEnums.has(k)) addedEnums.push(k);
  for (const k of baseEnums.keys()) if (!curEnums.has(k)) removedEnums.push(k);
  for (const [k, e] of curEnums) {
    const base = baseEnums.get(k);
    if (base?.status === "ok" && e.status !== "ok") newlyMissing.push(`enum ${k}`);
    if (base && base.status !== "ok" && e.status === "ok") nowFixed.push(`enum ${k}`);
  }

  return {
    addedTables, removedTables, addedColumns, removedColumns,
    addedEnums, removedEnums, newlyMissing, nowFixed,
  };
}

function diffIsEmpty(d: SchemaDiff): boolean {
  return (
    d.addedTables.length + d.removedTables.length +
    d.addedColumns.length + d.removedColumns.length +
    d.addedEnums.length + d.removedEnums.length +
    d.newlyMissing.length + d.nowFixed.length
  ) === 0;
}

function renderDiffMarkdown(d: SchemaDiff, baselinePath: string): string[] {
  const lines: string[] = [];
  lines.push(`### 🔍 Diff vs baseline (\`${baselinePath}\`)`);
  lines.push("");
  if (diffIsEmpty(d)) {
    lines.push("No schema changes vs baseline.");
    return lines;
  }
  const section = (title: string, items: string[]) => {
    if (items.length === 0) return;
    lines.push(`**${title}** (${items.length})`);
    for (const i of items) lines.push(`- \`${i}\``);
    lines.push("");
  };
  section("➕ Added tables", d.addedTables);
  section("➖ Removed tables", d.removedTables);
  section("➕ Added columns", d.addedColumns);
  section("➖ Removed columns", d.removedColumns);
  section("➕ Added enum values", d.addedEnums);
  section("➖ Removed enum values", d.removedEnums);
  section("🚨 Newly missing (regressions)", d.newlyMissing);
  section("✅ Now fixed", d.nowFixed);
  return lines;
}

function logDiffToConsole(d: SchemaDiff, baselinePath: string): void {
  console.log(`\n[preflight] 🔍 Diff vs baseline (${baselinePath}):`);
  if (diffIsEmpty(d)) {
    console.log("  (no changes)");
    return;
  }
  const log = (label: string, items: string[]) => {
    if (items.length) console.log(`  ${label}: ${items.join(", ")}`);
  };
  log("+tables", d.addedTables);
  log("-tables", d.removedTables);
  log("+columns", d.addedColumns);
  log("-columns", d.removedColumns);
  log("+enums", d.addedEnums);
  log("-enums", d.removedEnums);
  log("regressions", d.newlyMissing);
  log("fixed", d.nowFixed);
}

// ─────────────────────────────────────────────────────────────────

function writeStepSummary(snapshotPath: string, diffLines: string[]): void {
  if (!STEP_SUMMARY) return;
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const lines: string[] = [];
  lines.push("## E2E preflight — schema check");
  lines.push("");
  lines.push(`Project: \`${sanitizeUrl(SUPABASE_URL)}\``);
  lines.push("");
  if (findings.length === 0) {
    lines.push("✅ All required tables, columns, and enum values are present.");
  } else {
    lines.push(`❌ **${errors.length} error(s)**, ⚠️ **${warnings.length} warning(s)** found.`);
    lines.push("");
    lines.push("| Severity | Kind | Table | Detail |");
    lines.push("|---|---|---|---|");
    for (const f of findings) {
      const sev = f.severity === "error" ? "❌ error" : "⚠️ warning";
      const kind = f.kind.replace(/_/g, " ");
      lines.push(`| ${sev} | ${kind} | \`${f.table}\` | \`${f.detail}\` |`);
    }
    lines.push("");
    lines.push(
      `Update \`${SCRIPT_PATH}\` (and \`scripts/e2e-teardown.ts\`) to match the current schema, ` +
      "or run a migration to restore the expected columns/enums.",
    );
  }
  lines.push("");
  lines.push(`📦 Snapshot artifact: \`${snapshotPath}\` (uploaded as \`preflight-report\`).`);
  if (diffLines.length > 0) {
    lines.push("");
    lines.push(...diffLines);
  }
  appendFileSync(STEP_SUMMARY, lines.join("\n") + "\n");
}

async function main(): Promise<void> {
  console.log(`[preflight] Checking schema at ${sanitizeUrl(SUPABASE_URL)}`);

  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    try {
      await checkTable(table, cols);
    } catch (err) {
      findings.push({
        severity: "error", kind: "unknown", table,
        detail: "probe threw", rawError: safeMessage(err),
      });
    }
  }
  for (const e of REQUIRED_ENUM_VALUES) {
    for (const v of e.values) {
      try {
        await checkEnumValue(e.table, e.column, v);
      } catch (err) {
        findings.push({
          severity: "warning", kind: "unknown", table: e.table,
          detail: `enum ${e.column}="${v}"`, rawError: safeMessage(err),
        });
      }
    }
  }

  for (const f of findings) annotate(f);
  const snapshotPath = writeSnapshot();

  // Optional: diff against a previous snapshot artifact if the user provided one.
  let diffLines: string[] = [];
  const baseline = loadBaseline(BASELINE_PATH);
  if (baseline) {
    const diff = diffSnapshots(baseline, buildCurrentSnapshot());
    logDiffToConsole(diff, BASELINE_PATH);
    diffLines = renderDiffMarkdown(diff, BASELINE_PATH);
  }

  writeStepSummary(snapshotPath, diffLines);

  const errors = findings.filter((f) => f.severity === "error");
  if (errors.length > 0) {
    console.error(`\n[preflight] ❌ ${errors.length} schema mismatch(es):`);
    for (const f of findings) {
      const sev = f.severity === "error" ? "ERROR" : "warn";
      console.error(`  [${sev}] ${f.kind} — ${f.table}: ${f.detail}`);
    }
    console.error(
      `\nUpdate ${SCRIPT_PATH} (and scripts/e2e-teardown.ts) to match the current schema, ` +
      "or run a migration to restore the expected columns/enums.",
    );
    console.error(`\nSnapshot for local diff: ${snapshotPath}`);
    process.exit(1);
  }

  console.log("\n[preflight] ✅ Schema matches the seed script's expectations.");
}

main().catch((err) => {
  console.error("[preflight] Unexpected error:", err);
  process.exit(1);
});
