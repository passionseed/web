-- Disable recursive group grading trigger that causes stack depth errors
-- This trigger was causing infinite recursion when grading group submissions
-- We'll handle group grading in the application layer instead

BEGIN;

-- Drop the problematic group grading trigger
DROP TRIGGER IF EXISTS trigger_handle_group_grading ON public.submission_grades;

-- Drop the function that was causing recursion
DROP FUNCTION IF EXISTS public.handle_group_grading();

-- Add comment explaining the change
COMMENT ON TABLE public.submission_grades IS 'Grades for assessment submissions. Group grading is now handled in application layer to prevent database recursion.';

COMMIT;