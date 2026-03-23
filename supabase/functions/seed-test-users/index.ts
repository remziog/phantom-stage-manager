import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEST_USERS = [
  { email: "admin@phantom.test", full_name: "Test Yönetici", role: "admin", password: "Test1234!" },
  { email: "sales@phantom.test", full_name: "Test Satış", role: "sales", password: "Test1234!" },
  { email: "team@phantom.test", full_name: "Test Ekip Üyesi", role: "team_member", password: "Test1234!" },
  { email: "crew@phantom.test", full_name: "Test Personel", role: "crew", password: "Test1234!" },
  { email: "customer@phantom.test", full_name: "Test Müşteri", role: "customer", password: "Test1234!" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseAuth.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const testUser of TEST_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === testUser.email);

      if (existing) {
        results.push({ email: testUser.email, status: "already_exists", role: testUser.role });
        continue;
      }

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: { full_name: testUser.full_name, role: testUser.role },
      });

      if (createError) {
        results.push({ email: testUser.email, status: "error", error: createError.message });
      } else {
        results.push({ email: testUser.email, status: "created", role: testUser.role, user_id: newUser.user.id });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results, password: "Test1234!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
