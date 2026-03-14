import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QuoteStatus = "Draft" | "Sent" | "Approved" | "Rejected" | "Cancelled";
export type LineItemType = "Equipment" | "Personnel" | "Vehicle" | "Custom";

export type Quote = {
  id: string;
  quote_number: string;
  customer_id: string | null;
  customer_name: string;
  event_name: string;
  event_date: string | null;
  event_end_date: string | null;
  venue: string | null;
  status: QuoteStatus;
  subtotal: number;
  discount_percent: number;
  tax_percent: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItem = {
  id: string;
  quote_id: string;
  item_type: LineItemType;
  source_id: string | null;
  description: string;
  quantity: number;
  days: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

export function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quote[];
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["quotes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Quote;
    },
  });
}

export function useQuoteLineItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote_line_items", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_line_items")
        .select("*")
        .eq("quote_id", quoteId!)
        .order("sort_order");
      if (error) throw error;
      return data as QuoteLineItem[];
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: {
      customer_id?: string | null;
      customer_name: string;
      event_name: string;
      event_date?: string | null;
      event_end_date?: string | null;
      venue?: string | null;
      notes?: string | null;
      status?: QuoteStatus;
      subtotal?: number;
      discount_percent?: number;
      tax_percent?: number;
      total?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("quotes")
        .insert({ ...quote, quote_number: "", created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as Quote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote created");
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Quote> & { id: string }) => {
      const { error } = await supabase.from("quotes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quotes", vars.id] });
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useSaveLineItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quoteId,
      items,
    }: {
      quoteId: string;
      items: Omit<QuoteLineItem, "id" | "created_at">[];
    }) => {
      // Delete existing then insert new
      await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);
      if (items.length > 0) {
        const { error } = await supabase
          .from("quote_line_items")
          .insert(items.map((item) => ({ ...item, quote_id: quoteId })));
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quote_line_items", vars.quoteId] });
      toast.success("Line items saved");
    },
    onError: (e) => toast.error(e.message),
  });
}
