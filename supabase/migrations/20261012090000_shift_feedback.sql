-- End-of-round SHIFT feedback from the public /shift/feedback form.
-- Students are minors and anonymous (no login wall). Inserts go through
-- /api/shift/feedback with the service role; only admins can read.

CREATE TABLE IF NOT EXISTS public.shift_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort TEXT NOT NULL,
  nickname TEXT NOT NULL,
  satisfaction SMALLINT NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  can_do_now TEXT NOT NULL,
  confidence SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  ownership SMALLINT NOT NULL CHECK (ownership BETWEEN 1 AND 5),
  own_decision TEXT NOT NULL,
  motivation TEXT NOT NULL CHECK (motivation IN ('had_to', 'portfolio', 'wanted_to', 'care_for_users')),
  most_valuable TEXT NOT NULL,
  change_next TEXT NOT NULL,
  price_fit TEXT NOT NULL CHECK (price_fit IN ('too_cheap', 'about_right', 'too_expensive')),
  payer TEXT NOT NULL CHECK (payer IN ('self', 'parents', 'both', 'other')),
  recommend SMALLINT NOT NULL CHECK (recommend BETWEEN 0 AND 10),
  next_steps TEXT[] NOT NULL DEFAULT '{}',
  quote_ok BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_feedback IS 'End-of-round SHIFT feedback (minors: admin-only read, quote only when quote_ok)';

CREATE INDEX IF NOT EXISTS idx_shift_feedback_cohort_created
  ON public.shift_feedback(cohort, created_at DESC);

ALTER TABLE public.shift_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift feedback" ON public.shift_feedback;
CREATE POLICY "Admins can manage shift feedback"
  ON public.shift_feedback
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_feedback TO service_role;
