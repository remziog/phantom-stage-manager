
-- Activity log table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage activity_logs"
ON public.activity_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Team members can insert and view
CREATE POLICY "Team members can view activity_logs"
ON public.activity_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'team_member'));

CREATE POLICY "Team members can insert activity_logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'team_member'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
