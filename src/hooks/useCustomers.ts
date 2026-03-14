import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  customer_type: "Corporate" | "Agency" | "Individual" | "Government";
  tax_id: string | null;
  total_revenue: number;
  total_events: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("company_name");
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Omit<Customer, "id" | "created_at" | "updated_at" | "total_revenue" | "total_events">) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
    onError: (e) => toast.error(e.message),
  });
}
