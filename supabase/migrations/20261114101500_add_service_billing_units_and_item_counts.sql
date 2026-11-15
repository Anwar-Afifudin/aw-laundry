CREATE TYPE public.service_billing_unit AS ENUM (
  'KG',
  'PAIR',
  'PCS',
  'M2'
);

ALTER TABLE public.services
ADD COLUMN billing_unit public.service_billing_unit NOT NULL DEFAULT 'KG';

-- Keep the initial catalogue explicit as kilogram-based services. The default
-- also preserves KG for every other service that already exists.
UPDATE public.services
SET billing_unit = 'KG'::public.service_billing_unit
WHERE slug IN ('cuci-setrika', 'cuci-kering', 'setrika-saja');

UPDATE public.services
SET billing_unit = 'PAIR'::public.service_billing_unit
WHERE slug = 'laundry-sepatu';

ALTER TABLE public.order_items
ADD COLUMN billing_unit_snapshot public.service_billing_unit,
ADD COLUMN actual_item_count integer,
ADD CONSTRAINT order_items_actual_item_count_positive
  CHECK (actual_item_count IS NULL OR actual_item_count > 0);

UPDATE public.order_items AS item
SET billing_unit_snapshot = service.billing_unit
FROM public.services AS service
WHERE service.id = item.service_id;

ALTER TABLE public.order_items
ALTER COLUMN billing_unit_snapshot SET NOT NULL;

-- Extend the existing snapshot function used by the existing trigger instead
-- of introducing a second BEFORE INSERT trigger for the same responsibility.
CREATE OR REPLACE FUNCTION public.snapshot_order_item_production_steps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT service.production_steps, service.billing_unit
  INTO NEW.production_steps_snapshot, NEW.billing_unit_snapshot
  FROM public.services AS service
  WHERE service.id = NEW.service_id;

  IF NEW.production_steps_snapshot IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'SERVICE_PRODUCTION_WORKFLOW_NOT_FOUND', ERRCODE = '22023';
  END IF;

  IF NEW.billing_unit_snapshot IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'SERVICE_BILLING_UNIT_NOT_FOUND', ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

-- Replace the active verification RPC with a backward-compatible fourth
-- argument. Existing three-argument callers continue to work via the default.
DROP FUNCTION public.verify_admin_order_quantities_v2(uuid, uuid[], numeric[]);

CREATE FUNCTION public.verify_admin_order_quantities_v2(
  p_order_id uuid,
  p_item_ids uuid[],
  p_actual_quantities numeric[],
  p_actual_item_counts integer[] DEFAULT NULL
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

  v_input_count := COALESCE(pg_catalog.array_length(p_item_ids, 1), 0);

  IF v_input_count = 0
    OR v_input_count IS DISTINCT FROM COALESCE(pg_catalog.array_length(p_actual_quantities, 1), 0)
    OR (p_actual_item_counts IS NOT NULL AND v_input_count IS DISTINCT FROM COALESCE(pg_catalog.array_length(p_actual_item_counts, 1), 0))
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.unnest(p_actual_quantities) AS quantity(value)
    WHERE quantity.value IS NULL OR quantity.value <= 0::numeric
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.unnest(p_actual_item_counts) AS item_count(value)
    WHERE item_count.value IS NOT NULL AND item_count.value <= 0
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  IF v_input_count IS DISTINCT FROM (
    SELECT pg_catalog.count(DISTINCT item_id)
    FROM pg_catalog.unnest(p_item_ids) AS input(item_id)
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'DUPLICATE_ORDER_ITEMS', ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*) INTO v_order_item_count
  FROM public.order_items AS item
  WHERE item.order_id = p_order_id;

  IF v_input_count IS DISTINCT FROM v_order_item_count OR EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(p_item_ids) AS input(item_id)
    LEFT JOIN public.order_items AS item
      ON item.id = input.item_id AND item.order_id = p_order_id
    WHERE item.id IS NULL
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ORDER_ITEMS', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.unnest(p_item_ids) WITH ORDINALITY AS input_id(item_id, position)
    JOIN pg_catalog.unnest(p_actual_quantities) WITH ORDINALITY AS input_quantity(actual_quantity, position) USING (position)
    JOIN public.order_items AS item ON item.id = input_id.item_id
    WHERE (item.billing_unit_snapshot IN ('PAIR'::public.service_billing_unit, 'PCS'::public.service_billing_unit)
        AND input_quantity.actual_quantity <> pg_catalog.trunc(input_quantity.actual_quantity))
      OR (item.billing_unit_snapshot = 'KG'::public.service_billing_unit
        AND input_quantity.actual_quantity * 10::numeric <> pg_catalog.trunc(input_quantity.actual_quantity * 10::numeric))
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ACTUAL_QUANTITIES', ERRCODE = '22023';
  END IF;

  WITH verified_items AS (
    SELECT
      input_id.item_id,
      input_quantity.actual_quantity,
      input_count.actual_item_count
    FROM pg_catalog.unnest(p_item_ids) WITH ORDINALITY AS input_id(item_id, position)
    JOIN pg_catalog.unnest(p_actual_quantities) WITH ORDINALITY AS input_quantity(actual_quantity, position) USING (position)
    LEFT JOIN pg_catalog.unnest(p_actual_item_counts) WITH ORDINALITY AS input_count(actual_item_count, position) USING (position)
  )
  UPDATE public.order_items AS item
  SET actual_quantity = verified.actual_quantity,
      actual_item_count = verified.actual_item_count,
      final_subtotal = pg_catalog.round(item.unit_price_snapshot * verified.actual_quantity, 2)
  FROM verified_items AS verified
  WHERE item.id = verified.item_id AND item.order_id = p_order_id;

  SELECT COALESCE(pg_catalog.sum(item.final_subtotal), 0::numeric)
  INTO v_final_subtotal
  FROM public.order_items AS item
  WHERE item.order_id = p_order_id;

  UPDATE public.orders
  SET final_subtotal = v_final_subtotal,
      final_total = GREATEST(
        v_final_subtotal + pickup_fee + delivery_fee + additional_charge - discount_amount,
        0::numeric
      )
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL
  ON FUNCTION public.verify_admin_order_quantities_v2(uuid, uuid[], numeric[], integer[])
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.verify_admin_order_quantities_v2(uuid, uuid[], numeric[], integer[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';
