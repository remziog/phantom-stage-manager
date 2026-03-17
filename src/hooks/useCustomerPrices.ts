import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CustomerPriceItem = {
  id: string;
  customer_id: string;
  equipment_id: string;
  custom_price_per_day: number;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
};

export function useCustomerPrices(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer_prices", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_price_list")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerPriceItem[];
    },
  });
}

export function useUpsertCustomerPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { customer_id: string; equipment_id: string; custom_price_per_day: number; valid_from?: string; valid_until?: string | null }) => {
      const { data, error } = await supabase
        .from("customer_price_list")
        .upsert(item, { onConflict: "customer_id,equipment_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["customer_prices", data.customer_id] });
      toast.success("Özel fiyat kaydedildi");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCustomerPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
      const { error } = await supabase.from("customer_price_list").delete().eq("id", id);
      if (error) throw error;
      return customerId;
    },
    onSuccess: (customerId) => {
      qc.invalidateQueries({ queryKey: ["customer_prices", customerId] });
      toast.success("Özel fiyat silindi");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
