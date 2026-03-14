import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget activity logger.
 * Silently inserts into activity_logs; errors are swallowed
 * so they never block the main user flow.
 */
export async function logActivity(
  action: string,
  entity_type: string,
  entity_id?: string,
  entity_label?: string,
  details?: string
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      entity_type,
      entity_id: entity_id || null,
      entity_label: entity_label || null,
      details: details || null,
    });
  } catch {
    // silently ignore — activity logging should never break the app
  }
}
