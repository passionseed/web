-- Add group grading trigger to automatically grade all group members
-- When one member of a group assessment gets graded, all other members get the same grade

BEGIN;

-- Create function to handle group grading
CREATE OR REPLACE FUNCTION public.handle_group_grading()
RETURNS TRIGGER AS $$
DECLARE
    group_member_submission RECORD;
    assessment_group_id_var UUID;
BEGIN
    -- Check if this grade is for a group assessment submission
    SELECT ags.assessment_group_id INTO assessment_group_id_var
    FROM public.assessment_submissions ags
    WHERE ags.id = NEW.submission_id
    AND ags.submitted_for_group = true
    AND ags.assessment_group_id IS NOT NULL;
    
    -- If this is a group submission, apply the same grade to all other group members
    IF assessment_group_id_var IS NOT NULL THEN
        
        -- Apply the same grade to all other group member submissions
        FOR group_member_submission IN 
            SELECT asub.id as submission_id
            FROM public.assessment_submissions asub
            JOIN public.student_node_progress snp ON asub.progress_id = snp.id
            JOIN public.assessment_group_members agm ON agm.user_id = snp.user_id
            WHERE agm.group_id = assessment_group_id_var
            AND asub.assessment_id = (
                SELECT assessment_id 
                FROM public.assessment_submissions 
                WHERE id = NEW.submission_id
            )
            AND asub.id != NEW.submission_id  -- Don't grade the one we just graded
            AND asub.submitted_for_group = true
        LOOP
            -- Check if this submission already has a grade
            IF NOT EXISTS (
                SELECT 1 FROM public.submission_grades sg 
                WHERE sg.submission_id = group_member_submission.submission_id
            ) THEN
                -- Create the same grade for this group member
                INSERT INTO public.submission_grades (
                    submission_id,
                    grade,
                    points_awarded,
                    comments,
                    graded_at,
                    graded_by
                ) VALUES (
                    group_member_submission.submission_id,
                    NEW.grade,
                    NEW.points_awarded,
                    COALESCE(NEW.comments, '') || ' (Group Grade)',
                    NEW.graded_at,
                    NEW.graded_by
                );
                
                RAISE INFO 'Applied group grade to submission %', group_member_submission.submission_id;
            ELSE
                -- Update existing grade for this group member
                UPDATE public.submission_grades 
                SET 
                    grade = NEW.grade,
                    points_awarded = NEW.points_awarded,
                    comments = COALESCE(NEW.comments, '') || ' (Group Grade)',
                    graded_at = NEW.graded_at,
                    graded_by = NEW.graded_by
                WHERE submission_id = group_member_submission.submission_id;
                
                RAISE INFO 'Updated group grade for submission %', group_member_submission.submission_id;
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for group grading
CREATE TRIGGER trigger_handle_group_grading
    AFTER INSERT OR UPDATE ON public.submission_grades
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_group_grading();

-- Add helpful comments
COMMENT ON FUNCTION public.handle_group_grading() IS 
'Handles automatic grading propagation for group assessment submissions. 
When one group member gets graded, all other group members receive the same grade automatically.';

COMMIT;