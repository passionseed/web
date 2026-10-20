-- SHIFT feedback community sign-up: the 690 THB research price becomes two
-- ways in, free for a short testimonial clip or 250 THB a month. Widens the
-- CHECK so new answers save; 'join' stays valid for any earlier rows.

ALTER TABLE public.shift_feedback
  DROP CONSTRAINT IF EXISTS shift_feedback_community_signup_check;

ALTER TABLE public.shift_feedback
  ADD CONSTRAINT shift_feedback_community_signup_check
    CHECK (community_signup IN ('free_video', 'pay_250', 'join', 'ask_parents', 'not_now'));

COMMENT ON COLUMN public.shift_feedback.community_signup IS 'Community sign-up: free_video (free for a testimonial clip), pay_250, join (retired 690 offer), ask_parents, or not_now. Payment and clips are confirmed separately.';
