-- Create table to track hackathon user events for detailed analytics
-- This enables tracking user interactions, button clicks, form submissions, etc.
-- Also backs /api/hackathon/track-event, which the SHIFT pages use for clicks.
--
-- Safe to re-run: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS throughout.
-- Views use security_invoker so they respect the table's RLS instead of the
-- view owner's rights.

create table if not exists public.hackathon_events (
  id uuid primary key default gen_random_uuid(),
  
  -- Visitor Identification
  visitor_fingerprint text not null, -- Browser fingerprint or IP hash for privacy
  participant_id uuid references public.hackathon_participants(id) on delete set null,
  
  -- Event Details
  event_type text not null, -- Type of event: button_click, form_submit, page_scroll, etc.
  event_data jsonb default '{}'::jsonb, -- Additional event-specific data
  page_path text not null default '/hackathon', -- Which page the event occurred on
  
  -- Context
  user_agent text,
  referrer text,
  
  -- Timestamp
  created_at timestamptz not null default now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hackathon_events_created_at ON public.hackathon_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hackathon_events_fingerprint ON public.hackathon_events(visitor_fingerprint);
CREATE INDEX IF NOT EXISTS idx_hackathon_events_participant ON public.hackathon_events(participant_id) WHERE participant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hackathon_events_event_type ON public.hackathon_events(event_type);
CREATE INDEX IF NOT EXISTS idx_hackathon_events_page_path ON public.hackathon_events(page_path);

-- Create view for event analytics by type
CREATE OR REPLACE VIEW hackathon_events_by_type
WITH (security_invoker = true) AS
SELECT
  event_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(DISTINCT participant_id) FILTER (WHERE participant_id IS NOT NULL) as unique_participants,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM hackathon_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY total_events DESC;

-- Create view for page engagement analytics.
-- The per-type breakdown is counted in its own step first: Postgres cannot
-- nest COUNT(*) inside jsonb_object_agg in a single aggregate.
CREATE OR REPLACE VIEW hackathon_page_engagement
WITH (security_invoker = true) AS
WITH recent AS (
  SELECT page_path, event_type, visitor_fingerprint
  FROM hackathon_events
  WHERE created_at > NOW() - INTERVAL '7 days'
),
per_type AS (
  SELECT page_path, event_type, COUNT(*) AS n
  FROM recent
  GROUP BY page_path, event_type
)
SELECT
  r.page_path,
  COUNT(*) as total_events,
  COUNT(DISTINCT r.visitor_fingerprint) as unique_visitors,
  COUNT(DISTINCT r.event_type) as event_types,
  (
    SELECT jsonb_object_agg(p.event_type, p.n)
    FROM per_type p
    WHERE p.page_path = r.page_path
  ) as events_breakdown
FROM recent r
GROUP BY r.page_path
ORDER BY total_events DESC;

-- Create view for daily event counts
CREATE OR REPLACE VIEW hackathon_daily_events
WITH (security_invoker = true) AS
SELECT
  DATE(created_at) as date,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors
FROM hackathon_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, event_count DESC;

-- Comments for documentation
COMMENT ON TABLE public.hackathon_events IS 'Tracks user events (clicks, form submissions, interactions) for hackathon analytics';
COMMENT ON COLUMN public.hackathon_events.event_type IS 'Type of event: button_click, form_submit, page_scroll, video_play, etc.';
COMMENT ON COLUMN public.hackathon_events.event_data IS 'JSON payload with event-specific data like button_id, form_name, etc.';
COMMENT ON VIEW hackathon_events_by_type IS 'Aggregated event counts by type for the last 30 days';
COMMENT ON VIEW hackathon_page_engagement IS 'Page-level engagement metrics for the last 7 days';
COMMENT ON VIEW hackathon_daily_events IS 'Daily event counts broken down by event type';

-- Enable RLS
ALTER TABLE public.hackathon_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for tracking events)
DROP POLICY IF EXISTS "Anyone can insert hackathon events" ON public.hackathon_events;
CREATE POLICY "Anyone can insert hackathon events"
  ON public.hackathon_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins read: rows hold visitor fingerprints, and the only reader is
-- the admin analytics route.
DROP POLICY IF EXISTS "Authenticated users can view hackathon events" ON public.hackathon_events;
DROP POLICY IF EXISTS "Admins can view hackathon events" ON public.hackathon_events;
CREATE POLICY "Admins can view hackathon events"
  ON public.hackathon_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT INSERT ON TABLE public.hackathon_events TO anon, authenticated;
GRANT SELECT ON TABLE public.hackathon_events TO authenticated;

-- Grant SELECT on views to authenticated users
GRANT SELECT ON hackathon_events_by_type TO authenticated;
GRANT SELECT ON hackathon_page_engagement TO authenticated;
GRANT SELECT ON hackathon_daily_events TO authenticated;
