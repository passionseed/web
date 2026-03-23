-- supabase/migrations/20260322100000_create_score_events.sql
-- Score events table for tracking user scores from reflections and journey progress

CREATE TABLE public.score_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  journey_id uuid REFERENCES public.student_journeys(id) ON DELETE CASCADE,
  reflection_id uuid REFERENCES public.path_reflections(id) ON DELETE CASCADE,
  score_type text NOT NULL,
  score_value integer NOT NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT score_events_pkey PRIMARY KEY (id),
  CONSTRAINT score_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT score_events_score_type_check CHECK (score_type IN ('daily_reflection', 'journey_progress', 'milestone', 'bonus')),
  CONSTRAINT score_events_score_value_check CHECK (score_value >= 0),
  CONSTRAINT score_events_journey_or_reflection_check CHECK (
    (journey_id IS NOT NULL) OR (reflection_id IS NOT NULL)
  )
);

-- Indexes for timeline queries and common lookups
CREATE INDEX idx_score_events_user_id ON public.score_events(user_id);
CREATE INDEX idx_score_events_user_created ON public.score_events(user_id, created_at DESC);
CREATE INDEX idx_score_events_journey_id ON public.score_events(journey_id);
CREATE INDEX idx_score_events_reflection_id ON public.score_events(reflection_id);
CREATE INDEX idx_score_events_type ON public.score_events(score_type);

-- RLS: Users can only read/write their own scores
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own score events"
  ON public.score_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own score events"
  ON public.score_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own score events"
  ON public.score_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own score events"
  ON public.score_events FOR DELETE
  USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.score_events TO authenticated;

-- Comments
COMMENT ON TABLE public.score_events IS 'Tracks user scores from reflections and journey progress';
COMMENT ON COLUMN public.score_events.score_type IS 'Type of score event: daily_reflection, journey_progress, milestone, bonus';
COMMENT ON COLUMN public.score_events.score_value IS 'Numeric score value (always positive)';
COMMENT ON COLUMN public.score_events.metadata IS 'Additional context like source details, multipliers, etc.';
COMMENT ON COLUMN public.score_events.journey_id IS 'Optional FK to student_journeys for journey-related scores';
COMMENT ON COLUMN public.score_events.reflection_id IS 'Optional FK to path_reflections for reflection-related scores';
