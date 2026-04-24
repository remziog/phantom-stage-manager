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

export interface ImportAssetRow {
  name: string;
  sku: string | null;
  category: string | null;
  location: string | null;
  quantity: number;
  unit_price: number;
  status: AssetStatus;
}

export interface ImportAssetsResult {
  inserted: number;
  updated: number;
  failed: { index: number; message: string }[];
}

/**
 * Bulk-import assets. Rows with a `sku` matching an existing asset in the
 * company are updated; rows without a sku — or with a brand-new sku — are
 * inserted. Errors are collected per-row instead of aborting the whole batch.
 */
export async function importAssets(
  companyId: string,
  userId: string,
  rows: ImportAssetRow[],
): Promise<ImportAssetsResult> {
  const result: ImportAssetsResult = { inserted: 0, updated: 0, failed: [] };
  if (rows.length === 0) return result;

  // Fetch existing SKUs once so we can decide insert vs update.
  const skus = Array.from(
    new Set(rows.map((r) => r.sku).filter((s): s is string => !!s && s.length > 0)),
  );
  const existingBySku = new Map<string, string>();
  if (skus.length > 0) {
    const { data, error } = await supabase
      .from("assets")
      .select("id, sku")
      .eq("company_id", companyId)
      .in("sku", skus);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.sku) existingBySku.set(row.sku, row.id);
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const existingId = r.sku ? existingBySku.get(r.sku) : undefined;
      if (existingId) {
        const { error } = await supabase
          .from("assets")
          .update({
            name: r.name,
            category: r.category,
            location: r.location,
            quantity: r.quantity,
            unit_price: r.unit_price,
            status: r.status,
          })
          .eq("id", existingId);
        if (error) throw error;
        result.updated += 1;
      } else {
        const { error } = await supabase.from("assets").insert({
          company_id: companyId,
          created_by: userId,
          name: r.name,
          sku: r.sku,
          category: r.category,
          location: r.location,
          quantity: r.quantity,
          unit_price: r.unit_price,
          status: r.status,
        });
        if (error) throw error;
        result.inserted += 1;
      }
    } catch (e) {
      result.failed.push({ index: i, message: (e as Error).message });
    }
  }

  return result;
}
