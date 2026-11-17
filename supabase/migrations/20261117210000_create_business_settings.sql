CREATE TABLE public.business_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'A&W Laundry'
    CHECK (
      pg_catalog.btrim(business_name) <> ''
      AND pg_catalog.char_length(business_name) <= 100
    ),
  phone text
    CHECK (
      phone IS NULL
      OR (
        pg_catalog.btrim(phone) <> ''
        AND pg_catalog.char_length(phone) <= 30
      )
    ),
  email text
    CHECK (
      email IS NULL
      OR (
        pg_catalog.btrim(email) <> ''
        AND pg_catalog.char_length(email) <= 254
      )
    ),
  address text
    CHECK (
      address IS NULL
      OR (
        pg_catalog.btrim(address) <> ''
        AND pg_catalog.char_length(address) <= 500
      )
    ),
  opening_time time,
  closing_time time,
  pickup_enabled boolean NOT NULL DEFAULT true,
  delivery_enabled boolean NOT NULL DEFAULT true,
  pickup_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (pickup_fee >= 0),
  delivery_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  minimum_order numeric(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER business_settings_set_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.business_settings (id)
VALUES (1);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active customers can read business settings"
  ON public.business_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS customer_profile
      WHERE customer_profile.id = (SELECT auth.uid())
        AND customer_profile.role = 'CUSTOMER'::public.user_role
        AND customer_profile.is_active = true
    )
  );

CREATE POLICY "Active admins can read business settings"
  ON public.business_settings
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

REVOKE ALL ON TABLE public.business_settings
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.business_settings
  TO authenticated;

CREATE FUNCTION public.update_business_settings(
  p_business_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_opening_time time,
  p_closing_time time,
  p_pickup_enabled boolean,
  p_delivery_enabled boolean,
  p_pickup_fee numeric,
  p_delivery_fee numeric,
  p_minimum_order numeric
)
RETURNS public.business_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := (SELECT auth.uid());
  v_business_name text := pg_catalog.btrim(p_business_name);
  v_phone text := NULLIF(pg_catalog.btrim(p_phone), '');
  v_email text := NULLIF(pg_catalog.btrim(p_email), '');
  v_address text := NULLIF(pg_catalog.btrim(p_address), '');
  v_settings public.business_settings%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_active_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '42501';
  END IF;

  IF v_business_name IS NULL
    OR v_business_name = ''
    OR pg_catalog.char_length(v_business_name) > 100
    OR (v_phone IS NOT NULL AND pg_catalog.char_length(v_phone) > 30)
    OR (v_email IS NOT NULL AND pg_catalog.char_length(v_email) > 254)
    OR (v_address IS NOT NULL AND pg_catalog.char_length(v_address) > 500)
    OR p_pickup_enabled IS NULL
    OR p_delivery_enabled IS NULL
    OR p_pickup_fee IS NULL
    OR p_pickup_fee < 0
    OR p_pickup_fee > 9999999999.99
    OR p_delivery_fee IS NULL
    OR p_delivery_fee < 0
    OR p_delivery_fee > 9999999999.99
    OR p_minimum_order IS NULL
    OR p_minimum_order < 0
    OR p_minimum_order > 9999999999.99
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_BUSINESS_SETTINGS', ERRCODE = '22023';
  END IF;

  UPDATE public.business_settings
  SET business_name = v_business_name,
      phone = v_phone,
      email = v_email,
      address = v_address,
      opening_time = p_opening_time,
      closing_time = p_closing_time,
      pickup_enabled = p_pickup_enabled,
      delivery_enabled = p_delivery_enabled,
      pickup_fee = p_pickup_fee,
      delivery_fee = p_delivery_fee,
      minimum_order = p_minimum_order
  WHERE id = 1
  RETURNING * INTO v_settings;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_BUSINESS_SETTINGS', ERRCODE = 'P0002';
  END IF;

  RETURN v_settings;
END;
$$;

REVOKE ALL ON FUNCTION public.update_business_settings(
  text,
  text,
  text,
  text,
  time,
  time,
  boolean,
  boolean,
  numeric,
  numeric,
  numeric
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_business_settings(
  text,
  text,
  text,
  text,
  time,
  time,
  boolean,
  boolean,
  numeric,
  numeric,
  numeric
) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_customer_order_multi(
  p_order_id uuid,
  p_items jsonb,
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
  v_special_instructions text := NULLIF(pg_catalog.btrim(p_special_instructions), '');
  v_existing_order public.orders%ROWTYPE;
  v_settings public.business_settings%ROWTYPE;
  v_item_count integer;
  v_estimated_subtotal numeric(12, 2);
  v_pickup_fee numeric(12, 2) := 0;
  v_delivery_fee numeric(12, 2) := 0;
  v_estimated_total numeric(12, 2);
  v_estimated_duration_hours integer;
  v_estimated_completion_at timestamptz;
  v_pickup_address_snapshot jsonb;
  v_delivery_address_snapshot jsonb;
  v_created_at timestamptz := pg_catalog.clock_timestamp();
  v_order_date date;
  v_order_number_prefix text;
  v_order_sequence integer;
  v_order_number text;
  v_service_names text;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = v_customer_id
      AND profile.role = 'CUSTOMER'::public.user_role
      AND profile.is_active = true
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'CUSTOMER_PROFILE_INVALID', ERRCODE = '42501';
  END IF;

  IF p_order_id IS NULL OR p_intake_method IS NULL OR p_return_method IS NULL
    OR p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) <> 'array'
    OR pg_catalog.jsonb_array_length(p_items) = 0
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ORDER_INPUT', ERRCODE = '22023';
  END IF;

  IF v_special_instructions IS NOT NULL AND pg_catalog.char_length(v_special_instructions) > 500 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_SPECIAL_INSTRUCTIONS', ERRCODE = '22023';
  END IF;

  IF (p_intake_method = 'PICKUP'::public.order_intake_method AND p_pickup_address_id IS NULL)
    OR (p_intake_method = 'DROPOFF'::public.order_intake_method AND p_pickup_address_id IS NOT NULL)
    OR (p_return_method = 'DELIVERY'::public.order_return_method AND p_delivery_address_id IS NULL)
    OR (p_return_method = 'CUSTOMER_PICKUP'::public.order_return_method AND p_delivery_address_id IS NOT NULL)
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ORDER_INPUT', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    WHERE pg_catalog.jsonb_typeof(item.value) IS DISTINCT FROM 'object'
      OR pg_catalog.jsonb_typeof(item.value -> 'service_id') IS DISTINCT FROM 'string'
      OR (item.value ->> 'service_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR pg_catalog.jsonb_typeof(item.value -> 'estimated_quantity') IS DISTINCT FROM 'number'
      OR (item.value ->> 'estimated_quantity')::numeric <= 0
      OR (item.value ->> 'estimated_quantity')::numeric > 999999999.999
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_ORDER_ITEMS', ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.jsonb_array_length(p_items) INTO v_item_count;

  IF v_item_count IS DISTINCT FROM (
    SELECT pg_catalog.count(DISTINCT (item.value ->> 'service_id')::uuid)
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'DUPLICATE_SERVICES', ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_order_id::text, 0));

  SELECT current_order.* INTO v_existing_order
  FROM public.orders AS current_order
  WHERE current_order.id = p_order_id;

  IF FOUND THEN
    IF v_existing_order.customer_id IS DISTINCT FROM v_customer_id
      OR v_existing_order.intake_method IS DISTINCT FROM p_intake_method
      OR v_existing_order.return_method IS DISTINCT FROM p_return_method
      OR v_existing_order.special_instructions IS DISTINCT FROM v_special_instructions
      OR (p_intake_method = 'PICKUP'::public.order_intake_method
        AND v_existing_order.pickup_address_snapshot ->> 'address_id' IS DISTINCT FROM p_pickup_address_id::text)
      OR (p_return_method = 'DELIVERY'::public.order_return_method
        AND v_existing_order.delivery_address_snapshot ->> 'address_id' IS DISTINCT FROM p_delivery_address_id::text)
      OR v_item_count IS DISTINCT FROM (SELECT pg_catalog.count(*) FROM public.order_items WHERE order_id = p_order_id)
      OR EXISTS (
        SELECT 1
        FROM pg_catalog.jsonb_array_elements(p_items) AS requested(value)
        LEFT JOIN public.order_items AS existing
          ON existing.order_id = p_order_id
          AND existing.service_id = (requested.value ->> 'service_id')::uuid
          AND existing.estimated_quantity = (requested.value ->> 'estimated_quantity')::numeric
        WHERE existing.id IS NULL
      )
    THEN
      RAISE EXCEPTION USING MESSAGE = 'ORDER_REQUEST_CONFLICT', ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT v_existing_order.id, v_existing_order.order_number, v_existing_order.status,
      (SELECT pg_catalog.string_agg(item.service_name_snapshot, ', ' ORDER BY item.created_at, item.id)
       FROM public.order_items AS item WHERE item.order_id = p_order_id),
      v_existing_order.estimated_total, v_existing_order.estimated_completion_at,
      v_existing_order.intake_method, v_existing_order.return_method, v_existing_order.created_at;
    RETURN;
  END IF;

  SELECT settings.*
  INTO v_settings
  FROM public.business_settings AS settings
  WHERE settings.id = 1
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'BUSINESS_SETTINGS_UNAVAILABLE', ERRCODE = 'P0002';
  END IF;

  IF p_intake_method = 'PICKUP'::public.order_intake_method
    AND NOT v_settings.pickup_enabled
  THEN
    RAISE EXCEPTION USING MESSAGE = 'PICKUP_UNAVAILABLE', ERRCODE = '22023';
  END IF;

  IF p_return_method = 'DELIVERY'::public.order_return_method
    AND NOT v_settings.delivery_enabled
  THEN
    RAISE EXCEPTION USING MESSAGE = 'DELIVERY_UNAVAILABLE', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    LEFT JOIN public.services AS service
      ON service.id = (item.value ->> 'service_id')::uuid AND service.is_active = true
    WHERE service.id IS NULL
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'SERVICE_UNAVAILABLE', ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
    JOIN public.services AS service ON service.id = (item.value ->> 'service_id')::uuid
    WHERE (service.billing_unit IN ('PAIR'::public.service_billing_unit, 'PCS'::public.service_billing_unit)
        AND (item.value ->> 'estimated_quantity')::numeric <> pg_catalog.trunc((item.value ->> 'estimated_quantity')::numeric))
      OR (service.billing_unit = 'KG'::public.service_billing_unit
        AND (item.value ->> 'estimated_quantity')::numeric * 10
          <> pg_catalog.trunc((item.value ->> 'estimated_quantity')::numeric * 10))
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_QUANTITY', ERRCODE = '22023';
  END IF;

  IF p_intake_method = 'PICKUP'::public.order_intake_method THEN
    SELECT pg_catalog.jsonb_build_object('address_id', address.id, 'label', address.label,
      'recipient_name', address.recipient_name, 'phone', address.phone, 'address_line', address.address_line,
      'city', address.city, 'district', address.district, 'postal_code', address.postal_code, 'notes', address.notes)
    INTO v_pickup_address_snapshot
    FROM public.addresses AS address
    WHERE address.id = p_pickup_address_id AND address.customer_id = v_customer_id
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'PICKUP_ADDRESS_INVALID', ERRCODE = '42501'; END IF;
  END IF;

  IF p_return_method = 'DELIVERY'::public.order_return_method THEN
    SELECT pg_catalog.jsonb_build_object('address_id', address.id, 'label', address.label,
      'recipient_name', address.recipient_name, 'phone', address.phone, 'address_line', address.address_line,
      'city', address.city, 'district', address.district, 'postal_code', address.postal_code, 'notes', address.notes)
    INTO v_delivery_address_snapshot
    FROM public.addresses AS address
    WHERE address.id = p_delivery_address_id AND address.customer_id = v_customer_id
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'DELIVERY_ADDRESS_INVALID', ERRCODE = '42501'; END IF;
  END IF;

  PERFORM service.id
  FROM pg_catalog.jsonb_array_elements(p_items) AS item(value)
  JOIN public.services AS service ON service.id = (item.value ->> 'service_id')::uuid
  FOR SHARE OF service;

  SELECT pg_catalog.round(pg_catalog.sum(service.price * (item.value ->> 'estimated_quantity')::numeric), 2),
    pg_catalog.max(service.estimated_duration_hours),
    pg_catalog.string_agg(service.name, ', ' ORDER BY item.position)
  INTO v_estimated_subtotal, v_estimated_duration_hours, v_service_names
  FROM pg_catalog.jsonb_array_elements(p_items) WITH ORDINALITY AS item(value, position)
  JOIN public.services AS service ON service.id = (item.value ->> 'service_id')::uuid;

  IF v_estimated_subtotal > 9999999999.99 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_QUANTITY', ERRCODE = '22023';
  END IF;

  IF v_estimated_subtotal < v_settings.minimum_order THEN
    RAISE EXCEPTION USING MESSAGE = 'MINIMUM_ORDER_NOT_MET', ERRCODE = '22023';
  END IF;

  v_pickup_fee := CASE
    WHEN p_intake_method = 'PICKUP'::public.order_intake_method
      THEN v_settings.pickup_fee
    ELSE 0
  END;
  v_delivery_fee := CASE
    WHEN p_return_method = 'DELIVERY'::public.order_return_method
      THEN v_settings.delivery_fee
    ELSE 0
  END;

  IF v_estimated_subtotal + v_pickup_fee + v_delivery_fee > 9999999999.99 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_QUANTITY', ERRCODE = '22023';
  END IF;

  v_estimated_total := v_estimated_subtotal + v_pickup_fee + v_delivery_fee;
  v_estimated_completion_at := v_created_at + pg_catalog.make_interval(hours => v_estimated_duration_hours);
  v_order_date := (v_created_at AT TIME ZONE 'Asia/Jakarta')::date;
  v_order_number_prefix := 'AWL-' || pg_catalog.to_char(v_order_date, 'YYYYMMDD') || '-';
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('order-number:' || v_order_date::text, 0));
  SELECT COALESCE(pg_catalog.max(pg_catalog.right(current_order.order_number, 4)::integer), 0) + 1
  INTO v_order_sequence FROM public.orders AS current_order
  WHERE current_order.order_number LIKE v_order_number_prefix || '%';
  IF v_order_sequence > 9999 THEN RAISE EXCEPTION USING MESSAGE = 'ORDER_NUMBER_LIMIT', ERRCODE = '54000'; END IF;
  v_order_number := v_order_number_prefix || pg_catalog.lpad(v_order_sequence::text, 4, '0');

  INSERT INTO public.orders (id, order_number, customer_id, status, intake_method, return_method,
    estimated_completion_at, special_instructions, estimated_subtotal, pickup_fee, delivery_fee,
    estimated_total, pickup_address_snapshot, delivery_address_snapshot, created_at, updated_at)
  VALUES (p_order_id, v_order_number, v_customer_id, 'ORDER_CREATED'::public.order_status,
    p_intake_method, p_return_method, v_estimated_completion_at, v_special_instructions,
    v_estimated_subtotal, v_pickup_fee, v_delivery_fee, v_estimated_total,
    v_pickup_address_snapshot, v_delivery_address_snapshot, v_created_at, v_created_at);

  INSERT INTO public.order_items (order_id, service_id, service_name_snapshot, price_type_snapshot,
    unit_price_snapshot, estimated_quantity, estimated_subtotal, created_at, updated_at)
  SELECT p_order_id, service.id, service.name, service.price_type, service.price,
    (item.value ->> 'estimated_quantity')::numeric,
    pg_catalog.round(service.price * (item.value ->> 'estimated_quantity')::numeric, 2),
    v_created_at, v_created_at
  FROM pg_catalog.jsonb_array_elements(p_items) WITH ORDINALITY AS item(value, position)
  JOIN public.services AS service ON service.id = (item.value ->> 'service_id')::uuid
  ORDER BY item.position;

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, created_at)
  VALUES (p_order_id, NULL, 'ORDER_CREATED'::public.order_status, v_customer_id, v_created_at);

  RETURN QUERY SELECT p_order_id, v_order_number, 'ORDER_CREATED'::public.order_status,
    v_service_names, v_estimated_total, v_estimated_completion_at,
    p_intake_method, p_return_method, v_created_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_customer_order_multi(
  uuid, jsonb, public.order_intake_method, public.order_return_method, uuid, uuid, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_customer_order_multi(
  uuid, jsonb, public.order_intake_method, public.order_return_method, uuid, uuid, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
