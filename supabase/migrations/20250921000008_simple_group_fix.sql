-- Simple group submission fix function
-- A more basic approach to fixing group submissions

BEGIN;

-- Create a simple function to fix group submissions
CREATE OR REPLACE FUNCTION public.simple_fix_group_submissions(classroom_uuid UUID)
RETURNS TABLE(fixed_count INTEGER, message TEXT) AS $$
DECLARE
    fixed_submissions INTEGER := 0;
    submission_record RECORD;
    group_record RECORD;
    member_record RECORD;
    member_progress_id UUID;
BEGIN
    -- Step 1: Find submissions that need to be marked as group submissions
    FOR submission_record IN
        SELECT DISTINCT 
            asub.id as submission_id,
            asub.assessment_id,
            asub.progress_id,
            snp.user_id as submitting_user_id,
            na.node_id,
            ag.id as group_id
        FROM public.assessment_submissions asub
        JOIN public.student_node_progress snp ON asub.progress_id = snp.id
        JOIN public.node_assessments na ON asub.assessment_id = na.id
        JOIN public.assessment_groups ag ON ag.assessment_id = na.id
        JOIN public.assessment_group_members agm ON agm.group_id = ag.id AND agm.user_id = snp.user_id
        JOIN public.map_nodes mn ON na.node_id = mn.id
        JOIN public.learning_maps lm ON mn.map_id = lm.id
        WHERE (
            lm.parent_classroom_id = classroom_uuid OR 
            EXISTS (
                SELECT 1 FROM public.classroom_maps cm 
                WHERE cm.map_id = lm.id AND cm.classroom_id = classroom_uuid
            )
        )
        AND (asub.submitted_for_group IS NOT TRUE OR asub.assessment_group_id IS NULL)
    LOOP
        -- Update the submission to mark it as a group submission
        UPDATE public.assessment_submissions 
        SET 
            submitted_for_group = true,
            assessment_group_id = submission_record.group_id
        WHERE id = submission_record.submission_id;
        
        -- Find other group members who need submissions
        FOR member_record IN
            SELECT agm.user_id
            FROM public.assessment_group_members agm
            WHERE agm.group_id = submission_record.group_id
            AND agm.user_id != submission_record.submitting_user_id
            AND NOT EXISTS (
                SELECT 1 FROM public.assessment_submissions asub2
                JOIN public.student_node_progress snp2 ON asub2.progress_id = snp2.id
                WHERE asub2.assessment_id = submission_record.assessment_id 
                AND snp2.user_id = agm.user_id
            )
        LOOP
            -- Get or create progress record
            SELECT id INTO member_progress_id
            FROM public.student_node_progress
            WHERE user_id = member_record.user_id AND node_id = submission_record.node_id;
            
            IF member_progress_id IS NULL THEN
                INSERT INTO public.student_node_progress (user_id, node_id, status, arrived_at, started_at)
                VALUES (member_record.user_id, submission_record.node_id, 'in_progress', NOW(), NOW())
                RETURNING id INTO member_progress_id;
            END IF;
            
            -- Copy the submission
            INSERT INTO public.assessment_submissions (
                progress_id, assessment_id, text_answer, file_urls, image_url, 
                quiz_answers, assessment_group_id, submitted_for_group, submitted_at, metadata
            ) 
            SELECT 
                member_progress_id, assessment_id, text_answer, file_urls, image_url,
                quiz_answers, submission_record.group_id, true, submitted_at, metadata
            FROM public.assessment_submissions
            WHERE id = submission_record.submission_id;
            
            fixed_submissions := fixed_submissions + 1;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT fixed_submissions, 'Group submissions fixed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;