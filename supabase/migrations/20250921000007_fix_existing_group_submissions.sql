-- Investigate and fix existing group submissions
-- This will help identify why group submissions aren't working

BEGIN;

-- First, let's check what assessment groups exist
CREATE OR REPLACE FUNCTION public.debug_group_submissions(classroom_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Get all group information for debugging
    SELECT json_build_object(
        'assessment_groups', (
            SELECT json_agg(
                json_build_object(
                    'group_id', ag.id,
                    'group_name', ag.group_name,
                    'assessment_id', ag.assessment_id,
                    'members', (
                        SELECT json_agg(
                            json_build_object(
                                'user_id', agm.user_id,
                                'username', p.username,
                                'full_name', p.full_name
                            )
                        )
                        FROM public.assessment_group_members agm
                        JOIN public.profiles p ON p.id = agm.user_id
                        WHERE agm.group_id = ag.id
                    )
                )
            )
            FROM public.assessment_groups ag
            JOIN public.node_assessments na ON ag.assessment_id = na.id
            JOIN public.map_nodes mn ON na.node_id = mn.id
            JOIN public.learning_maps lm ON mn.map_id = lm.id
            WHERE lm.parent_classroom_id = classroom_uuid OR EXISTS (
                SELECT 1 FROM public.classroom_maps cm 
                WHERE cm.map_id = lm.id AND cm.classroom_id = classroom_uuid
            )
        ),
        'submissions', (
            SELECT json_agg(
                json_build_object(
                    'submission_id', asub.id,
                    'user_id', snp.user_id,
                    'username', p.username,
                    'node_title', mn.title,
                    'map_title', lm.title,
                    'submitted_for_group', asub.submitted_for_group,
                    'assessment_group_id', asub.assessment_group_id,
                    'assessment_id', asub.assessment_id
                )
            )
            FROM public.assessment_submissions asub
            JOIN public.student_node_progress snp ON asub.progress_id = snp.id
            JOIN public.profiles p ON p.id = snp.user_id
            JOIN public.node_assessments na ON asub.assessment_id = na.id
            JOIN public.map_nodes mn ON na.node_id = mn.id
            JOIN public.learning_maps lm ON mn.map_id = lm.id
            WHERE lm.parent_classroom_id = classroom_uuid OR EXISTS (
                SELECT 1 FROM public.classroom_maps cm 
                WHERE cm.map_id = lm.id AND cm.classroom_id = classroom_uuid
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually fix group submissions
CREATE OR REPLACE FUNCTION public.fix_group_submissions(classroom_uuid UUID)
RETURNS JSON AS $$
DECLARE
    submission_record RECORD;
    group_member RECORD;
    member_progress_id UUID;
    node_id_var UUID;
    fixed_count INTEGER := 0;
BEGIN
    -- Find submissions that should be group submissions but aren't marked as such
    FOR submission_record IN
        SELECT DISTINCT 
            asub.id as submission_id,
            asub.assessment_id,
            asub.progress_id,
            ag.id as group_id,
            snp.user_id as submitting_user_id,
            na.node_id
        FROM public.assessment_submissions asub
        JOIN public.student_node_progress snp ON asub.progress_id = snp.id
        JOIN public.node_assessments na ON asub.assessment_id = na.id
        JOIN public.assessment_groups ag ON ag.assessment_id = na.id
        JOIN public.assessment_group_members agm ON agm.group_id = ag.id AND agm.user_id = snp.user_id
        JOIN public.map_nodes mn ON na.node_id = mn.id
        JOIN public.learning_maps lm ON mn.map_id = lm.id
        WHERE (lm.parent_classroom_id = classroom_uuid OR EXISTS (
            SELECT 1 FROM public.classroom_maps cm 
            WHERE cm.map_id = lm.id AND cm.classroom_id = classroom_uuid
        ))
        AND (asub.submitted_for_group IS NOT TRUE OR asub.assessment_group_id IS NULL)
    LOOP
        RAISE INFO 'Processing submission % for group %', submission_record.submission_id, submission_record.group_id;
        
        -- Update the original submission to mark it as a group submission
        UPDATE public.assessment_submissions 
        SET 
            submitted_for_group = true,
            assessment_group_id = submission_record.group_id
        WHERE id = submission_record.submission_id;
        
        -- Now create submissions for other group members
        FOR group_member IN 
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
            RAISE INFO 'Creating submission for group member: %', group_member.user_id;
            
            -- Get or create progress record for the group member
            SELECT id INTO member_progress_id
            FROM public.student_node_progress
            WHERE user_id = group_member.user_id 
            AND node_id = submission_record.node_id;
            
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
                    submission_record.node_id,
                    'in_progress',
                    NOW(),
                    NOW()
                )
                RETURNING id INTO member_progress_id;
                
                RAISE INFO 'Created progress record % for user %', member_progress_id, group_member.user_id;
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
            ) 
            SELECT 
                member_progress_id,
                assessment_id,
                text_answer,
                file_urls,
                image_url,
                quiz_answers,
                submission_record.group_id,
                true,
                submitted_at,
                metadata
            FROM public.assessment_submissions
            WHERE id = submission_record.submission_id;
            
            fixed_count := fixed_count + 1;
            RAISE INFO 'Created group submission for user %', group_member.user_id;
        END LOOP;
    END LOOP;
    
    RETURN json_build_object('fixed_submissions', fixed_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;