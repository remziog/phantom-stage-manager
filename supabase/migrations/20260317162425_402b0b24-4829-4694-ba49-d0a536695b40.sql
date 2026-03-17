
-- Sales rolü RLS politikaları
CREATE POLICY "Sales can view equipment" ON public.equipment FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can insert equipment" ON public.equipment FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can update equipment" ON public.equipment FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales can view customers" ON public.customers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can update customers" ON public.customers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales can view quotes" ON public.quotes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can create quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can update quotes" ON public.quotes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales can view line items" ON public.quote_line_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can manage line items" ON public.quote_line_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales can view events" ON public.events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales can manage event_equipment" ON public.event_equipment FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can manage event_team" ON public.event_team FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can manage event_vehicles" ON public.event_vehicles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));

CREATE POLICY "Sales can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can view team members" ON public.team_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can view quote requests" ON public.quote_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can update quote requests" ON public.quote_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can view activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Sales can insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'sales'::app_role));

-- Crew rolü RLS politikaları (kısıtlı)
CREATE POLICY "Crew can view equipment" ON public.equipment FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'crew'::app_role));
CREATE POLICY "Crew can view events" ON public.events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'crew'::app_role));
CREATE POLICY "Crew can view event_equipment" ON public.event_equipment FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'crew'::app_role));
CREATE POLICY "Crew can view event_team" ON public.event_team FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'crew'::app_role));
CREATE POLICY "Crew can view event_vehicles" ON public.event_vehicles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'crew'::app_role));
CREATE POLICY "Crew can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'crew'::app_role));
CREATE POLICY "Crew can view team members" ON public.team_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'crew'::app_role));
CREATE POLICY "Crew can insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'crew'::app_role));
