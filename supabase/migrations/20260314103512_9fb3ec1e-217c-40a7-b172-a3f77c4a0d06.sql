
-- Create customer_type enum
CREATE TYPE public.customer_type AS ENUM ('Corporate', 'Agency', 'Individual', 'Government');

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  customer_type public.customer_type NOT NULL DEFAULT 'Corporate',
  tax_id TEXT,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_events INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Team members can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'team_member'));

-- Updated_at trigger
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.customers (company_name, contact_name, email, phone, city, customer_type, tax_id, total_revenue, total_events, is_active) VALUES
  ('Vodafone Turkey', 'Ayşe Kılıç', 'ayse@vodafone.com.tr', '+90 212 555 0101', 'İstanbul', 'Corporate', 'VF-1234567', 185000, 12, true),
  ('IMG Artists', 'Mehmet Demir', 'mehmet@imgartists.com', '+90 216 555 0202', 'İstanbul', 'Agency', 'IM-2345678', 320000, 24, true),
  ('Ankara Büyükşehir Belediyesi', 'Fatma Yıldız', 'fatma@ankara.bel.tr', '+90 312 555 0303', 'Ankara', 'Government', 'AB-3456789', 95000, 6, true),
  ('Berkay Management', 'Can Arslan', 'can@berkay.com.tr', '+90 532 555 0404', 'İstanbul', 'Individual', 'BM-4567890', 72000, 8, true),
  ('Turkcell', 'Zeynep Öztürk', 'zeynep@turkcell.com.tr', '+90 212 555 0505', 'İstanbul', 'Corporate', 'TC-5678901', 450000, 18, true),
  ('Pozitif Live', 'Ali Koç', 'ali@pozitif.com.tr', '+90 216 555 0606', 'İstanbul', 'Agency', 'PL-6789012', 280000, 15, true),
  ('Garanti BBVA', 'Elif Şahin', 'elif@garantibbva.com.tr', '+90 212 555 0707', 'İstanbul', 'Corporate', 'GB-7890123', 165000, 10, false),
  ('İzmir Fuarları AŞ', 'Hakan Çelik', 'hakan@izmirfuar.com', '+90 232 555 0808', 'İzmir', 'Corporate', 'IF-8901234', 120000, 9, true);
