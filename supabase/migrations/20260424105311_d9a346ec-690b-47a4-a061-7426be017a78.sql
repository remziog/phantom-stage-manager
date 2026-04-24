-- Status enum
DO $$ BEGIN
  CREATE TYPE public.update_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.customer_update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status public.update_request_status NOT NULL DEFAULT 'pending',
  -- requested values (null = no change requested for that field)
  name text,
  email text,
  phone text,
  address text,
  tax_id text,
  notes text,
  message text,
  reviewed_by uuid,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cur_company_status
  ON public.customer_update_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cur_customer
  ON public.customer_update_requests(customer_id, created_at DESC);

ALTER TABLE public.customer_update_requests ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_cur_updated_at ON public.customer_update_requests;
CREATE TRIGGER trg_cur_updated_at
  BEFORE UPDATE ON public.customer_update_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer-portal user can create requests for their own linked customer
CREATE POLICY cur_customer_insert_self
  ON public.customer_update_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND public.is_linked_customer(customer_id, auth.uid())
  );

-- Customer-portal user can read their own requests
CREATE POLICY cur_customer_select_self
  ON public.customer_update_requests FOR SELECT
  TO authenticated
  USING (public.is_linked_customer(customer_id, auth.uid()));

-- Admins can read all requests in their company
CREATE POLICY cur_admin_select
  ON public.customer_update_requests FOR SELECT
  TO authenticated
  USING (public.has_company_role(company_id, auth.uid(),
    ARRAY['owner'::member_role, 'admin'::member_role]));

-- Admins can update (approve/reject) requests in their company
CREATE POLICY cur_admin_update
  ON public.customer_update_requests FOR UPDATE
  TO authenticated
  USING (public.has_company_role(company_id, auth.uid(),
    ARRAY['owner'::member_role, 'admin'::member_role]))
  WITH CHECK (public.has_company_role(company_id, auth.uid(),
    ARRAY['owner'::member_role, 'admin'::member_role]));