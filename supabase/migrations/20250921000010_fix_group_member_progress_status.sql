-- Fix group member progress status to allow progression after group submission
-- When one group member submits, all group members should have their progress updated to "submitted"
-- so they can proceed to the next node without waiting for grading

BEGIN;

-- Drop and recreate the group submission handler with progress status update
DROP TRIGGER IF EXISTS trigger_handle_group_submission ON public.assessment_submissions;
DROP FUNCTION IF EXISTS public.handle_group_submission();

-- Enhanced function that also updates progress status for group members
CREATE OR REPLACE FUNCTION public.handle_group_submission()
RETURNS TRIGGER AS $$
DECLARE
    group_member RECORD;
    member_progress_id UUID;
    node_id_var UUID;
BEGIN
    -- Only process if this is a group submission
    IF NEW.submitted_for_group = true AND NEW.assessment_group_id IS NOT NULL THEN
        
        RAISE INFO 'Processing group submission for group % and assessment %', 
            NEW.assessment_group_id, NEW.assessment_id;
        
        -- Get the node_id from the assessment
        SELECT na.node_id INTO node_id_var
        FROM public.node_assessments na
        WHERE na.id = NEW.assessment_id;
        
        IF node_id_var IS NULL THEN
            RAISE WARNING 'Could not find node_id for assessment %', NEW.assessment_id;
            RETURN NEW;
        END IF;
        
        -- Create submissions and update progress for all other group members who haven't submitted yet
        FOR group_member IN 
            SELECT agm.user_id
            FROM public.assessment_group_members agm
            WHERE agm.group_id = NEW.assessment_group_id
            AND agm.user_id != (
                SELECT snp.user_id 
                FROM public.student_node_progress snp 
                WHERE snp.id = NEW.progress_id
            )
            AND NOT EXISTS (
                SELECT 1 FROM public.assessment_submissions asub
                JOIN public.student_node_progress snp ON asub.progress_id = snp.id
                WHERE asub.assessment_id = NEW.assessment_id 
                AND snp.user_id = agm.user_id
            )
        LOOP
            -- Get or create progress record for the group member
            SELECT id INTO member_progress_id
            FROM public.student_node_progress
            WHERE user_id = group_member.user_id 
            AND node_id = node_id_var;
            
            -- If no progress record exists, create one with 'submitted' status
            IF member_progress_id IS NULL THEN
                INSERT INTO public.student_node_progress (
                    user_id,
                    node_id,
                    status,
                    arrived_at,
                    started_at,
                    submitted_at
                ) VALUES (
                    group_member.user_id,
                    node_id_var,
                    'submitted',  -- Start with submitted status since group submission is created
                    NOW(),
                    NOW(),
                    NEW.submitted_at
                )
                RETURNING id INTO member_progress_id;
                
                RAISE INFO 'Created progress record % for user % on node % with submitted status', 
                    member_progress_id, group_member.user_id, node_id_var;
            ELSE
                -- Update existing progress record to 'submitted' status
                UPDATE public.student_node_progress
                SET 
                    status = 'submitted',
                    submitted_at = NEW.submitted_at
                WHERE id = member_progress_id;
                
                RAISE INFO 'Updated progress record % for user % to submitted status', 
                    member_progress_id, group_member.user_id;
            END IF;
            
            -- Create a copy of the submission for each group member
            INSERT INTO public.assessment_submissions (
                progress_id,
                assessment_id,
                text_answer,
                file_urls,
                image_url,
                quiz_answers,
                assessment_group_id,
                submitted_for_group,
                submitted_at,
                metadata
            ) VALUES (
                member_progress_id,
                NEW.assessment_id,
                NEW.text_answer,
                NEW.file_urls,
                NEW.image_url,
                NEW.quiz_answers,
                NEW.assessment_group_id,
                true,
                NEW.submitted_at,
                NEW.metadata
            );
            
            RAISE INFO 'Created group submission for user % with progress_id %', 
                group_member.user_id, member_progress_id;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for group submissions
CREATE TRIGGER trigger_handle_group_submission
    AFTER INSERT ON public.assessment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_group_submission();

-- Add helpful comments
COMMENT ON FUNCTION public.handle_group_submission() IS 
'Handles automatic creation of assessment submissions for all group members when one member submits. 
Creates progress records with "submitted" status if they do not exist, or updates existing records to "submitted".
This allows all group members to progress to the next node immediately after one member submits.';

COMMIT;