
CREATE OR REPLACE FUNCTION public.notify_on_expense_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _action text;
  _title text;
  _message text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    _action := CASE WHEN NEW.status = 'approved' THEN 'onaylandı' ELSE 'reddedildi' END;
    _title := 'Masraf ' || CASE WHEN NEW.status = 'approved' THEN 'Onaylandı' ELSE 'Reddedildi' END;
    _message := '"' || NEW.description || '" masrafınız (' || NEW.amount || ' ₺) ' || _action;
    
    IF NEW.status = 'rejected' AND NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason <> '' THEN
      _message := _message || '. Sebep: ' || NEW.rejection_reason;
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (
      NEW.submitted_by,
      _title,
      _message,
      'expense_' || NEW.status,
      NEW.id,
      'expense'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_expense_status_change
  AFTER UPDATE ON public.expenses
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_on_expense_status_change();
