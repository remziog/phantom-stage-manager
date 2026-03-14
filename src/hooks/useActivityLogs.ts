import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: string | null;
  created_at: string;
};

export function useActivityLogs(limit = 20) {
  return useQuery({
    queryKey: ["activity_logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ActivityLog[];
    },
  });
}

export function useLogActivity() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      action: string;
      entity_type: string;
      entity_id?: string;
      entity_label?: string;
      details?: string;
    }) => {
      if (!user) return;
      const { error } = await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id || null,
        entity_label: log.entity_label || null,
        details: log.details || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity_logs"] }),
  });
}
