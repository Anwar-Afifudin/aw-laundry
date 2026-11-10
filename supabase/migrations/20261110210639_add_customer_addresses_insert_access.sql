REVOKE ALL PRIVILEGES
  ON TABLE public.addresses
  FROM PUBLIC, anon, authenticated;

GRANT SELECT
  ON TABLE public.addresses
  TO authenticated;

GRANT INSERT (
  customer_id,
  label,
  recipient_name,
  phone,
  address_line,
  district,
  city,
  postal_code,
  notes,
  is_default
)
  ON TABLE public.addresses
  TO authenticated;

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert own addresses"
  ON public.addresses
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = customer_id);
