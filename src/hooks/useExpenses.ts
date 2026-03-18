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
  approved_by_name?: string | null;
  submitted_by_name?: string | null;
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

      // Fetch profile names for approvers and submitters
      const allUserIds = [
        ...new Set([
          ...(data as any[]).map((e) => e.approved_by).filter(Boolean),
          ...(data as any[]).map((e) => e.submitted_by).filter(Boolean),
        ]),
      ];
      let profileMap: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allUserIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name || ""]));
        }
      }

      return (data as any[]).map((e) => ({
        ...e,
        event_name: e.events?.name ?? null,
        approved_by_name: e.approved_by ? (profileMap[e.approved_by] || null) : null,
        submitted_by_name: e.submitted_by ? (profileMap[e.submitted_by] || null) : null,
        events: undefined,
      })) as Expense[];
    },
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ["expenses", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, events(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const e = data as any;
      return {
        ...e,
        event_name: e.events?.name ?? null,
        events: undefined,
      } as Expense;
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

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...fields
    }: {
      id: string;
      event_id?: string | null;
      category?: string;
      description?: string;
      amount?: number;
      receipt_url?: string | null;
      receipt_name?: string | null;
      notes?: string | null;
      expense_date?: string;
    }) => {
      const { error } = await supabase
        .from("expenses")
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Masraf güncellendi");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Masraf silindi");
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
