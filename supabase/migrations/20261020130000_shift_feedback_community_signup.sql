-- SHIFT feedback ends with a real community sign-up at the batch's research
-- price (planned price 1,500 THB a month, research price 690 THB a month).
-- Additive and nullable so earlier rows stay valid.

ALTER TABLE public.shift_feedback
  ADD COLUMN IF NOT EXISTS community_signup TEXT
    CHECK (community_signup IN ('join', 'ask_parents', 'not_now'));

COMMENT ON COLUMN public.shift_feedback.community_signup IS 'Community sign-up at the research price: join, ask_parents, or not_now. Payment is confirmed separately.';
