DROP VIEW IF EXISTS public.public_driver_profiles;

CREATE OR REPLACE FUNCTION public.get_public_driver_profiles(ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  city text,
  avatar_url text,
  rating numeric,
  trips_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.city, p.avatar_url, p.rating, p.trips_count
  FROM public.profiles p
  WHERE p.id = ANY(ids);
$$;

REVOKE ALL ON FUNCTION public.get_public_driver_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_driver_profiles(uuid[]) TO anon, authenticated, service_role;