-- Lightweight analytics for CSV import editor undo/redo/edit activity.
CREATE TABLE public.csv_edit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  -- 'edit' | 'undo' | 'redo' | 'undo_row' | 'undo_all'
  action text NOT NULL,
  -- CSV column name (e.g. 'unit_price'). Nullable for bulk actions like
  -- 'undo_all' where no single field applies.
  field text,
  -- Source line number from the CSV. Nullable for bulk actions.
  line_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT csv_edit_events_action_chk
    CHECK (action IN ('edit','undo','redo','undo_row','undo_all'))
);

ALTER TABLE public.csv_edit_events ENABLE ROW LEVEL SECURITY;

-- Any company member may log their own events.
CREATE POLICY csv_edit_events_insert_self
ON public.csv_edit_events
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_member(company_id, auth.uid())
  AND user_id = auth.uid()
);

-- Only owners/admins can read aggregates for their company.
CREATE POLICY csv_edit_events_select_admin
ON public.csv_edit_events
FOR SELECT
TO authenticated
USING (
  has_company_role(company_id, auth.uid(), ARRAY['owner'::member_role, 'admin'::member_role])
);

-- Aggregation indexes.
CREATE INDEX csv_edit_events_company_created_idx
  ON public.csv_edit_events (company_id, created_at DESC);
CREATE INDEX csv_edit_events_company_field_idx
  ON public.csv_edit_events (company_id, field)
  WHERE field IS NOT NULL;