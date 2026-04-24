/**
 * Customer-portal data: the linked customer record and update requests.
 * RLS restricts every query/mutation to the caller's own customer row.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type UpdateRequest =
  Database["public"]["Tables"]["customer_update_requests"]["Row"];
export type UpdateRequestInsert =
  Database["public"]["Tables"]["customer_update_requests"]["Insert"];

/** Fetch the customer record linked to the current user, or null if none. */
export async function fetchLinkedCustomer(
  customerId: string,
): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** List all update requests for this customer, newest first. */
export async function listMyUpdateRequests(
  customerId: string,
): Promise<UpdateRequest[]> {
  const { data, error } = await supabase
    .from("customer_update_requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Submit a new update request. Only fields the customer wants changed
 *  should be passed (others left undefined → stored as null = no change). */
export async function createUpdateRequest(
  input: UpdateRequestInsert,
): Promise<UpdateRequest> {
  const { data, error } = await supabase
    .from("customer_update_requests")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}
