-- Enable RLS on hackathon matching tables
ALTER TABLE public.hackathon_matching_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_matching_met_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_matching_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_matching_runs ENABLE ROW LEVEL SECURITY;

-- 1. hackathon_matching_events policies
-- Allow everyone to read event details
CREATE POLICY "Allow public read access to events"
  ON public.hackathon_matching_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. hackathon_matching_met_connections policies
-- Allow everyone to read and insert (participants reporting who they met)
CREATE POLICY "Allow public read access to met connections"
  ON public.hackathon_matching_met_connections FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to met connections"
  ON public.hackathon_matching_met_connections FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. hackathon_matching_rankings policies
-- Allow everyone to read and manage rankings (participants submitting preferences)
CREATE POLICY "Allow public read access to rankings"
  ON public.hackathon_matching_rankings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert access to rankings"
  ON public.hackathon_matching_rankings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update access to rankings"
  ON public.hackathon_matching_rankings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. hackathon_matching_runs policies
-- Allow everyone to read run status
CREATE POLICY "Allow public read access to matching runs"
  ON public.hackathon_matching_runs FOR SELECT
  TO anon, authenticated
  USING (true);
