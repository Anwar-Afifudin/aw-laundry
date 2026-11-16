CREATE TYPE public.complaint_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE public.complaint_category AS ENUM (
  'SERVICE_QUALITY',
  'ITEM_DAMAGE',
  'ITEM_LOST',
  'PICKUP_DELIVERY',
  'BILLING',
  'OTHER'
);

CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  category public.complaint_category NOT NULL,
  subject text NOT NULL
    CHECK (pg_catalog.btrim(subject) <> '' AND pg_catalog.char_length(subject) <= 120),
  description text NOT NULL
    CHECK (pg_catalog.btrim(description) <> '' AND pg_catalog.char_length(description) <= 3000),
  status public.complaint_status NOT NULL DEFAULT 'OPEN',
  resolution_notes text
    CHECK (resolution_notes IS NULL OR pg_catalog.char_length(resolution_notes) <= 3000),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.complaint_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL
    REFERENCES public.complaints (id) ON DELETE CASCADE,
  from_status public.complaint_status,
  to_status public.complaint_status NOT NULL,
  note text CHECK (note IS NULL OR pg_catalog.char_length(note) <= 3000),
  changed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_status IS NULL OR from_status <> to_status)
);

CREATE INDEX complaints_customer_id_idx
  ON public.complaints (customer_id);

CREATE INDEX complaints_order_id_idx
  ON public.complaints (order_id);

CREATE INDEX complaints_status_idx
  ON public.complaints (status);

CREATE INDEX complaints_created_at_idx
  ON public.complaints (created_at DESC);

CREATE INDEX complaint_status_history_complaint_id_created_at_idx
  ON public.complaint_status_history (complaint_id, created_at);

CREATE TRIGGER complaints_set_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own complaints"
  ON public.complaints
  FOR SELECT
  TO authenticated
  USING (customer_id = (SELECT auth.uid()));

CREATE POLICY "Active admins can read all complaints"
  ON public.complaints
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

CREATE POLICY "Customers can read history from own complaints"
  ON public.complaint_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.complaints AS customer_complaint
      WHERE customer_complaint.id = complaint_status_history.complaint_id
        AND customer_complaint.customer_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Active admins can read all complaint history"
  ON public.complaint_status_history
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

REVOKE ALL ON TABLE public.complaints, public.complaint_status_history
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.complaints, public.complaint_status_history
  TO authenticated;

CREATE FUNCTION public.create_customer_complaint(
  p_order_id uuid,
  p_category public.complaint_category,
  p_subject text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer_id uuid := (SELECT auth.uid());
  v_subject text := pg_catalog.btrim(p_subject);
  v_description text := pg_catalog.btrim(p_description);
  v_complaint_id uuid;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '28000';
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

  IF p_order_id IS NULL OR p_category IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_COMPLAINT_INPUT', ERRCODE = '22023';
  END IF;

  IF v_subject IS NULL
    OR v_subject = ''
    OR pg_catalog.char_length(v_subject) > 120
  THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_COMPLAINT_SUBJECT', ERRCODE = '22023';
  END IF;

  IF v_description IS NULL
    OR v_description = ''
    OR pg_catalog.char_length(v_description) > 3000
  THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_COMPLAINT_DESCRIPTION',
      ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.orders AS customer_order
    WHERE customer_order.id = p_order_id
      AND customer_order.customer_id = v_customer_id
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'ORDER_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.complaints (
    order_id,
    customer_id,
    category,
    subject,
    description
  ) VALUES (
    p_order_id,
    v_customer_id,
    p_category,
    v_subject,
    v_description
  )
  RETURNING id INTO v_complaint_id;

  INSERT INTO public.complaint_status_history (
    complaint_id,
    from_status,
    to_status,
    changed_by
  ) VALUES (
    v_complaint_id,
    NULL,
    'OPEN'::public.complaint_status,
    v_customer_id
  );

  RETURN v_complaint_id;
END;
$$;

CREATE FUNCTION public.update_admin_complaint_status(
  p_complaint_id uuid,
  p_to_status public.complaint_status,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := (SELECT auth.uid());
  v_complaint public.complaints%ROWTYPE;
  v_expected_status public.complaint_status;
  v_note text := NULLIF(pg_catalog.btrim(p_note), '');
  v_changed_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_active_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '42501';
  END IF;

  IF p_complaint_id IS NULL OR p_to_status IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_COMPLAINT_INPUT', ERRCODE = '22023';
  END IF;

  IF v_note IS NOT NULL AND pg_catalog.char_length(v_note) > 3000 THEN
    RAISE EXCEPTION USING MESSAGE = 'COMPLAINT_NOTE_TOO_LONG', ERRCODE = '22023';
  END IF;

  SELECT complaint.*
  INTO v_complaint
  FROM public.complaints AS complaint
  WHERE complaint.id = p_complaint_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'COMPLAINT_NOT_FOUND', ERRCODE = 'P0002';
  END IF;

  v_expected_status := CASE v_complaint.status
    WHEN 'OPEN'::public.complaint_status
      THEN 'IN_PROGRESS'::public.complaint_status
    WHEN 'IN_PROGRESS'::public.complaint_status
      THEN 'RESOLVED'::public.complaint_status
    WHEN 'RESOLVED'::public.complaint_status
      THEN 'CLOSED'::public.complaint_status
    ELSE NULL
  END;

  IF p_to_status IS DISTINCT FROM v_expected_status THEN
    RAISE EXCEPTION USING
      MESSAGE = 'INVALID_COMPLAINT_STATUS_TRANSITION',
      ERRCODE = '22023';
  END IF;

  IF p_to_status = 'RESOLVED'::public.complaint_status AND v_note IS NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'COMPLAINT_RESOLUTION_NOTES_REQUIRED',
      ERRCODE = '22023';
  END IF;

  UPDATE public.complaints
  SET status = p_to_status,
      resolution_notes = CASE
        WHEN p_to_status = 'RESOLVED'::public.complaint_status THEN v_note
        ELSE resolution_notes
      END,
      resolved_at = CASE
        WHEN p_to_status = 'RESOLVED'::public.complaint_status THEN v_changed_at
        ELSE resolved_at
      END,
      closed_at = CASE
        WHEN p_to_status = 'CLOSED'::public.complaint_status THEN v_changed_at
        ELSE closed_at
      END
  WHERE id = p_complaint_id;

  INSERT INTO public.complaint_status_history (
    complaint_id,
    from_status,
    to_status,
    note,
    changed_by,
    created_at
  ) VALUES (
    p_complaint_id,
    v_complaint.status,
    p_to_status,
    v_note,
    v_admin_id,
    v_changed_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_customer_complaint(
  uuid,
  public.complaint_category,
  text,
  text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_customer_complaint(
  uuid,
  public.complaint_category,
  text,
  text
) TO authenticated;

REVOKE ALL ON FUNCTION public.update_admin_complaint_status(
  uuid,
  public.complaint_status,
  text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_admin_complaint_status(
  uuid,
  public.complaint_status,
  text
) TO authenticated;

NOTIFY pgrst, 'reload schema';
