-- Module change log: tracks enable/disable of dashboard modules per company
CREATE TABLE public.module_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID,
  user_email TEXT,
  module TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('enabled', 'disabled')),
  source TEXT NOT NULL CHECK (source IN ('onboarding', 'settings')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_module_change_log_company_created
  ON public.module_change_log (company_id, created_at DESC);

ALTER TABLE public.module_change_log ENABLE ROW LEVEL SECURITY;

-- Only owners + admins can view the audit log
CREATE POLICY "module_log_select_admin"
  ON public.module_change_log
  FOR SELECT
  TO authenticated
  USING (public.has_company_role(company_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role]));

-- Any company member can insert their own change records (the app records them as users toggle modules)
CREATE POLICY "module_log_insert_member"
  ON public.module_change_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_company_member(company_id, auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );