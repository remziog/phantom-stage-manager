
-- Create quote_requests table
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  event_type text NOT NULL DEFAULT 'Other',
  start_date date,
  end_date date,
  venue text,
  estimated_audience_size text,
  services_needed text[] DEFAULT '{}',
  budget_range text,
  details text,
  file_url text,
  file_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Customers can insert their own requests
CREATE POLICY "Customers can insert own requests"
ON public.quote_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Customers can view their own requests
CREATE POLICY "Customers can view own requests"
ON public.quote_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage all requests"
ON public.quote_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Team members can view all requests
CREATE POLICY "Team members can view requests"
ON public.quote_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'team_member'::app_role));

-- Updated at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for quote request files
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-request-files', 'quote-request-files', false);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload quote request files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quote-request-files');

-- Storage RLS: users can read own files, admins can read all
CREATE POLICY "Users can read own quote request files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'quote-request-files');

-- Trigger to notify admins on new quote request
CREATE OR REPLACE FUNCTION public.notify_admins_on_quote_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _admin_record RECORD;
  _customer_name text;
BEGIN
  -- Get customer name
  SELECT company_name INTO _customer_name
  FROM public.customers WHERE id = NEW.customer_id;

  FOR _admin_record IN
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      _admin_record.user_id,
      'New Quote Request',
      COALESCE(_customer_name, 'A customer') || ' submitted a quote request for "' || NEW.event_name || '"',
      'quote_request',
      NEW.id,
      'quote_request'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_quote_request
  AFTER INSERT ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION notify_admins_on_quote_request();

-- Enable realtime for quote_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;
