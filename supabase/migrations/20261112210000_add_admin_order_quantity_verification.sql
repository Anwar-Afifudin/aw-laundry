CREATE FUNCTION public.verify_admin_order_quantities(
  p_order_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item_count integer;
  v_payload_count integer;
  v_final_subtotal numeric(12, 2);
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_active_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '42501';
  END IF;

  SELECT current_order.* INTO v_order
  FROM public.orders AS current_order
  WHERE current_order.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  IF v_order.status <> 'WEIGHING'::public.order_status THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_WEIGHING', ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_typeof(p_items) <> 'array'
    OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(p_items) AS payload(value)
    WHERE pg_catalog.jsonb_typeof(payload.value) <> 'object'
      OR pg_catalog.jsonb_typeof(payload.value -> 'item_id') <> 'string'
      OR pg_catalog.jsonb_typeof(payload.value -> 'actual_quantity') <> 'number'
      OR (payload.value ->> 'actual_quantity')::numeric <= 0
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*) INTO v_item_count
  FROM public.order_items WHERE order_id = p_order_id;

  SELECT pg_catalog.count(DISTINCT (payload.value ->> 'item_id')::uuid)
  INTO v_payload_count
  FROM pg_catalog.jsonb_array_elements(p_items) AS payload(value);

  IF v_payload_count <> v_item_count
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.jsonb_array_elements(p_items) AS payload(value)
      LEFT JOIN public.order_items AS item
        ON item.id = (payload.value ->> 'item_id')::uuid
        AND item.order_id = p_order_id
      WHERE item.id IS NULL
    )
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ORDER_ITEMS', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS payload(value)
    JOIN public.order_items AS item
      ON item.id = (payload.value ->> 'item_id')::uuid
    WHERE (item.price_type_snapshot = 'PER_ITEM'::public.service_price_type
        AND (payload.value ->> 'actual_quantity')::numeric
          <> pg_catalog.trunc((payload.value ->> 'actual_quantity')::numeric))
      OR (item.price_type_snapshot = 'PER_KG'::public.service_price_type
        AND (payload.value ->> 'actual_quantity')::numeric * 10
          <> pg_catalog.trunc((payload.value ->> 'actual_quantity')::numeric * 10))
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  WITH verified_items AS (
    SELECT
      (payload.value ->> 'item_id')::uuid AS item_id,
      (payload.value ->> 'actual_quantity')::numeric AS actual_quantity
    FROM pg_catalog.jsonb_array_elements(p_items) AS payload(value)
  )
  UPDATE public.order_items AS item
  SET actual_quantity = verified.actual_quantity,
      final_subtotal = pg_catalog.round(
        CASE WHEN item.price_type_snapshot = 'FIXED'::public.service_price_type
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
  ON FUNCTION public.verify_admin_order_quantities(uuid, jsonb)
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.verify_admin_order_quantities(uuid, jsonb)
  TO authenticated;

CREATE FUNCTION public.require_verified_quantities_before_processing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'WEIGHING'::public.order_status
    AND NEW.status = 'WAITING_PROCESS'::public.order_status
    AND EXISTS (
      SELECT 1
      FROM public.order_items AS item
      WHERE item.order_id = OLD.id
        AND item.actual_quantity IS NULL
    )
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'ACTUAL_QUANTITY_REQUIRED',
      ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_require_verified_quantities_before_processing
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.require_verified_quantities_before_processing();
