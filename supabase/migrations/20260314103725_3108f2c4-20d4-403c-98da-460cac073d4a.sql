
-- Quote status enum
CREATE TYPE public.quote_status AS ENUM ('Draft', 'Sent', 'Approved', 'Rejected', 'Cancelled');

-- Line item source type
CREATE TYPE public.line_item_type AS ENUM ('Equipment', 'Personnel', 'Vehicle', 'Custom');

-- Quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_date DATE,
  event_end_date DATE,
  venue TEXT,
  status public.quote_status NOT NULL DEFAULT 'Draft',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  tax_percent NUMERIC NOT NULL DEFAULT 20,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quote line items
CREATE TABLE public.quote_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  item_type public.line_item_type NOT NULL DEFAULT 'Custom',
  source_id UUID,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  days INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quotes"
  ON public.quotes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage quotes"
  ON public.quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create quotes"
  ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Team members can update quotes"
  ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Authenticated users can view line items"
  ON public.quote_line_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage line items"
  ON public.quote_line_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can manage line items"
  ON public.quote_line_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'team_member'));

-- Triggers
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sequence for quote numbers
CREATE SEQUENCE public.quote_number_seq START 1001;

-- Function to auto-generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'QT-' || LPAD(nextval('public.quote_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.generate_quote_number();

-- Seed quotes
INSERT INTO public.quotes (quote_number, customer_id, customer_name, event_name, event_date, event_end_date, venue, status, subtotal, discount_percent, tax_percent, total, notes)
SELECT
  'QT-0' || n::text,
  c.id,
  c.company_name,
  e.event_name,
  e.event_date,
  e.event_date + 2,
  e.venue,
  e.status,
  e.subtotal,
  e.discount,
  20,
  ROUND(e.subtotal * (1 - e.discount/100) * 1.20, 2),
  e.notes
FROM (VALUES
  (1, 'Vodafone Turkey',   'Vodafone Red Launch',     '2026-04-15'::date, 'Volkswagen Arena, İstanbul',  'Approved'::quote_status, 45000, 5,  'Full production package'),
  (2, 'IMG Artists',        'Jazz Festival Main Stage', '2026-05-20'::date, 'Harbiye Açıkhava, İstanbul', 'Sent'::quote_status,     82000, 10, 'Multi-day festival setup'),
  (3, 'Turkcell',           'Turkcell Gala Night',     '2026-06-10'::date, 'Hilton Bosphorus, İstanbul', 'Draft'::quote_status,     35000, 0,  NULL),
  (4, 'Pozitif Live',       'Rock Festival 2026',      '2026-07-01'::date, 'KüçükÇiftlik Park',          'Approved'::quote_status, 120000, 8, 'Largest event of summer')
) AS e(n, cname, event_name, event_date, venue, status, subtotal, discount, notes)
JOIN public.customers c ON c.company_name = e.cname;

-- Seed line items for first quote
INSERT INTO public.quote_line_items (quote_id, item_type, description, quantity, days, unit_price, line_total, sort_order)
SELECT q.id, t.item_type, t.description, t.quantity, t.days, t.unit_price, t.quantity * t.days * t.unit_price, t.sort_order
FROM public.quotes q
CROSS JOIN (VALUES
  ('Equipment'::line_item_type, 'Moving Head Wash 19×40W',  8, 3, 450,  1),
  ('Equipment'::line_item_type, 'Line Array Speaker',       12, 3, 350, 2),
  ('Personnel'::line_item_type, 'Light Technician',          2, 3, 1500, 3),
  ('Personnel'::line_item_type, 'Sound Technician',          2, 3, 1500, 4),
  ('Vehicle'::line_item_type,   'Truck Transport',           1, 2, 3500, 5),
  ('Custom'::line_item_type,    'Setup & Strike',            1, 1, 5000, 6)
) AS t(item_type, description, quantity, days, unit_price, sort_order)
WHERE q.quote_number = 'QT-01';
