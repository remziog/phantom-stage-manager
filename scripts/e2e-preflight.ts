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
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STEP_SUMMARY = process.env.GITHUB_STEP_SUMMARY;
const ON_CI = !!process.env.GITHUB_ACTIONS;
const SCRIPT_PATH = "scripts/e2e-seed.ts";
const SNAPSHOT_PATH = process.env.PREFLIGHT_SNAPSHOT_PATH ?? "preflight-report/schema-snapshot.json";

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

/** Mask a string of unknown shape for safe console output. */
function safeMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function checkTable(table: string, columns: string[]): Promise<void> {
  // Step 1: probe the table itself with `select(id) limit 0`.
  const probe = await admin.from(table).select("id").limit(0);
  if (probe.error) {
    const msg = probe.error.message;
    // Postgrest reports missing relations with this code/message shape.
    if (
      probe.error.code === "PGRST205" ||
      /relation .* does not exist/i.test(msg) ||
      /could not find the table/i.test(msg)
    ) {
      findings.push({
        severity: "error", kind: "missing_table", table, detail: table, rawError: msg,
      });
      return;
    }
    // Some other failure — still record it so the user sees something.
    findings.push({
      severity: "error", kind: "unknown", table, detail: "probe failed", rawError: msg,
    });
    return;
  }

  // Step 2: probe each column individually so we can list every miss.
  for (const col of columns) {
    if (col === "id") continue; // already covered by the table probe
    const { error } = await admin.from(table).select(col).limit(0);
    if (!error) continue;
    if (
      error.code === "42703" ||
      /column .* does not exist/i.test(error.message) ||
      /could not find the .* column/i.test(error.message)
    ) {
      findings.push({
        severity: "error", kind: "missing_column", table, detail: col, rawError: error.message,
      });
    } else {
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
    console.log(`[preflight] ✓ enum ${table}.${column} accepts "${value}"`);
    return;
  }
  if (error.code === "22P02" || /invalid input value for enum/i.test(error.message)) {
    findings.push({
      severity: "error", kind: "missing_enum_value", table,
      detail: `${column} = "${value}"`, rawError: error.message,
    });
    return;
  }
  findings.push({
    severity: "warning", kind: "unknown", table,
    detail: `enum probe ${column}="${value}"`, rawError: error.message,
  });
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

function writeStepSummary(): void {
  if (!STEP_SUMMARY) return;
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const lines: string[] = [];
  lines.push("## E2E preflight — schema check");
  lines.push("");
  lines.push(`Project: \`${SUPABASE_URL}\``);
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
  appendFileSync(STEP_SUMMARY, lines.join("\n") + "\n");
}

async function main(): Promise<void> {
  console.log(`[preflight] Checking schema at ${SUPABASE_URL}`);

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
  writeStepSummary();

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
    process.exit(1);
  }

  console.log("\n[preflight] ✅ Schema matches the seed script's expectations.");
}

main().catch((err) => {
  console.error("[preflight] Unexpected error:", err);
  process.exit(1);
});
