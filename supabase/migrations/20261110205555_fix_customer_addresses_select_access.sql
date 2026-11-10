REVOKE ALL PRIVILEGES
  ON TABLE public.addresses
  FROM PUBLIC, anon, authenticated;

GRANT SELECT
  ON TABLE public.addresses
  TO authenticated;

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select own addresses"
  ON public.addresses
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = customer_id);
