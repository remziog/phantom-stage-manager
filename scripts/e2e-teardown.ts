/**
 * E2E teardown script — removes the fixture company and its child data,
 * and deletes the seeded auth users. Safe to run repeatedly; missing rows
 * are ignored so it can run unconditionally in CI's `if: always()` step.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY_SLUG = process.env.E2E_COMPANY_SLUG ?? "e2e-test-co";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.warn("[teardown] SUPABASE_URL / SERVICE_ROLE missing — skipping.");
  process.exit(0);
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("slug", COMPANY_SLUG)
    .maybeSingle();

  if (company?.id) {
    const cid = company.id as string;
    console.log(`[teardown] Removing fixture company ${cid}`);
    await admin.from("transaction_items").delete().eq("company_id", cid);
    await admin.from("invoices").delete().eq("company_id", cid);
    await admin.from("transactions").delete().eq("company_id", cid);
    await admin.from("assets").delete().eq("company_id", cid);
    await admin.from("customers").delete().eq("company_id", cid);
    await admin.from("module_change_log").delete().eq("company_id", cid);
    await admin.from("company_members").delete().eq("company_id", cid);
    await admin.from("profiles").update({ current_company_id: null }).eq("current_company_id", cid);
    await admin.from("companies").delete().eq("id", cid);
  }

  for (const email of [ADMIN_EMAIL, OPERATOR_EMAIL].filter(Boolean) as string[]) {
    const uid = await findUserId(email);
    if (uid) {
      const { error } = await admin.auth.admin.deleteUser(uid);
      if (error) console.warn(`[teardown] Could not delete ${email}:`, error.message);
      else console.log(`[teardown] Deleted user ${email} (${uid})`);
    }
  }

  console.log("[teardown] ✅ Done.");
}

main().catch((err) => {
  console.error("[teardown] Warning — continuing:", err);
  process.exit(0); // Never fail the CI job on teardown.
});
