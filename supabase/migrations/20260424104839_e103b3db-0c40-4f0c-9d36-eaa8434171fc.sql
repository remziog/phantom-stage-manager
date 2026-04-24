-- 1. Add linked_customer_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linked_customer_id uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_linked_customer
  ON public.profiles(linked_customer_id);

-- 2. Helper: is the user linked to this customer?
CREATE OR REPLACE FUNCTION public.is_linked_customer(_customer_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND linked_customer_id = _customer_id
  );
$$;

-- Helper: get the customer_id linked to the current user
CREATE OR REPLACE FUNCTION public.get_linked_customer_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT linked_customer_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- 3. Customers: allow linked customer to read & update their own row
DROP POLICY IF EXISTS customers_self_select ON public.customers;
CREATE POLICY customers_self_select
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.is_linked_customer(id, auth.uid()));

DROP POLICY IF EXISTS customers_self_update ON public.customers;
CREATE POLICY customers_self_update
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.is_linked_customer(id, auth.uid()))
  WITH CHECK (public.is_linked_customer(id, auth.uid()));

-- 4. Transactions: linked customer can read their own
DROP POLICY IF EXISTS transactions_self_select ON public.transactions;
CREATE POLICY transactions_self_select
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    customer_id IS NOT NULL
    AND public.is_linked_customer(customer_id, auth.uid())
  );

-- 5. Transaction items: linked customer can read items of their own transactions
DROP POLICY IF EXISTS transaction_items_self_select ON public.transaction_items;
CREATE POLICY transaction_items_self_select
  ON public.transaction_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_items.transaction_id
        AND t.customer_id IS NOT NULL
        AND public.is_linked_customer(t.customer_id, auth.uid())
    )
  );

-- 6. Invoices: linked customer can read their own
DROP POLICY IF EXISTS invoices_self_select ON public.invoices;
CREATE POLICY invoices_self_select
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    customer_id IS NOT NULL
    AND public.is_linked_customer(customer_id, auth.uid())
  );

-- 7. Companies: linked customer can read the company they're a customer of
-- (so the app can render the company name/branding for them)
DROP POLICY IF EXISTS companies_select_linked_customer ON public.companies;
CREATE POLICY companies_select_linked_customer
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.company_id = companies.id
        AND public.is_linked_customer(c.id, auth.uid())
    )
  );