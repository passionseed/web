-- =====================================================
-- ADD DRAFT STATUS TO PATH ACTIVITIES
-- Allows admins to save incomplete activities
-- Students cannot access draft activities
-- =====================================================

-- Add is_draft column to path_activities
ALTER TABLE public.path_activities
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

-- Add index for querying published activities
CREATE INDEX IF NOT EXISTS idx_path_activities_draft
  ON public.path_activities(is_draft)
  WHERE is_draft = false;

-- Add draft_reason column to store why activity is draft
ALTER TABLE public.path_activities
  ADD COLUMN IF NOT EXISTS draft_reason TEXT;

COMMENT ON COLUMN public.path_activities.is_draft IS 'True if activity is incomplete and not ready for students';
COMMENT ON COLUMN public.path_activities.draft_reason IS 'Optional reason why activity is in draft state (e.g., "Missing conversation selection")';

-- Function to check if activity is complete
CREATE OR REPLACE FUNCTION is_activity_complete(activity_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  activity_record RECORD;
  has_content BOOLEAN;
  has_assessment BOOLEAN;
BEGIN
  -- Get activity details
  SELECT * INTO activity_record
  FROM public.path_activities
  WHERE id = activity_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if activity has content
  SELECT EXISTS(
    SELECT 1 FROM public.path_content
    WHERE path_content.activity_id = activity_id
  ) INTO has_content;

  -- Check if activity has assessment
  SELECT EXISTS(
    SELECT 1 FROM public.path_assessments
    WHERE path_assessments.activity_id = activity_id
  ) INTO has_assessment;

  -- Activity is complete if it has either content or assessment
  RETURN has_content OR has_assessment;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_activity_complete IS 'Checks if activity has content or assessment configured';
