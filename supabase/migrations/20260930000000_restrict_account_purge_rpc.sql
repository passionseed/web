-- Account purges must only run through the authenticated server-side route.
-- Default privileges grant new public-schema functions directly to anon and
-- authenticated, so revoking PUBLIC alone does not remove their access.

REVOKE ALL ON FUNCTION public.purge_user_account_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_user_account_data(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.purge_user_account_data(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_account_data(uuid) TO service_role;
