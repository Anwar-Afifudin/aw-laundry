CREATE FUNCTION public.verify_admin_order_quantities_v2(
  p_order_id uuid,
  p_item_ids uuid[],
  p_actual_quantities numeric[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_order_item_count integer;
  v_input_count integer;
  v_final_subtotal numeric(12, 2);
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_active_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '42501';
  END IF;

  SELECT current_order.*
  INTO v_order
  FROM public.orders AS current_order
  WHERE current_order.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  IF v_order.status <> 'WEIGHING'::public.order_status THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_WEIGHING', ERRCODE = '22023';
  END IF;

  v_input_count := pg_catalog.coalesce(pg_catalog.array_length(p_item_ids, 1), 0);

  IF v_input_count = 0
    OR v_input_count IS DISTINCT FROM
      pg_catalog.coalesce(pg_catalog.array_length(p_actual_quantities, 1), 0)
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(p_actual_quantities) AS quantity(value)
    WHERE quantity.value IS NULL OR quantity.value <= 0
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  IF v_input_count IS DISTINCT FROM (
    SELECT pg_catalog.count(DISTINCT item_id)
    FROM pg_catalog.unnest(p_item_ids) AS input(item_id)
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'DUPLICATE_ORDER_ITEMS', ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_order_item_count
  FROM public.order_items AS item
  WHERE item.order_id = p_order_id;

  IF v_input_count IS DISTINCT FROM v_order_item_count
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(p_item_ids) AS input(item_id)
      LEFT JOIN public.order_items AS item
        ON item.id = input.item_id
        AND item.order_id = p_order_id
      WHERE item.id IS NULL
    )
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ORDER_ITEMS', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(p_item_ids) WITH ORDINALITY
      AS input_id(item_id, position)
    JOIN pg_catalog.unnest(p_actual_quantities) WITH ORDINALITY
      AS input_quantity(actual_quantity, position)
      USING (position)
    JOIN public.order_items AS item ON item.id = input_id.item_id
    WHERE (item.price_type_snapshot = 'PER_ITEM'::public.service_price_type
        AND input_quantity.actual_quantity
          <> pg_catalog.trunc(input_quantity.actual_quantity))
      OR (item.price_type_snapshot = 'PER_KG'::public.service_price_type
        AND input_quantity.actual_quantity * 10
          <> pg_catalog.trunc(input_quantity.actual_quantity * 10))
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  WITH verified_items AS (
    SELECT input_id.item_id, input_quantity.actual_quantity
    FROM pg_catalog.unnest(p_item_ids) WITH ORDINALITY
      AS input_id(item_id, position)
    JOIN pg_catalog.unnest(p_actual_quantities) WITH ORDINALITY
      AS input_quantity(actual_quantity, position)
      USING (position)
  )
  UPDATE public.order_items AS item
  SET actual_quantity = verified.actual_quantity,
      final_subtotal = pg_catalog.round(
        CASE
          WHEN item.price_type_snapshot = 'FIXED'::public.service_price_type
            THEN item.unit_price_snapshot
          ELSE item.unit_price_snapshot * verified.actual_quantity
        END,
        2
      )
  FROM verified_items AS verified
  WHERE item.id = verified.item_id
    AND item.order_id = p_order_id;

  SELECT pg_catalog.coalesce(pg_catalog.sum(item.final_subtotal), 0)
  INTO v_final_subtotal
  FROM public.order_items AS item
  WHERE item.order_id = p_order_id;

  UPDATE public.orders
  SET final_subtotal = v_final_subtotal,
      final_total = pg_catalog.greatest(
        v_final_subtotal + pickup_fee + delivery_fee
          + additional_charge - discount_amount,
        0
      )
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL
  ON FUNCTION public.verify_admin_order_quantities_v2(uuid, uuid[], numeric[])
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.verify_admin_order_quantities_v2(uuid, uuid[], numeric[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';
