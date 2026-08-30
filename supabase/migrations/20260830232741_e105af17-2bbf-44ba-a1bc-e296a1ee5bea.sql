DROP POLICY IF EXISTS "Public can read non-sensitive profile columns" ON public.profiles;

REVOKE ALL ON public.profiles FROM anon;

DROP VIEW IF EXISTS public.public_driver_profiles;

CREATE VIEW public.public_driver_profiles
WITH (security_invoker = off) AS
SELECT id, full_name, city, avatar_url, rating, trips_count
FROM public.profiles;

REVOKE ALL ON public.public_driver_profiles FROM PUBLIC;
GRANT SELECT ON public.public_driver_profiles TO anon, authenticated;
GRANT ALL ON public.public_driver_profiles TO service_role;