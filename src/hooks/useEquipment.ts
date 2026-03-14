import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { logActivity } from "@/lib/activityLogger";

export type Equipment = Tables<"equipment">;
export type EquipmentInsert = TablesInsert<"equipment">;
export type EquipmentUpdate = TablesUpdate<"equipment">;

export function useEquipment() {
  return useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (equipment: EquipmentInsert) => {
      const { data, error } = await supabase
        .from("equipment")
        .insert(equipment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      logActivity("Equipment added", "equipment", data.id, data.name, `${data.category} · qty ${data.quantity_total}`);
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: EquipmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("equipment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      logActivity("Equipment updated", "equipment", data.id, data.name);
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      logActivity("Equipment deleted", "equipment", id);
    },
  });
}
