-- Create table to track hackathon user events for detailed analytics
-- This enables tracking user interactions, button clicks, form submissions, etc.

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
CREATE OR REPLACE VIEW hackathon_events_by_type AS
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

-- Create view for page engagement analytics
CREATE OR REPLACE VIEW hackathon_page_engagement AS
SELECT
  page_path,
  COUNT(*) as total_events,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(DISTINCT event_type) as event_types,
  jsonb_object_agg(
    event_type,
    COUNT(*)
  ) as events_breakdown
FROM hackathon_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY page_path
ORDER BY total_events DESC;

-- Create view for daily event counts
CREATE OR REPLACE VIEW hackathon_daily_events AS
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
CREATE POLICY "Anyone can insert hackathon events"
  ON public.hackathon_events FOR INSERT
  WITH CHECK (true);

-- Only allow reads for authenticated users
CREATE POLICY "Authenticated users can view hackathon events"
  ON public.hackathon_events FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Grant SELECT on views to authenticated users
GRANT SELECT ON hackathon_events_by_type TO authenticated;
GRANT SELECT ON hackathon_page_engagement TO authenticated;
GRANT SELECT ON hackathon_daily_events TO authenticated;
