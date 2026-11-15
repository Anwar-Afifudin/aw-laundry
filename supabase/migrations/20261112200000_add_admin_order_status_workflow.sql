CREATE POLICY "Active admins can read all order status history"
  ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

CREATE FUNCTION public.update_admin_order_status(
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

  v_expected_status := CASE v_order.status
    WHEN 'ORDER_CREATED'::public.order_status THEN
      CASE WHEN v_order.intake_method = 'PICKUP'::public.order_intake_method
        THEN 'WAITING_PICKUP'::public.order_status ELSE 'RECEIVED'::public.order_status END
    WHEN 'WAITING_PICKUP'::public.order_status THEN 'PICKED_UP'::public.order_status
    WHEN 'PICKED_UP'::public.order_status THEN 'RECEIVED'::public.order_status
    WHEN 'RECEIVED'::public.order_status THEN 'WEIGHING'::public.order_status
    WHEN 'WEIGHING'::public.order_status THEN 'WAITING_PROCESS'::public.order_status
    WHEN 'WAITING_PROCESS'::public.order_status THEN 'WASHING'::public.order_status
    WHEN 'WASHING'::public.order_status THEN 'DRYING'::public.order_status
    WHEN 'DRYING'::public.order_status THEN 'IRONING'::public.order_status
    WHEN 'IRONING'::public.order_status THEN 'QUALITY_CONTROL'::public.order_status
    WHEN 'QUALITY_CONTROL'::public.order_status THEN 'PACKING'::public.order_status
    WHEN 'PACKING'::public.order_status THEN 'READY'::public.order_status
    WHEN 'READY'::public.order_status THEN
      CASE WHEN v_order.return_method = 'DELIVERY'::public.order_return_method
        THEN 'OUT_FOR_DELIVERY'::public.order_status ELSE 'COMPLETED'::public.order_status END
    WHEN 'OUT_FOR_DELIVERY'::public.order_status THEN 'COMPLETED'::public.order_status
    ELSE NULL
  END;

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
