-- Add display_order to hackathon_phase_activity_assessments to support multiple assessments per activity

ALTER TABLE public.hackathon_phase_activity_assessments
  ADD COLUMN display_order int NOT NULL DEFAULT 0;

-- Drop the old unique constraint that only covered activity_id
ALTER TABLE public.hackathon_phase_activity_assessments
  DROP CONSTRAINT hackathon_phase_activity_assessments_activity_id_key;

-- Add new unique constraint on (activity_id, display_order)
ALTER TABLE public.hackathon_phase_activity_assessments
  ADD CONSTRAINT hackathon_phase_activity_assessments_activity_id_display_order_key
  UNIQUE (activity_id, display_order);

-- Add index on (activity_id, display_order)
CREATE INDEX hackathon_phase_activity_assessments_activity_id_display_order_idx
  ON public.hackathon_phase_activity_assessments (activity_id, display_order);
