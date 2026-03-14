
-- Update trigger to skip when user_id is NULL (public submissions handled by edge function)
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
  -- Only fire for logged-in submissions (user_id is set)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

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
