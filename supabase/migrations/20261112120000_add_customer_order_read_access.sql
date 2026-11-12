CREATE POLICY "Customers can read own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (customer_id = (SELECT auth.uid()));

CREATE POLICY "Customers can read items from own orders"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = (SELECT auth.uid())
    )
  );

REVOKE SELECT
  ON TABLE public.orders, public.order_items
  FROM authenticated;

GRANT SELECT (
  id,
  order_number,
  customer_id,
  status,
  intake_method,
  return_method,
  estimated_completion_at,
  estimated_total,
  created_at
)
  ON TABLE public.orders
  TO authenticated;

GRANT SELECT (
  id,
  order_id,
  service_name_snapshot,
  price_type_snapshot,
  estimated_quantity,
  actual_quantity
)
  ON TABLE public.order_items
  TO authenticated;
