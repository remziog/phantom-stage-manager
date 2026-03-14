
-- Allow customers to update their own quotes (status only, from Sent to Approved/Rejected)
CREATE POLICY "Customers can respond to sent quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (
    customer_id = get_customer_id_for_user(auth.uid())
    AND status = 'Sent'
  )
  WITH CHECK (
    customer_id = get_customer_id_for_user(auth.uid())
    AND status IN ('Approved', 'Rejected')
  );
