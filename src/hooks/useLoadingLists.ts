import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LoadingList = {
  id: string;
  event_id: string;
  vehicle_id: string;
  direction: string;
  status: string;
  created_by: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LoadingListItem = {
  id: string;
  loading_list_id: string;
  equipment_id: string;
  quantity: number;
  scanned_at: string;
  scanned_by: string;
  notes: string | null;
};

export function useLoadingLists(eventId?: string) {
  return useQuery({
    queryKey: ["loading_lists", eventId],
    queryFn: async () => {
      let q = supabase.from("loading_lists").select("*").order("created_at", { ascending: false });
      if (eventId) q = q.eq("event_id", eventId);
      const { data, error } = await q;
      if (error) throw error;
      return data as LoadingList[];
    },
  });
}

export function useLoadingListItems(listId?: string) {
  return useQuery({
    queryKey: ["loading_list_items", listId],
    enabled: !!listId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loading_list_items")
        .select("*")
        .eq("loading_list_id", listId!)
        .order("scanned_at", { ascending: false });
      if (error) throw error;
      return data as LoadingListItem[];
    },
  });
}

export function useCreateLoadingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (list: { event_id: string; vehicle_id: string; direction: string; created_by: string; notes?: string }) => {
      const { data, error } = await supabase.from("loading_lists").insert(list).select().single();
      if (error) throw error;
      return data as LoadingList;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loading_lists"] });
      toast.success("Yükleme listesi oluşturuldu");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddLoadingListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { loading_list_id: string; equipment_id: string; quantity: number; scanned_by: string; notes?: string }) => {
      const { data, error } = await supabase.from("loading_list_items").insert(item).select().single();
      if (error) throw error;
      return data as LoadingListItem;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["loading_list_items", data.loading_list_id] });
      toast.success("Ekipman yükleme listesine eklendi");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateLoadingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; completed_at?: string }) => {
      const { error } = await supabase.from("loading_lists").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loading_lists"] });
      toast.success("Yükleme listesi güncellendi");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
