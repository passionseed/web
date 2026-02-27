-- Create table to track hackathon page views for analytics
-- This enables tracking unique visitors per day for admin dashboard visualization

CREATE TABLE IF NOT EXISTS hackathon_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Visitor Identification
  visitor_fingerprint TEXT NOT NULL, -- Browser fingerprint or IP hash for privacy
  session_id TEXT, -- Session identifier if available
  participant_id UUID REFERENCES hackathon_participants(id), -- If logged in

  -- Page Context
  page_path TEXT NOT NULL DEFAULT '/hackathon', -- Which hackathon page was viewed
  referrer TEXT, -- Where the visitor came from
  user_agent TEXT, -- Browser/device information

  -- Geolocation (optional, can be added later)
  country_code TEXT,

  -- Timestamp
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb -- For extensibility
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON hackathon_page_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_fingerprint ON hackathon_page_views(visitor_fingerprint);
CREATE INDEX IF NOT EXISTS idx_page_views_participant ON hackathon_page_views(participant_id) WHERE participant_id IS NOT NULL;

-- Create view for daily unique visitors
CREATE OR REPLACE VIEW hackathon_daily_unique_visitors AS
SELECT
  DATE(viewed_at) as date,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(*) as total_page_views,
  COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE participant_id IS NOT NULL) as logged_in_visitors,
  COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE participant_id IS NULL) as anonymous_visitors,
  COUNT(DISTINCT participant_id) FILTER (WHERE participant_id IS NOT NULL) as unique_logged_in_users
FROM hackathon_page_views
WHERE viewed_at > NOW() - INTERVAL '90 days' -- Last 90 days
GROUP BY DATE(viewed_at)
ORDER BY date DESC;

-- Create view for hourly stats (useful for identifying peak times)
CREATE OR REPLACE VIEW hackathon_hourly_visitors AS
SELECT
  DATE_TRUNC('hour', viewed_at) as hour,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(*) as total_page_views,
  COUNT(DISTINCT referrer) FILTER (WHERE referrer IS NOT NULL AND referrer != '') as unique_referrers
FROM hackathon_page_views
WHERE viewed_at > NOW() - INTERVAL '7 days' -- Last 7 days
GROUP BY DATE_TRUNC('hour', viewed_at)
ORDER BY hour DESC;

-- Create view for referrer analysis
CREATE OR REPLACE VIEW hackathon_top_referrers AS
SELECT
  COALESCE(NULLIF(referrer, ''), 'Direct/None') as referrer_source,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(*) as total_visits,
  MIN(viewed_at) as first_visit,
  MAX(viewed_at) as last_visit
FROM hackathon_page_views
WHERE viewed_at > NOW() - INTERVAL '30 days'
GROUP BY referrer
ORDER BY unique_visitors DESC
LIMIT 20;

-- Comments for documentation
COMMENT ON TABLE hackathon_page_views IS 'Tracks page views to hackathon pages for analytics and visitor counting';
COMMENT ON COLUMN hackathon_page_views.visitor_fingerprint IS 'Privacy-preserving visitor identifier (hashed IP + user agent or browser fingerprint)';
COMMENT ON VIEW hackathon_daily_unique_visitors IS 'Daily aggregated unique visitor counts for the last 90 days';
COMMENT ON VIEW hackathon_hourly_visitors IS 'Hourly visitor statistics for the last 7 days';

-- RLS Policies (public can insert, only admins can view)
ALTER TABLE hackathon_page_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for tracking page views)
CREATE POLICY "Anyone can insert page views"
  ON hackathon_page_views FOR INSERT
  WITH CHECK (true);

-- Only allow reads for authenticated users (could further restrict to admins)
CREATE POLICY "Authenticated users can view page views"
  ON hackathon_page_views FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Grant SELECT on views to authenticated users
GRANT SELECT ON hackathon_daily_unique_visitors TO authenticated;
GRANT SELECT ON hackathon_hourly_visitors TO authenticated;
GRANT SELECT ON hackathon_top_referrers TO authenticated;
