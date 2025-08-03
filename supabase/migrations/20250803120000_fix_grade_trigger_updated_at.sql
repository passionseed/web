-- Fix the grade trigger to remove the non-existent updated_at column reference
-- The student_node_progress table doesn't have an updated_at column

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_new_grade_update_progress ON public.submission_grades;
DROP FUNCTION IF EXISTS public.update_progress_on_grade();

-- Function to update student_node_progress status based on a new grade
-- FIXED: Removed updated_at column reference since it doesn't exist in the table
CREATE OR REPLACE FUNCTION public.update_progress_on_grade() 
RETURNS TRIGGER AS $$
DECLARE
    submission_progress_id uuid;
    new_status text;
BEGIN
    -- Get the progress_id from the submission that was just graded
    SELECT progress_id INTO submission_progress_id
    FROM public.assessment_submissions
    WHERE id = NEW.submission_id;

    -- Map grade to appropriate status
    IF NEW.grade = 'pass' THEN
        new_status := 'passed';
    ELSIF NEW.grade = 'fail' THEN
        new_status := 'failed';
    ELSE
        -- Should not happen due to grade constraints, but just in case
        RAISE EXCEPTION 'Invalid grade value: %', NEW.grade;
    END IF;

    -- Update the status in the student_node_progress table
    -- FIXED: Removed updated_at = NOW() since the column doesn't exist
    UPDATE public.student_node_progress
    SET status = new_status
    WHERE id = submission_progress_id;

    -- Log the update for debugging
    RAISE NOTICE 'Updated progress % from grade % to status % (graded_by: %)', 
        submission_progress_id, NEW.grade, new_status, 
        CASE WHEN NEW.graded_by IS NULL THEN 'SYSTEM' ELSE 'INSTRUCTOR' END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new grade is inserted
CREATE TRIGGER on_new_grade_update_progress
AFTER INSERT ON public.submission_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_progress_on_grade();

-- Add helpful comments
COMMENT ON FUNCTION public.update_progress_on_grade() IS 'Maps submission grades (pass/fail) to progress status (passed/failed), supports both instructor and system grading. Fixed to not update non-existent updated_at column.';
COMMENT ON TRIGGER on_new_grade_update_progress ON public.submission_grades IS 'Automatically updates student progress when a grade is assigned by instructor or system';
