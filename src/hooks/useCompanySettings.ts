import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CompanySettings {
  id: string;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_city: string | null;
  company_country: string | null;
  tax_id: string | null;
  logo_url: string | null;
  default_tax_rate: number;
  currency: string;
  currency_symbol: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as CompanySettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      const { id, created_at, updated_at, ...rest } = updates as any;
      const { data, error } = await supabase
        .from("company_settings" as any)
        .update(rest)
        .eq("id", query.data?.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CompanySettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({ title: "Settings saved", description: "Company settings updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadLogo = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `logo.${ext}`;

    // Remove old logo if exists
    await supabase.storage.from("company-assets").remove([path]);

    const { error } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("company-assets")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    uploadLogo,
  };
}
