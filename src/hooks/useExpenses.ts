import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Expense {
  id: string;
  event_id: string | null;
  category: string;
  description: string;
  amount: number;
  receipt_url: string | null;
  receipt_name: string | null;
  status: string;
  submitted_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
  // joined
  event_name?: string;
}

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, events(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((e) => ({
        ...e,
        event_name: e.events?.name ?? null,
        events: undefined,
      })) as Expense[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: {
      event_id?: string | null;
      category: string;
      description: string;
      amount: number;
      receipt_url?: string | null;
      receipt_name?: string | null;
      notes?: string | null;
      expense_date: string;
      submitted_by: string;
    }) => {
      const { error } = await supabase.from("expenses").insert(expense as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Masraf kaydedildi");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateExpenseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      approved_by,
      rejection_reason,
    }: {
      id: string;
      status: "approved" | "rejected";
      approved_by: string;
      rejection_reason?: string;
    }) => {
      const update: any = {
        status,
        approved_by,
        approved_at: new Date().toISOString(),
      };
      if (rejection_reason) update.rejection_reason = rejection_reason;
      const { error } = await supabase
        .from("expenses")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Masraf durumu güncellendi");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export async function uploadReceipt(file: File, expenseId: string) {
  const ext = file.name.split(".").pop();
  const path = `${expenseId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("expense-receipts")
    .upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage
    .from("expense-receipts")
    .getPublicUrl(path);
  return data.publicUrl;
}
