REVOKE ALL ON public.audit_log FROM anon, authenticated;
REVOKE ALL ON public.bookings FROM anon, authenticated;
REVOKE ALL ON public.driver_applications FROM anon, authenticated;
REVOKE ALL ON public.notifications FROM anon, authenticated;
REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.rides FROM anon, authenticated;
REVOKE ALL ON public.stripe_events FROM anon, authenticated;
REVOKE ALL ON public.user_roles FROM anon, authenticated;

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

GRANT SELECT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.driver_applications TO authenticated;
GRANT ALL ON public.driver_applications TO service_role;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.rides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rides TO authenticated;
GRANT ALL ON public.rides TO service_role;

GRANT ALL ON public.stripe_events TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;