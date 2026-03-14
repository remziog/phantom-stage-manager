
-- Company settings table (single-row config)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'My Company',
  company_email text,
  company_phone text,
  company_address text,
  company_city text,
  company_country text,
  tax_id text,
  logo_url text,
  default_tax_rate numeric NOT NULL DEFAULT 20,
  currency text NOT NULL DEFAULT 'TRY',
  currency_symbol text NOT NULL DEFAULT '₺',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view settings
CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default row
INSERT INTO public.company_settings (company_name) VALUES ('PHANTOM');

-- Storage bucket for company logo
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

-- Storage policies
CREATE POLICY "Admins can upload company assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update company assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view company assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'company-assets');
