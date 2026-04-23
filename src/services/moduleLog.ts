/**
 * Audit log for module enable/disable changes.
 * Records every transition (enabling or disabling a module) so admins can review
 * how the workspace's enabled module list evolved over time.
 */
import { supabase } from "@/integrations/supabase/client";

export type ModuleLogEntry = {
  id: string;
  company_id: string;
  user_id: string | null;
  user_email: string | null;
  module: string;
  action: "enabled" | "disabled";
  source: "onboarding" | "settings";
  created_at: string;
};

/**
 * Diff two module lists and write one row per change to `module_change_log`.
 * Safe to call with identical lists (it will simply insert nothing).
 */
export async function logModuleChanges(input: {
  companyId: string;
  userId: string | null;
  userEmail: string | null;
  before: string[];
  after: string[];
  source: "onboarding" | "settings";
}): Promise<void> {
  const beforeSet = new Set(input.before);
  const afterSet = new Set(input.after);

  const enabled = [...afterSet].filter((m) => !beforeSet.has(m));
  const disabled = [...beforeSet].filter((m) => !afterSet.has(m));

  const rows = [
    ...enabled.map((module) => ({ module, action: "enabled" as const })),
    ...disabled.map((module) => ({ module, action: "disabled" as const })),
  ].map((r) => ({
    company_id: input.companyId,
    user_id: input.userId,
    user_email: input.userEmail,
    module: r.module,
    action: r.action,
    source: input.source,
  }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("module_change_log").insert(rows);
  if (error) throw error;
}

export async function listModuleChanges(companyId: string, limit = 100): Promise<ModuleLogEntry[]> {
  const { data, error } = await supabase
    .from("module_change_log")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ModuleLogEntry[];
}
