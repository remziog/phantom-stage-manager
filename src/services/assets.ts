import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Asset = Database["public"]["Tables"]["assets"]["Row"];
export type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];
export type AssetUpdate = Database["public"]["Tables"]["assets"]["Update"];
export type AssetStatus = Database["public"]["Enums"]["asset_status"];

export async function listAssets(companyId: string): Promise<Asset[]> {
  const { data, error } = await supabase.from("assets").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAsset(input: AssetInsert): Promise<Asset> {
  const { data, error } = await supabase.from("assets").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateAsset(id: string, updates: AssetUpdate): Promise<Asset> {
  const { data, error } = await supabase.from("assets").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function archiveAsset(id: string): Promise<void> {
  const { error } = await supabase.from("assets").update({ status: "archived" as AssetStatus }).eq("id", id);
  if (error) throw error;
}
