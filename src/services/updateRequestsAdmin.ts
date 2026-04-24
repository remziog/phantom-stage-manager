/**
 * Admin-side service for customer update requests. Reading & updating
 * is restricted by RLS to owners/admins of the company.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type UpdateRequest =
  Database["public"]["Tables"]["customer_update_requests"]["Row"];
export type UpdateRequestStatus = UpdateRequest["status"];

export interface UpdateRequestWithCustomer extends UpdateRequest {
  customer: { id: string; name: string; email: string | null } | null;
}

/** List requests for a company, optionally filtered by status. Customer
 *  info is fetched in a second query (no FK relationship is defined, so
 *  PostgREST joins aren't available). */
export async function listUpdateRequests(
  companyId: string,
  status?: UpdateRequestStatus,
): Promise<UpdateRequestWithCustomer[]> {
  let q = supabase
    .from("customer_update_requests")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data: requests, error } = await q;
  if (error) throw error;
  if (!requests || requests.length === 0) return [];

  const customerIds = Array.from(new Set(requests.map((r) => r.customer_id)));
  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select("id, name, email")
    .in("id", customerIds);
  if (cErr) throw cErr;

  const byId = new Map((customers ?? []).map((c) => [c.id, c]));
  return requests.map((r) => ({ ...r, customer: byId.get(r.customer_id) ?? null }));
}

/** Fields a customer can request changes to. Mirrors the portal page. */
const EDITABLE_FIELDS = ["name", "email", "phone", "address", "tax_id", "notes"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** Approve a request: write the requested values to the customer record,
 *  then mark the request approved. Done in two steps because Supabase JS
 *  has no transaction wrapper — RLS still ensures only admins can do this. */
export async function approveRequest(
  request: UpdateRequest,
  reviewerId: string,
  reviewNotes?: string,
): Promise<void> {
  // Build the update payload from non-null requested fields only.
  const payload: Record<string, string | null> = {};
  for (const f of EDITABLE_FIELDS) {
    const v = request[f];
    if (v !== null && v !== undefined) payload[f] = v;
  }

  if (Object.keys(payload).length > 0) {
    const { error: upErr } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", request.customer_id);
    if (upErr) throw upErr;
  }

  const { error: reqErr } = await supabase
    .from("customer_update_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes?.trim() || null,
    })
    .eq("id", request.id);
  if (reqErr) throw reqErr;
}

/** Reject a request — does not touch the customer record. */
export async function rejectRequest(
  requestId: string,
  reviewerId: string,
  reviewNotes?: string,
): Promise<void> {
  const { error } = await supabase
    .from("customer_update_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes?.trim() || null,
    })
    .eq("id", requestId);
  if (error) throw error;
}

/** Fetch a customer's current values so the diff can show before/after. */
export async function fetchCustomerForDiff(
  customerId: string,
): Promise<Database["public"]["Tables"]["customers"]["Row"] | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export { EDITABLE_FIELDS };
