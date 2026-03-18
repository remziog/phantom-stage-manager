import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EquipmentFault = {
  id: string;
  equipment_id: string;
  reported_by: string;
  event_id: string | null;
  fault_type: string;
  severity: string;
  description: string;
  photo_urls: string[];
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useEquipmentFaults(equipmentId?: string) {
  return useQuery({
    queryKey: ["equipment_faults", equipmentId],
    queryFn: async () => {
      let q = supabase.from("equipment_faults").select("*").order("created_at", { ascending: false });
      if (equipmentId) q = q.eq("equipment_id", equipmentId);
      const { data, error } = await q;
      if (error) throw error;
      return data as EquipmentFault[];
    },
  });
}

export function useCreateFault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fault: {
      equipment_id: string;
      reported_by: string;
      event_id?: string | null;
      fault_type: string;
      severity: string;
      description: string;
      photo_urls?: string[];
    }) => {
      const { data, error } = await supabase.from("equipment_faults").insert(fault).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment_faults"] });
      toast.success("Arıza raporu oluşturuldu");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFault() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; resolution_notes?: string; resolved_by?: string; resolved_at?: string }) => {
      const { error } = await supabase.from("equipment_faults").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["equipment_faults"] });
      toast.success("Arıza güncellendi");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
