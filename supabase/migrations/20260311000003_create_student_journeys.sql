-- supabase/migrations/20260311000003_create_student_journeys.sql

CREATE TABLE public.student_journeys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  title text NOT NULL,
  career_goal text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores jsonb NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT student_journeys_pkey PRIMARY KEY (id),
  CONSTRAINT student_journeys_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT student_journeys_source_check CHECK (source IN ('ai_generated', 'manual'))
);

-- Indexes
CREATE INDEX idx_student_journeys_student_id ON public.student_journeys(student_id);
CREATE INDEX idx_student_journeys_active ON public.student_journeys(student_id) WHERE is_active = true;

-- Updated_at trigger (reuse existing function)
CREATE TRIGGER update_student_journeys_updated_at
  BEFORE UPDATE ON public.student_journeys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.student_journeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own journeys"
  ON public.student_journeys FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own journeys"
  ON public.student_journeys FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update own journeys"
  ON public.student_journeys FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Users can delete own journeys"
  ON public.student_journeys FOR DELETE
  USING (auth.uid() = student_id);

COMMENT ON TABLE public.student_journeys IS 'Career journey plans created by AI or manually by students';
COMMENT ON COLUMN public.student_journeys.steps IS 'Ordered JSON array: [{type, tcas_program_id, label, details}]';
COMMENT ON COLUMN public.student_journeys.scores IS 'Match scores: {passion, future, world}';
