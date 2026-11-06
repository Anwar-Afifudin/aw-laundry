INSERT INTO public.services (
  name,
  slug,
  description,
  price,
  price_type,
  estimated_duration_hours,
  image_url,
  is_active
)
VALUES
  (
    'Cuci Kering',
    'cuci-kering',
    'Layanan cuci dan pengeringan pakaian tanpa setrika.',
    7000,
    'PER_KG'::public.service_price_type,
    24,
    NULL,
    true
  ),
  (
    'Cuci + Setrika',
    'cuci-setrika',
    'Layanan lengkap cuci, pengeringan, dan setrika pakaian.',
    10000,
    'PER_KG'::public.service_price_type,
    24,
    NULL,
    true
  ),
  (
    'Setrika Saja',
    'setrika-saja',
    'Layanan setrika untuk pakaian yang sudah dicuci.',
    6000,
    'PER_KG'::public.service_price_type,
    24,
    NULL,
    true
  ),
  (
    'Bed Cover',
    'bed-cover',
    'Layanan pencucian dan pengeringan bed cover.',
    25000,
    'PER_ITEM'::public.service_price_type,
    48,
    NULL,
    true
  ),
  (
    'Laundry Sepatu',
    'laundry-sepatu',
    'Layanan pencucian sepatu dengan penanganan khusus.',
    30000,
    'PER_ITEM'::public.service_price_type,
    72,
    NULL,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  estimated_duration_hours = EXCLUDED.estimated_duration_hours,
  image_url = EXCLUDED.image_url,
  is_active = EXCLUDED.is_active;
