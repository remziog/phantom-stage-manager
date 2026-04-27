/**
 * RLS multi-tenancy isolation E2E
 * --------------------------------
 * Provisions TWO tenants (company A + user A, company B + user B) with the
 * service-role key, then signs in as each user via the public anon client and
 * asserts that:
 *   1. user B sees ZERO rows from company A across every tenant table
 *   2. user B cannot UPDATE company A's rows (no error, but zero rows changed)
 *   3. user B cannot DELETE company A's rows (no error, but zero rows changed)
 *
 * This is the load-bearing security regression test for the platform's
 * multi-tenant promise. If it ever fails, do not ship.
 *
 * Required env (all server-side, never bundled into the client):
 *   SUPABASE_URL                       (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VITE_SUPABASE_PUBLISHABLE_KEY      (the anon key used by the app)
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD          → tenant A user
 *   E2E_TENANT_B_EMAIL / E2E_TENANT_B_PASSWORD    → tenant B user
 * Optional:
 *   E2E_COMPANY_SLUG               (default "e2e-test-co", reused from seed)
 *   E2E_TENANT_B_COMPANY_SLUG      (default "e2e-tenant-b")
 */
import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const A_EMAIL = process.env.E2E_ADMIN_EMAIL;
const A_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const A_SLUG = process.env.E2E_COMPANY_SLUG ?? "e2e-test-co";

const B_EMAIL = process.env.E2E_TENANT_B_EMAIL;
const B_PASSWORD = process.env.E2E_TENANT_B_PASSWORD;
const B_SLUG = process.env.E2E_TENANT_B_COMPANY_SLUG ?? "e2e-tenant-b";
const B_NAME = process.env.E2E_TENANT_B_COMPANY_NAME ?? "E2E Tenant B";

const haveCreds =
  !!SUPABASE_URL &&
  !!SERVICE_ROLE &&
  !!ANON_KEY &&
  !!A_EMAIL &&
  !!A_PASSWORD &&
  !!B_EMAIL &&
  !!B_PASSWORD;

type ProvisionResult = {
  companyAId: string;
  companyBId: string;
  userAId: string;
  userBId: string;
  tenantACustomerId: string;
  tenantAAssetId: string;
  tenantATransactionId: string;
};

async function findUser(admin: SupabaseClient, email: string) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(admin: SupabaseClient, email: string, password: string, fullName: string) {
  const existing = await findUser(admin, email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user.id;
}

async function ensureProfile(admin: SupabaseClient, userId: string, fullName: string, companyId: string) {
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

async function deletePriorCompany(admin: SupabaseClient, slug: string) {
  const { data: existing } = await admin.from("companies").select("id").eq("slug", slug).maybeSingle();
  if (!existing) return;
  const cid = existing.id as string;
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

async function provision(): Promise<ProvisionResult> {
  const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Tenant A is normally created by the existing seed script. We rebuild B
  // from scratch here and trust A's slug already points at a seeded company.
  // To keep this test independent we recreate both.
  await deletePriorCompany(admin, B_SLUG);

  const userAId = await ensureUser(admin, A_EMAIL!, A_PASSWORD!, "RLS Tenant A");
  const userBId = await ensureUser(admin, B_EMAIL!, B_PASSWORD!, "RLS Tenant B");

  // Reuse company A if the seed already produced it; otherwise create a minimal one.
  let companyAId: string;
  const existingA = await admin.from("companies").select("id").eq("slug", A_SLUG).maybeSingle();
  if (existingA.data?.id) {
    companyAId = existingA.data.id as string;
  } else {
    const { data, error } = await admin
      .from("companies")
      .insert({
        slug: A_SLUG,
        name: "RLS Tenant A",
        created_by: userAId,
        industry_type: "rental",
        onboarding_completed: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    companyAId = data.id;
  }

  // Always (re)create company B fresh.
  const { data: bRow, error: bErr } = await admin
    .from("companies")
    .insert({
      slug: B_SLUG,
      name: B_NAME,
      created_by: userBId,
      industry_type: "rental",
      onboarding_completed: true,
    })
    .select("id")
    .single();
  if (bErr) throw bErr;
  const companyBId = bRow.id as string;

  // Memberships — A only in companyA, B only in companyB.
  await admin.from("company_members").delete().eq("user_id", userAId).eq("company_id", companyBId);
  await admin.from("company_members").delete().eq("user_id", userBId).eq("company_id", companyAId);

  const upsertMember = async (uid: string, cid: string, role: "owner" | "operator") => {
    const existing = await admin
      .from("company_members")
      .select("id")
      .eq("user_id", uid)
      .eq("company_id", cid)
      .maybeSingle();
    if (existing.data) return;
    const { error } = await admin.from("company_members").insert({ user_id: uid, company_id: cid, role });
    if (error) throw error;
  };
  await upsertMember(userAId, companyAId, "owner");
  await upsertMember(userBId, companyBId, "owner");

  await ensureProfile(admin, userAId, "RLS Tenant A", companyAId);
  await ensureProfile(admin, userBId, "RLS Tenant B", companyBId);

  // Tenant A data fingerprint we'll try to read/mutate from B's session.
  const stamp = Date.now();
  const { data: cust, error: custErr } = await admin
    .from("customers")
    .insert({
      company_id: companyAId,
      created_by: userAId,
      name: `[RLS-A-${stamp}] Customer`,
      email: `rls-a-${stamp}@example.com`,
    })
    .select("id")
    .single();
  if (custErr) throw custErr;

  const { data: asset, error: assetErr } = await admin
    .from("assets")
    .insert({
      company_id: companyAId,
      created_by: userAId,
      name: `[RLS-A-${stamp}] Asset`,
      quantity: 1,
      unit_price: 100,
    })
    .select("id")
    .single();
  if (assetErr) throw assetErr;

  const { data: tx, error: txErr } = await admin
    .from("transactions")
    .insert({
      company_id: companyAId,
      created_by: userAId,
      customer_id: cust.id,
      type: "rental",
      status: "draft",
      total_amount: 100,
    })
    .select("id")
    .single();
  if (txErr) throw txErr;

  return {
    companyAId,
    companyBId,
    userAId,
    userBId,
    tenantACustomerId: cust.id,
    tenantAAssetId: asset.id,
    tenantATransactionId: tx.id,
  };
}

async function signedInAnonClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn(${email}) failed: ${error.message}`);
  return client;
}

test.describe("RLS multi-tenancy isolation", () => {
  test.skip(!haveCreds, "Missing SUPABASE_* / E2E_* env vars — see e2e/rls-multitenancy.e2e.ts");

  test("user B cannot read, update, or delete user A's data", async () => {
    const fixture = await provision();

    // Sanity: signed-in as A, A's customer is visible.
    const aClient = await signedInAnonClient(A_EMAIL!, A_PASSWORD!);
    const aSees = await aClient.from("customers").select("id").eq("id", fixture.tenantACustomerId);
    expect(aSees.error, "tenant A reading own customer").toBeNull();
    expect(aSees.data?.length, "tenant A sees own customer").toBe(1);

    // Sign in as tenant B.
    const bClient = await signedInAnonClient(B_EMAIL!, B_PASSWORD!);

    // ── 1. SELECT isolation across every tenant-scoped table ──────────────
    const reads = await Promise.all([
      bClient.from("customers").select("id").eq("company_id", fixture.companyAId),
      bClient.from("assets").select("id").eq("company_id", fixture.companyAId),
      bClient.from("transactions").select("id").eq("company_id", fixture.companyAId),
      bClient.from("invoices").select("id").eq("company_id", fixture.companyAId),
      bClient.from("transaction_items").select("id").eq("company_id", fixture.companyAId),
      bClient.from("agents").select("id").eq("company_id", fixture.companyAId),
      bClient.from("company_members").select("id").eq("company_id", fixture.companyAId),
    ]);
    for (const r of reads) {
      // RLS does not error — it returns an empty set.
      expect(r.error, `select from B should not error: ${r.error?.message}`).toBeNull();
      expect(r.data ?? [], "tenant B reading tenant A rows").toEqual([]);
    }

    // Direct id lookup also returns nothing.
    const directHit = await bClient.from("customers").select("id").eq("id", fixture.tenantACustomerId);
    expect(directHit.data ?? []).toEqual([]);

    // ── 2. UPDATE isolation ──────────────────────────────────────────────
    const upd = await bClient
      .from("customers")
      .update({ name: "HACKED BY TENANT B" })
      .eq("id", fixture.tenantACustomerId)
      .select("id");
    expect(upd.error, "RLS-blocked update returns no error, just zero rows").toBeNull();
    expect(upd.data ?? [], "no rows mutated cross-tenant").toEqual([]);

    // Confirm A's customer is unchanged.
    const verify = await aClient
      .from("customers")
      .select("name")
      .eq("id", fixture.tenantACustomerId)
      .single();
    expect(verify.data?.name).not.toBe("HACKED BY TENANT B");

    // ── 3. DELETE isolation ──────────────────────────────────────────────
    const del = await bClient
      .from("customers")
      .delete()
      .eq("id", fixture.tenantACustomerId)
      .select("id");
    expect(del.error, "RLS-blocked delete returns no error, just zero rows").toBeNull();
    expect(del.data ?? [], "no rows deleted cross-tenant").toEqual([]);

    // Verify the row still exists from A's perspective.
    const stillThere = await aClient
      .from("customers")
      .select("id")
      .eq("id", fixture.tenantACustomerId);
    expect(stillThere.data?.length, "A's customer survived").toBe(1);

    // ── 4. INSERT cross-tenant must fail ─────────────────────────────────
    const xInsert = await bClient.from("customers").insert({
      company_id: fixture.companyAId,
      created_by: fixture.userBId,
      name: "Trojan customer",
    });
    expect(xInsert.error, "B inserting into A's company must error").not.toBeNull();
  });
});
