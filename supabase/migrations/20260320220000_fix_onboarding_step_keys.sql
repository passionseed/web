-- Fix onboarding_state.current_step CHECK constraint to match the new phase keys
ALTER TABLE public.onboarding_state
  DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check;

ALTER TABLE public.onboarding_state
  ADD CONSTRAINT onboarding_state_current_step_check
  CHECK (
    current_step IN (
      'welcome',
      'interest',
      'assessment',
      'influence',
      'results',
      'account'
    )
  );
