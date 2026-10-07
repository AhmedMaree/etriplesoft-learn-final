-- The hosted Supabase project provides this event trigger to enable RLS on new
-- public tables. Keep the trigger, but prevent callers through the Data API.
-- Local Supabase may not install this platform function, so guard the ACL fix.
DO $migration$
BEGIN
  IF pg_catalog.to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated';
  END IF;
END;
$migration$;
