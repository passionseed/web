-- Radar Guide: reels, short links, link clicks, comment DM log and reel insights (spec 3.4).
-- All admin-only under RLS; /r/[code], the webhook and the claim run with the service role.
-- Radar-origin DM threads are tagged so sales tooling can fence them off (safeguarding, spec 5.6).
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.radar_reels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform         text NOT NULL CHECK (platform IN ('instagram','tiktok','youtube')),
  media_id         text CHECK (media_id IS NULL OR media_id ~ '^[0-9_]{5,64}$'),
  shortcode        text CHECK (shortcode IS NULL OR shortcode ~ '^[A-Za-z0-9_-]{5,40}$'),
  permalink        text CHECK (permalink IS NULL OR permalink ~ '^https://(www\.)?(instagram\.com|tiktok\.com|youtube\.com)/'),
  field_slug       text REFERENCES public.radar_fields(slug) ON UPDATE CASCADE ON DELETE SET NULL, -- NULL = hub
  chapter_key      text CHECK (chapter_key IS NULL OR chapter_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  video_kind       text NOT NULL DEFAULT 'founder' CHECK (video_kind IN ('founder','motion','demo')),
  angle            text CHECK (angle IS NULL OR angle IN ('salary_reveal','myth_busted','ai_replace',
                     'portfolio_for_this_career','which_faculty','compare','day_in_life','overview')),
  is_trial         boolean NOT NULL DEFAULT false,
  hook_variant     smallint CHECK (hook_variant IS NULL OR hook_variant BETWEEN 0 AND 9),
  career_label_th  text CHECK (career_label_th IS NULL OR char_length(career_label_th) <= 40),
  dm_enabled       boolean NOT NULL DEFAULT true,
  posted_at        timestamptz,
  note             text CHECK (note IS NULL OR char_length(note) <= 200),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- The DM says "สาย {label}"; the full name_th reads badly, so a mapped reel needs a short label.
  CONSTRAINT radar_reels_label_required CHECK (field_slug IS NULL OR career_label_th IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS radar_reels_platform_media_uidx ON public.radar_reels (platform, media_id) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS radar_reels_field_idx ON public.radar_reels (field_slug);
CREATE INDEX IF NOT EXISTS radar_reels_posted_idx ON public.radar_reels (posted_at DESC);

CREATE TABLE IF NOT EXISTS public.radar_links (
  code          text PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9-]{1,31}$'),
  field_slug    text REFERENCES public.radar_fields(slug) ON UPDATE CASCADE ON DELETE SET NULL, -- NULL = hub
  chapter_key   text CHECK (chapter_key IS NULL OR chapter_key ~ '^[a-z][a-z0-9_]{1,31}$'),
  reel_id       uuid REFERENCES public.radar_reels(id) ON DELETE SET NULL,
  utm_source    text NOT NULL CHECK (utm_source ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_medium    text NOT NULL CHECK (utm_medium ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_campaign  text NOT NULL DEFAULT 'radar' CHECK (utm_campaign ~ '^[a-z0-9][a-z0-9_.-]{0,63}$'),
  utm_content   text CHECK (utm_content IS NULL OR utm_content ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$'),
  is_active     boolean NOT NULL DEFAULT true,
  note          text CHECK (note IS NULL OR char_length(note) <= 200),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS radar_links_reel_uidx ON public.radar_links (reel_id) WHERE reel_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.radar_link_clicks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL,             -- resolved code or fallback alias; not an FK so alias clicks log too
  field_slug text,
  page_key   text CHECK (page_key IS NULL OR page_key ~ '^[a-z][a-z0-9_]{1,31}$'), -- guide page from a typed cyber-<page> alias
  ua_app     text CHECK (ua_app IS NULL OR ua_app IN ('instagram','tiktok','line','facebook','other')),
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_link_clicks_code_idx ON public.radar_link_clicks (code, created_at DESC);

-- Guides are code (docs/features/radar-guides-in-code.md). chapter_key keeps its name and CHECK,
-- and holds the code guide's page key (e.g. mythos). Deck careers leave it NULL.
COMMENT ON COLUMN public.radar_reels.chapter_key IS 'Guide page key (code-authored guides), e.g. mythos; NULL for deck careers';
COMMENT ON COLUMN public.radar_links.chapter_key IS 'Guide page key (code-authored guides), e.g. mythos; NULL for deck careers';
COMMENT ON COLUMN public.radar_reels.angle IS 'Legacy reel angle; optional and unused by the page flow';

-- One row per comment we DM'd (or tried to). UNIQUE(comment_id) plus claim_radar_comment_dm() is the send lock.
-- comment_id is ig_comments.id (uuid). Graph calls use ig_comments.ig_comment_id (Meta's text id).
CREATE TABLE IF NOT EXISTS public.radar_comment_dms (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id     uuid NOT NULL UNIQUE REFERENCES public.ig_comments(id) ON DELETE CASCADE,
  reel_id        uuid REFERENCES public.radar_reels(id) ON DELETE SET NULL,
  field_slug     text,
  matched_by     text NOT NULL DEFAULT 'keyword' CHECK (matched_by IN ('keyword','request_phrase','admin')),
  mode           text NOT NULL CHECK (mode IN ('auto','admin')),
  status         text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','sent','failed','skipped')),
  skip_reason    text,
  error_code     text,
  link           text,
  message        text CHECK (message IS NULL OR char_length(message) <= 1000),
  public_reply   text,
  sent_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at     timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  dm_tap_at      timestamptz,             -- quick-reply tap (section 5.4), when that flow is on
  created_at     timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS radar_comment_dms_reel_idx ON public.radar_comment_dms (reel_id, created_at DESC);

-- Daily snapshot of Graph /{media-id}/insights per mapped reel (cron, section 5.7).
CREATE TABLE IF NOT EXISTS public.radar_reel_insights (
  reel_id        uuid NOT NULL REFERENCES public.radar_reels(id) ON DELETE CASCADE,
  captured_on    date NOT NULL,
  views          integer, reach integer, saved integer, shares integer, comments integer,
  likes          integer, avg_watch_ms integer, follows integer, profile_visits integer,
  raw            jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(raw) <= 8192),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reel_id, captured_on));

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['radar_reels','radar_links','radar_link_clicks','radar_comment_dms','radar_reel_insights'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "admins manage %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "admins manage %s" ON public.%I FOR ALL TO authenticated USING (public.is_admin((SELECT auth.uid()))) WITH CHECK (public.is_admin((SELECT auth.uid())))', t, t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
  END LOOP; END $$;

DROP TRIGGER IF EXISTS radar_reels_updated_at ON public.radar_reels;
CREATE TRIGGER radar_reels_updated_at BEFORE UPDATE ON public.radar_reels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS radar_links_updated_at ON public.radar_links;
CREATE TRIGGER radar_links_updated_at BEFORE UPDATE ON public.radar_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic claim, service role only. Wins when no row exists, or the previous attempt failed,
-- or a claim is stale (crash between claim and send). Sets ig_comments.replied_at in the same transaction.
CREATE OR REPLACE FUNCTION public.claim_radar_comment_dm(
  p_comment_id uuid, p_mode text, p_matched_by text, p_reel_id uuid DEFAULT NULL,
  p_field_slug text DEFAULT NULL, p_sent_by uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  -- A comment someone already answered outside the Radar flow is never claimed.
  IF EXISTS (SELECT 1 FROM public.ig_comments c WHERE c.id = p_comment_id AND c.replied_at IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM public.radar_comment_dms d WHERE d.comment_id = p_comment_id) THEN
    RETURN NULL; END IF;
  INSERT INTO public.radar_comment_dms AS d (comment_id, mode, matched_by, reel_id, field_slug, sent_by, status, claimed_at)
  VALUES (p_comment_id, p_mode, p_matched_by, p_reel_id, p_field_slug, p_sent_by, 'claimed', now())
  ON CONFLICT (comment_id) DO UPDATE
    SET status = 'claimed', mode = EXCLUDED.mode, sent_by = EXCLUDED.sent_by,
        error_code = NULL, claimed_at = now()
    WHERE d.status = 'failed' OR (d.status = 'claimed' AND d.claimed_at < now() - interval '10 minutes')
  RETURNING d.id INTO v_id;
  IF v_id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.ig_comments SET replied_at = now() WHERE id = p_comment_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.claim_radar_comment_dm(uuid,text,text,uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_radar_comment_dm(uuid,text,text,uuid,text,uuid) TO service_role;

-- Radar-origin DM threads are fenced off from sales tooling (section 5.6).
ALTER TABLE public.dm_conversations
  ADD COLUMN IF NOT EXISTS origin text CHECK (origin IS NULL OR origin IN ('radar')),
  ADD COLUMN IF NOT EXISTS radar_reply_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS dm_conversations_origin_idx ON public.dm_conversations (origin) WHERE origin IS NOT NULL;

-- Bio links point at the hub, never at the career being pushed. hub-ig is the shared
-- DM link for hub reels and unmapped posts (spec 5.3).
INSERT INTO public.radar_links (code, field_slug, utm_source, utm_medium, utm_content) VALUES
  ('tt',     NULL, 'tiktok-bio',    'bio', 'hub-bio'),
  ('ig',     NULL, 'ig-bio',        'bio', 'hub-bio'),
  ('hub-ig', NULL, 'ig-comment-dm', 'dm',  'hub-dm')
ON CONFLICT (code) DO NOTHING;
