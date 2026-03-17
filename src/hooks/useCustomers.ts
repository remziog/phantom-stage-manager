import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";

export type Customer = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  address_district: string | null;
  address_postal_code: string | null;
  city: string | null;
  customer_type: "Corporate" | "Agency" | "Individual" | "Government";
  tax_id: string | null;
  tax_office: string | null;
  website: string | null;
  has_contract: boolean;
  total_revenue: number;
  total_events: number;
  notes: string | null;
  is_active: boolean;
  user_id: string | null;
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
    mutationFn: async (customer: Partial<Customer> & { company_name: string; contact_name: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer added");
      logActivity("Customer created", "customer", data.id, data.company_name);
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
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      logActivity("Customer updated", "customer", vars.id, vars.company_name || undefined);
    },
    onError: (e) => toast.error(e.message),
  });
}
