CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone
  )
  VALUES (
    NEW.id,
    'CUSTOMER'::public.user_role,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE
  ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL PRIVILEGES
  ON TABLE public.profiles
  FROM PUBLIC, anon, authenticated;

GRANT SELECT
  ON TABLE public.profiles
  TO authenticated;

GRANT UPDATE (full_name, phone, avatar_url)
  ON TABLE public.profiles
  TO authenticated;

CREATE POLICY "Authenticated users can select own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
