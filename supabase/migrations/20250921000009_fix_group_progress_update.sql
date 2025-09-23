-- Fix group progress update to ensure all group members can progress to next stage
-- When one group member gets graded, all group members should have their progress updated

BEGIN;

-- Drop existing trigger and function to recreate with group support
DROP TRIGGER IF EXISTS on_new_grade_update_progress ON public.submission_grades;
DROP FUNCTION IF EXISTS public.update_progress_on_grade();

-- Enhanced function to update progress for both individual and group submissions
CREATE OR REPLACE FUNCTION public.update_progress_on_grade() 
RETURNS TRIGGER AS $$
DECLARE
    submission_progress_id uuid;
    new_status text;
    submission_record RECORD;
    group_member_submission RECORD;
BEGIN
    -- Get submission details
    SELECT 
        progress_id,
        submitted_for_group,
        assessment_group_id,
        assessment_id
    INTO submission_record
    FROM public.assessment_submissions
    WHERE id = NEW.submission_id;

    -- Map grade to appropriate status
    IF NEW.grade = 'pass' THEN
        new_status := 'passed';
    ELSIF NEW.grade = 'fail' THEN
        new_status := 'failed';
    ELSE
        RAISE EXCEPTION 'Invalid grade value: %', NEW.grade;
    END IF;

    -- Update the status for the main submission
    UPDATE public.student_node_progress
    SET status = new_status
    WHERE id = submission_record.progress_id;

    RAISE INFO 'Updated main progress % to status %', submission_record.progress_id, new_status;

    -- If this is a group submission, update progress for all other group members too
    IF submission_record.submitted_for_group = true AND submission_record.assessment_group_id IS NOT NULL THEN
        RAISE INFO 'Processing group progress update for group %', submission_record.assessment_group_id;
        
        -- Find all other group member submissions and update their progress
        FOR group_member_submission IN 
            SELECT 
                asub.progress_id,
                asub.id as submission_id
            FROM public.assessment_submissions asub
            WHERE asub.assessment_id = submission_record.assessment_id
            AND asub.submitted_for_group = true
            AND asub.assessment_group_id = submission_record.assessment_group_id
            AND asub.id != NEW.submission_id  -- Don't update the one we already updated
        LOOP
            -- Update progress status for this group member
            UPDATE public.student_node_progress
            SET status = new_status
            WHERE id = group_member_submission.progress_id;
            
            RAISE INFO 'Updated group member progress % to status %', 
                group_member_submission.progress_id, new_status;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_new_grade_update_progress
    AFTER INSERT OR UPDATE ON public.submission_grades
    FOR EACH ROW
    EXECUTE FUNCTION public.update_progress_on_grade();

-- Update comments
COMMENT ON FUNCTION public.update_progress_on_grade() IS 
'Maps submission grades (pass/fail) to progress status (passed/failed) for both individual and group submissions. 
When a group submission is graded, all group members progress status is updated so they can all advance to next stages.';

COMMIT;