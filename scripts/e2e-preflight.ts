/**
 * Preflight schema check for the E2E seed script.
 *
 * Verifies that every table, column, and enum value the seed/teardown scripts
 * rely on actually exists in the connected Supabase project. Fails fast (exit 1)
 * with a clear diff so CI doesn't waste time spinning up Playwright against
 * a backend that no longer matches the script.
 *
 * Strategy: do a `select` of the exact columns we care about with `limit(0)` —
 * Supabase returns a precise error if any column is missing. For enums we read
 * pg_enum via the REST `select` on the underlying tables (status filter probe).
 *
 * Required env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[preflight] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Tables + the columns the seed script reads or writes. */
const REQUIRED_COLUMNS: Record<string, string[]> = {
  companies: [
    "id", "slug", "name", "created_by", "industry_type",
    "onboarding_completed", "currency", "settings",
  ],
  company_members: ["id", "company_id", "user_id", "role"],
  profiles: ["id", "user_id", "full_name", "current_company_id"],
  customers: ["id", "company_id", "created_by", "name", "email"],
  assets: ["id", "company_id", "created_by", "name", "category", "quantity", "unit_price"],
  // Tables the teardown script clears so the fixture company can be removed.
  transaction_items: ["id", "company_id"],
  transactions: ["id", "company_id"],
  invoices: ["id", "company_id"],
  module_change_log: ["id", "company_id"],
};

/** Enum values we send in inserts. Probed by filtering on the column. */
const REQUIRED_ENUM_VALUES: { table: string; column: string; values: string[] }[] = [
  { table: "companies",        column: "industry_type", values: ["rental"] },
  { table: "company_members",  column: "role",          values: ["owner", "operator"] },
];

const failures: string[] = [];

async function checkTableColumns(table: string, columns: string[]) {
  const { error } = await admin.from(table).select(columns.join(", ")).limit(0);
  if (error) {
    failures.push(`Table "${table}": ${error.message}`);
    return;
  }
  console.log(`[preflight] ✓ ${table} (${columns.length} columns)`);
}

async function checkEnumValue(table: string, column: string, value: string) {
  // PostgREST returns 22P02 ("invalid input value for enum …") if the value
  // isn't part of the enum. Any other outcome (rows or empty) means it's valid.
  const { error } = await admin.from(table).select("id").eq(column, value).limit(0);
  if (error && /invalid input value for enum/i.test(error.message)) {
    failures.push(`Enum value missing — ${table}.${column} does not accept "${value}"`);
    return;
  }
  if (error) {
    failures.push(`Enum probe failed — ${table}.${column}="${value}": ${error.message}`);
    return;
  }
  console.log(`[preflight] ✓ enum ${table}.${column} accepts "${value}"`);
}

async function main() {
  console.log(`[preflight] Checking schema at ${SUPABASE_URL}`);

  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    await checkTableColumns(table, cols);
  }

  for (const e of REQUIRED_ENUM_VALUES) {
    for (const v of e.values) {
      await checkEnumValue(e.table, e.column, v);
    }
  }

  if (failures.length > 0) {
    console.error("\n[preflight] ❌ Schema mismatches detected:");
    for (const f of failures) console.error("  - " + f);
    console.error(
      "\nUpdate scripts/e2e-seed.ts (and scripts/e2e-teardown.ts) to match the current schema, " +
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
