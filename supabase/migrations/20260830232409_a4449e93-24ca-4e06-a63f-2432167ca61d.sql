DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

REVOKE SELECT ON public.profiles FROM anon;

CREATE OR REPLACE VIEW public.public_driver_profiles
WITH (security_invoker = off) AS
SELECT id, full_name, city, avatar_url, rating, trips_count
FROM public.profiles;

GRANT SELECT ON public.public_driver_profiles TO anon, authenticated;
GRANT ALL ON public.public_driver_profiles TO service_role;