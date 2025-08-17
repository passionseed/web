-- Add status column to user_map_enrollments table
-- This column tracks the current status of a user's enrollment in a learning map

ALTER TABLE public.user_map_enrollments
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add a check constraint to ensure only valid status values
ALTER TABLE public.user_map_enrollments
ADD CONSTRAINT user_map_enrollments_valid_status 
CHECK (status IN ('active', 'completed', 'dropped'));

-- Add index for faster status queries
CREATE INDEX IF NOT EXISTS idx_user_map_enrollments_status 
ON public.user_map_enrollments(status);

-- Add comment to describe the column
COMMENT ON COLUMN public.user_map_enrollments.status 
IS 'Current enrollment status: active, completed, dropped';

-- Update existing enrollments to have the default status
UPDATE public.user_map_enrollments 
SET status = 'active' 
WHERE status IS NULL;