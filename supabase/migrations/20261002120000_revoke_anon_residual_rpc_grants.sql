-- Remove residual direct EXECUTE grants to anon left by Supabase default
-- privileges on public-schema RPCs (REVOKE ... FROM PUBLIC does not remove
-- per-role grants; see 20260930000000_restrict_account_purge_rpc.sql).
-- Bodies audited 2026-10-02: all are fail-closed for anon today, so this is
-- least-privilege hardening, not a live leak fix. authenticated must keep
-- EXECUTE (server components/actions call these with the session key), so
-- only anon is revoked.

REVOKE ALL ON FUNCTION public.pseed_join_cohort(text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.pseed_cohort_heatmap(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.pseed_set_availability(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.pseed_is_participant(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.pseed_cohort_slot_roster(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.pseed_cohort_tags(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.pseed_participant_stats(uuid) FROM anon;

-- set_profile_visibility had no explicit REVOKE at all (anon + PUBLIC held
-- default grants) and its ownership check failed open for NULL auth.uid()
-- (NULL != uid evaluates NULL, so the IF skipped the RAISE — the same
-- pattern as purge_user_account_data). Revoke anon/PUBLIC and make the body
-- check fail closed. authenticated keeps EXECUTE (granted in
-- 20260612233000_public_profiles.sql); service_role keeps its default grant.

REVOKE ALL ON FUNCTION public.set_profile_visibility(uuid, boolean, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_profile_visibility(uuid, boolean, text[]) FROM anon;

CREATE OR REPLACE FUNCTION public.set_profile_visibility(
  p_user_id          uuid,
  p_is_public        boolean,
  p_published_sections text[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT (p_published_sections <@ ARRAY['class','ikigai','growth','portfolio']::text[]) THEN
    RAISE EXCEPTION 'invalid section';
  END IF;
  INSERT INTO public_profiles (user_id, is_public, published_sections)
    VALUES (p_user_id, p_is_public, p_published_sections)
    ON CONFLICT (user_id)
    DO UPDATE SET
      is_public          = EXCLUDED.is_public,
      published_sections = EXCLUDED.published_sections;
END; $$;
