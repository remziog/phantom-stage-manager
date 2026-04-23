import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const seeds = [
  { email: "owner@apexcloud.test",    password: "ApexCloud123!", full_name: "Olivia Owner",     company: "Acme Rentals",        industry: "rental" },
  { email: "warehouse@apexcloud.test",password: "ApexCloud123!", full_name: "Walter Warehouse", company: "Northwind Storage",   industry: "warehouse" },
  { email: "logistics@apexcloud.test",password: "ApexCloud123!", full_name: "Lola Logistics",   company: "FastLane Delivery",   industry: "logistics" },
  { email: "demo@apexcloud.test",     password: "ApexCloud123!", full_name: "Demo User",        company: "Demo Co",             industry: "mixed" },
];

const slugify = (n) => n.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);

async function ensureUser(s) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: s.email, password: s.password, email_confirm: true,
    user_metadata: { full_name: s.full_name },
  });
  let userId = created?.user?.id;
  if (!userId) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = list?.users.find((u) => u.email === s.email)?.id;
    console.log(`Exists: ${s.email} -> ${userId}`);
  } else {
    console.log(`Created: ${s.email} -> ${userId}`);
  }
  if (!userId) throw new Error(`No user id for ${s.email}`);

  await admin.from("profiles").upsert({ user_id: userId, full_name: s.full_name }, { onConflict: "user_id" });

  const { data: existing } = await admin.from("companies").select("id").eq("created_by", userId).eq("name", s.company).maybeSingle();
  let companyId = existing?.id;
  if (!companyId) {
    const { data: comp, error: cErr } = await admin.from("companies").insert({
      name: s.company, slug: slugify(s.company), created_by: userId,
      industry_type: s.industry, onboarding_completed: true, currency: "USD",
      settings: { locations: 1, team_size: 3, focus: ["assets", "reservations", "customers", "invoices"] },
    }).select("id").single();
    if (cErr) throw cErr;
    companyId = comp.id;
    await admin.from("company_members").insert({ company_id: companyId, user_id: userId, role: "owner" });
  }
  await admin.from("profiles").update({ current_company_id: companyId }).eq("user_id", userId);

  if (s.industry === "rental") {
    const { data: assetsExisting } = await admin.from("assets").select("id").eq("company_id", companyId).limit(1);
    if (!assetsExisting?.length) {
      await admin.from("assets").insert([
        { company_id: companyId, created_by: userId, name: "DJI Ronin 4D Camera", sku: "CAM-001", category: "Camera",   quantity: 3,  unit_price: 250, status: "available" },
        { company_id: companyId, created_by: userId, name: "Aputure 600D Light",  sku: "LGT-001", category: "Lighting", quantity: 6,  unit_price: 80,  status: "available" },
        { company_id: companyId, created_by: userId, name: "Sennheiser EW-DX Mic",sku: "AUD-001", category: "Audio",    quantity: 4,  unit_price: 60,  status: "available" },
        { company_id: companyId, created_by: userId, name: "Manfrotto Tripod",    sku: "SUP-001", category: "Support",  quantity: 10, unit_price: 25,  status: "rented" },
      ]);
    }
    const { data: custExisting } = await admin.from("customers").select("id").eq("company_id", companyId).limit(1);
    if (!custExisting?.length) {
      await admin.from("customers").insert([
        { company_id: companyId, created_by: userId, name: "Sunrise Productions", email: "hello@sunriseprod.test", phone: "+1 555 0101" },
        { company_id: companyId, created_by: userId, name: "Echo Studios",        email: "ops@echostudios.test",   phone: "+1 555 0102" },
        { company_id: companyId, created_by: userId, name: "Northwind Events",    email: "book@northwind.test",    phone: "+1 555 0103" },
      ]);
    }
  }
  return { userId, companyId };
}

const out = [];
for (const s of seeds) {
  try { out.push({ email: s.email, password: s.password, ...(await ensureUser(s)) }); }
  catch (e) { console.error(`FAIL ${s.email}:`, e.message); }
}
console.log("\n=== TEST USERS ===");
console.table(out);
