-- Optimal Smart Group Shuffle Algorithm
-- This creates truly balanced groups avoiding size 1 groups

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_assessment_groups_shuffle(UUID, INTEGER, BOOLEAN);

-- Create the optimal shuffle function
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
    
    -- Optimal distribution algorithm to avoid groups of size 1
    IF p_allow_uneven_groups THEN
        DECLARE
            remainder INTEGER := student_count % p_target_group_size;
        BEGIN
            IF remainder = 0 THEN
                -- Perfect division: all groups are target size
                groups_of_target_size := student_count / p_target_group_size;
                groups_of_size_two := 0;
            ELSIF remainder = 1 THEN
                -- Avoid group of 1: convert one target_size group to two groups of size 2
                -- Example: 40 students, target 3 -> instead of 13×3 + 1×1, make 12×3 + 2×2
                -- But optimal is 10×3 + 5×2, so we need more groups of 2
                DECLARE
                    basic_groups INTEGER := student_count / p_target_group_size;
                    needed_for_pairs INTEGER := (p_target_group_size + 1) / 2;  -- Students needed to make pairs
                BEGIN
                    -- Calculate how many target_size groups to convert to pairs
                    -- For 40 students, target 3: we want to maximize groups of 2
                    -- 40 = 3x + 2y, maximize y while keeping reasonable x
                    -- Try different combinations: start with all groups of 2, then add groups of 3
                    IF student_count % 2 = 0 THEN
                        -- Even number of students: maximize groups of 2
                        groups_of_size_two := student_count / 2;
                        groups_of_target_size := 0;
                        -- But prefer some groups of target size if reasonable
                        WHILE groups_of_size_two >= p_target_group_size AND groups_of_size_two * 2 + groups_of_target_size * p_target_group_size = student_count LOOP
                            groups_of_size_two := groups_of_size_two - (p_target_group_size / 2);
                            groups_of_target_size := groups_of_target_size + 2;
                            -- For target 3: convert 3 groups of 2 (6 students) into 2 groups of 3 (6 students)
                            -- This reduces total group count while maintaining good sizes
                            IF p_target_group_size = 3 AND groups_of_size_two >= 3 THEN
                                groups_of_size_two := groups_of_size_two - 3;
                                groups_of_target_size := groups_of_target_size + 2;
                            END IF;
                        END LOOP;
                    ELSE
                        -- Odd number: need at least one group of target_size (if target_size is odd)
                        groups_of_target_size := 1;
                        groups_of_size_two := (student_count - p_target_group_size) / 2;
                    END IF;
                END;
            ELSE
                -- remainder >= 2: create some groups of size (target_size-1) and some of target_size
                groups_of_target_size := student_count / p_target_group_size;
                groups_of_size_two := remainder;
            END IF;
        END;
    ELSE
        -- Strict mode: only create full groups of exactly target_size
        groups_of_target_size := student_count / p_target_group_size;
        groups_of_size_two := 0;
    END IF;
    
    RAISE NOTICE 'Optimal distribution: % students -> % groups of % + % groups of 2', 
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
            ELSE
                target_size_for_current_group := 2;
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