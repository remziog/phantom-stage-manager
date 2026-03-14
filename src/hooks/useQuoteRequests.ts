import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type QuoteRequest = {
  id: string;
  customer_id: string | null;
  user_id: string;
  event_name: string;
  event_type: string;
  start_date: string | null;
  end_date: string | null;
  venue: string | null;
  estimated_audience_size: string | null;
  services_needed: string[];
  budget_range: string | null;
  details: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteRequestInsert = {
  event_name: string;
  event_type: string;
  start_date?: string | null;
  end_date?: string | null;
  venue?: string | null;
  estimated_audience_size?: string | null;
  services_needed?: string[];
  budget_range?: string | null;
  details?: string | null;
  file_url?: string | null;
  file_name?: string | null;
};

export function useQuoteRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quote_requests"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteRequest[];
    },
  });
}

export function useCreateQuoteRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: QuoteRequestInsert) => {
      // Get customer_id for this user
      const { data: customerId } = await supabase.rpc("get_customer_id_for_user", {
        _user_id: user!.id,
      });

      const { data, error } = await supabase
        .from("quote_requests")
        .insert({
          ...req,
          user_id: user!.id,
          customer_id: customerId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote_requests"] }),
  });
}

export async function uploadQuoteRequestFile(file: File, userId: string) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("quote-request-files")
    .upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage
    .from("quote-request-files")
    .getPublicUrl(path);

  return { url: data.publicUrl, path };
}
