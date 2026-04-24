/**
 * E2E seed script
 * ---------------
 * Creates a clean test fixture in Supabase before Playwright runs:
 *   - Two confirmed auth users (admin + operator)
 *   - One company with onboarding completed and the rental modules enabled
 *   - Memberships linking each user to the company with the right role
 *   - A handful of sample customers and assets so list pages aren't empty
 *
 * Designed to be re-runnable: it deletes any prior fixture (matching the
 * E2E_COMPANY_SLUG) before recreating it, so each CI run starts clean.
 *
 * Required env:
 *   SUPABASE_URL                 (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD
 * Optional:
 *   E2E_COMPANY_SLUG   (default: "e2e-test-co")
 *   E2E_COMPANY_NAME   (default: "E2E Test Co")
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Role = "owner" | "admin" | "manager" | "operator" | "viewer";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY_SLUG = process.env.E2E_COMPANY_SLUG ?? "e2e-test-co";
const COMPANY_NAME = process.env.E2E_COMPANY_NAME ?? "E2E Test Co";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const OPERATOR_EMAIL = process.env.E2E_OPERATOR_EMAIL;
const OPERATOR_PASSWORD = process.env.E2E_OPERATOR_PASSWORD;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`[seed] Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  // Pages until found; small fixture so 200 per page is plenty.
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(
  admin: SupabaseClient,
  email: string,
  password: string,
  fullName: string,
): Promise<string> {
  const existing = await findUserByEmail(admin, email);
  if (existing) {
    // Reset password so the credentials in CI secrets always work.
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    console.log(`[seed] Reused user ${email} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  console.log(`[seed] Created user ${email} (${data.user.id})`);
  return data.user.id;
}

async function ensureProfile(admin: SupabaseClient, userId: string, fullName: string, companyId: string | null) {
  // The `handle_new_user` trigger inserts a profile row on signup, but
  // `profiles.user_id` has no UNIQUE constraint — so we can't rely on upsert
  // with onConflict. Update first, insert only if no row exists.
  const { data: updated, error: updateErr } = await admin
    .from("profiles")
    .update({ full_name: fullName, current_company_id: companyId })
    .eq("user_id", userId)
    .select("id");
  if (updateErr) throw updateErr;
  if (updated && updated.length > 0) return;

  const { error: insertErr } = await admin.from("profiles").insert({
    user_id: userId,
    full_name: fullName,
    current_company_id: companyId,
  });
  if (insertErr) throw insertErr;
}

async function deleteExistingCompany(admin: SupabaseClient, slug: string) {
  const { data: existing, error } = await admin
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!existing) return;
  const cid = existing.id as string;
  console.log(`[seed] Removing prior fixture company ${cid}`);
  // Children that don't cascade by FK — delete in dependency order.
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

async function createCompany(admin: SupabaseClient, ownerId: string): Promise<string> {
  const { data, error } = await admin
    .from("companies")
    .insert({
      slug: COMPANY_SLUG,
      name: COMPANY_NAME,
      created_by: ownerId,
      industry_type: "rental",
      onboarding_completed: true,
      currency: "USD",
      settings: {
        enabled_modules: ["Assets", "Reservations", "Customers", "Invoices", "Reports"],
      },
    })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`[seed] Created company ${data.id} (${COMPANY_SLUG})`);
  return data.id;
}

async function addMember(admin: SupabaseClient, companyId: string, userId: string, role: Role) {
  const { error } = await admin.from("company_members").insert({
    company_id: companyId,
    user_id: userId,
    role,
  });
  if (error) throw error;
}

async function seedSampleData(admin: SupabaseClient, companyId: string, ownerId: string) {
  const customers = ["Aurora Events", "Northwind Productions", "Helios Studios"].map((name, i) => ({
    company_id: companyId,
    created_by: ownerId,
    name: `[E2E] ${name}`,
    email: `e2e-customer-${i}@example.com`,
  }));
  const { error: cErr } = await admin.from("customers").insert(customers);
  if (cErr) throw cErr;

  const assets = [
    { name: "[E2E] LED Panel Pack", category: "Lighting", quantity: 12, unit_price: 150 },
    { name: "[E2E] Wireless Mic Kit", category: "Audio", quantity: 8, unit_price: 90 },
    { name: "[E2E] Truss Section 3m", category: "Structure", quantity: 20, unit_price: 60 },
  ].map((a) => ({ ...a, company_id: companyId, created_by: ownerId }));
  const { error: aErr } = await admin.from("assets").insert(assets);
  if (aErr) throw aErr;

  console.log(`[seed] Inserted ${customers.length} customers + ${assets.length} assets`);
}

async function main() {
  const url = requireEnv("SUPABASE_URL", SUPABASE_URL);
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE);
  const adminEmail = requireEnv("E2E_ADMIN_EMAIL", ADMIN_EMAIL);
  const adminPassword = requireEnv("E2E_ADMIN_PASSWORD", ADMIN_PASSWORD);
  const operatorEmail = requireEnv("E2E_OPERATOR_EMAIL", OPERATOR_EMAIL);
  const operatorPassword = requireEnv("E2E_OPERATOR_PASSWORD", OPERATOR_PASSWORD);

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log("[seed] Ensuring auth users…");
  const adminUserId = await ensureUser(admin, adminEmail, adminPassword, "E2E Admin");
  const operatorUserId = await ensureUser(admin, operatorEmail, operatorPassword, "E2E Operator");

  console.log("[seed] Cleaning prior fixture company…");
  await deleteExistingCompany(admin, COMPANY_SLUG);

  console.log("[seed] Creating company + memberships…");
  const companyId = await createCompany(admin, adminUserId);
  await addMember(admin, companyId, adminUserId, "owner");
  await addMember(admin, companyId, operatorUserId, "operator");

  console.log("[seed] Linking profiles to company…");
  await ensureProfile(admin, adminUserId, "E2E Admin", companyId);
  await ensureProfile(admin, operatorUserId, "E2E Operator", companyId);

  console.log("[seed] Seeding sample customers + assets…");
  await seedSampleData(admin, companyId, adminUserId);

  console.log(`[seed] ✅ Done. Company ${COMPANY_SLUG} ready (id=${companyId}).`);
}

main().catch((err) => {
  console.error("[seed] ❌ Failed:", err);
  process.exit(1);
});
