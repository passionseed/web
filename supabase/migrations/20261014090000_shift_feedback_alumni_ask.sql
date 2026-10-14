-- SHIFT feedback ends with the alumni ask: one project to keep going after
-- day 7, and which days suit the weekly alumni session (Fridays from
-- 16 October 2026). Additive and nullable so earlier rows stay valid.

ALTER TABLE public.shift_feedback
  ADD COLUMN IF NOT EXISTS continue_project TEXT
    CHECK (continue_project IN ('own', 'new', 'join', 'not_now')),
  ADD COLUMN IF NOT EXISTS continue_project_note TEXT,
  ADD COLUMN IF NOT EXISTS available_days TEXT[];

COMMENT ON COLUMN public.shift_feedback.available_days IS 'Days that suit the weekly alumni session: mon..sun, or none';
