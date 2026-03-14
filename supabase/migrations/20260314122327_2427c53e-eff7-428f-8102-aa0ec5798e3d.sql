
-- Function to notify admins when a customer responds to a quote (approve/reject)
CREATE OR REPLACE FUNCTION public.notify_admins_on_quote_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_record RECORD;
  _action text;
BEGIN
  -- Only fire when status changes from Sent to Approved or Rejected
  IF OLD.status = 'Sent' AND NEW.status IN ('Approved', 'Rejected') THEN
    _action := CASE WHEN NEW.status = 'Approved' THEN 'approved' ELSE 'rejected' END;

    -- Notify all admin users
    FOR _admin_record IN
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        _admin_record.user_id,
        'Quote ' || NEW.status || ': ' || NEW.quote_number,
        NEW.customer_name || ' has ' || _action || ' quote "' || NEW.event_name || '" (' || NEW.quote_number || ')',
        'quote_' || _action,
        NEW.id,
        'quote'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_notify_admins_on_quote_response
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_quote_response();
