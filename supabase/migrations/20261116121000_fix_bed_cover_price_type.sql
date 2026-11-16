UPDATE public.services
SET price_type = 'PER_KG'::public.service_price_type
WHERE slug = 'bed-cover'
  AND billing_unit = 'KG'::public.service_billing_unit;
