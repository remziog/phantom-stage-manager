import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];
export type TransactionUpdate = Database["public"]["Tables"]["transactions"]["Update"];
export type TransactionStatus = Database["public"]["Enums"]["transaction_status"];

export type ReservationWithCustomer = Transaction & { customer?: { name: string } | null };

export async function listReservations(companyId: string): Promise<ReservationWithCustomer[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, customer:customers(name)")
    .eq("company_id", companyId)
    .eq("type", "rental")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReservationWithCustomer[];
}

export async function createReservation(input: TransactionInsert): Promise<Transaction> {
  const { data, error } = await supabase.from("transactions").insert({ ...input, type: "rental" }).select().single();
  if (error) throw error;
  return data;
}

export async function updateReservationStatus(id: string, status: TransactionStatus): Promise<Transaction> {
  const { data, error } = await supabase.from("transactions").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function getReservation(id: string): Promise<Transaction | null> {
  const { data, error } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
