CREATE TYPE public.user_role AS ENUM (
  'CUSTOMER',
  'ADMIN'
);

CREATE TYPE public.service_price_type AS ENUM (
  'PER_KG',
  'PER_ITEM',
  'PER_METER',
  'FIXED'
);

CREATE TYPE public.order_status AS ENUM (
  'ORDER_CREATED',
  'WAITING_PICKUP',
  'PICKED_UP',
  'RECEIVED',
  'WEIGHING',
  'WAITING_PROCESS',
  'WASHING',
  'DRYING',
  'IRONING',
  'QUALITY_CONTROL',
  'PACKING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE public.order_intake_method AS ENUM (
  'PICKUP',
  'DROPOFF'
);

CREATE TYPE public.order_return_method AS ENUM (
  'DELIVERY',
  'CUSTOMER_PICKUP'
);

CREATE TYPE public.payment_status AS ENUM (
  'UNPAID',
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'CUSTOMER',
  full_name text NOT NULL CHECK (btrim(full_name) <> ''),
  phone text NOT NULL CHECK (btrim(phone) <> ''),
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- service_categories and the services.category_id foreign key are introduced
-- together in a later migration so this migration remains limited to its six
-- requested application tables and never leaves an unenforced category UUID.
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  slug text NOT NULL UNIQUE CHECK (btrim(slug) <> ''),
  description text,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  price_type public.service_price_type NOT NULL,
  estimated_duration_hours integer NOT NULL CHECK (estimated_duration_hours > 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  label text NOT NULL CHECK (btrim(label) <> ''),
  recipient_name text NOT NULL CHECK (btrim(recipient_name) <> ''),
  phone text NOT NULL CHECK (btrim(phone) <> ''),
  address_line text NOT NULL CHECK (btrim(address_line) <> ''),
  city text,
  district text,
  postal_code text,
  latitude numeric(9, 6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(10, 6) CHECK (longitude BETWEEN -180 AND 180),
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE
    CHECK (order_number ~ '^AWL-[0-9]{8}-[0-9]{4}$'),
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'ORDER_CREATED',
  intake_method public.order_intake_method NOT NULL,
  return_method public.order_return_method NOT NULL,
  estimated_completion_at timestamptz,
  actual_completion_at timestamptz,
  special_instructions text,
  admin_notes text,
  estimated_subtotal numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (estimated_subtotal >= 0),
  final_subtotal numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (final_subtotal >= 0),
  pickup_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (pickup_fee >= 0),
  delivery_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (discount_amount >= 0),
  additional_charge numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (additional_charge >= 0),
  estimated_total numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (estimated_total >= 0),
  final_total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (final_total >= 0),
  payment_status public.payment_status NOT NULL DEFAULT 'UNPAID',
  pickup_address_snapshot jsonb
    CHECK (
      pickup_address_snapshot IS NULL
      OR jsonb_typeof(pickup_address_snapshot) = 'object'
    ),
  delivery_address_snapshot jsonb
    CHECK (
      delivery_address_snapshot IS NULL
      OR jsonb_typeof(delivery_address_snapshot) = 'object'
    ),
  pickup_scheduled_at timestamptz,
  pickup_actual_at timestamptz,
  delivery_scheduled_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_pickup_address_snapshot_required_for_pickup
    CHECK (
      intake_method <> 'PICKUP'
      OR pickup_address_snapshot IS NOT NULL
    ),
  CONSTRAINT orders_delivery_address_snapshot_required_for_delivery
    CHECK (
      return_method <> 'DELIVERY'
      OR delivery_address_snapshot IS NOT NULL
    )
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  service_name_snapshot text NOT NULL
    CHECK (btrim(service_name_snapshot) <> ''),
  price_type_snapshot public.service_price_type NOT NULL,
  unit_price_snapshot numeric(12, 2) NOT NULL
    CHECK (unit_price_snapshot >= 0),
  estimated_quantity numeric(12, 3)
    CHECK (estimated_quantity IS NULL OR estimated_quantity > 0),
  actual_quantity numeric(12, 3)
    CHECK (actual_quantity IS NULL OR actual_quantity > 0),
  estimated_subtotal numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (estimated_subtotal >= 0),
  final_subtotal numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (final_subtotal >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  changed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_status IS NULL OR from_status <> to_status)
);

CREATE INDEX addresses_customer_id_idx
  ON public.addresses (customer_id);

CREATE UNIQUE INDEX addresses_one_default_per_customer_idx
  ON public.addresses (customer_id)
  WHERE is_default;

CREATE INDEX orders_customer_id_idx
  ON public.orders (customer_id);

CREATE INDEX orders_status_idx
  ON public.orders (status);

CREATE INDEX orders_payment_status_idx
  ON public.orders (payment_status);

CREATE INDEX orders_created_at_idx
  ON public.orders (created_at DESC);

CREATE INDEX order_items_order_id_idx
  ON public.order_items (order_id);

CREATE INDEX order_items_service_id_idx
  ON public.order_items (service_id);

CREATE INDEX order_status_history_order_id_created_at_idx
  ON public.order_status_history (order_id, created_at);

CREATE INDEX order_status_history_changed_by_idx
  ON public.order_status_history (changed_by);

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER services_set_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER addresses_set_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER order_items_set_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active services"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
