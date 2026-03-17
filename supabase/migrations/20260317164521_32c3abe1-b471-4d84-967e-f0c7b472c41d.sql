-- Müşteri tablosuna yeni alanlar ekle
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS website text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_district text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address_postal_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_office text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_contract boolean NOT NULL DEFAULT false;

-- Müşteriye özel fiyat tablosu
CREATE TABLE public.customer_price_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  custom_price_per_day numeric NOT NULL DEFAULT 0,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_id, equipment_id)
);

ALTER TABLE public.customer_price_list ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage customer_price_list"
  ON public.customer_price_list FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Sales can view
CREATE POLICY "Sales can view customer_price_list"
  ON public.customer_price_list FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'sales'));

-- Sales can manage
CREATE POLICY "Sales can manage customer_price_list"
  ON public.customer_price_list FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'sales'));

-- Team members can view
CREATE POLICY "Team members can view customer_price_list"
  ON public.customer_price_list FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'team_member'));