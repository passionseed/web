-- Radar Guide: guide events, career requests, channel helper and the funnel view (spec 3.3).
-- Postgres regex uses \y for a word boundary (never \b). Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.radar_guide_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL,
  session_id  text NOT NULL CHECK (session_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field_slug  text CHECK (field_slug IS NULL OR field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  event_type  text NOT NULL CHECK (event_type IN ('chapter_view','video_play','video_unmute','video_progress',
                'video_complete','interactive_tap','cta_click','follow_click','share_click')),
  chapter_key text CHECK (chapter_key IS NULL OR chapter_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  card_id     uuid REFERENCES public.radar_cards(id) ON DELETE SET NULL,
  target      text CHECK (target IS NULL OR target ~ '^[a-z0-9][a-z0-9_.:-]{0,63}$'),
  value_int   integer CHECK (value_int IS NULL OR value_int BETWEEN 0 AND 100000),
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb
              CHECK (jsonb_typeof(metadata) = 'object' AND pg_column_size(metadata) <= 1024),
  created_at  timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_guide_events_field_type_idx ON public.radar_guide_events (field_slug, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS radar_guide_events_visit_idx ON public.radar_guide_events (visit_id);
CREATE INDEX IF NOT EXISTS radar_guide_events_session_idx ON public.radar_guide_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS radar_guide_events_created_idx ON public.radar_guide_events (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS radar_guide_events_once_uidx ON public.radar_guide_events
  (visit_id, event_type, (coalesce(chapter_key, '')), (coalesce(value_int, -1)))
  WHERE event_type IN ('chapter_view','video_play','video_unmute','video_progress','video_complete');
ALTER TABLE public.radar_guide_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read radar guide events" ON public.radar_guide_events;
CREATE POLICY "admins read radar guide events" ON public.radar_guide_events
  FOR SELECT TO authenticated USING (public.is_admin((SELECT auth.uid())));
REVOKE ALL ON TABLE public.radar_guide_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.radar_guide_events TO authenticated;

CREATE OR REPLACE FUNCTION private.record_radar_guide_event(
  p_session_id text, p_visit_id uuid, p_event_type text, p_field_slug text DEFAULT NULL,
  p_chapter_key text DEFAULT NULL, p_card_id uuid DEFAULT NULL, p_target text DEFAULT NULL,
  p_value_int integer DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_field_id uuid;
  v_uid uuid := CASE WHEN coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN NULL ELSE auth.uid() END;
BEGIN
  IF p_event_type IS NULL OR p_event_type NOT IN ('chapter_view','video_play','video_unmute','video_progress',
     'video_complete','interactive_tap','cta_click','follow_click','share_click') THEN
    RAISE EXCEPTION 'invalid radar guide event' USING ERRCODE = '22023'; END IF;
  IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9._:-]{8,128}$' OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'invalid radar session' USING ERRCODE = '22023'; END IF;
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' OR pg_column_size(p_metadata) > 1024 THEN
    RAISE EXCEPTION 'invalid radar guide metadata' USING ERRCODE = '22023'; END IF;
  IF p_field_slug IS NOT NULL THEN
    SELECT id INTO v_field_id FROM public.radar_fields WHERE slug = p_field_slug AND is_published;
    IF v_field_id IS NULL THEN RAISE EXCEPTION 'radar field not found' USING ERRCODE = 'P0002'; END IF;
  END IF;
  IF p_card_id IS NOT NULL AND (v_field_id IS NULL OR NOT EXISTS (
     SELECT 1 FROM public.radar_cards c WHERE c.id = p_card_id AND c.field_id = v_field_id)) THEN
    RAISE EXCEPTION 'radar card not in field' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.radar_guide_events
      WHERE session_id = p_session_id AND created_at >= now() - interval '1 minute') >= 60 THEN
    RAISE EXCEPTION 'radar guide rate limit' USING ERRCODE = 'P0001'; END IF;
  -- Global ceiling: session ids are caller-chosen, so the per-session cap alone
  -- does not bound a flood. The LIMIT keeps the check a short index scan.
  IF (SELECT count(*) FROM (SELECT 1 FROM public.radar_guide_events
      WHERE created_at >= now() - interval '1 minute' LIMIT 6000) recent) >= 6000 THEN
    RAISE EXCEPTION 'radar guide rate limit' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.radar_guide_events (visit_id, session_id, user_id, field_slug, event_type,
    chapter_key, card_id, target, value_int, metadata)
  VALUES (p_visit_id, p_session_id, v_uid, p_field_slug, p_event_type,
    CASE WHEN p_chapter_key ~ '^[a-z][a-z0-9_]{1,31}$' THEN p_chapter_key END, p_card_id,
    CASE WHEN p_target ~ '^[a-z0-9][a-z0-9_.:-]{0,63}$' THEN p_target END,
    CASE WHEN p_value_int BETWEEN 0 AND 100000 THEN p_value_int END, p_metadata)
  ON CONFLICT (visit_id, event_type, (coalesce(chapter_key, '')), (coalesce(value_int, -1)))
    WHERE event_type IN ('chapter_view','video_play','video_unmute','video_progress','video_complete')
  DO NOTHING;
END $$;
CREATE OR REPLACE FUNCTION public.record_radar_guide_event(
  p_session_id text, p_visit_id uuid, p_event_type text, p_field_slug text DEFAULT NULL,
  p_chapter_key text DEFAULT NULL, p_card_id uuid DEFAULT NULL, p_target text DEFAULT NULL,
  p_value_int integer DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.record_radar_guide_event(p_session_id, p_visit_id, p_event_type, p_field_slug,
    p_chapter_key, p_card_id, p_target, p_value_int, p_metadata) $$;
REVOKE ALL ON FUNCTION private.record_radar_guide_event(text,uuid,text,text,text,uuid,text,integer,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_radar_guide_event(text,uuid,text,text,text,uuid,text,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_radar_guide_event(text,uuid,text,text,text,uuid,text,integer,jsonb) TO anon, authenticated;

-- Career requests: free text from minors. Admin-only, no contact details, never shown publicly.
CREATE TABLE IF NOT EXISTS public.radar_career_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source             text NOT NULL DEFAULT 'page' CHECK (source IN ('page','ig_comment')),
  session_id         text CHECK (session_id IS NULL OR session_id ~ '^[A-Za-z0-9._:-]{8,128}$'),
  visit_id           uuid,
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_field_slug    text CHECK (from_field_slug IS NULL OR from_field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  request_text       text NOT NULL CHECK (char_length(request_text) BETWEEN 2 AND 80),
  matched_field_slug text,
  status             text NOT NULL DEFAULT 'new' CHECK (status IN ('new','merged','planned','published','rejected')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT radar_career_requests_page_session CHECK (source <> 'page' OR session_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS radar_career_requests_text_idx ON public.radar_career_requests (lower(request_text));
CREATE INDEX IF NOT EXISTS radar_career_requests_created_idx ON public.radar_career_requests (created_at DESC);
ALTER TABLE public.radar_career_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage career requests" ON public.radar_career_requests;
CREATE POLICY "admins manage career requests" ON public.radar_career_requests
  FOR ALL TO authenticated USING (public.is_admin((SELECT auth.uid()))) WITH CHECK (public.is_admin((SELECT auth.uid())));
REVOKE ALL ON TABLE public.radar_career_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.radar_career_requests TO authenticated;

CREATE OR REPLACE FUNCTION private.submit_radar_career_request(
  p_session_id text, p_visit_id uuid, p_text text, p_from_field_slug text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_text text := btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'));
  v_uid uuid := CASE WHEN coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN NULL ELSE auth.uid() END;
BEGIN
  IF p_session_id IS NULL OR p_session_id !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid radar session id' USING ERRCODE = '22023'; END IF;
  IF char_length(v_text) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION 'invalid career request' USING ERRCODE = '22023'; END IF;
  -- Real contact data only: URLs, domains, @handles and emails, and runs of 8+ digits.
  -- No Thai keyword blocks: เชฟร้านเบอร์เกอร์, อินฟลูเอนเซอร์ไอจี and ไลน์แมน are real careers.
  -- Mirrored in lib/radar-guide/career-request.ts validateCareerRequest().
  IF v_text ~* '(https?://|www\.|\.(com|net|org|co|me|th|io|ly|gg)\y|@[a-z0-9_.]{2,}|[0-9][0-9 -]{6,}[0-9])' THEN
    RAISE EXCEPTION 'career request has contact details' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.radar_career_requests
      WHERE session_id = p_session_id AND created_at >= now() - interval '1 hour') >= 5
     OR (SELECT count(*) FROM public.radar_career_requests WHERE created_at >= now() - interval '1 hour') >= 300 THEN
    RAISE EXCEPTION 'career request rate limit' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.radar_career_requests (source, session_id, visit_id, user_id, from_field_slug, request_text)
  VALUES ('page', p_session_id, p_visit_id, v_uid,
    CASE WHEN p_from_field_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN p_from_field_slug END, v_text);
END $$;
CREATE OR REPLACE FUNCTION public.submit_radar_career_request(
  p_session_id text, p_visit_id uuid, p_text text, p_from_field_slug text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.submit_radar_career_request(p_session_id, p_visit_id, p_text, p_from_field_slug) $$;
REVOKE ALL ON FUNCTION private.submit_radar_career_request(text,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_radar_career_request(text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_radar_career_request(text,uuid,text,text) TO anon, authenticated;

-- Channel = utm_source when tagged; otherwise inferred. Mirrored in lib/radar-guide/utm.ts radarChannel().
CREATE OR REPLACE FUNCTION public.radar_channel(p_source text, p_ref text, p_app text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN p_source IS NOT NULL THEN p_source
    WHEN p_app = 'instagram' OR p_ref LIKE '%instagram.com' THEN 'ig-untagged'
    WHEN p_app = 'tiktok' OR p_ref LIKE '%tiktok.com' THEN 'tiktok-untagged'
    WHEN p_app IN ('line','facebook') THEN p_app || '-untagged'
    WHEN p_ref IS NULL OR p_ref LIKE '%passionseed.org' THEN 'direct'
    ELSE 'referral' END $$;
REVOKE ALL ON FUNCTION public.radar_channel(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.radar_channel(text,text,text) TO authenticated;

CREATE OR REPLACE VIEW public.analytics_radar_guide_funnel WITH (security_invoker = true) AS
WITH v AS (
  SELECT visit_id, session_id, coalesce(field_slug, 'hub') AS page, utm_campaign, utm_content,
    date_trunc('week', (created_at AT TIME ZONE 'Asia/Bangkok'))::date AS week,
    public.radar_channel(utm_source, referrer_host, ua_app) AS channel
  FROM public.radar_visits),
e AS (
  SELECT visit_id,
    count(DISTINCT chapter_key) FILTER (WHERE event_type = 'chapter_view') AS chapters_seen,
    bool_or(event_type = 'video_play') AS played, bool_or(event_type = 'video_unmute') AS unmuted,
    bool_or(event_type = 'video_complete') AS completed,
    count(DISTINCT chapter_key) FILTER (WHERE event_type = 'video_complete') AS chapters_done,
    bool_or(event_type = 'interactive_tap') AS tapped, bool_or(event_type = 'cta_click') AS cta,
    bool_or(event_type = 'follow_click') AS followed, bool_or(event_type = 'share_click') AS shared
  FROM public.radar_guide_events GROUP BY visit_id),
i AS (
  SELECT visit_id FROM public.radar_path_intents WHERE visit_id IS NOT NULL
  UNION
  SELECT (metadata->>'visit_id')::uuid FROM public.radar_interest_events
  WHERE event_type = 'interested'
    AND metadata->>'visit_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
r AS (SELECT DISTINCT visit_id FROM public.radar_career_requests WHERE visit_id IS NOT NULL)
SELECT v.week, v.page, v.channel, v.utm_campaign, v.utm_content,
  count(*) AS visits, count(DISTINCT v.session_id) AS unique_devices,
  coalesce(sum(e.chapters_seen), 0) AS chapters_seen,
  count(*) FILTER (WHERE e.played) AS video_plays, count(*) FILTER (WHERE e.unmuted) AS unmutes,
  count(*) FILTER (WHERE e.completed) AS visits_with_complete, coalesce(sum(e.chapters_done), 0) AS chapters_completed,
  count(*) FILTER (WHERE e.tapped) AS interactive_visits, count(*) FILTER (WHERE e.cta) AS cta_clicks,
  count(*) FILTER (WHERE e.followed) AS follow_intents, count(*) FILTER (WHERE e.shared) AS share_clicks,
  count(*) FILTER (WHERE v.visit_id IN (SELECT visit_id FROM i)) AS intents,
  count(*) FILTER (WHERE v.visit_id IN (SELECT visit_id FROM r)) AS career_requests
FROM v LEFT JOIN e USING (visit_id) GROUP BY 1,2,3,4,5;
REVOKE ALL ON public.analytics_radar_guide_funnel FROM anon;
GRANT SELECT ON public.analytics_radar_guide_funnel TO authenticated;

-- Guides are code (docs/features/radar-guides-in-code.md section 4.4). chapter_key keeps its name
-- and CHECK and holds the guide page key. Per-page funnel for the admin, read through the base
-- table's is_admin policy (security_invoker).
COMMENT ON COLUMN public.radar_guide_events.chapter_key IS 'Guide page key (code-authored guides), e.g. mythos';
CREATE OR REPLACE VIEW public.analytics_radar_guide_pages WITH (security_invoker = true) AS
SELECT field_slug, chapter_key AS page_key,
  date_trunc('week', (created_at AT TIME ZONE 'Asia/Bangkok'))::date AS week,
  count(DISTINCT visit_id) FILTER (WHERE event_type = 'chapter_view')    AS viewers,
  count(DISTINCT visit_id) FILTER (WHERE event_type = 'interactive_tap') AS players,
  count(*) FILTER (WHERE event_type = 'interactive_tap' AND target LIKE '%:skip') AS skips,
  count(DISTINCT visit_id) FILTER (WHERE event_type = 'video_play')      AS clip_plays,
  count(DISTINCT visit_id) FILTER (WHERE event_type = 'video_complete')  AS clip_completes,
  count(*) FILTER (WHERE event_type = 'share_click') AS shares,
  count(*) FILTER (WHERE event_type = 'cta_click')   AS ctas
FROM public.radar_guide_events
WHERE chapter_key IS NOT NULL
GROUP BY 1, 2, 3;
REVOKE ALL ON public.analytics_radar_guide_pages FROM anon;
GRANT SELECT ON public.analytics_radar_guide_pages TO authenticated;
