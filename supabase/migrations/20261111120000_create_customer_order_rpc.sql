CREATE OR REPLACE FUNCTION public.create_customer_order(
  p_order_id uuid,
  p_service_id uuid,
  p_estimated_quantity numeric,
  p_intake_method public.order_intake_method,
  p_return_method public.order_return_method,
  p_pickup_address_id uuid,
  p_delivery_address_id uuid,
  p_special_instructions text
)
RETURNS TABLE (
  id uuid,
  order_number text,
  status public.order_status,
  service_name text,
  estimated_total numeric,
  estimated_completion_at timestamptz,
  intake_method public.order_intake_method,
  return_method public.order_return_method,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_customer_id uuid := (SELECT auth.uid());
  v_special_instructions text;
  v_existing_order public.orders%ROWTYPE;
  v_existing_item public.order_items%ROWTYPE;
  v_existing_item_count bigint;
  v_service_name text;
  v_service_price numeric(12, 2);
  v_service_price_type public.service_price_type;
  v_estimated_duration_hours integer;
  v_estimated_subtotal numeric;
  v_estimated_completion_at timestamptz;
  v_pickup_address_snapshot jsonb;
  v_delivery_address_snapshot jsonb;
  v_created_at timestamptz := pg_catalog.clock_timestamp();
  v_order_date date;
  v_order_number_prefix text;
  v_order_sequence integer;
  v_order_number text;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'AUTH_REQUIRED',
      ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = v_customer_id
      AND profile.role = 'CUSTOMER'::public.user_role
      AND profile.is_active = true
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'CUSTOMER_PROFILE_INVALID',
      ERRCODE = '42501';
  END IF;

  v_special_instructions := NULLIF(
    pg_catalog.btrim(p_special_instructions),
    ''
  );

  IF p_order_id IS NULL
    OR p_service_id IS NULL
    OR p_estimated_quantity IS NULL
    OR p_intake_method IS NULL
    OR p_return_method IS NULL
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_ORDER_INPUT',
      ERRCODE = '22023';
  END IF;

  IF p_estimated_quantity <= 0
    OR p_estimated_quantity > 999999999.999
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_QUANTITY',
      ERRCODE = '22023';
  END IF;

  IF v_special_instructions IS NOT NULL
    AND pg_catalog.char_length(v_special_instructions) > 500
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_SPECIAL_INSTRUCTIONS',
      ERRCODE = '22023';
  END IF;

  IF p_intake_method = 'PICKUP'::public.order_intake_method
    AND p_pickup_address_id IS NULL
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'PICKUP_ADDRESS_REQUIRED',
      ERRCODE = '22023';
  END IF;

  IF p_intake_method = 'DROPOFF'::public.order_intake_method
    AND p_pickup_address_id IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_ORDER_INPUT',
      ERRCODE = '22023';
  END IF;

  IF p_return_method = 'DELIVERY'::public.order_return_method
    AND p_delivery_address_id IS NULL
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'DELIVERY_ADDRESS_REQUIRED',
      ERRCODE = '22023';
  END IF;

  IF p_return_method = 'CUSTOMER_PICKUP'::public.order_return_method
    AND p_delivery_address_id IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_ORDER_INPUT',
      ERRCODE = '22023';
  END IF;

  -- Serialize retries for the same client-generated order ID. A retry after a
  -- committed response was lost returns the original order instead of creating
  -- a duplicate.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_order_id::text, 0)
  );

  SELECT existing_order.*
  INTO v_existing_order
  FROM public.orders AS existing_order
  WHERE existing_order.id = p_order_id;

  IF FOUND THEN
    IF v_existing_order.customer_id IS DISTINCT FROM v_customer_id THEN
      RAISE EXCEPTION USING
        MESSAGE = 'ORDER_REQUEST_CONFLICT',
        ERRCODE = '22023';
    END IF;

    SELECT pg_catalog.count(*)
    INTO v_existing_item_count
    FROM public.order_items AS existing_item
    WHERE existing_item.order_id = p_order_id;

    IF v_existing_item_count <> 1 THEN
      RAISE EXCEPTION USING
        MESSAGE = 'ORDER_REQUEST_CONFLICT',
        ERRCODE = '22023';
    END IF;

    SELECT existing_item.*
    INTO v_existing_item
    FROM public.order_items AS existing_item
    WHERE existing_item.order_id = p_order_id;

    IF v_existing_item.service_id IS DISTINCT FROM p_service_id
      OR v_existing_item.estimated_quantity IS DISTINCT FROM p_estimated_quantity
      OR v_existing_order.intake_method IS DISTINCT FROM p_intake_method
      OR v_existing_order.return_method IS DISTINCT FROM p_return_method
      OR v_existing_order.special_instructions IS DISTINCT FROM v_special_instructions
      OR (
        p_intake_method = 'PICKUP'::public.order_intake_method
        AND v_existing_order.pickup_address_snapshot ->> 'address_id'
          IS DISTINCT FROM p_pickup_address_id::text
      )
      OR (
        p_return_method = 'DELIVERY'::public.order_return_method
        AND v_existing_order.delivery_address_snapshot ->> 'address_id'
          IS DISTINCT FROM p_delivery_address_id::text
      )
    THEN
      RAISE EXCEPTION USING
        MESSAGE = 'ORDER_REQUEST_CONFLICT',
        ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT
      v_existing_order.id,
      v_existing_order.order_number,
      'ORDER_CREATED'::public.order_status,
      v_existing_item.service_name_snapshot,
      v_existing_order.estimated_total,
      v_existing_order.estimated_completion_at,
      v_existing_order.intake_method,
      v_existing_order.return_method,
      v_existing_order.created_at;
    RETURN;
  END IF;

  SELECT
    service.name,
    service.price,
    service.price_type,
    service.estimated_duration_hours
  INTO
    v_service_name,
    v_service_price,
    v_service_price_type,
    v_estimated_duration_hours
  FROM public.services AS service
  WHERE service.id = p_service_id
    AND service.is_active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      MESSAGE = 'SERVICE_UNAVAILABLE',
      ERRCODE = '22023';
  END IF;

  IF v_service_price_type = 'PER_ITEM'::public.service_price_type THEN
    IF p_estimated_quantity <> pg_catalog.trunc(p_estimated_quantity) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'INVALID_QUANTITY',
        ERRCODE = '22023';
    END IF;
  ELSIF v_service_price_type = 'PER_KG'::public.service_price_type THEN
    IF p_estimated_quantity * 10
      <> pg_catalog.trunc(p_estimated_quantity * 10)
    THEN
      RAISE EXCEPTION USING
        MESSAGE = 'INVALID_QUANTITY',
        ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION USING
      MESSAGE = 'SERVICE_TYPE_UNSUPPORTED',
      ERRCODE = '22023';
  END IF;

  v_estimated_subtotal := pg_catalog.round(
    v_service_price * p_estimated_quantity,
    2
  );

  IF v_estimated_subtotal > 9999999999.99 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_QUANTITY',
      ERRCODE = '22023';
  END IF;

  IF p_intake_method = 'PICKUP'::public.order_intake_method THEN
    SELECT pg_catalog.jsonb_build_object(
      'address_id', address.id,
      'label', address.label,
      'recipient_name', address.recipient_name,
      'phone', address.phone,
      'address_line', address.address_line,
      'city', address.city,
      'district', address.district,
      'postal_code', address.postal_code,
      'notes', address.notes
    )
    INTO v_pickup_address_snapshot
    FROM public.addresses AS address
    WHERE address.id = p_pickup_address_id
      AND address.customer_id = v_customer_id
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        MESSAGE = 'PICKUP_ADDRESS_INVALID',
        ERRCODE = '42501';
    END IF;
  END IF;

  IF p_return_method = 'DELIVERY'::public.order_return_method THEN
    SELECT pg_catalog.jsonb_build_object(
      'address_id', address.id,
      'label', address.label,
      'recipient_name', address.recipient_name,
      'phone', address.phone,
      'address_line', address.address_line,
      'city', address.city,
      'district', address.district,
      'postal_code', address.postal_code,
      'notes', address.notes
    )
    INTO v_delivery_address_snapshot
    FROM public.addresses AS address
    WHERE address.id = p_delivery_address_id
      AND address.customer_id = v_customer_id
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        MESSAGE = 'DELIVERY_ADDRESS_INVALID',
        ERRCODE = '42501';
    END IF;
  END IF;

  v_estimated_completion_at := v_created_at
    + pg_catalog.make_interval(hours => v_estimated_duration_hours);
  v_order_date := (v_created_at AT TIME ZONE 'Asia/Jakarta')::date;
  v_order_number_prefix := 'AWL-'
    || pg_catalog.to_char(v_order_date, 'YYYYMMDD')
    || '-';

  -- One transaction at a time allocates the sequence for a Jakarta calendar
  -- date, preventing duplicate human-readable order numbers.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('order-number:' || v_order_date::text, 0)
  );

  SELECT COALESCE(
    pg_catalog.max(pg_catalog.right(current_order.order_number, 4)::integer),
    0
  ) + 1
  INTO v_order_sequence
  FROM public.orders AS current_order
  WHERE current_order.order_number LIKE v_order_number_prefix || '%';

  IF v_order_sequence > 9999 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'ORDER_NUMBER_LIMIT',
      ERRCODE = '54000';
  END IF;

  v_order_number := v_order_number_prefix
    || pg_catalog.lpad(v_order_sequence::text, 4, '0');

  INSERT INTO public.orders (
    id,
    order_number,
    customer_id,
    status,
    intake_method,
    return_method,
    estimated_completion_at,
    special_instructions,
    estimated_subtotal,
    estimated_total,
    pickup_address_snapshot,
    delivery_address_snapshot,
    created_at,
    updated_at
  )
  VALUES (
    p_order_id,
    v_order_number,
    v_customer_id,
    'ORDER_CREATED'::public.order_status,
    p_intake_method,
    p_return_method,
    v_estimated_completion_at,
    v_special_instructions,
    v_estimated_subtotal,
    v_estimated_subtotal,
    v_pickup_address_snapshot,
    v_delivery_address_snapshot,
    v_created_at,
    v_created_at
  );

  INSERT INTO public.order_items (
    order_id,
    service_id,
    service_name_snapshot,
    price_type_snapshot,
    unit_price_snapshot,
    estimated_quantity,
    estimated_subtotal,
    created_at,
    updated_at
  )
  VALUES (
    p_order_id,
    p_service_id,
    v_service_name,
    v_service_price_type,
    v_service_price,
    p_estimated_quantity,
    v_estimated_subtotal,
    v_created_at,
    v_created_at
  );

  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by,
    created_at
  )
  VALUES (
    p_order_id,
    NULL,
    'ORDER_CREATED'::public.order_status,
    v_customer_id,
    v_created_at
  );

  RETURN QUERY
  SELECT
    p_order_id,
    v_order_number,
    'ORDER_CREATED'::public.order_status,
    v_service_name,
    v_estimated_subtotal,
    v_estimated_completion_at,
    p_intake_method,
    p_return_method,
    v_created_at;
END;
$function$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.orders, public.order_items, public.order_status_history
  FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.create_customer_order(
    uuid,
    uuid,
    numeric,
    public.order_intake_method,
    public.order_return_method,
    uuid,
    uuid,
    text
  )
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.create_customer_order(
    uuid,
    uuid,
    numeric,
    public.order_intake_method,
    public.order_return_method,
    uuid,
    uuid,
    text
  )
  TO authenticated;
