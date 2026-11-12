-- Read-only daily sync of Meta marketing data (Instagram organic insights and
-- Meta Ads results), written by /api/cron/meta-marketing-sync and
-- scripts/meta-marketing-backfill.ts. Every table is keyed by its natural
-- id + date so reruns and overlapping backfills upsert instead of duplicating.
-- Aggregate marketing numbers only: no student or lead personal data.
-- Additive and idempotent. Service role only: RLS on, no policies.

-- One row per Instagram account per day (Meta's reporting day).
CREATE TABLE IF NOT EXISTS public.ig_account_daily (
  ig_user_id TEXT NOT NULL,
  date DATE NOT NULL,
  reach INTEGER,
  views INTEGER,
  profile_views INTEGER,
  accounts_engaged INTEGER,
  total_interactions INTEGER,
  website_clicks INTEGER,
  follows INTEGER,
  unfollows INTEGER,
  -- Snapshot of the account's follower total, only on days a sync ran.
  followers_count INTEGER,
  media_count INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ig_user_id, date)
);

-- Posts and Reels on the account (stories are not listed by /media).
CREATE TABLE IF NOT EXISTS public.ig_media (
  id TEXT PRIMARY KEY,
  ig_user_id TEXT NOT NULL,
  media_type TEXT,
  media_product_type TEXT,
  caption TEXT,
  permalink TEXT,
  posted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ig_media_posted_at_idx
  ON public.ig_media (posted_at DESC);

-- Lifetime totals per post, one snapshot per day so growth can be charted.
CREATE TABLE IF NOT EXISTS public.ig_media_insights (
  media_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  reach INTEGER,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  saves INTEGER,
  shares INTEGER,
  total_interactions INTEGER,
  follows INTEGER,
  profile_visits INTEGER,
  avg_watch_time_ms INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, snapshot_date)
);

-- Ad metadata, including where the ad sends people (for UTM attribution).
CREATE TABLE IF NOT EXISTS public.meta_ads (
  ad_id TEXT PRIMARY KEY,
  ad_account_id TEXT NOT NULL,
  ad_name TEXT,
  adset_id TEXT,
  campaign_id TEXT,
  effective_status TEXT,
  destination_urls TEXT[] NOT NULL DEFAULT '{}',
  url_tags TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meta_ads_utm_source_idx
  ON public.meta_ads (utm_source);

-- One row per ad per day (the ad account's timezone).
CREATE TABLE IF NOT EXISTS public.meta_ads_daily (
  ad_account_id TEXT NOT NULL,
  date DATE NOT NULL,
  ad_id TEXT NOT NULL,
  ad_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  objective TEXT,
  currency TEXT,
  spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  reach INTEGER,
  clicks INTEGER,
  link_clicks INTEGER,
  ctr NUMERIC(10, 4),
  cpc NUMERIC(12, 4),
  landing_page_views INTEGER,
  leads INTEGER,
  initiate_checkouts INTEGER,
  messaging_conversations INTEGER,
  -- Every action Meta reported, for results not broken out above.
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (date, ad_id)
);

CREATE INDEX IF NOT EXISTS meta_ads_daily_campaign_date_idx
  ON public.meta_ads_daily (campaign_id, date DESC);

-- One row per source per run, so the admin page can show why a sync skipped
-- or failed (missing env var, missing permission, expired token).
CREATE TABLE IF NOT EXISTS public.meta_marketing_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('ig_account', 'ig_media', 'meta_ads')),
  trigger TEXT NOT NULL CHECK (trigger IN ('cron', 'manual')),
  since DATE,
  until DATE,
  status TEXT NOT NULL CHECK (status IN ('ok', 'partial', 'skipped', 'failed')),
  error_code TEXT,
  rows_upserted INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS meta_marketing_sync_runs_source_started_idx
  ON public.meta_marketing_sync_runs (source, started_at DESC);

ALTER TABLE public.ig_account_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_media_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_marketing_sync_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ig_account_daily FROM anon, authenticated;
REVOKE ALL ON public.ig_media FROM anon, authenticated;
REVOKE ALL ON public.ig_media_insights FROM anon, authenticated;
REVOKE ALL ON public.meta_ads FROM anon, authenticated;
REVOKE ALL ON public.meta_ads_daily FROM anon, authenticated;
REVOKE ALL ON public.meta_marketing_sync_runs FROM anon, authenticated;

COMMENT ON TABLE public.ig_account_daily IS 'Instagram account insights per day, synced read-only from the Graph API.';
COMMENT ON TABLE public.ig_media IS 'Instagram posts and Reels, synced read-only from the Graph API.';
COMMENT ON TABLE public.ig_media_insights IS 'Lifetime Instagram post insights, one snapshot per post per day.';
COMMENT ON TABLE public.meta_ads IS 'Meta ad metadata and destination UTM tags, synced read-only from the Marketing API.';
COMMENT ON TABLE public.meta_ads_daily IS 'Meta Ads results per ad per day, synced read-only from the Marketing API.';
COMMENT ON TABLE public.meta_marketing_sync_runs IS 'Log of Meta marketing sync runs per source, for the admin status panel.';
