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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const notifications: {
      user_id: string;
      title: string;
      message: string;
      type: string;
      reference_id?: string;
      reference_type?: string;
    }[] = [];

    // Get all admin user IDs
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = admins?.map((a) => a.user_id) || [];

    // 1. Equipment low stock alerts (<20% available)
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id, name, quantity_total, quantity_available");

    if (equipment) {
      const lowStock = equipment.filter(
        (e) => e.quantity_total > 0 && e.quantity_available / e.quantity_total < 0.2
      );

      for (const item of lowStock) {
        // Check if we already sent this notification today
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "equipment_low_stock")
          .eq("reference_id", item.id)
          .gte("created_at", today + "T00:00:00Z")
          .limit(1);

        if (!existing || existing.length === 0) {
          for (const adminId of adminIds) {
            notifications.push({
              user_id: adminId,
              title: "Low Equipment Stock",
              message: `${item.name}: only ${item.quantity_available}/${item.quantity_total} available`,
              type: "equipment_low_stock",
              reference_id: item.id,
              reference_type: "equipment",
            });
          }
        }
      }
    }

    // 2. Events starting within 3 days — notify assigned crew
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const today = new Date().toISOString().split("T")[0];
    const futureDate = threeDaysFromNow.toISOString().split("T")[0];

    const { data: upcomingEvents } = await supabase
      .from("events")
      .select("id, name, start_date, venue")
      .gte("start_date", today)
      .lte("start_date", futureDate)
      .not("status", "in", '("Completed","Cancelled")');

    if (upcomingEvents) {
      for (const event of upcomingEvents) {
        // Check if already notified today
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("type", "event_upcoming")
          .eq("reference_id", event.id)
          .gte("created_at", today + "T00:00:00Z")
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Get assigned crew members
        const { data: crew } = await supabase
          .from("event_team")
          .select("team_member_id, team_members!inner(user_id)")
          .eq("event_id", event.id);

        if (crew) {
          for (const c of crew) {
            const userId = (c as any).team_members?.user_id;
            if (userId) {
              notifications.push({
                user_id: userId,
                title: "Upcoming Event",
                message: `"${event.name}" starts on ${event.start_date}${event.venue ? ` at ${event.venue}` : ""}`,
                type: "event_upcoming",
                reference_id: event.id,
                reference_type: "event",
              });
            }
          }
        }

        // Also notify admins
        for (const adminId of adminIds) {
          notifications.push({
            user_id: adminId,
            title: "Event Starting Soon",
            message: `"${event.name}" starts on ${event.start_date}`,
            type: "event_upcoming",
            reference_id: event.id,
            reference_type: "event",
          });
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: notifications.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
