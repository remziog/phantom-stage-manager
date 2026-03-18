
-- Equipment fault reports table
CREATE TABLE public.equipment_faults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  fault_type text NOT NULL DEFAULT 'damage',
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  photo_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_faults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage faults" ON public.equipment_faults FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Team can manage faults" ON public.equipment_faults FOR ALL TO authenticated USING (has_role(auth.uid(), 'team_member'));
CREATE POLICY "Crew can insert faults" ON public.equipment_faults FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'crew'));
CREATE POLICY "Crew can view faults" ON public.equipment_faults FOR SELECT TO authenticated USING (has_role(auth.uid(), 'crew'));
CREATE POLICY "Sales can view faults" ON public.equipment_faults FOR SELECT TO authenticated USING (has_role(auth.uid(), 'sales'));

-- Loading lists table (truck loading/unloading)
CREATE TABLE public.loading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'load',
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loading_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loading_lists" ON public.loading_lists FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Team can manage loading_lists" ON public.loading_lists FOR ALL TO authenticated USING (has_role(auth.uid(), 'team_member'));
CREATE POLICY "Crew can manage loading_lists" ON public.loading_lists FOR ALL TO authenticated USING (has_role(auth.uid(), 'crew'));
CREATE POLICY "Sales can view loading_lists" ON public.loading_lists FOR SELECT TO authenticated USING (has_role(auth.uid(), 'sales'));

-- Loading list items (individual equipment scanned onto truck)
CREATE TABLE public.loading_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loading_list_id uuid NOT NULL REFERENCES public.loading_lists(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by uuid NOT NULL,
  notes text
);

ALTER TABLE public.loading_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage loading_list_items" ON public.loading_list_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Team can manage loading_list_items" ON public.loading_list_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'team_member'));
CREATE POLICY "Crew can manage loading_list_items" ON public.loading_list_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'crew'));
CREATE POLICY "Sales can view loading_list_items" ON public.loading_list_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'sales'));

-- Storage bucket for fault photos
INSERT INTO storage.buckets (id, name, public) VALUES ('fault-photos', 'fault-photos', true);

CREATE POLICY "Authenticated users can upload fault photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fault-photos');
CREATE POLICY "Anyone can view fault photos" ON storage.objects FOR SELECT USING (bucket_id = 'fault-photos');
CREATE POLICY "Admins can delete fault photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fault-photos' AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_equipment_faults BEFORE UPDATE ON public.equipment_faults FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_loading_lists BEFORE UPDATE ON public.loading_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
