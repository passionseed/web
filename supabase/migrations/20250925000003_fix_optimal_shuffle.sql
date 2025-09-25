-- Fix Optimal Smart Group Shuffle Algorithm
-- Properly respect target group size preference while avoiding groups of size 1

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_assessment_groups_shuffle(UUID, INTEGER, BOOLEAN);

-- Create the corrected optimal shuffle function
CREATE OR REPLACE FUNCTION public.create_assessment_groups_shuffle(
    p_assessment_id UUID,
    p_target_group_size INTEGER DEFAULT 3,
    p_allow_uneven_groups BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    student_count INTEGER;
    groups_of_target_size INTEGER;
    groups_of_size_two INTEGER;
    current_group INTEGER := 1;
    current_group_size INTEGER := 0;
    current_group_id UUID;
    result JSON;
    student_record RECORD;
    target_size_for_current_group INTEGER;
BEGIN
    -- Verify the assessment exists and is a group assessment
    IF NOT EXISTS (
        SELECT 1 FROM public.node_assessments 
        WHERE id = p_assessment_id AND is_group_assessment = true
    ) THEN
        RAISE EXCEPTION 'Assessment not found or not configured for group assessment';
    END IF;
    
    -- Check permissions (user must be instructor/TA in the classroom containing this assessment)
    IF NOT EXISTS (
        SELECT 1 FROM public.node_assessments na
        JOIN public.map_nodes mn ON na.node_id = mn.id
        JOIN public.learning_maps lm ON mn.map_id = lm.id
        JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
        WHERE na.id = p_assessment_id 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('instructor', 'ta')
        AND lm.map_type = 'classroom_exclusive'
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to manage assessment groups';
    END IF;
    
    -- Delete existing groups for this assessment
    DELETE FROM public.assessment_groups WHERE assessment_id = p_assessment_id;
    
    -- Get all students in the classroom for this assessment
    CREATE TEMP TABLE temp_students AS
    SELECT cm.user_id, p.full_name, p.username
    FROM public.node_assessments na
    JOIN public.map_nodes mn ON na.node_id = mn.id
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
    JOIN public.profiles p ON cm.user_id = p.id
    WHERE na.id = p_assessment_id 
    AND cm.role = 'student'
    GROUP BY cm.user_id, p.full_name, p.username
    ORDER BY RANDOM(); -- Shuffle students
    
    SELECT COUNT(*) INTO student_count FROM temp_students;
    
    IF student_count = 0 THEN
        RAISE EXCEPTION 'No students found in classroom for this assessment';
    END IF;
    
    -- Smart distribution algorithm: start with target size, then adjust to avoid size 1
    IF p_allow_uneven_groups THEN
        DECLARE
            remainder INTEGER := student_count % p_target_group_size;
        BEGIN
            IF remainder = 0 THEN
                -- Perfect division: all groups are target size
                groups_of_target_size := student_count / p_target_group_size;
                groups_of_size_two := 0;
            ELSIF remainder = 1 THEN
                -- Avoid group of size 1: take 1 student from another group to make 2 groups of size 2
                -- Start with standard division: n groups of target_size + 1 group of size 1
                -- Convert to: (n-1) groups of target_size + 2 groups of size 2
                -- Math: target_size + 1 = (target_size - 1) + 2
                groups_of_target_size := (student_count / p_target_group_size) - 1;
                groups_of_size_two := 2;
            ELSE
                -- remainder = 2 or more: keep as is, groups of size 2+ are acceptable
                groups_of_target_size := student_count / p_target_group_size;
                groups_of_size_two := 1; -- one group with the remainder students
                
                -- But if remainder is exactly 2, make it a proper group of 2
                IF remainder = 2 THEN
                    -- Perfect: one group of target_size, one group of size 2
                    -- groups_of_target_size stays the same
                    groups_of_size_two := 1;
                ELSE
                    -- remainder > 2: the remainder group is acceptable size
                    groups_of_size_two := 0; -- the last group will have remainder students (handled differently)
                    
                    -- Actually, let's be consistent and use the remainder as a separate group
                    -- This will be handled in the assignment loop
                END IF;
            END IF;
        END;
    ELSE
        -- Strict mode: only create full groups of exactly target_size
        groups_of_target_size := student_count / p_target_group_size;
        groups_of_size_two := 0;
    END IF;
    
    -- For the special case of remainder > 2, we need to handle it properly
    DECLARE
        remainder INTEGER := student_count % p_target_group_size;
        total_assigned_students INTEGER;
    BEGIN
        IF p_allow_uneven_groups AND remainder > 2 THEN
            -- Keep the remainder as a separate group (it's size 3+ so acceptable)
            groups_of_size_two := 0;
            -- The remainder group will be handled naturally in the assignment loop
        END IF;
        
        -- Calculate how many students we've planned for
        total_assigned_students := groups_of_target_size * p_target_group_size + groups_of_size_two * 2;
        
        -- If we still have unassigned students and remainder > 2, create one more group
        IF total_assigned_students < student_count AND remainder > 2 THEN
            -- The remaining students form their own group (size = remainder)
            -- This is handled automatically by the assignment loop
        END IF;
    END;
    
    RAISE NOTICE 'Smart distribution: % students -> % groups of % + % groups of 2 + remainder group if needed', 
                 student_count, groups_of_target_size, p_target_group_size, groups_of_size_two;
    
    -- Create groups and assign students
    FOR student_record IN SELECT * FROM temp_students LOOP
        -- Create new group if needed
        IF current_group_size = 0 THEN
            INSERT INTO public.assessment_groups (assessment_id, group_name, group_number, created_by)
            VALUES (p_assessment_id, 'Group ' || current_group, current_group, auth.uid())
            RETURNING id INTO current_group_id;
            
            -- Determine target size for this group
            IF current_group <= groups_of_target_size THEN
                target_size_for_current_group := p_target_group_size;
            ELSIF current_group <= groups_of_target_size + groups_of_size_two THEN
                target_size_for_current_group := 2;
            ELSE
                -- This is a remainder group - it can have any remaining students
                target_size_for_current_group := student_count - (groups_of_target_size * p_target_group_size + groups_of_size_two * 2);
            END IF;
        END IF;
        
        -- Add student to current group
        INSERT INTO public.assessment_group_members (group_id, user_id, assigned_by)
        VALUES (current_group_id, student_record.user_id, auth.uid());
        
        current_group_size := current_group_size + 1;
        
        -- Move to next group if current one is full
        IF current_group_size >= target_size_for_current_group THEN
            current_group := current_group + 1;
            current_group_size := 0;
        END IF;
    END LOOP;
    
    -- Clean up temp table
    DROP TABLE temp_students;
    
    -- Return created groups
    SELECT json_agg(
        json_build_object(
            'id', ag.id,
            'group_name', ag.group_name,
            'group_number', ag.group_number,
            'member_count', (
                SELECT COUNT(*) FROM public.assessment_group_members 
                WHERE group_id = ag.id
            )
        ) ORDER BY ag.group_number
    ) INTO result
    FROM public.assessment_groups ag
    WHERE ag.assessment_id = p_assessment_id;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_assessment_groups_shuffle(UUID, INTEGER, BOOLEAN) TO authenticated;

COMMIT;