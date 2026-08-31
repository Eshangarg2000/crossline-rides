REVOKE EXECUTE ON FUNCTION public.expire_stale_holds(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.expire_stale_holds(uuid) TO service_role;