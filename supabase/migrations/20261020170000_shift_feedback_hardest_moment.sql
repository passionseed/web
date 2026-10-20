-- SHIFT feedback asks students to reflect on the hardest moment of the
-- round and how they got through it. Additive and nullable so earlier rows
-- stay valid.

ALTER TABLE public.shift_feedback
  ADD COLUMN IF NOT EXISTS hardest_moment TEXT;

COMMENT ON COLUMN public.shift_feedback.hardest_moment IS 'Reflection: the hardest moment of the round and how the student got through it';
