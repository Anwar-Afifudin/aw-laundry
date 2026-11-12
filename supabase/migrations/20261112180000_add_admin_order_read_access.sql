CREATE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role = 'ADMIN'::public.user_role
      AND profile.is_active = true
  );
$$;

REVOKE ALL
  ON FUNCTION public.is_active_admin()
  FROM PUBLIC, anon;

GRANT EXECUTE
  ON FUNCTION public.is_active_admin()
  TO authenticated;

CREATE POLICY "Active admins can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

CREATE POLICY "Active admins can read all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

CREATE POLICY "Active admins can read all order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));
