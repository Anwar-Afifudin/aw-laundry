REVOKE ALL PRIVILEGES
  ON TABLE public.services
  FROM anon, authenticated;

GRANT SELECT
  ON TABLE public.services
  TO anon, authenticated;
