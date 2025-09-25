-- Fully Balanced Smart Group Shuffle Algorithm
-- Ensures balanced group sizes for ALL cases, not just remainder = 1

BEGIN;

-- Drop the existing function
DROP FUNCTION IF EXISTS public.create_assessment_groups_shuffle(UUID, INTEGER, BOOLEAN);

-- Create the fully balanced shuffle function
CREATE OR REPLACE FUNCTION public.create_assessment_groups_shuffle(
    p_assessment_id UUID,
    p_target_group_size INTEGER DEFAULT 3,
    p_allow_uneven_groups BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    student_count INTEGER;
    larger_groups INTEGER;
    smaller_groups INTEGER;
    larger_group_size INTEGER;
    smaller_group_size INTEGER;
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
    
    -- Clean Universal Balanced Distribution Algorithm
    DECLARE
        remainder INTEGER := student_count % p_target_group_size;
        base_groups INTEGER := student_count / p_target_group_size;
    BEGIN
        IF NOT p_allow_uneven_groups THEN
            -- Strict mode: only full groups
            smaller_groups := base_groups;
            larger_groups := 0;
            smaller_group_size := p_target_group_size;
            larger_group_size := p_target_group_size;
            
        ELSIF remainder = 0 THEN
            -- Perfect division: all groups same size
            smaller_groups := base_groups;
            larger_groups := 0;
            smaller_group_size := p_target_group_size;
            larger_group_size := p_target_group_size;
            
        ELSIF remainder = 1 THEN
            -- Avoid group of size 1: redistribute one student
            -- We have: base_groups * target_size + 1 students
            -- Convert to: (base_groups - 1) * target_size + 1 * (target_size + 1)
            -- Then split the (target_size + 1) group into smaller groups
            -- Actually, let's use the same math as other cases for consistency
            DECLARE
                total_groups_needed INTEGER := base_groups + 1;
                groups_of_target_size INTEGER;
                groups_of_smaller_size INTEGER;
            BEGIN
                groups_of_target_size := student_count - total_groups_needed * (p_target_group_size - 1);
                groups_of_smaller_size := total_groups_needed - groups_of_target_size;
                
                smaller_groups := groups_of_target_size;
                larger_groups := groups_of_smaller_size;
                smaller_group_size := p_target_group_size;
                larger_group_size := p_target_group_size - 1;
            END;
            
        ELSE
            -- Standard case: never exceed target size, create balanced groups
            -- We have: base_groups * target_size + remainder students
            -- We want: x groups of target_size + y groups of (target_size - 1)
            -- Equation: x * target_size + y * (target_size - 1) = total students
            -- Also: x + y = total number of groups needed
            -- Solve: y = base_groups + 1 - x, substitute and solve for x
            DECLARE
                total_groups_needed INTEGER := base_groups + 1;
                groups_of_target_size INTEGER;
                groups_of_smaller_size INTEGER;
            BEGIN
                -- x * target_size + (total_groups_needed - x) * (target_size - 1) = student_count
                -- x * target_size + total_groups_needed * (target_size - 1) - x * (target_size - 1) = student_count
                -- x * (target_size - (target_size - 1)) = student_count - total_groups_needed * (target_size - 1)
                -- x = student_count - total_groups_needed * (target_size - 1)
                groups_of_target_size := student_count - total_groups_needed * (p_target_group_size - 1);
                groups_of_smaller_size := total_groups_needed - groups_of_target_size;
                
                smaller_groups := groups_of_target_size;
                larger_groups := groups_of_smaller_size;
                smaller_group_size := p_target_group_size;
                larger_group_size := p_target_group_size - 1;
            END;
        END IF;
    END;
    
    RAISE NOTICE 'Balanced distribution: % students -> % groups of % + % groups of %', 
                 student_count, smaller_groups, smaller_group_size, larger_groups, larger_group_size;
    
    -- Create groups and assign students
    FOR student_record IN SELECT * FROM temp_students LOOP
        -- Create new group if needed
        IF current_group_size = 0 THEN
            INSERT INTO public.assessment_groups (assessment_id, group_name, group_number, created_by)
            VALUES (p_assessment_id, 'Group ' || current_group, current_group, auth.uid())
            RETURNING id INTO current_group_id;
            
            -- Determine target size for this group
            IF current_group <= smaller_groups THEN
                target_size_for_current_group := smaller_group_size;
            ELSE
                target_size_for_current_group := larger_group_size;
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