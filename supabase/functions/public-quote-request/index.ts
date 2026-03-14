import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      contact_company,
      contact_name,
      contact_email,
      contact_phone,
      event_name,
      event_type,
      start_date,
      end_date,
      venue,
      estimated_audience_size,
      services_needed,
      budget_range,
      details,
    } = body;

    if (!event_name || !contact_name || !contact_email) {
      return new Response(
        JSON.stringify({ error: "Event name, contact name, and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to find or create a customer by email
    let customerId: string | null = null;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", contact_email)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else if (contact_company) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          company_name: contact_company,
          contact_name: contact_name,
          email: contact_email,
          phone: contact_phone || null,
        })
        .select("id")
        .single();
      if (newCustomer) customerId = newCustomer.id;
    }

    // Insert quote request (no user_id for public submissions)
    const { data: request, error: insertError } = await supabase
      .from("quote_requests")
      .insert({
        customer_id: customerId,
        user_id: null,
        contact_company: contact_company || null,
        contact_name,
        contact_email,
        contact_phone: contact_phone || null,
        event_name,
        event_type: event_type || "Other",
        start_date: start_date || null,
        end_date: end_date || null,
        venue: venue || null,
        estimated_audience_size: estimated_audience_size || null,
        services_needed: services_needed || [],
        budget_range: budget_range || null,
        details: details || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Notify admins
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins) {
      const notifications = admins.map((a: { user_id: string }) => ({
        user_id: a.user_id,
        title: "New Public Quote Request",
        message: `${contact_name} (${contact_company || contact_email}) submitted a request for "${event_name}"`,
        type: "quote_request",
        reference_id: request.id,
        reference_type: "quote_request",
      }));
      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({ success: true, id: request.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
