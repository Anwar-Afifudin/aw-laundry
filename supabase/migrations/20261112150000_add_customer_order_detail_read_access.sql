CREATE POLICY "Customers can read history from own orders"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND orders.customer_id = (SELECT auth.uid())
    )
  );

REVOKE SELECT
  ON TABLE public.order_status_history
  FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  payment_status,
  actual_completion_at,
  special_instructions,
  estimated_subtotal,
  final_subtotal,
  pickup_fee,
  delivery_fee,
  discount_amount,
  additional_charge,
  final_total,
  pickup_address_snapshot,
  delivery_address_snapshot
)
  ON TABLE public.orders
  TO authenticated;

GRANT SELECT (
  unit_price_snapshot,
  estimated_subtotal,
  final_subtotal,
  notes
)
  ON TABLE public.order_items
  TO authenticated;

GRANT SELECT (
  id,
  order_id,
  to_status,
  note,
  created_at
)
  ON TABLE public.order_status_history
  TO authenticated;
