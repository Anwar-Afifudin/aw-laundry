-- Customer/anonymous access remains limited to active services. Admins need
-- catalogue-wide read and write access for the service management module.
GRANT INSERT, UPDATE
  ON TABLE public.services
  TO authenticated;

CREATE POLICY "Active admins can read all services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Active admins can create services"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_admin());

CREATE POLICY "Active admins can update services"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

NOTIFY pgrst, 'reload schema';
