/**
 * Apex Cloud — Service layer.
 * Keep all data access here so we can swap backends later without touching components.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];
export type IndustryType = Database["public"]["Enums"]["industry_type"];
export type MemberRole = Database["public"]["Enums"]["member_role"];

function slugify(name: string) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function createCompany(input: { name: string; userId: string }): Promise<Company> {
  const slug = slugify(input.name);
  const { data, error } = await supabase
    .from("companies")
    .insert({ name: input.name, slug, created_by: input.userId })
    .select()
    .single();
  if (error) throw error;

  // Add the creator as owner
  const { error: memberError } = await supabase
    .from("company_members")
    .insert({ company_id: data.id, user_id: input.userId, role: "owner" as MemberRole });
  if (memberError) throw memberError;

  // Set as current
  await supabase.from("profiles").update({ current_company_id: data.id }).eq("user_id", input.userId);
  return data;
}

export async function updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
  const { data, error } = await supabase.from("companies").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function completeOnboarding(
  companyId: string,
  industry: IndustryType,
  settings: Record<string, unknown>,
): Promise<Company> {
  return updateCompany(companyId, {
    industry_type: industry,
    onboarding_completed: true,
    settings: settings as never,
  });
}
