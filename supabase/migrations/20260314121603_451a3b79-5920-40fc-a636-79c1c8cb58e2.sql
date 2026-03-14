
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- 'quote_created', 'event_status', 'quote_approved', 'info'
  reference_id uuid, -- links to quote or event id
  reference_type text, -- 'quote' or 'event'
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- System (admin/triggers) can insert notifications
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'team_member'::app_role)
  );

-- Admins can view all notifications (for debugging)
CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify customer when a quote is created for them
CREATE OR REPLACE FUNCTION public.notify_customer_on_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_user_id uuid;
BEGIN
  -- Find the user_id linked to this customer
  IF NEW.customer_id IS NOT NULL THEN
    SELECT user_id INTO _customer_user_id
    FROM public.customers
    WHERE id = NEW.customer_id AND user_id IS NOT NULL;

    IF _customer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id, reference_type)
      VALUES (
        _customer_user_id,
        'New Quote: ' || NEW.quote_number,
        'A new quote "' || NEW.event_name || '" has been created for you. Total: ' || NEW.total,
        'quote_created',
        NEW.id,
        'quote'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to notify customer when event status changes
CREATE OR REPLACE FUNCTION public.notify_customer_on_event_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_user_id uuid;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.customer_id IS NOT NULL THEN
      SELECT user_id INTO _customer_user_id
      FROM public.customers
      WHERE id = NEW.customer_id AND user_id IS NOT NULL;

      IF _customer_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, reference_id, reference_type)
        VALUES (
          _customer_user_id,
          'Event Update: ' || NEW.name,
          'Your event "' || NEW.name || '" status changed to ' || NEW.status,
          'event_status',
          NEW.id,
          'event'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers
CREATE TRIGGER trg_notify_customer_on_quote
  AFTER INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_on_quote();

CREATE TRIGGER trg_notify_customer_on_event_status
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_on_event_status();
