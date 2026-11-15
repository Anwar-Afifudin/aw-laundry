UPDATE public.services
SET production_steps = ARRAY[
  'WASHING'::public.order_status,
  'DRYING'::public.order_status,
  'QUALITY_CONTROL'::public.order_status,
  'PACKING'::public.order_status,
  'READY'::public.order_status
]
WHERE slug = 'laundry-sepatu';
