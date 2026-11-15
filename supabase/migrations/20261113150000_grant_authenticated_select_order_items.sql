-- Allow authenticated users to read order items.
-- Row Level Security tetap menentukan data mana yang boleh dibaca.

GRANT SELECT
ON TABLE public.order_items
TO authenticated;

NOTIFY pgrst, 'reload schema';