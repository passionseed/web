-- Fix: app writes step_type 'test_run' but CHECK constraint excluded it
-- Error: "violates check constraint hackathon_phase3_cycle_steps_step_type_check"

ALTER TABLE public.hackathon_phase3_cycle_steps
  DROP CONSTRAINT IF EXISTS hackathon_phase3_cycle_steps_step_type_check;

ALTER TABLE public.hackathon_phase3_cycle_steps
  ADD CONSTRAINT hackathon_phase3_cycle_steps_step_type_check
    CHECK (step_type IN ('hypothesis', 'pretotype', 'test_session', 'test_run', 'synthesis'));
