
-- Add user_id to customers table to link customer accounts to auth users
ALTER TABLE public.customers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create a security definer function to get customer_id for the logged-in user
CREATE OR REPLACE FUNCTION public.get_customer_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.customers
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Add RLS policy so customers can only see their own quotes
CREATE POLICY "Customers can view own quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    customer_id = get_customer_id_for_user(auth.uid())
  );

-- Add RLS policy so customers can only see their own events
CREATE POLICY "Customers can view own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    customer_id = get_customer_id_for_user(auth.uid())
  );

-- Add RLS policy so customers can see line items for their own quotes
CREATE POLICY "Customers can view own quote line items"
  ON public.quote_line_items FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM public.quotes
      WHERE customer_id = get_customer_id_for_user(auth.uid())
    )
  );
