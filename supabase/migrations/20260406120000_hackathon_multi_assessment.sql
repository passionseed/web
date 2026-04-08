-- Add display_order to hackathon_phase_activity_assessments to support multiple assessments per activity

ALTER TABLE public.hackathon_phase_activity_assessments
  ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;

-- Drop the old unique constraint that only covered activity_id (if exists)
-- Note: This will fail silently if constraint doesn't exist, which is fine
ALTER TABLE public.hackathon_phase_activity_assessments
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_assessments_activity_id_key;

-- Add new unique constraint on (activity_id, display_order) (if not exists)
-- Note: This will fail silently if constraint already exists, which is fine
ALTER TABLE public.hackathon_phase_activity_assessments
  ADD CONSTRAINT hackathon_phase_activity_assessments_activity_id_display_order_key
  UNIQUE (activity_id, display_order);

-- Index is created implicitly by the unique constraint above