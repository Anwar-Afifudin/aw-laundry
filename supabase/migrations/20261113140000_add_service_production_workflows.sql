ALTER TABLE public.services
ADD COLUMN production_steps public.order_status[] NOT NULL
DEFAULT ARRAY[
  'WASHING'::public.order_status,
  'DRYING'::public.order_status,
  'IRONING'::public.order_status,
  'QUALITY_CONTROL'::public.order_status,
  'PACKING'::public.order_status,
  'READY'::public.order_status
];

UPDATE public.services
SET production_steps = CASE slug
  WHEN 'setrika-saja' THEN ARRAY[
    'IRONING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ]
  WHEN 'cuci-kering' THEN ARRAY[
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ]
  WHEN 'cuci-saja' THEN ARRAY[
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ]
  ELSE production_steps
END;

ALTER TABLE public.services
ADD CONSTRAINT services_production_steps_valid
CHECK (
  cardinality(production_steps) > 0
  AND production_steps <@ ARRAY[
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'IRONING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ]
  AND production_steps @> ARRAY[
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ]
);

ALTER TABLE public.order_items
ADD COLUMN production_steps_snapshot public.order_status[];

UPDATE public.order_items AS item
SET production_steps_snapshot = service.production_steps
FROM public.services AS service
WHERE service.id = item.service_id;

ALTER TABLE public.order_items
ALTER COLUMN production_steps_snapshot SET NOT NULL;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_production_steps_snapshot_valid
CHECK (
  cardinality(production_steps_snapshot) > 0
  AND production_steps_snapshot <@ ARRAY[
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'IRONING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ]
);

CREATE FUNCTION public.snapshot_order_item_production_steps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT service.production_steps
  INTO NEW.production_steps_snapshot
  FROM public.services AS service
  WHERE service.id = NEW.service_id;

  IF NEW.production_steps_snapshot IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'SERVICE_PRODUCTION_WORKFLOW_NOT_FOUND', ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_order_item_production_steps() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER order_items_snapshot_production_steps
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_order_item_production_steps();

CREATE FUNCTION public.get_order_expected_next_status(p_order_id uuid)
RETURNS public.order_status
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_steps public.order_status[];
  v_current_position integer;
  v_next_status public.order_status;
BEGIN
  SELECT current_order.* INTO v_order
  FROM public.orders AS current_order
  WHERE current_order.id = p_order_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_order.status = 'ORDER_CREATED'::public.order_status THEN
    RETURN CASE WHEN v_order.intake_method = 'PICKUP'::public.order_intake_method
      THEN 'WAITING_PICKUP'::public.order_status ELSE 'RECEIVED'::public.order_status END;
  ELSIF v_order.status = 'WAITING_PICKUP'::public.order_status THEN RETURN 'PICKED_UP'::public.order_status;
  ELSIF v_order.status = 'PICKED_UP'::public.order_status THEN RETURN 'RECEIVED'::public.order_status;
  ELSIF v_order.status = 'RECEIVED'::public.order_status THEN RETURN 'WEIGHING'::public.order_status;
  ELSIF v_order.status = 'WEIGHING'::public.order_status THEN RETURN 'WAITING_PROCESS'::public.order_status;
  ELSIF v_order.status = 'READY'::public.order_status THEN
    RETURN CASE WHEN v_order.return_method = 'DELIVERY'::public.order_return_method
      THEN 'OUT_FOR_DELIVERY'::public.order_status ELSE 'COMPLETED'::public.order_status END;
  ELSIF v_order.status = 'OUT_FOR_DELIVERY'::public.order_status THEN RETURN 'COMPLETED'::public.order_status;
  ELSIF v_order.status IN ('COMPLETED'::public.order_status, 'CANCELLED'::public.order_status) THEN RETURN NULL;
  END IF;

  SELECT ARRAY_REMOVE(ARRAY[
    CASE WHEN bool_or(item.production_steps_snapshot @> ARRAY['WASHING'::public.order_status]) THEN 'WASHING'::public.order_status END,
    CASE WHEN bool_or(item.production_steps_snapshot @> ARRAY['DRYING'::public.order_status]) THEN 'DRYING'::public.order_status END,
    CASE WHEN bool_or(item.production_steps_snapshot @> ARRAY['IRONING'::public.order_status]) THEN 'IRONING'::public.order_status END,
    CASE WHEN bool_or(item.production_steps_snapshot @> ARRAY['QUALITY_CONTROL'::public.order_status]) THEN 'QUALITY_CONTROL'::public.order_status END,
    CASE WHEN bool_or(item.production_steps_snapshot @> ARRAY['PACKING'::public.order_status]) THEN 'PACKING'::public.order_status END,
    CASE WHEN bool_or(item.production_steps_snapshot @> ARRAY['READY'::public.order_status]) THEN 'READY'::public.order_status END
  ], NULL)
  INTO v_steps
  FROM public.order_items AS item
  WHERE item.order_id = p_order_id;

  IF v_steps IS NULL OR cardinality(v_steps) = 0 THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_PRODUCTION_WORKFLOW_NOT_FOUND', ERRCODE = '22023';
  END IF;

  IF v_order.status = 'WAITING_PROCESS'::public.order_status THEN
    RETURN v_steps[1];
  END IF;

  v_current_position := array_position(ARRAY[
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'IRONING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ], v_order.status);

  SELECT step INTO v_next_status
  FROM unnest(v_steps) AS step
  WHERE array_position(ARRAY[
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'IRONING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ], step) > v_current_position
  ORDER BY array_position(ARRAY[
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'IRONING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status,
    'READY'::public.order_status
  ], step)
  LIMIT 1;

  RETURN v_next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_expected_next_status(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_admin_order_status(
  p_order_id uuid,
  p_to_status public.order_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := (SELECT auth.uid());
  v_order public.orders%ROWTYPE;
  v_expected_status public.order_status;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_active_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '42501';
  END IF;

  SELECT current_order.* INTO v_order
  FROM public.orders AS current_order
  WHERE current_order.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_FOUND', ERRCODE = 'P0002'; END IF;
  IF v_order.status IN ('COMPLETED'::public.order_status, 'CANCELLED'::public.order_status) THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_STATUS_TERMINAL', ERRCODE = '22023';
  END IF;

  v_expected_status := public.get_order_expected_next_status(p_order_id);

  IF p_to_status IS DISTINCT FROM v_expected_status
    AND p_to_status IS DISTINCT FROM 'CANCELLED'::public.order_status THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_STATUS_TRANSITION', ERRCODE = '22023';
  END IF;

  UPDATE public.orders
  SET status = p_to_status,
      actual_completion_at = CASE WHEN p_to_status = 'COMPLETED'::public.order_status
        THEN pg_catalog.clock_timestamp() ELSE actual_completion_at END
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (p_order_id, v_order.status, p_to_status, v_admin_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_admin_order_status(uuid, public.order_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_admin_order_status(uuid, public.order_status) TO authenticated;
