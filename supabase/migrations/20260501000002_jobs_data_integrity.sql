-- Normalize automation_risk to 0.0-1.0 range and add constraint
-- Column is documented as 0.0-1.0 in seed SQL; this migration enforces it

-- Fix any values still in 0-100 range (legacy data from older migrations)
UPDATE public.jobs SET automation_risk = automation_risk / 100.0 WHERE automation_risk > 1;

-- Add CHECK constraint to enforce 0.0-1.0 range going forward
ALTER TABLE public.jobs ADD CONSTRAINT automation_risk_range CHECK (automation_risk >= 0 AND automation_risk <= 1);

COMMENT ON COLUMN public.jobs.automation_risk IS 'AI automation risk: 0.0 (no risk) to 1.0 (fully automatable)';
