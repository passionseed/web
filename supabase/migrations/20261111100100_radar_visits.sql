-- Radar Guide: one visits table for the hub and field pages, written only through
-- record_radar_visit() (spec 3.2). utm values are sanitised in SQL; no usernames or IGSIDs.
-- Also closes anon read access on the existing Radar analytics views. Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.radar_visits (
  visit_id      uuid PRIMARY KEY,
  session_id    text NOT NULL CHECK (session_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field_slug    text CHECK (field_slug IS NULL OR field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'), -- NULL = /radar hub
  utm_source    text CHECK (utm_source    IS NULL OR utm_source    ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_medium    text CHECK (utm_medium    IS NULL OR utm_medium    ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_campaign  text CHECK (utm_campaign  IS NULL OR utm_campaign  ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_content   text CHECK (utm_content   IS NULL OR utm_content   ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$'),
  referrer_host text CHECK (referrer_host IS NULL OR referrer_host ~ '^[a-z0-9.-]{1,253}$'),
  ua_app        text CHECK (ua_app IS NULL OR ua_app IN ('instagram','tiktok','line','facebook','other')),
  created_at    timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_visits_created_idx ON public.radar_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS radar_visits_field_idx   ON public.radar_visits (field_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS radar_visits_session_idx ON public.radar_visits (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS radar_visits_source_idx  ON public.radar_visits (utm_source, created_at DESC) WHERE utm_source IS NOT NULL;
ALTER TABLE public.radar_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read radar visits" ON public.radar_visits;
CREATE POLICY "admins read radar visits" ON public.radar_visits
  FOR SELECT TO authenticated USING (public.is_admin((SELECT auth.uid())));
REVOKE ALL ON TABLE public.radar_visits FROM anon, authenticated;
GRANT SELECT ON TABLE public.radar_visits TO authenticated;

ALTER TABLE public.radar_path_intents ADD COLUMN IF NOT EXISTS visit_id uuid;
CREATE INDEX IF NOT EXISTS radar_path_intents_visit_idx ON public.radar_path_intents (visit_id) WHERE visit_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.radar_token(p text, p_case_sensitive boolean DEFAULT false)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_case_sensitive AND p ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$' THEN p
    WHEN NOT p_case_sensitive AND lower(p) ~ '^[a-z0-9][a-z0-9_.-]{0,63}$' THEN lower(p)
  END $$;

CREATE OR REPLACE FUNCTION private.record_radar_visit(
  p_session_id text, p_visit_id uuid, p_field_slug text DEFAULT NULL, p_attr jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := CASE WHEN coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN NULL ELSE auth.uid() END;
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9._:-]{8,128}$' OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'invalid radar session' USING ERRCODE = '22023'; END IF;
  IF p_attr IS NULL OR jsonb_typeof(p_attr) <> 'object' OR pg_column_size(p_attr) > 1024 THEN
    RAISE EXCEPTION 'invalid radar visit' USING ERRCODE = '22023'; END IF;
  IF p_field_slug IS NOT NULL AND NOT EXISTS (
     SELECT 1 FROM public.radar_fields WHERE slug = p_field_slug AND is_published) THEN
    RAISE EXCEPTION 'radar field not found' USING ERRCODE = 'P0002'; END IF;
  IF (SELECT count(*) FROM public.radar_visits
      WHERE session_id = p_session_id AND created_at >= now() - interval '1 minute') >= 20 THEN
    RAISE EXCEPTION 'radar visit rate limit' USING ERRCODE = 'P0001'; END IF;
  -- Global ceiling: session ids are caller-chosen, so the per-session cap alone
  -- does not bound a flood. The LIMIT keeps the check a short index scan.
  IF (SELECT count(*) FROM (SELECT 1 FROM public.radar_visits
      WHERE created_at >= now() - interval '1 minute' LIMIT 1200) recent) >= 1200 THEN
    RAISE EXCEPTION 'radar visit rate limit' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.radar_visits (visit_id, session_id, user_id, field_slug,
    utm_source, utm_medium, utm_campaign, utm_content, referrer_host, ua_app)
  VALUES (p_visit_id, p_session_id, v_uid, p_field_slug,
    private.radar_token(p_attr->>'utm_source'), private.radar_token(p_attr->>'utm_medium'),
    private.radar_token(p_attr->>'utm_campaign'), private.radar_token(p_attr->>'utm_content', true),
    CASE WHEN p_attr->>'referrer_host' ~ '^[a-z0-9.-]{1,253}$' THEN p_attr->>'referrer_host' END,
    CASE WHEN p_attr->>'ua_app' IN ('instagram','tiktok','line','facebook','other') THEN p_attr->>'ua_app' END)
  ON CONFLICT (visit_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.record_radar_visit(
  p_session_id text, p_visit_id uuid, p_field_slug text DEFAULT NULL, p_attr jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.record_radar_visit(p_session_id, p_visit_id, p_field_slug, p_attr) $$;
REVOKE ALL ON FUNCTION private.radar_token(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_radar_visit(text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_radar_visit(text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_radar_visit(text, uuid, text, jsonb) TO anon, authenticated;

-- Existing aggregate views were created without security_invoker, so anon can read them.
ALTER VIEW public.analytics_radar_engagement SET (security_invoker = true);
ALTER VIEW public.analytics_radar_totals     SET (security_invoker = true);
ALTER VIEW public.analytics_radar_interest   SET (security_invoker = true);
REVOKE ALL ON public.analytics_radar_engagement, public.analytics_radar_totals, public.analytics_radar_interest FROM anon;
GRANT SELECT ON public.analytics_radar_engagement, public.analytics_radar_totals, public.analytics_radar_interest TO authenticated;
