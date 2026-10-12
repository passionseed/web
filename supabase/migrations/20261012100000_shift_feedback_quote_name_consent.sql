-- SHIFT feedback: students choose how they are quoted (by a name they type,
-- anonymously, or not at all) and agree to a versioned PDPA notice.
-- Additive and nullable so rows from before this change stay valid.

ALTER TABLE public.shift_feedback
  ADD COLUMN IF NOT EXISTS quote_mode TEXT
    CHECK (quote_mode IN ('named', 'anonymous', 'no')),
  ADD COLUMN IF NOT EXISTS quote_name TEXT,
  ADD COLUMN IF NOT EXISTS notice_version TEXT,
  ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shift_feedback.quote_name IS 'Credit name the student typed for quotes; only set when quote_mode = named';
