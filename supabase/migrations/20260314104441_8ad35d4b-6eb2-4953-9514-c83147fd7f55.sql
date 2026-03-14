
-- Event status enum
CREATE TYPE public.event_status AS ENUM ('Planning', 'Confirmed', 'In Progress', 'Completed', 'Cancelled');

-- Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  status public.event_status NOT NULL DEFAULT 'Planning',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  load_in_date DATE,
  load_out_date DATE,
  venue TEXT,
  venue_address TEXT,
  project_manager_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event equipment assignments
CREATE TABLE public.event_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  UNIQUE(event_id, equipment_id)
);

-- Event team assignments
CREATE TABLE public.event_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role_on_event TEXT,
  notes TEXT,
  UNIQUE(event_id, team_member_id)
);

-- Event vehicle assignments
CREATE TABLE public.event_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  notes TEXT,
  UNIQUE(event_id, vehicle_id)
);

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_vehicles ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Team members can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'team_member'));
CREATE POLICY "Team members can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'team_member'));

-- Assignment table policies (same pattern)
CREATE POLICY "Authenticated can view event_equipment" ON public.event_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_equipment" ON public.event_equipment FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Team members can manage event_equipment" ON public.event_equipment FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Authenticated can view event_team" ON public.event_team FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_team" ON public.event_team FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Team members can manage event_team" ON public.event_team FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Authenticated can view event_vehicles" ON public.event_vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage event_vehicles" ON public.event_vehicles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Team members can manage event_vehicles" ON public.event_vehicles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'team_member'));

-- Updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed events
INSERT INTO public.events (name, customer_id, customer_name, quote_id, status, start_date, end_date, load_in_date, load_out_date, venue, venue_address, notes)
SELECT
  e.name, c.id, c.company_name, q.id, e.status,
  e.start_date, e.end_date, e.start_date - 1, e.end_date + 1,
  e.venue, e.venue_address, e.notes
FROM (VALUES
  ('Vodafone Red Launch', 'Vodafone Turkey', 'QT-01', 'Confirmed'::event_status, '2026-04-15'::date, '2026-04-17'::date, 'Volkswagen Arena, İstanbul', 'Atatürk Mah. Volkswagen Arena', 'Full production with L/S/V'),
  ('Jazz Festival Main Stage', 'IMG Artists', 'QT-02', 'Planning'::event_status, '2026-05-20'::date, '2026-05-23'::date, 'Harbiye Açıkhava, İstanbul', 'Harbiye, Şişli', 'Multi-day festival'),
  ('Rock Festival 2026', 'Pozitif Live', 'QT-04', 'Confirmed'::event_status, '2026-07-01'::date, '2026-07-04'::date, 'KüçükÇiftlik Park', 'Maçka, Beşiktaş', 'Largest summer event'),
  ('Corporate Gala Night', 'Turkcell', 'QT-03', 'In Progress'::event_status, '2026-03-14'::date, '2026-03-14'::date, 'Hilton Bosphorus', 'Harbiye, Şişli', 'Elegant indoor gala')
) AS e(name, cname, qnum, status, start_date, end_date, venue, venue_address, notes)
JOIN public.customers c ON c.company_name = e.cname
LEFT JOIN public.quotes q ON q.quote_number = e.qnum;
