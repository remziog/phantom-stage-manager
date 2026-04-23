import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export type InvoiceWithCustomer = Invoice & { customer?: { name: string; email: string | null; address: string | null } | null };

export async function listInvoices(companyId: string): Promise<InvoiceWithCustomer[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, customer:customers(name, email, address)")
    .eq("company_id", companyId)
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InvoiceWithCustomer[];
}

export async function createInvoice(input: InvoiceInsert): Promise<Invoice> {
  const { data, error } = await supabase.from("invoices").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
  const { data, error } = await supabase.from("invoices").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function generateInvoiceFromReservation(args: {
  companyId: string;
  reservationId: string;
  customerId: string | null;
  total: number;
  currency: string;
  userId: string;
}): Promise<Invoice> {
  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(issueDate.getDate() + 14);

  return createInvoice({
    company_id: args.companyId,
    transaction_id: args.reservationId,
    customer_id: args.customerId,
    invoice_number: "", // trigger will assign
    status: "draft",
    issue_date: issueDate.toISOString().slice(0, 10),
    due_date: dueDate.toISOString().slice(0, 10),
    total: args.total,
    currency: args.currency,
    created_by: args.userId,
  });
}
