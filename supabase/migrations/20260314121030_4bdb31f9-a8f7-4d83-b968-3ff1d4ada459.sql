
-- Fix RLS: restrict broad SELECT policies to non-customer roles only

-- QUOTES: Drop broad policy and replace with admin/team only
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON public.quotes;
CREATE POLICY "Admin and team can view all quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role)
  );

-- EVENTS: Drop broad policy and replace with admin/team only
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
CREATE POLICY "Admin and team can view all events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role)
  );

-- QUOTE LINE ITEMS: Drop broad policy and replace with admin/team only
DROP POLICY IF EXISTS "Authenticated users can view line items" ON public.quote_line_items;
CREATE POLICY "Admin and team can view all line items"
  ON public.quote_line_items FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'team_member'::app_role)
  );
