-- Add group lock functionality to assessment groups
-- This allows groups to be locked and excluded from shuffle operations

BEGIN;

-- Add is_locked column to assessment_groups table
ALTER TABLE public.assessment_groups 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false NOT NULL;

-- Add index for locked groups (for efficient filtering)
CREATE INDEX IF NOT EXISTS idx_assessment_groups_locked 
ON public.assessment_groups(assessment_id, is_locked) WHERE is_locked = true;

-- Add comment for documentation
COMMENT ON COLUMN public.assessment_groups.is_locked IS 'Whether this group is locked and should be excluded from shuffle operations';

COMMIT;