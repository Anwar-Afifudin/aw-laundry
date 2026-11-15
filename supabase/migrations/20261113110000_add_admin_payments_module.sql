CREATE TYPE public.payment_method AS ENUM (
  'CASH',
  'BANK_TRANSFER',
  'QRIS',
  'COD'
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0::numeric),
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL,
  proof_url text,
  reference_number text,
  paid_at timestamptz,
  confirmed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_paid_fields_match_status CHECK (
    (status = 'PAID'::public.payment_status AND paid_at IS NOT NULL AND confirmed_by IS NOT NULL)
    OR
    (status <> 'PAID'::public.payment_status AND paid_at IS NULL)
  )
);

CREATE INDEX payments_order_id_created_at_idx
  ON public.payments (order_id, created_at DESC);

CREATE INDEX payments_status_paid_at_idx
  ON public.payments (status, paid_at DESC);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders AS customer_order
      WHERE customer_order.id = payments.order_id
        AND customer_order.customer_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Active admins can read all payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

REVOKE ALL ON TABLE public.payments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.payments
  FROM authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;

CREATE FUNCTION public.update_admin_payment(
  p_order_id uuid,
  p_status public.payment_status,
  p_method public.payment_method,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := (SELECT auth.uid());
  v_order public.orders%ROWTYPE;
  v_pending_payment_id uuid;
  v_notes text := NULLIF(pg_catalog.btrim(p_notes), '');
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_active_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN (
    'PENDING'::public.payment_status,
    'PAID'::public.payment_status,
    'FAILED'::public.payment_status
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_PAYMENT_STATUS', ERRCODE = '22023';
  END IF;

  IF p_method IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'PAYMENT_METHOD_REQUIRED', ERRCODE = '22023';
  END IF;

  IF v_notes IS NOT NULL AND pg_catalog.char_length(v_notes) > 1000 THEN
    RAISE EXCEPTION USING MESSAGE = 'PAYMENT_NOTES_TOO_LONG', ERRCODE = '22023';
  END IF;

  SELECT current_order.*
  INTO v_order
  FROM public.orders AS current_order
  WHERE current_order.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  IF v_order.status = 'CANCELLED'::public.order_status THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_CANCELLED', ERRCODE = '22023';
  END IF;

  IF v_order.payment_status IN (
    'PAID'::public.payment_status,
    'REFUNDED'::public.payment_status
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'PAYMENT_STATUS_TERMINAL', ERRCODE = '22023';
  END IF;

  IF v_order.final_total <= 0::numeric OR EXISTS (
    SELECT 1
    FROM public.order_items AS item
    WHERE item.order_id = p_order_id
      AND item.actual_quantity IS NULL
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'FINAL_TOTAL_NOT_READY', ERRCODE = '22023';
  END IF;

  IF v_order.payment_status = 'PENDING'::public.payment_status
    AND p_status = 'PENDING'::public.payment_status THEN
    RAISE EXCEPTION USING MESSAGE = 'PAYMENT_ALREADY_PENDING', ERRCODE = '22023';
  END IF;

  IF v_order.payment_status = 'PENDING'::public.payment_status THEN
    SELECT payment.id
    INTO v_pending_payment_id
    FROM public.payments AS payment
    WHERE payment.order_id = p_order_id
      AND payment.status = 'PENDING'::public.payment_status
    ORDER BY payment.created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_pending_payment_id IS NOT NULL THEN
    UPDATE public.payments
    SET amount = v_order.final_total,
        method = p_method,
        status = p_status,
        paid_at = CASE
          WHEN p_status = 'PAID'::public.payment_status
            THEN pg_catalog.clock_timestamp()
          ELSE NULL
        END,
        confirmed_by = CASE
          WHEN p_status = 'PAID'::public.payment_status THEN v_admin_id
          ELSE NULL
        END,
        notes = v_notes
    WHERE id = v_pending_payment_id;
  ELSE
    INSERT INTO public.payments (
      order_id,
      amount,
      method,
      status,
      paid_at,
      confirmed_by,
      notes
    ) VALUES (
      p_order_id,
      v_order.final_total,
      p_method,
      p_status,
      CASE
        WHEN p_status = 'PAID'::public.payment_status
          THEN pg_catalog.clock_timestamp()
        ELSE NULL
      END,
      CASE
        WHEN p_status = 'PAID'::public.payment_status THEN v_admin_id
        ELSE NULL
      END,
      v_notes
    );
  END IF;

  UPDATE public.orders
  SET payment_status = p_status
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL
  ON FUNCTION public.update_admin_payment(
    uuid,
    public.payment_status,
    public.payment_method,
    text
  )
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.update_admin_payment(
    uuid,
    public.payment_status,
    public.payment_method,
    text
  )
  TO authenticated;

NOTIFY pgrst, 'reload schema';
