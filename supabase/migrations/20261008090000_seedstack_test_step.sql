-- SeedStack: allow the new "test" step (/seedstack-test: recruiting and
-- running user tests). Widens the CHECK only; existing rows stay valid.
-- Idempotent: safe to apply straight to production.

ALTER TABLE public.seedstack_events DROP CONSTRAINT IF EXISTS seedstack_events_step_check;
ALTER TABLE public.seedstack_events
  ADD CONSTRAINT seedstack_events_step_check CHECK (step IN ('install', 'scope', 'ship', 'test'));
