ALTER TABLE public.score_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill from path_enrollments if enrollment_id exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'score_events' AND column_name = 'enrollment_id'
  ) THEN
    UPDATE public.score_events se
    SET user_id = pe.user_id
    FROM public.path_enrollments pe
    WHERE se.enrollment_id = pe.id
      AND se.user_id IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_score_events_user_id ON public.score_events(user_id);