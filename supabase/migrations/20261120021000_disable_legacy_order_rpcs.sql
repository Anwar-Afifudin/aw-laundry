-- Remove legacy order RPCs that have been replaced by hardened versions.
--
-- Replacements:
--   create_customer_order(...)       -> create_customer_order_multi(...)
--   verify_admin_order_quantities(...) -> verify_admin_order_quantities_v2(...)
--
-- Keeping the legacy functions exposed would leave outdated business rules
-- reachable through the Supabase RPC API.

DROP FUNCTION IF EXISTS public.create_customer_order(
  uuid,
  uuid,
  numeric,
  public.order_intake_method,
  public.order_return_method,
  uuid,
  uuid,
  text
);

DROP FUNCTION IF EXISTS public.verify_admin_order_quantities(
  uuid,
  jsonb
);

NOTIFY pgrst, 'reload schema';
