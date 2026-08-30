CREATE OR REPLACE VIEW public.public_driver_profiles
WITH (security_invoker = on) AS
SELECT id, full_name, city, avatar_url, rating, trips_count
FROM public.profiles;

GRANT SELECT ON public.public_driver_profiles TO anon, authenticated;

GRANT SELECT (id, full_name, city, avatar_url, rating, trips_count)
ON public.profiles TO anon, authenticated;

CREATE POLICY "Public can read non-sensitive profile columns"
ON public.profiles
FOR SELECT
TO anon
USING (true);