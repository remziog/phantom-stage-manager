CREATE TABLE public.user_export_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid,
  page_key text NOT NULL,
  name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_export_presets_unique UNIQUE (user_id, company_id, page_key, name)
);

CREATE INDEX user_export_presets_lookup
  ON public.user_export_presets (user_id, company_id, page_key);

ALTER TABLE public.user_export_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_export_presets_select_own"
  ON public.user_export_presets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_export_presets_insert_own"
  ON public.user_export_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_export_presets_update_own"
  ON public.user_export_presets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_export_presets_delete_own"
  ON public.user_export_presets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER user_export_presets_set_updated_at
  BEFORE UPDATE ON public.user_export_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();