-- Fix and debug group submission trigger
-- Add better logging and error handling

BEGIN;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_handle_group_submission ON public.assessment_submissions;
DROP FUNCTION IF EXISTS public.handle_group_submission();

-- Create improved function with better debugging
CREATE OR REPLACE FUNCTION public.handle_group_submission()
RETURNS TRIGGER AS $$
DECLARE
    group_member RECORD;
    member_progress_id UUID;
    node_id_var UUID;
    submitting_user_id UUID;
BEGIN
    -- Only process if this is a group submission
    IF NEW.submitted_for_group = true AND NEW.assessment_group_id IS NOT NULL THEN
        
        RAISE INFO 'Processing group submission for group %', NEW.assessment_group_id;
        
        -- Get the node_id from the assessment
        SELECT na.node_id INTO node_id_var
        FROM public.node_assessments na
        WHERE na.id = NEW.assessment_id;
        
        IF node_id_var IS NULL THEN
            RAISE WARNING 'Could not find node_id for assessment %', NEW.assessment_id;
            RETURN NEW;
        END IF;
        
        RAISE INFO 'Found node_id % for assessment %', node_id_var, NEW.assessment_id;
        
        -- Get the user who submitted
        SELECT snp.user_id INTO submitting_user_id
        FROM public.student_node_progress snp 
        WHERE snp.id = NEW.progress_id;
        
        IF submitting_user_id IS NULL THEN
            RAISE WARNING 'Could not find submitting user for progress_id %', NEW.progress_id;
            RETURN NEW;
        END IF;
        
        RAISE INFO 'Submitting user: %', submitting_user_id;
        
        -- Create submissions for all other group members who haven't submitted yet
        FOR group_member IN 
            SELECT agm.user_id
            FROM public.assessment_group_members agm
            WHERE agm.group_id = NEW.assessment_group_id
            AND agm.user_id != submitting_user_id
            AND NOT EXISTS (
                SELECT 1 FROM public.assessment_submissions asub
                JOIN public.student_node_progress snp ON asub.progress_id = snp.id
                WHERE asub.assessment_id = NEW.assessment_id 
                AND snp.user_id = agm.user_id
            )
        LOOP
            RAISE INFO 'Processing group member: %', group_member.user_id;
            
            -- Get or create progress record for the group member
            SELECT id INTO member_progress_id
            FROM public.student_node_progress
            WHERE user_id = group_member.user_id 
            AND node_id = node_id_var;
            
            -- If no progress record exists, create one
            IF member_progress_id IS NULL THEN
                INSERT INTO public.student_node_progress (
                    user_id,
                    node_id,
                    status,
                    arrived_at,
                    started_at
                ) VALUES (
                    group_member.user_id,
                    node_id_var,
                    'in_progress',
                    NOW(),
                    NOW()
                )
                RETURNING id INTO member_progress_id;
                
                RAISE INFO 'Created progress record % for user % on node %', 
                    member_progress_id, group_member.user_id, node_id_var;
            ELSE
                RAISE INFO 'Found existing progress record % for user %', 
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
        
        RAISE INFO 'Completed processing group submission for group %', NEW.assessment_group_id;
        
    ELSE
        RAISE INFO 'Skipping non-group submission or missing group_id. submitted_for_group: %, group_id: %', 
            NEW.submitted_for_group, NEW.assessment_group_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for group submissions
CREATE TRIGGER trigger_handle_group_submission
    AFTER INSERT ON public.assessment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_group_submission();

-- Add helpful comments
COMMENT ON FUNCTION public.handle_group_submission() IS 
'Handles automatic creation of assessment submissions for all group members when one member submits. 
Creates progress records if they do not exist for group members. Includes detailed logging for debugging.';

COMMIT;