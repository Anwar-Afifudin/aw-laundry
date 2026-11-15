ALTER TABLE public.order_items
ADD COLUMN production_status public.order_status;

CREATE TABLE public.order_item_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items (id) ON DELETE RESTRICT,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  changed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_status IS NULL OR from_status <> to_status),
  CHECK (
    from_status IS NULL
    OR from_status IN (
      'WAITING_PROCESS'::public.order_status,
      'WASHING'::public.order_status,
      'DRYING'::public.order_status,
      'IRONING'::public.order_status,
      'QUALITY_CONTROL'::public.order_status,
      'PACKING'::public.order_status,
      'READY'::public.order_status
    )
  ),
  CHECK (
    to_status IN (
      'WAITING_PROCESS'::public.order_status,
      'WASHING'::public.order_status,
      'DRYING'::public.order_status,
      'IRONING'::public.order_status,
      'QUALITY_CONTROL'::public.order_status,
      'PACKING'::public.order_status,
      'READY'::public.order_status
    )
  )
);

CREATE INDEX order_item_status_history_item_created_at_idx
  ON public.order_item_status_history (order_item_id, created_at);

ALTER TABLE public.order_item_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read history from own order items"
  ON public.order_item_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_items AS item
      JOIN public.orders AS customer_order ON customer_order.id = item.order_id
      WHERE item.id = order_item_status_history.order_item_id
        AND customer_order.customer_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Active admins can read all order item history"
  ON public.order_item_status_history
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

REVOKE ALL ON TABLE public.order_item_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.order_item_status_history TO authenticated;

-- Infer one current production state for existing items. This does not invent
-- timestamps for each historical step; a single baseline event is added below.
WITH order_backfill_status AS (
  SELECT
    current_order.id AS order_id,
    CASE
      WHEN current_order.status = 'CANCELLED'::public.order_status THEN (
        SELECT history.to_status
        FROM public.order_status_history AS history
        WHERE history.order_id = current_order.id
          AND history.to_status IN (
            'WAITING_PROCESS'::public.order_status,
            'WASHING'::public.order_status,
            'DRYING'::public.order_status,
            'IRONING'::public.order_status,
            'QUALITY_CONTROL'::public.order_status,
            'PACKING'::public.order_status,
            'READY'::public.order_status
          )
        ORDER BY history.created_at DESC, history.id DESC
        LIMIT 1
      )
      ELSE current_order.status
    END AS effective_status,
    current_order.status = 'CANCELLED'::public.order_status AS is_cancelled
  FROM public.orders AS current_order
), inferred_item_status AS (
  SELECT
    item.id AS order_item_id,
    CASE
      WHEN backfill.effective_status IN (
        'READY'::public.order_status,
        'OUT_FOR_DELIVERY'::public.order_status,
        'COMPLETED'::public.order_status
      ) THEN 'READY'::public.order_status
      WHEN backfill.effective_status = 'WAITING_PROCESS'::public.order_status
        THEN 'WAITING_PROCESS'::public.order_status
      WHEN backfill.effective_status IN (
        'WASHING'::public.order_status,
        'DRYING'::public.order_status,
        'IRONING'::public.order_status,
        'QUALITY_CONTROL'::public.order_status,
        'PACKING'::public.order_status
      ) THEN COALESCE(
        (
          SELECT step.value
          FROM pg_catalog.unnest(item.production_steps_snapshot) WITH ORDINALITY AS step(value, position)
          WHERE CASE step.value
            WHEN 'WASHING'::public.order_status THEN 1
            WHEN 'DRYING'::public.order_status THEN 2
            WHEN 'IRONING'::public.order_status THEN 3
            WHEN 'QUALITY_CONTROL'::public.order_status THEN 4
            WHEN 'PACKING'::public.order_status THEN 5
            WHEN 'READY'::public.order_status THEN 6
          END <= CASE backfill.effective_status
            WHEN 'WASHING'::public.order_status THEN 1
            WHEN 'DRYING'::public.order_status THEN 2
            WHEN 'IRONING'::public.order_status THEN 3
            WHEN 'QUALITY_CONTROL'::public.order_status THEN 4
            WHEN 'PACKING'::public.order_status THEN 5
          END
          ORDER BY step.position DESC
          LIMIT 1
        ),
        CASE WHEN backfill.is_cancelled THEN NULL ELSE 'WAITING_PROCESS'::public.order_status END
      )
      ELSE NULL
    END AS production_status
  FROM public.order_items AS item
  JOIN order_backfill_status AS backfill ON backfill.order_id = item.order_id
)
UPDATE public.order_items AS item
SET production_status = inferred.production_status
FROM inferred_item_status AS inferred
WHERE inferred.order_item_id = item.id;

INSERT INTO public.order_item_status_history (
  order_item_id,
  from_status,
  to_status,
  changed_by,
  note
)
SELECT
  item.id,
  NULL,
  item.production_status,
  NULL,
  'BACKFILLED_FROM_ORDER_STATUS'
FROM public.order_items AS item
WHERE item.production_status IS NOT NULL;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_production_status_valid
CHECK (
  production_status IS NULL
  OR production_status = 'WAITING_PROCESS'::public.order_status
  OR production_status = ANY(production_steps_snapshot)
);

CREATE OR REPLACE FUNCTION public.require_verified_quantities_before_processing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'WEIGHING'::public.order_status
    AND NEW.status = 'WAITING_PROCESS'::public.order_status
  THEN
    IF EXISTS (
      SELECT 1
      FROM public.order_items AS item
      WHERE item.order_id = OLD.id
        AND (item.actual_quantity IS NULL OR item.actual_quantity <= 0)
    ) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'ACTUAL_QUANTITY_REQUIRED',
        ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.order_items AS item
      WHERE item.order_id = OLD.id
        AND item.billing_unit_snapshot = 'KG'::public.service_billing_unit
        AND (item.actual_item_count IS NULL OR item.actual_item_count <= 0)
    ) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'KG_ITEM_COUNT_REQUIRED',
        ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.order_items AS item
      WHERE item.order_id = OLD.id
        AND item.final_subtotal IS NULL
    ) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'FINAL_SUBTOTAL_REQUIRED',
        ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_order_expected_next_status(p_order_id uuid)
RETURNS public.order_status
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT current_order.* INTO v_order
  FROM public.orders AS current_order
  WHERE current_order.id = p_order_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  CASE v_order.status
    WHEN 'ORDER_CREATED'::public.order_status THEN
      RETURN CASE WHEN v_order.intake_method = 'PICKUP'::public.order_intake_method
        THEN 'WAITING_PICKUP'::public.order_status ELSE 'RECEIVED'::public.order_status END;
    WHEN 'WAITING_PICKUP'::public.order_status THEN RETURN 'PICKED_UP'::public.order_status;
    WHEN 'PICKED_UP'::public.order_status THEN RETURN 'RECEIVED'::public.order_status;
    WHEN 'RECEIVED'::public.order_status THEN RETURN 'WEIGHING'::public.order_status;
    WHEN 'WEIGHING'::public.order_status THEN RETURN 'WAITING_PROCESS'::public.order_status;
    WHEN 'READY'::public.order_status THEN
      RETURN CASE WHEN v_order.return_method = 'DELIVERY'::public.order_return_method
        THEN 'OUT_FOR_DELIVERY'::public.order_status ELSE 'COMPLETED'::public.order_status END;
    WHEN 'OUT_FOR_DELIVERY'::public.order_status THEN RETURN 'COMPLETED'::public.order_status;
    ELSE RETURN NULL;
  END CASE;
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

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  IF v_order.status IN ('COMPLETED'::public.order_status, 'CANCELLED'::public.order_status) THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_STATUS_TERMINAL', ERRCODE = '22023';
  END IF;

  v_expected_status := public.get_order_expected_next_status(p_order_id);

  IF p_to_status IS DISTINCT FROM 'CANCELLED'::public.order_status
    AND (v_expected_status IS NULL OR p_to_status IS DISTINCT FROM v_expected_status)
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_STATUS_TRANSITION', ERRCODE = '22023';
  END IF;

  IF v_order.status = 'WEIGHING'::public.order_status
    AND p_to_status = 'WAITING_PROCESS'::public.order_status
  THEN
    WITH queued_items AS (
      UPDATE public.order_items AS item
      SET production_status = 'WAITING_PROCESS'::public.order_status
      WHERE item.order_id = p_order_id
        AND item.production_status IS NULL
      RETURNING item.id
    )
    INSERT INTO public.order_item_status_history (
      order_item_id,
      from_status,
      to_status,
      changed_by
    )
    SELECT
      queued.id,
      NULL,
      'WAITING_PROCESS'::public.order_status,
      v_admin_id
    FROM queued_items AS queued;

    IF EXISTS (
      SELECT 1
      FROM public.order_items AS item
      WHERE item.order_id = p_order_id
        AND item.production_status IS DISTINCT FROM 'WAITING_PROCESS'::public.order_status
    ) THEN
      RAISE EXCEPTION USING MESSAGE = 'ORDER_ITEMS_NOT_READY_FOR_PRODUCTION', ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.orders
  SET status = p_to_status,
      actual_completion_at = CASE
        WHEN p_to_status = 'COMPLETED'::public.order_status
          THEN pg_catalog.clock_timestamp()
        ELSE actual_completion_at
      END
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by)
  VALUES (p_order_id, v_order.status, p_to_status, v_admin_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_admin_order_status(uuid, public.order_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_admin_order_status(uuid, public.order_status) TO authenticated;

CREATE FUNCTION public.update_admin_order_item_production_status(
  p_order_item_id uuid,
  p_to_status public.order_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := (SELECT auth.uid());
  v_order_id uuid;
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_current_position integer;
  v_expected_status public.order_status;
  v_aggregate_status public.order_status;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_active_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '42501';
  END IF;

  SELECT item.order_id INTO v_order_id
  FROM public.order_items AS item
  WHERE item.id = p_order_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_ITEM_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  SELECT current_order.* INTO v_order
  FROM public.orders AS current_order
  WHERE current_order.id = v_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  SELECT item.* INTO v_item
  FROM public.order_items AS item
  WHERE item.id = p_order_item_id
    AND item.order_id = v_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_ITEM_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  IF v_order.status IN ('COMPLETED'::public.order_status, 'CANCELLED'::public.order_status) THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_STATUS_TERMINAL', ERRCODE = '22023';
  END IF;

  IF v_order.status NOT IN (
    'WAITING_PROCESS'::public.order_status,
    'WASHING'::public.order_status,
    'DRYING'::public.order_status,
    'IRONING'::public.order_status,
    'QUALITY_CONTROL'::public.order_status,
    'PACKING'::public.order_status
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_IN_PRODUCTION', ERRCODE = '22023';
  END IF;

  IF v_item.production_status IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_ITEM_NOT_QUEUED_FOR_PRODUCTION', ERRCODE = '22023';
  END IF;

  IF v_item.production_status = 'READY'::public.order_status THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_ITEM_PRODUCTION_COMPLETE', ERRCODE = '22023';
  END IF;

  IF v_item.production_status = 'WAITING_PROCESS'::public.order_status THEN
    v_expected_status := v_item.production_steps_snapshot[1];
  ELSE
    v_current_position := pg_catalog.array_position(
      v_item.production_steps_snapshot,
      v_item.production_status
    );

    IF v_current_position IS NULL THEN
      RAISE EXCEPTION USING MESSAGE = 'ORDER_ITEM_PRODUCTION_STATUS_INVALID', ERRCODE = '22023';
    END IF;

    v_expected_status := v_item.production_steps_snapshot[v_current_position + 1];
  END IF;

  IF v_expected_status IS NULL OR p_to_status IS DISTINCT FROM v_expected_status THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ITEM_PRODUCTION_TRANSITION', ERRCODE = '22023';
  END IF;

  UPDATE public.order_items
  SET production_status = p_to_status
  WHERE id = p_order_item_id;

  INSERT INTO public.order_item_status_history (
    order_item_id,
    from_status,
    to_status,
    changed_by
  )
  VALUES (
    p_order_item_id,
    v_item.production_status,
    p_to_status,
    v_admin_id
  );

  SELECT CASE
    WHEN pg_catalog.bool_and(item.production_status = 'READY'::public.order_status)
      THEN 'READY'::public.order_status
    WHEN pg_catalog.bool_or(
      item.production_status IS NULL
      OR item.production_status = 'WAITING_PROCESS'::public.order_status
    ) THEN 'WAITING_PROCESS'::public.order_status
    ELSE CASE pg_catalog.min(
      CASE item.production_status
        WHEN 'WASHING'::public.order_status THEN 1
        WHEN 'DRYING'::public.order_status THEN 2
        WHEN 'IRONING'::public.order_status THEN 3
        WHEN 'QUALITY_CONTROL'::public.order_status THEN 4
        WHEN 'PACKING'::public.order_status THEN 5
        WHEN 'READY'::public.order_status THEN 6
      END
    )
      WHEN 1 THEN 'WASHING'::public.order_status
      WHEN 2 THEN 'DRYING'::public.order_status
      WHEN 3 THEN 'IRONING'::public.order_status
      WHEN 4 THEN 'QUALITY_CONTROL'::public.order_status
      WHEN 5 THEN 'PACKING'::public.order_status
      WHEN 6 THEN 'READY'::public.order_status
    END
  END
  INTO v_aggregate_status
  FROM public.order_items AS item
  WHERE item.order_id = v_order_id;

  IF v_aggregate_status IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_PRODUCTION_AGGREGATE_INVALID', ERRCODE = '22023';
  END IF;

  IF v_aggregate_status IS DISTINCT FROM v_order.status THEN
    UPDATE public.orders
    SET status = v_aggregate_status
    WHERE id = v_order_id;

    INSERT INTO public.order_status_history (
      order_id,
      from_status,
      to_status,
      changed_by
    )
    VALUES (
      v_order_id,
      v_order.status,
      v_aggregate_status,
      v_admin_id
    );
  END IF;
END;
$$;

REVOKE ALL
  ON FUNCTION public.update_admin_order_item_production_status(uuid, public.order_status)
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.update_admin_order_item_production_status(uuid, public.order_status)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
