-- First, let's check and fix the submission_grades table constraints
ALTER TABLE public.submission_grades 
DROP CONSTRAINT IF EXISTS submission_grades_grade_check,
DROP CONSTRAINT IF EXISTS submission_grades_rating_check;

-- Add proper check constraints
ALTER TABLE public.submission_grades 
ADD CONSTRAINT submission_grades_grade_check 
CHECK (grade IN ('pass', 'fail'));

ALTER TABLE public.submission_grades 
ADD CONSTRAINT submission_grades_rating_check 
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Ensure the graded_by column allows instructor/TA users
-- (This should be handled by application logic, but let's document it)
COMMENT ON COLUMN public.submission_grades.graded_by IS 'User ID of instructor or TA who graded this submission';
COMMENT ON COLUMN public.submission_grades.grade IS 'Pass or fail grade (pass, fail)';
COMMENT ON COLUMN public.submission_grades.rating IS 'Optional numeric rating from 1 to 5';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS submission_grades_submission_id_idx ON public.submission_grades(submission_id);
CREATE INDEX IF NOT EXISTS submission_grades_graded_by_idx ON public.submission_grades(graded_by);
