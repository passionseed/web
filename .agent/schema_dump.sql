--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: community_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.community_role AS ENUM (
    'member',
    'moderator',
    'admin',
    'owner'
);


ALTER TYPE public.community_role OWNER TO postgres;

--
-- Name: emotion; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.emotion AS ENUM (
    'joy',
    'curiosity',
    'fulfillment',
    'challenge',
    'sadness',
    'anxiety',
    'anticipation',
    'trust',
    'happy',
    'excited',
    'grateful',
    'content',
    'hopeful',
    'sad',
    'anxious',
    'frustrated',
    'overwhelmed',
    'tired',
    'neutral',
    'calm',
    'proud',
    'motivated',
    'creative',
    'confused',
    'stuck',
    'bored',
    'stressed',
    'energized'
);


ALTER TYPE public.emotion OWNER TO postgres;

--
-- Name: map_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.map_type AS ENUM (
    'public',
    'private',
    'classroom_exclusive'
);


ALTER TYPE public.map_type OWNER TO postgres;

--
-- Name: post_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.post_type AS ENUM (
    'text',
    'image',
    'link',
    'poll'
);


ALTER TYPE public.post_type OWNER TO postgres;

--
-- Name: project_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.project_status AS ENUM (
    'planning',
    'in_progress',
    'completed',
    'on_hold'
);


ALTER TYPE public.project_status OWNER TO postgres;

--
-- Name: archive_old_assignments(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.archive_old_assignments(days_old integer DEFAULT 365) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    archived_count INTEGER := 0;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := now() - (days_old || ' days')::INTERVAL;
    
    -- Only allow instructors to archive their own assignments
    UPDATE public.classroom_assignments
    SET is_active = false
    WHERE created_by = auth.uid()
    AND created_at < cutoff_date
    AND is_active = true;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN json_build_object(
        'archived_assignments', archived_count,
        'cutoff_date', cutoff_date,
        'archived_at', now()
    );
END;
$$;


ALTER FUNCTION public.archive_old_assignments(days_old integer) OWNER TO postgres;

--
-- Name: FUNCTION archive_old_assignments(days_old integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.archive_old_assignments(days_old integer) IS 'Archives assignments older than specified days (default 365)';


--
-- Name: assign_group_assignment_to_members(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_group_assignment_to_members() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- When a group assignment is created, automatically enroll all group members
    INSERT INTO public.assignment_enrollments (assignment_id, user_id, due_date, status)
    SELECT 
        NEW.assignment_id,
        agm.user_id,
        NEW.due_date,
        'assigned'
    FROM public.assignment_group_members agm
    WHERE agm.group_id = NEW.group_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.assign_group_assignment_to_members() OWNER TO postgres;

--
-- Name: auto_enroll_classroom_members(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_enroll_classroom_members(assignment_uuid uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    classroom_uuid UUID;
    enrollment_count INTEGER := 0;
    member_record RECORD;
BEGIN
    -- Get the classroom ID for this assignment
    SELECT classroom_id INTO classroom_uuid
    FROM public.classroom_assignments 
    WHERE id = assignment_uuid;
    
    IF classroom_uuid IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;
    
    -- Check if user has permission to manage this assignment
    IF NOT EXISTS (
        SELECT 1 FROM public.classroom_assignments 
        WHERE id = assignment_uuid AND created_by = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: you can only auto-enroll members in your own assignments';
    END IF;
    
    -- Enroll all students in the classroom
    FOR member_record IN 
        SELECT user_id 
        FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND role = 'student'
    LOOP
        -- Insert enrollment if it doesn't already exist
        INSERT INTO public.assignment_enrollments (assignment_id, user_id)
        SELECT assignment_uuid, member_record.user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM public.assignment_enrollments 
            WHERE assignment_id = assignment_uuid 
            AND user_id = member_record.user_id
        );
        
        IF FOUND THEN
            enrollment_count := enrollment_count + 1;
        END IF;
    END LOOP;
    
    RETURN enrollment_count;
END;
$$;


ALTER FUNCTION public.auto_enroll_classroom_members(assignment_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION auto_enroll_classroom_members(assignment_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.auto_enroll_classroom_members(assignment_uuid uuid) IS 'Automatically enrolls all classroom students in a new assignment';


--
-- Name: bulk_enroll_students(uuid, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bulk_enroll_students(classroom_uuid uuid, student_emails text[]) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    enrollment_results JSON;
    successful_enrollments INTEGER := 0;
    failed_enrollments INTEGER := 0;
    email_address TEXT;
    user_uuid UUID;
    error_details JSON[] := ARRAY[]::JSON[];
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can enroll students';
    END IF;
    
    -- Process each email
    FOREACH email_address IN ARRAY student_emails
    LOOP
        BEGIN
            -- Find user by email
            SELECT id INTO user_uuid
            FROM auth.users 
            WHERE email = email_address;
            
            IF user_uuid IS NULL THEN
                failed_enrollments := failed_enrollments + 1;
                error_details := error_details || json_build_object(
                    'email', email_address,
                    'error', 'User not found'
                );
                CONTINUE;
            END IF;
            
            -- Insert membership if not exists
            INSERT INTO public.classroom_memberships (classroom_id, user_id, role)
            VALUES (classroom_uuid, user_uuid, 'student')
            ON CONFLICT (classroom_id, user_id) DO NOTHING;
            
            IF FOUND THEN
                successful_enrollments := successful_enrollments + 1;
            ELSE
                failed_enrollments := failed_enrollments + 1;
                error_details := error_details || json_build_object(
                    'email', email_address,
                    'error', 'Already enrolled'
                );
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            failed_enrollments := failed_enrollments + 1;
            error_details := error_details || json_build_object(
                'email', email_address,
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    SELECT json_build_object(
        'successful_enrollments', successful_enrollments,
        'failed_enrollments', failed_enrollments,
        'total_attempted', array_length(student_emails, 1),
        'errors', error_details,
        'processed_at', now()
    ) INTO enrollment_results;
    
    RETURN enrollment_results;
END;
$$;


ALTER FUNCTION public.bulk_enroll_students(classroom_uuid uuid, student_emails text[]) OWNER TO postgres;

--
-- Name: FUNCTION bulk_enroll_students(classroom_uuid uuid, student_emails text[]); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.bulk_enroll_students(classroom_uuid uuid, student_emails text[]) IS 'Bulk enrolls students in a classroom by email addresses';


--
-- Name: calculate_assignment_completion(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_assignment_completion(enrollment_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    enrollment_record RECORD;
    total_nodes INTEGER := 0;
    completed_nodes INTEGER := 0;
    required_nodes INTEGER := 0;
    completed_required INTEGER := 0;
    total_points INTEGER := 0;
    earned_points INTEGER := 0;
    completion_percentage INTEGER := 0;
    result JSON;
BEGIN
    -- Get enrollment details
    SELECT ae.*, ca.id as assignment_id
    INTO enrollment_record
    FROM public.assignment_enrollments ae
    JOIN public.classroom_assignments ca ON ae.assignment_id = ca.id
    WHERE ae.id = enrollment_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Enrollment not found';
    END IF;
    
    -- Check access permissions
    IF NOT (
        enrollment_record.user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.classroom_assignments 
            WHERE id = enrollment_record.assignment_id 
            AND created_by = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied to enrollment data';
    END IF;
    
    -- Calculate node completion statistics
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE an.is_required) as required_total,
        COALESCE(SUM(an.points_possible), 0) as points_possible
    INTO total_nodes, required_nodes, total_points
    FROM public.assignment_nodes an
    WHERE an.assignment_id = enrollment_record.assignment_id;
    
    -- Count completed nodes (check student_node_progress table)
    SELECT 
        COUNT(*) FILTER (WHERE snp.status IN ('passed', 'completed')) as completed_total,
        COUNT(*) FILTER (WHERE snp.status IN ('passed', 'completed') AND an.is_required) as completed_required_total,
        COALESCE(SUM(
            CASE WHEN snp.status IN ('passed', 'completed') 
            THEN an.points_possible 
            ELSE 0 END
        ), 0) as earned_points_total
    INTO completed_nodes, completed_required, earned_points
    FROM public.assignment_nodes an
    LEFT JOIN public.student_node_progress snp ON (
        an.node_id = snp.node_id 
        AND snp.user_id = enrollment_record.user_id
    )
    WHERE an.assignment_id = enrollment_record.assignment_id;
    
    -- Calculate completion percentage
    IF required_nodes > 0 THEN
        completion_percentage := ROUND((completed_required::DECIMAL / required_nodes::DECIMAL) * 100);
    ELSIF total_nodes > 0 THEN
        completion_percentage := ROUND((completed_nodes::DECIMAL / total_nodes::DECIMAL) * 100);
    END IF;
    
    -- Build result
    SELECT json_build_object(
        'enrollment_id', enrollment_uuid,
        'assignment_id', enrollment_record.assignment_id,
        'user_id', enrollment_record.user_id,
        'total_nodes', total_nodes,
        'completed_nodes', completed_nodes,
        'required_nodes', required_nodes,
        'completed_required_nodes', completed_required,
        'completion_percentage', completion_percentage,
        'total_points_possible', total_points,
        'total_points_earned', earned_points,
        'status', CASE 
            WHEN completion_percentage = 100 THEN 'completed'
            WHEN completed_nodes > 0 THEN 'in_progress'
            ELSE 'assigned'
        END,
        'last_calculated', now()
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.calculate_assignment_completion(enrollment_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION calculate_assignment_completion(enrollment_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.calculate_assignment_completion(enrollment_uuid uuid) IS 'Calculates detailed completion statistics for an assignment enrollment';


--
-- Name: create_assessment_groups_shuffle(uuid, integer, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_assessment_groups_shuffle(p_assessment_id uuid, p_target_group_size integer DEFAULT 3, p_allow_uneven_groups boolean DEFAULT true) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.create_assessment_groups_shuffle(p_assessment_id uuid, p_target_group_size integer, p_allow_uneven_groups boolean) OWNER TO postgres;

--
-- Name: create_assignment_from_map(uuid, uuid, text, text, uuid[], boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text DEFAULT NULL::text, selected_node_ids uuid[] DEFAULT NULL::uuid[], auto_enroll boolean DEFAULT true) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    assignment_id UUID;
    node_id UUID;
    sequence_num INTEGER := 1;
    enrolled_count INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can create assignments';
    END IF;
    
    -- Check if map is linked to classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classroom_maps 
        WHERE classroom_id = classroom_uuid 
        AND map_id = map_uuid 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Map is not linked to this classroom';
    END IF;
    
    -- Create the assignment
    INSERT INTO public.classroom_assignments (
        classroom_id,
        title,
        description,
        created_by,
        source_map_id,
        map_context
    ) VALUES (
        classroom_uuid,
        assignment_title,
        assignment_description,
        auth.uid(),
        map_uuid,
        'Created from linked map: ' || (SELECT title FROM public.learning_maps WHERE id = map_uuid)
    ) RETURNING id INTO assignment_id;
    
    -- Add nodes to assignment
    IF selected_node_ids IS NOT NULL THEN
        -- Use selected nodes
        FOREACH node_id IN ARRAY selected_node_ids
        LOOP
            -- Verify node belongs to the map
            IF EXISTS (
                SELECT 1 FROM public.map_nodes 
                WHERE id = node_id AND map_id = map_uuid
            ) THEN
                INSERT INTO public.assignment_nodes (
                    assignment_id,
                    node_id,
                    sequence_order
                ) VALUES (
                    assignment_id,
                    node_id,
                    sequence_num
                );
                sequence_num := sequence_num + 1;
            END IF;
        END LOOP;
    ELSE
        -- Use all nodes from the map
        INSERT INTO public.assignment_nodes (assignment_id, node_id, sequence_order)
        SELECT assignment_id, mn.id, ROW_NUMBER() OVER (ORDER BY mn.created_at)
        FROM public.map_nodes mn
        WHERE mn.map_id = map_uuid;
    END IF;
    
    -- Auto-enroll students if requested
    IF auto_enroll THEN
        INSERT INTO public.assignment_enrollments (assignment_id, user_id)
        SELECT assignment_id, cm.user_id
        FROM public.classroom_memberships cm
        WHERE cm.classroom_id = classroom_uuid
        AND cm.role = 'student';
        
        GET DIAGNOSTICS enrolled_count = ROW_COUNT;
    END IF;
    
    RETURN json_build_object(
        'assignment_id', assignment_id,
        'classroom_id', classroom_uuid,
        'source_map_id', map_uuid,
        'nodes_added', sequence_num - 1,
        'students_enrolled', enrolled_count,
        'created_at', now()
    );
END;
$$;


ALTER FUNCTION public.create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text, selected_node_ids uuid[], auto_enroll boolean) OWNER TO postgres;

--
-- Name: FUNCTION create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text, selected_node_ids uuid[], auto_enroll boolean); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text, selected_node_ids uuid[], auto_enroll boolean) IS 'Creates an assignment based on nodes from a linked map';


--
-- Name: create_classroom_exclusive_map(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_classroom_exclusive_map(classroom_uuid uuid, map_title text, map_description text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    new_map_id UUID;
    result JSON;
BEGIN
    -- Verify user has permission to create maps in this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = auth.uid() 
        AND role IN ('instructor', 'ta')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to create classroom-exclusive maps';
    END IF;
    
    -- Create the map
    INSERT INTO public.learning_maps (
        title,
        description,
        creator_id,
        map_type,
        parent_classroom_id,
        visibility
    ) VALUES (
        map_title,
        map_description,
        auth.uid(),
        'classroom_exclusive',
        classroom_uuid,
        'private'  -- Classroom-exclusive maps are always private visibility
    ) RETURNING id INTO new_map_id;
    
    -- Return the created map
    SELECT json_build_object(
        'id', new_map_id,
        'title', map_title,
        'description', map_description,
        'creator_id', auth.uid(),
        'map_type', 'classroom_exclusive',
        'parent_classroom_id', classroom_uuid,
        'created_at', now()
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.create_classroom_exclusive_map(classroom_uuid uuid, map_title text, map_description text) OWNER TO postgres;

--
-- Name: debug_group_submissions(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.debug_group_submissions(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.debug_group_submissions(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: delete_learning_map_cascade(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_learning_map_cascade(map_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    deleted_counts JSON;
    node_ids UUID[];
    assessment_ids UUID[];
    submission_ids UUID[];
    group_ids UUID[];
BEGIN
    -- Get all node IDs for this map
    SELECT ARRAY(
        SELECT id FROM map_nodes WHERE map_id = map_uuid
    ) INTO node_ids;
    
    -- Get all assessment IDs for these nodes
    SELECT ARRAY(
        SELECT id FROM node_assessments WHERE node_id = ANY(node_ids)
    ) INTO assessment_ids;
    
    -- Get all submission IDs for these assessments
    SELECT ARRAY(
        SELECT id FROM assessment_submissions WHERE assessment_id = ANY(assessment_ids)
    ) INTO submission_ids;
    
    -- Get all group IDs for these assessments
    SELECT ARRAY(
        SELECT id FROM assessment_groups WHERE assessment_id = ANY(assessment_ids)
    ) INTO group_ids;
    
    -- Delete in correct order to avoid foreign key violations
    
    -- 1. Delete assessment group members
    DELETE FROM assessment_group_members WHERE group_id = ANY(group_ids);
    
    -- 2. Delete submission grades
    DELETE FROM submission_grades WHERE submission_id = ANY(submission_ids);
    
    -- 3. Delete assessment submissions
    DELETE FROM assessment_submissions WHERE id = ANY(submission_ids);
    
    -- 4. Delete assessment groups
    DELETE FROM assessment_groups WHERE id = ANY(group_ids);
    
    -- 5. Delete quiz questions
    DELETE FROM quiz_questions WHERE assessment_id = ANY(assessment_ids);
    
    -- 6. Delete node assessments
    DELETE FROM node_assessments WHERE id = ANY(assessment_ids);
    
    -- 7. Delete node submissions
    DELETE FROM node_submissions WHERE node_id = ANY(node_ids);
    
    -- 8. Delete student node progress
    DELETE FROM student_node_progress WHERE node_id = ANY(node_ids);
    
    -- 9. Delete node content
    DELETE FROM node_content WHERE node_id = ANY(node_ids);
    
    -- 10. Delete node paths
    DELETE FROM node_paths 
    WHERE source_node_id = ANY(node_ids) OR destination_node_id = ANY(node_ids);
    
    -- 11. Delete map nodes
    DELETE FROM map_nodes WHERE id = ANY(node_ids);
    
    -- 12. Delete classroom map features
    DELETE FROM classroom_map_features WHERE map_id = map_uuid;
    
    -- 13. Delete classroom maps (links)
    DELETE FROM classroom_maps WHERE map_id = map_uuid;
    
    -- 14. Delete user map enrollments
    DELETE FROM user_map_enrollments WHERE map_id = map_uuid;
    
    -- 15. Delete cohort map enrollments
    DELETE FROM cohort_map_enrollments WHERE map_id = map_uuid;
    
    -- 16. Finally delete the learning map itself
    DELETE FROM learning_maps WHERE id = map_uuid;
    
    -- Return success
    SELECT json_build_object(
        'success', true,
        'deleted_map_id', map_uuid,
        'node_count', array_length(node_ids, 1),
        'assessment_count', array_length(assessment_ids, 1)
    ) INTO deleted_counts;
    
    RETURN deleted_counts;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error details
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$;


ALTER FUNCTION public.delete_learning_map_cascade(map_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION delete_learning_map_cascade(map_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.delete_learning_map_cascade(map_uuid uuid) IS 'Safely deletes a learning map and all related data in the correct order to avoid foreign key violations. Only admins and map creators can delete maps (enforced by application logic).';


--
-- Name: enroll_new_group_member_in_assignments(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enroll_new_group_member_in_assignments() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- When a new member joins a group, enroll them in all group assignments
    INSERT INTO public.assignment_enrollments (assignment_id, user_id, due_date, status)
    SELECT 
        aga.assignment_id,
        NEW.user_id,
        aga.due_date,
        'assigned'
    FROM public.assignment_group_assignments aga
    WHERE aga.group_id = NEW.group_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.enroll_new_group_member_in_assignments() OWNER TO postgres;

--
-- Name: ensure_single_leader_per_team(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_single_leader_per_team() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- If this is setting someone as a leader, remove leader status from others in the team
  IF NEW.is_leader = true THEN
    UPDATE public.team_memberships 
    SET is_leader = false 
    WHERE team_id = NEW.team_id AND id != NEW.id AND is_leader = true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.ensure_single_leader_per_team() OWNER TO postgres;

--
-- Name: fix_group_submissions(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fix_group_submissions(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.fix_group_submissions(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: generate_join_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_join_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    attempts INTEGER := 0;
BEGIN
    LOOP
        result := '';
        -- Generate 6-character code
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.classrooms WHERE join_code = result) THEN
            RETURN result;
        END IF;
        
        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique join code after 100 attempts';
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION public.generate_join_code() OWNER TO postgres;

--
-- Name: FUNCTION generate_join_code(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.generate_join_code() IS 'Generates unique 6-character alphanumeric join codes';


--
-- Name: get_admin_maps_optimized(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_admin_maps_optimized(limit_count integer DEFAULT 50, offset_count integer DEFAULT 0) RETURNS TABLE(id uuid, title text, description text, creator_id uuid, creator_name text, difficulty integer, category text, visibility text, node_count bigint, avg_difficulty integer, created_at timestamp with time zone, updated_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id,
        lm.title,
        lm.description,
        lm.creator_id,
        COALESCE(p.full_name, p.username, 'Unknown') as creator_name,
        lm.difficulty,
        lm.category,
        lm.visibility,
        COALESCE(mn.node_count, 0) as node_count,
        COALESCE(mn.avg_difficulty, 1) as avg_difficulty,
        lm.created_at,
        lm.updated_at,
        lm.metadata
    FROM learning_maps lm
    LEFT JOIN profiles p ON p.id = lm.creator_id
    LEFT JOIN (
        -- Efficient aggregation subquery with qualified column names
        SELECT 
            mn.map_id,
            COUNT(*) as node_count,
            ROUND(AVG(COALESCE(mn.difficulty, 1)))::INTEGER as avg_difficulty
        FROM map_nodes mn
        GROUP BY mn.map_id
    ) mn ON mn.map_id = lm.id
    ORDER BY lm.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;


ALTER FUNCTION public.get_admin_maps_optimized(limit_count integer, offset_count integer) OWNER TO postgres;

--
-- Name: get_assessment_groups(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_assessment_groups(p_assessment_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this assessment
    IF NOT EXISTS (
        SELECT 1 FROM public.node_assessments na
        JOIN public.map_nodes mn ON na.node_id = mn.id
        JOIN public.learning_maps lm ON mn.map_id = lm.id
        JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
        WHERE na.id = p_assessment_id 
        AND cm.user_id = auth.uid()
        AND lm.map_type = 'classroom_exclusive'
    ) THEN
        RAISE EXCEPTION 'Access denied to assessment groups';
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'id', ag.id,
            'group_name', ag.group_name,
            'group_number', ag.group_number,
            'created_at', ag.created_at,
            'members', ag.members
        ) ORDER BY ag.group_number
    ) INTO result
    FROM (
        SELECT 
            ag.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', agm.user_id,
                        'full_name', p.full_name,
                        'username', p.username,
                        'assigned_at', agm.assigned_at
                    ) ORDER BY p.full_name
                ) FILTER (WHERE agm.user_id IS NOT NULL),
                '[]'::json
            ) as members
        FROM public.assessment_groups ag
        LEFT JOIN public.assessment_group_members agm ON ag.id = agm.group_id
        LEFT JOIN public.profiles p ON agm.user_id = p.id
        WHERE ag.assessment_id = p_assessment_id
        GROUP BY ag.id, ag.group_name, ag.group_number, ag.created_at
    ) ag;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;


ALTER FUNCTION public.get_assessment_groups(p_assessment_id uuid) OWNER TO postgres;

--
-- Name: get_classroom_analytics(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_classroom_analytics(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
    instructor_check BOOLEAN := false;
BEGIN
    -- Check if user is instructor of this classroom
    SELECT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) INTO instructor_check;
    
    IF NOT instructor_check THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can view analytics';
    END IF;
    
    WITH classroom_stats AS (
        SELECT 
            c.name as classroom_name,
            c.description,
            c.created_at as classroom_created,
            COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.role = 'student') as total_students,
            COUNT(DISTINCT ca.id) as total_assignments,
            COUNT(DISTINCT ca.id) FILTER (WHERE ca.is_published) as published_assignments,
            COUNT(DISTINCT ae.id) as total_enrollments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'completed') as completed_enrollments,
            AVG(ae.completion_percentage) FILTER (WHERE ae.completion_percentage > 0) as avg_completion_rate
        FROM public.classrooms c
        LEFT JOIN public.classroom_memberships cm ON c.id = cm.classroom_id
        LEFT JOIN public.classroom_assignments ca ON c.id = ca.classroom_id
        LEFT JOIN public.assignment_enrollments ae ON ca.id = ae.assignment_id
        WHERE c.id = classroom_uuid
        GROUP BY c.id, c.name, c.description, c.created_at
    ),
    recent_activity AS (
        SELECT 
            COUNT(*) as recent_submissions
        FROM public.assignment_enrollments ae
        JOIN public.classroom_assignments ca ON ae.assignment_id = ca.id
        WHERE ca.classroom_id = classroom_uuid
        AND ae.completed_at > now() - INTERVAL '7 days'
    ),
    assignment_performance AS (
        SELECT 
            ca.title,
            ca.id as assignment_id,
            COUNT(ae.id) as enrolled_count,
            COUNT(ae.id) FILTER (WHERE ae.status = 'completed') as completed_count,
            AVG(ae.completion_percentage) as avg_completion,
            AVG(ae.total_points_earned::DECIMAL / NULLIF(ae.total_points_possible, 0) * 100) as avg_score
        FROM public.classroom_assignments ca
        LEFT JOIN public.assignment_enrollments ae ON ca.id = ae.assignment_id
        WHERE ca.classroom_id = classroom_uuid
        AND ca.is_published = true
        GROUP BY ca.id, ca.title
        ORDER BY ca.created_at DESC
        LIMIT 10
    )
    SELECT json_build_object(
        'classroom', (SELECT row_to_json(cs) FROM classroom_stats cs),
        'recent_activity', (SELECT row_to_json(ra) FROM recent_activity ra),
        'assignment_performance', (
            SELECT json_agg(row_to_json(ap)) 
            FROM assignment_performance ap
        ),
        'generated_at', now()
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.get_classroom_analytics(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_classroom_analytics(classroom_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_classroom_analytics(classroom_uuid uuid) IS 'Returns comprehensive analytics for classroom performance and activity';


--
-- Name: get_classroom_available_nodes(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_classroom_available_nodes(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can view available nodes';
    END IF;

    SELECT json_agg(
        json_build_object(
            'map_id', m.id,
            'map_title', m.title,
            'nodes', (
                SELECT json_agg(
                    json_build_object(
                        'node_id', mn.id,
                        'node_title', mn.title,
                        'node_description', mn.description,
                        'has_content', EXISTS (
                            SELECT 1 FROM public.node_content 
                            WHERE node_id = mn.id
                        ),
                        'has_assessment', EXISTS (
                            SELECT 1 FROM public.node_assessments 
                            WHERE node_id = mn.id
                        )
                    ) ORDER BY mn.created_at
                )
                FROM public.map_nodes mn 
                WHERE mn.map_id = m.id
            )
        ) ORDER BY cm.display_order, cm.added_at
    ) INTO result
    FROM public.classroom_maps cm
    JOIN public.learning_maps m ON cm.map_id = m.id
    WHERE cm.classroom_id = classroom_uuid
    AND cm.is_active = true;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;


ALTER FUNCTION public.get_classroom_available_nodes(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_classroom_available_nodes(classroom_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_classroom_available_nodes(classroom_uuid uuid) IS 'Returns all nodes from linked maps available for assignment creation';


--
-- Name: get_classroom_exclusive_maps(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_classroom_exclusive_maps(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', lm.id,
            'title', lm.title,
            'description', lm.description,
            'creator_id', lm.creator_id,
            'created_at', lm.created_at,
            'updated_at', lm.updated_at,
            'node_count', COALESCE(node_counts.count, 0),
            'features', COALESCE(feature_list.features, '[]'::json)
        ) ORDER BY lm.created_at DESC
    ), '[]'::json) INTO result
    FROM public.learning_maps lm
    LEFT JOIN (
        SELECT map_id, COUNT(*) as count
        FROM public.map_nodes
        GROUP BY map_id
    ) node_counts ON lm.id = node_counts.map_id
    LEFT JOIN (
        SELECT 
            map_id,
            json_agg(
                json_build_object(
                    'type', feature_type,
                    'config', feature_config,
                    'enabled', is_enabled
                )
            ) as features
        FROM public.classroom_map_features
        WHERE is_enabled = true
        GROUP BY map_id
    ) feature_list ON lm.id = feature_list.map_id
    WHERE lm.map_type = 'classroom_exclusive'
    AND lm.parent_classroom_id = classroom_uuid;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.get_classroom_exclusive_maps(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: get_classroom_maps(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_classroom_maps(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this classroom
    IF NOT (
        EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_uuid AND instructor_id = auth.uid()) OR
        public.is_classroom_member(classroom_uuid, auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to classroom maps';
    END IF;

    SELECT json_agg(
        json_build_object(
            'link_id', cm.id,
            'map_id', m.id,
            'map_title', m.title,
            'map_description', m.description,
            'node_count', (
                SELECT COUNT(*) FROM public.map_nodes 
                WHERE map_id = m.id
            ),
            'added_at', cm.added_at,
            'added_by', cm.added_by,
            'display_order', cm.display_order,
            'notes', cm.notes,
            'is_active', cm.is_active
        ) ORDER BY cm.display_order, cm.added_at
    ) INTO result
    FROM public.classroom_maps cm
    JOIN public.learning_maps m ON cm.map_id = m.id
    WHERE cm.classroom_id = classroom_uuid
    AND cm.is_active = true;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;


ALTER FUNCTION public.get_classroom_maps(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_classroom_maps(classroom_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_classroom_maps(classroom_uuid uuid) IS 'Returns all maps linked to a classroom with metadata';


--
-- Name: get_classroom_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_classroom_stats(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this classroom
    IF NOT (
        EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_uuid AND instructor_id = auth.uid()) OR
        public.is_classroom_member(classroom_uuid, auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to classroom statistics';
    END IF;

    SELECT json_build_object(
        'total_members', (
            SELECT COUNT(*) FROM public.classroom_memberships 
            WHERE classroom_id = classroom_uuid
        ),
        'total_students', (
            SELECT COUNT(*) FROM public.classroom_memberships 
            WHERE classroom_id = classroom_uuid AND role = 'student'
        ),
        'total_assignments', (
            SELECT COUNT(*) FROM public.classroom_assignments 
            WHERE classroom_id = classroom_uuid
        ),
        'published_assignments', (
            SELECT COUNT(*) FROM public.classroom_assignments 
            WHERE classroom_id = classroom_uuid AND is_published = true
        ),
        'active_enrollments', (
            SELECT COUNT(*) FROM public.assignment_enrollments ae
            JOIN public.classroom_assignments ca ON ae.assignment_id = ca.id
            WHERE ca.classroom_id = classroom_uuid 
            AND ae.status IN ('assigned', 'in_progress', 'submitted')
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.get_classroom_stats(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_classroom_stats(classroom_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_classroom_stats(classroom_uuid uuid) IS 'Returns comprehensive statistics for a classroom';


--
-- Name: get_journey_overview(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_journey_overview(user_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is requesting their own data
    IF user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Access denied to user journey overview';
    END IF;

    SELECT json_build_object(
        'total_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid
        ),
        'active_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND status = 'in_progress'
        ),
        'completed_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND status = 'completed'
        ),
        'north_star_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND project_type = 'north_star'
        ),
        'short_term_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND project_type = 'short_term'
        ),
        'total_milestones', (
            SELECT COUNT(*) FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = user_uuid
        ),
        'completed_milestones', (
            SELECT COUNT(*) FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = user_uuid AND pm.status = 'completed'
        )
    ) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION public.get_journey_overview(user_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_journey_overview(user_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_journey_overview(user_uuid uuid) IS 'Returns overview statistics for a user''s entire journey';


--
-- Name: get_orphaned_image_keys(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_orphaned_image_keys(older_than_hours integer DEFAULT 24) RETURNS TABLE(image_key text, last_updated timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    lm.cover_image_key::TEXT,
    lm.cover_image_updated_at
  FROM learning_maps lm
  WHERE lm.cover_image_key IS NOT NULL
    AND lm.cover_image_updated_at < NOW() - INTERVAL '1 hour' * older_than_hours
    AND (lm.cover_image_url IS NULL OR lm.cover_image_url = '');
END;
$$;


ALTER FUNCTION public.get_orphaned_image_keys(older_than_hours integer) OWNER TO postgres;

--
-- Name: get_project_stats(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_project_stats(project_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this project
    IF NOT EXISTS (
        SELECT 1 FROM public.journey_projects
        WHERE id = project_uuid AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to project statistics';
    END IF;

    SELECT json_build_object(
        'total_milestones', (
            SELECT COUNT(*) FROM public.project_milestones
            WHERE project_id = project_uuid
        ),
        'completed_milestones', (
            SELECT COUNT(*) FROM public.project_milestones
            WHERE project_id = project_uuid AND status = 'completed'
        ),
        'in_progress_milestones', (
            SELECT COUNT(*) FROM public.project_milestones
            WHERE project_id = project_uuid AND status = 'in_progress'
        ),
        'average_progress', (
            SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
            FROM public.project_milestones
            WHERE project_id = project_uuid
        ),
        'total_journal_entries', (
            SELECT COUNT(*) FROM public.milestone_journals mj
            JOIN public.project_milestones pm ON pm.id = mj.milestone_id
            WHERE pm.project_id = project_uuid
        ),
        'total_reflections', (
            SELECT COUNT(*) FROM public.project_reflections
            WHERE project_id = project_uuid
        )
    ) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION public.get_project_stats(project_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_project_stats(project_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_project_stats(project_uuid uuid) IS 'Returns comprehensive statistics for a specific project';


--
-- Name: get_student_progress_overview(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_student_progress_overview(classroom_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can view student progress';
    END IF;
    
    WITH student_overview AS (
        SELECT 
            u.id as user_id,
            u.email,
            cm.joined_at,
            cm.last_active_at,
            COUNT(DISTINCT ae.id) as total_assignments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'completed') as completed_assignments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'in_progress') as in_progress_assignments,
            COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'overdue') as overdue_assignments,
            AVG(ae.completion_percentage) as avg_completion_rate,
            SUM(ae.total_points_earned) as total_points_earned,
            SUM(ae.total_points_possible) as total_points_possible
        FROM public.classroom_memberships cm
        JOIN auth.users u ON cm.user_id = u.id
        LEFT JOIN public.assignment_enrollments ae ON (
            cm.user_id = ae.user_id 
            AND ae.assignment_id IN (
                SELECT id FROM public.classroom_assignments 
                WHERE classroom_id = classroom_uuid
            )
        )
        WHERE cm.classroom_id = classroom_uuid
        AND cm.role = 'student'
        GROUP BY u.id, u.email, cm.joined_at, cm.last_active_at
        ORDER BY cm.joined_at
    )
    SELECT json_build_object(
        'classroom_id', classroom_uuid,
        'students', (
            SELECT json_agg(
                json_build_object(
                    'user_id', so.user_id,
                    'email', so.email,
                    'joined_at', so.joined_at,
                    'last_active_at', so.last_active_at,
                    'assignments_summary', json_build_object(
                        'total', so.total_assignments,
                        'completed', so.completed_assignments,
                        'in_progress', so.in_progress_assignments,
                        'overdue', so.overdue_assignments
                    ),
                    'performance', json_build_object(
                        'avg_completion_rate', ROUND(so.avg_completion_rate, 2),
                        'total_points_earned', so.total_points_earned,
                        'total_points_possible', so.total_points_possible,
                        'grade_percentage', CASE 
                            WHEN so.total_points_possible > 0 
                            THEN ROUND((so.total_points_earned::DECIMAL / so.total_points_possible::DECIMAL) * 100, 2)
                            ELSE NULL
                        END
                    )
                )
            )
            FROM student_overview so
        ),
        'generated_at', now()
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.get_student_progress_overview(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION get_student_progress_overview(classroom_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_student_progress_overview(classroom_uuid uuid) IS 'Returns detailed progress overview for all students in a classroom';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: team_node_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_node_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    node_id uuid NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    assigned_to uuid,
    help_requested boolean DEFAULT false,
    help_request_message text,
    scheduled_meeting_id uuid,
    submitted_by uuid,
    help_requested_at timestamp with time zone,
    instructor_comment text,
    instructor_comment_at timestamp with time zone,
    CONSTRAINT team_node_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'assigned'::text, 'in_progress'::text, 'submitted'::text, 'passed'::text, 'passed_late'::text, 'passed_zero_grade'::text, 'failed'::text])))
);


ALTER TABLE public.team_node_progress OWNER TO postgres;

--
-- Name: TABLE team_node_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.team_node_progress IS 'Tracks progress of teams through learning map nodes, aggregated from individual team member progress';


--
-- Name: COLUMN team_node_progress.assigned_to; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_node_progress.assigned_to IS 'User ID of the team member assigned to work on this node';


--
-- Name: COLUMN team_node_progress.help_requested; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_node_progress.help_requested IS 'Whether the team has requested help from instructors for this node';


--
-- Name: COLUMN team_node_progress.help_request_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_node_progress.help_request_message IS 'Message describing what help the team needs';


--
-- Name: COLUMN team_node_progress.submitted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_node_progress.submitted_by IS 'User ID of the team member who made the best/latest submission for this node';


--
-- Name: COLUMN team_node_progress.instructor_comment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_node_progress.instructor_comment IS 'Comments from instructors about team progress on this node';


--
-- Name: COLUMN team_node_progress.instructor_comment_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_node_progress.instructor_comment_at IS 'When the instructor comment was last updated';


--
-- Name: get_team_map_progress(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_team_map_progress(map_id_param uuid) RETURNS SETOF public.team_node_progress
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_team_id uuid;
    is_instructor boolean := false;
BEGIN
    -- Check if user is instructor or TA in any classroom that has teams with this map
    SELECT EXISTS (
        SELECT 1 
        FROM classroom_team_maps ctm
        JOIN classroom_teams ct ON ctm.team_id = ct.id
        JOIN classroom_memberships cm ON ct.classroom_id = cm.classroom_id
        WHERE ctm.map_id = map_id_param 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('instructor', 'ta')
    ) INTO is_instructor;

    -- Instructors and TAs can see progress for all teams with this map
    IF is_instructor THEN
        RETURN QUERY
        SELECT tnp.*
        FROM team_node_progress tnp
        JOIN classroom_team_maps ctm ON tnp.team_id = ctm.team_id
        WHERE ctm.map_id = map_id_param;

    -- Students can see their own team's progress for this map
    ELSE
        -- Find the team_id for the current user that has this map
        SELECT ctm.team_id INTO user_team_id 
        FROM classroom_team_maps ctm
        JOIN team_memberships tm ON ctm.team_id = tm.team_id
        WHERE ctm.map_id = map_id_param 
        AND tm.user_id = auth.uid() 
        AND tm.left_at IS NULL
        LIMIT 1;

        IF user_team_id IS NOT NULL THEN
            RETURN QUERY
            SELECT tnp.*
            FROM team_node_progress tnp
            WHERE tnp.team_id = user_team_id;
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION public.get_team_map_progress(map_id_param uuid) OWNER TO postgres;

--
-- Name: handle_auto_enroll_new_student(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_auto_enroll_new_student() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Only proceed if a new 'student' is being added to a classroom
  IF NEW.role = 'student' THEN
    -- Enroll the student in all active, published, auto-assign assignments for this classroom
    INSERT INTO public.assignment_enrollments (
      assignment_id,
      user_id,
      due_date,
      status
    )
    SELECT
      ca.id,
      NEW.user_id,
      ca.default_due_date,
      'assigned'
    FROM public.classroom_assignments AS ca
    WHERE ca.classroom_id = NEW.classroom_id
      AND ca.auto_assign = true
      AND ca.is_published = true
      AND ca.is_active = true
      -- Ensure we don't create a duplicate enrollment
      AND NOT EXISTS (
        SELECT 1 FROM public.assignment_enrollments AS ae
        WHERE ae.assignment_id = ca.id AND ae.user_id = NEW.user_id
      );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_auto_enroll_new_student() OWNER TO postgres;

--
-- Name: FUNCTION handle_auto_enroll_new_student(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_auto_enroll_new_student() IS 'Trigger function to automatically enroll a new student member into assignments marked for auto-assignment.';


--
-- Name: handle_group_submission(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_group_submission() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.handle_group_submission() OWNER TO postgres;

--
-- Name: FUNCTION handle_group_submission(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_group_submission() IS 'Handles automatic creation of assessment submissions for all group members when one member submits. 
Creates progress records with "submitted" status if they do not exist, or updates existing records to "submitted".
This allows all group members to progress to the next node immediately after one member submits.';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
DECLARE
  temp_username text;
  counter int := 0;
BEGIN
  -- Generate a temporary unique username based on email or user ID
  temp_username := 'user_' || substring(new.id::text, 1, 8);
  
  -- Make sure username is unique by adding a counter if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = temp_username) LOOP
    counter := counter + 1;
    temp_username := 'user_' || substring(new.id::text, 1, 8) || '_' || counter;
  END LOOP;
  
  -- Insert with required fields
  INSERT INTO public.profiles (id, username, email, created_at, updated_at)
  VALUES (
    new.id,
    temp_username,
    new.email,
    now(),
    now()
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, that's fine
    RAISE NOTICE 'Profile already exists for user %', new.id;
    RETURN new;
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin(user_uuid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid 
        AND role = 'admin'
    );
$$;


ALTER FUNCTION public.is_admin(user_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION is_admin(user_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_admin(user_uuid uuid) IS 'Check if a user has admin role';


--
-- Name: is_classroom_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_classroom_member(classroom_uuid uuid, user_uuid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;


ALTER FUNCTION public.is_classroom_member(classroom_uuid uuid, user_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION is_classroom_member(classroom_uuid uuid, user_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_classroom_member(classroom_uuid uuid, user_uuid uuid) IS 'Security definer function to check classroom membership without RLS recursion';


--
-- Name: is_community_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_community_admin(community_id_param uuid, user_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
    and role in ('admin', 'owner')
  );
end;
$$;


ALTER FUNCTION public.is_community_admin(community_id_param uuid, user_id_param uuid) OWNER TO postgres;

--
-- Name: is_community_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_community_member(community_id_param uuid, user_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
  );
end;
$$;


ALTER FUNCTION public.is_community_member(community_id_param uuid, user_id_param uuid) OWNER TO postgres;

--
-- Name: link_map_to_classroom(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    link_id UUID;
    max_order INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can link maps';
    END IF;
    
    -- Check if map exists
    IF NOT EXISTS (SELECT 1 FROM public.learning_maps WHERE id = map_uuid) THEN
        RAISE EXCEPTION 'Map not found';
    END IF;
    
    -- Check if link already exists
    IF EXISTS (
        SELECT 1 FROM public.classroom_maps 
        WHERE classroom_id = classroom_uuid AND map_id = map_uuid
    ) THEN
        RAISE EXCEPTION 'Map is already linked to this classroom';
    END IF;
    
    -- Get next display order
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO max_order
    FROM public.classroom_maps 
    WHERE classroom_id = classroom_uuid;
    
    -- Insert the link
    INSERT INTO public.classroom_maps (
        classroom_id, 
        map_id, 
        added_by, 
        display_order, 
        notes
    ) VALUES (
        classroom_uuid, 
        map_uuid, 
        auth.uid(), 
        max_order, 
        notes_text
    ) RETURNING id INTO link_id;
    
    RETURN json_build_object(
        'link_id', link_id,
        'classroom_id', classroom_uuid,
        'map_id', map_uuid,
        'display_order', max_order,
        'added_at', now()
    );
END;
$$;


ALTER FUNCTION public.link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text) OWNER TO postgres;

--
-- Name: FUNCTION link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text) IS 'Links a map to a classroom for assignment creation';


--
-- Name: reorder_classroom_maps(uuid, json); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reorder_classroom_maps(classroom_uuid uuid, link_orders json) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    link_item JSON;
    updated_count INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can reorder maps';
    END IF;
    
    -- Update display orders
    FOR link_item IN SELECT * FROM json_array_elements(link_orders)
    LOOP
        UPDATE public.classroom_maps 
        SET display_order = (link_item->>'order')::INTEGER
        WHERE id = (link_item->>'link_id')::UUID
        AND classroom_id = classroom_uuid;
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'classroom_id', classroom_uuid,
        'updated_count', updated_count,
        'reordered_at', now()
    );
END;
$$;


ALTER FUNCTION public.reorder_classroom_maps(classroom_uuid uuid, link_orders json) OWNER TO postgres;

--
-- Name: FUNCTION reorder_classroom_maps(classroom_uuid uuid, link_orders json); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.reorder_classroom_maps(classroom_uuid uuid, link_orders json) IS 'Updates the display order of linked maps in a classroom';


--
-- Name: set_current_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_current_timestamp_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_current_timestamp_updated_at() OWNER TO postgres;

--
-- Name: simple_fix_group_submissions(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.simple_fix_group_submissions(classroom_uuid uuid) RETURNS TABLE(fixed_count integer, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.simple_fix_group_submissions(classroom_uuid uuid) OWNER TO postgres;

--
-- Name: sync_assignment_progress(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_assignment_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    affected_enrollments RECORD;
    completion_data JSON;
BEGIN
    -- Find all enrollments that include this node
    FOR affected_enrollments IN
        SELECT DISTINCT ae.id as enrollment_id, ae.assignment_id, ae.user_id
        FROM public.assignment_enrollments ae
        JOIN public.assignment_nodes an ON ae.assignment_id = an.assignment_id
        WHERE an.node_id = COALESCE(NEW.node_id, OLD.node_id)
        AND ae.user_id = COALESCE(NEW.user_id, OLD.user_id)
    LOOP
        -- Calculate new completion data
        SELECT public.calculate_assignment_completion(affected_enrollments.enrollment_id) INTO completion_data;
        
        -- Update the enrollment record
        UPDATE public.assignment_enrollments
        SET 
            completion_percentage = (completion_data->>'completion_percentage')::INTEGER,
            total_points_earned = (completion_data->>'total_points_earned')::INTEGER,
            total_points_possible = (completion_data->>'total_points_possible')::INTEGER,
            status = CASE 
                WHEN (completion_data->>'completion_percentage')::INTEGER = 100 AND completed_at IS NULL THEN 'completed'
                WHEN (completion_data->>'completion_percentage')::INTEGER > 0 AND started_at IS NULL THEN 'in_progress'
                ELSE status
            END,
            started_at = CASE 
                WHEN (completion_data->>'completion_percentage')::INTEGER > 0 AND started_at IS NULL THEN now()
                ELSE started_at
            END,
            completed_at = CASE 
                WHEN (completion_data->>'completion_percentage')::INTEGER = 100 AND completed_at IS NULL THEN now()
                WHEN (completion_data->>'completion_percentage')::INTEGER < 100 THEN NULL
                ELSE completed_at
            END
        WHERE id = affected_enrollments.enrollment_id;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.sync_assignment_progress() OWNER TO postgres;

--
-- Name: FUNCTION sync_assignment_progress(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.sync_assignment_progress() IS 'Trigger function to automatically sync assignment progress when node progress changes';


--
-- Name: unlink_map_from_classroom(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can unlink maps';
    END IF;
    
    -- Delete the link
    DELETE FROM public.classroom_maps 
    WHERE classroom_id = classroom_uuid 
    AND map_id = map_uuid;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RAISE EXCEPTION 'Map link not found or already removed';
    END IF;
    
    RETURN json_build_object(
        'classroom_id', classroom_uuid,
        'map_id', map_uuid,
        'unlinked_at', now(),
        'deleted_count', deleted_count
    );
END;
$$;


ALTER FUNCTION public.unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid) OWNER TO postgres;

--
-- Name: FUNCTION unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid) IS 'Removes a map link from a classroom';


--
-- Name: update_classroom_map_feature(uuid, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_classroom_map_feature(map_uuid uuid, feature_type_param text, feature_config_param jsonb DEFAULT '{}'::jsonb, is_enabled_param boolean DEFAULT true) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result JSON;
BEGIN
    -- Verify user has permission to manage features for this map
    IF NOT EXISTS (
        SELECT 1 FROM public.learning_maps lm
        JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
        WHERE lm.id = map_uuid 
        AND lm.map_type = 'classroom_exclusive'
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('instructor', 'ta')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to manage map features';
    END IF;
    
    -- Insert or update the feature
    INSERT INTO public.classroom_map_features (
        map_id,
        feature_type,
        feature_config,
        is_enabled,
        created_by
    ) VALUES (
        map_uuid,
        feature_type_param,
        feature_config_param,
        is_enabled_param,
        auth.uid()
    )
    ON CONFLICT (map_id, feature_type)
    DO UPDATE SET
        feature_config = feature_config_param,
        is_enabled = is_enabled_param,
        updated_at = now();
    
    -- Return the updated feature
    SELECT json_build_object(
        'map_id', map_uuid,
        'feature_type', feature_type_param,
        'feature_config', feature_config_param,
        'is_enabled', is_enabled_param,
        'updated_at', now()
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION public.update_classroom_map_feature(map_uuid uuid, feature_type_param text, feature_config_param jsonb, is_enabled_param boolean) OWNER TO postgres;

--
-- Name: update_classroom_map_features_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_classroom_map_features_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$;


ALTER FUNCTION public.update_classroom_map_features_updated_at() OWNER TO postgres;

--
-- Name: update_community_member_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_community_member_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set member_count = member_count + 1
    where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities
    set member_count = member_count - 1
    where id = old.community_id;
  end if;
  return null;
end;
$$;


ALTER FUNCTION public.update_community_member_count() OWNER TO postgres;

--
-- Name: update_cover_image_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_cover_image_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (OLD.cover_image_url IS DISTINCT FROM NEW.cover_image_url OR
      OLD.cover_image_key IS DISTINCT FROM NEW.cover_image_key) THEN
    NEW.cover_image_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_cover_image_timestamp() OWNER TO postgres;

--
-- Name: update_journey_projects_positions(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_journey_projects_positions(items jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update all journey_projects positions in a single query
  -- The updated_at column will be automatically updated by the existing trigger
  UPDATE public.journey_projects AS jp
  SET
    position_x = (elem->>'x')::double precision,
    position_y = (elem->>'y')::double precision
  FROM jsonb_array_elements(items) AS elem
  WHERE jp.id = (elem->>'id')::uuid
    AND jp.user_id = auth.uid(); -- Ensure RLS: only update user's own projects
END;
$$;


ALTER FUNCTION public.update_journey_projects_positions(items jsonb) OWNER TO postgres;

--
-- Name: FUNCTION update_journey_projects_positions(items jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_journey_projects_positions(items jsonb) IS 'Batch updates position_x and position_y for multiple journey projects.
Input format: [{"id": "uuid", "x": number, "y": number}, ...]
Automatically respects RLS by only updating projects owned by the authenticated user.';


--
-- Name: update_meeting_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_meeting_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_meeting_timestamp() OWNER TO postgres;

--
-- Name: update_membership_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_membership_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_active_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_membership_activity() OWNER TO postgres;

--
-- Name: update_milestone_progress_from_journal(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_milestone_progress_from_journal() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update the milestone's progress to match the latest journal entry
    UPDATE public.project_milestones
    SET progress_percentage = NEW.progress_percentage
    WHERE id = NEW.milestone_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_milestone_progress_from_journal() OWNER TO postgres;

--
-- Name: update_progress_on_grade(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_progress_on_grade() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.update_progress_on_grade() OWNER TO postgres;

--
-- Name: FUNCTION update_progress_on_grade(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_progress_on_grade() IS 'Maps submission grades (pass/fail) to progress status (passed/failed) for both individual and group submissions. 
When a group submission is graded, all group members progress status is updated so they can all advance to next stages.';


--
-- Name: update_project_milestones_positions(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_project_milestones_positions(items jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update all project_milestones positions in a single query
  -- The updated_at column will be automatically updated by the existing trigger
  UPDATE public.project_milestones AS pm
  SET
    position_x = (elem->>'x')::double precision,
    position_y = (elem->>'y')::double precision
  FROM jsonb_array_elements(items) AS elem
  WHERE pm.id = (elem->>'id')::uuid
    AND pm.project_id IN (
      -- Ensure RLS: only update milestones in user's own projects
      SELECT id FROM public.journey_projects
      WHERE user_id = auth.uid()
    );
END;
$$;


ALTER FUNCTION public.update_project_milestones_positions(items jsonb) OWNER TO postgres;

--
-- Name: FUNCTION update_project_milestones_positions(items jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_project_milestones_positions(items jsonb) IS 'Batch updates position_x and position_y for multiple project milestones.
Input format: [{"id": "uuid", "x": number, "y": number}, ...]
Automatically respects RLS by only updating milestones in projects owned by the authenticated user.';


--
-- Name: update_project_status_from_milestones(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_project_status_from_milestones() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_milestones INTEGER;
    completed_milestones INTEGER;
    in_progress_milestones INTEGER;
    new_status TEXT;
BEGIN
    -- Count milestone statuses for the project
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'in_progress')
    INTO total_milestones, completed_milestones, in_progress_milestones
    FROM public.project_milestones
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);

    -- Determine new project status
    IF total_milestones = 0 THEN
        new_status := 'not_started';
    ELSIF completed_milestones = total_milestones THEN
        new_status := 'completed';
    ELSIF in_progress_milestones > 0 OR completed_milestones > 0 THEN
        new_status := 'in_progress';
    ELSE
        new_status := 'not_started';
    END IF;

    -- Update the project status
    UPDATE public.journey_projects
    SET
        status = new_status,
        completed_at = CASE WHEN new_status = 'completed' THEN now() ELSE NULL END
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_project_status_from_milestones() OWNER TO postgres;

--
-- Name: update_song_of_the_day_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_song_of_the_day_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_song_of_the_day_updated_at() OWNER TO postgres;

--
-- Name: update_team_progress_from_individual(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_team_progress_from_individual() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  team_id_val UUID;
  highest_status_num INTEGER;
  highest_status_val TEXT;
  submitted_by_val UUID;
  team_node_exists BOOLEAN := FALSE;
BEGIN
  -- Get the user's team for this map node (if any)
  SELECT tm.team_id INTO team_id_val
  FROM team_memberships tm
  JOIN classroom_team_maps ctm ON ctm.team_id = tm.team_id
  JOIN map_nodes mn ON mn.map_id = ctm.map_id
  WHERE tm.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND mn.id = COALESCE(NEW.node_id, OLD.node_id)
    AND tm.left_at IS NULL
  LIMIT 1;

  -- Exit if this user is not in a team for this map
  IF team_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if team progress record already exists
  SELECT EXISTS(
    SELECT 1 FROM team_node_progress 
    WHERE team_id = team_id_val 
    AND node_id = COALESCE(NEW.node_id, OLD.node_id)
  ) INTO team_node_exists;

  -- Determine the highest status achieved by any team member for this node
  WITH team_member_progress AS (
    SELECT 
      snp.status,
      snp.user_id,
      snp.submitted_at,
      CASE 
        WHEN snp.status = 'passed' THEN 6
        WHEN snp.status = 'submitted' THEN 5
        WHEN snp.status = 'in_progress' THEN 4
        WHEN snp.status = 'failed' THEN 3
        WHEN snp.status = 'not_started' THEN 2
        ELSE 1
      END as status_priority
    FROM student_node_progress snp
    JOIN team_memberships tm ON tm.user_id = snp.user_id
    WHERE tm.team_id = team_id_val
      AND snp.node_id = COALESCE(NEW.node_id, OLD.node_id)
      AND tm.left_at IS NULL
  ),
  highest_progress AS (
    SELECT 
      status,
      user_id,
      submitted_at,
      ROW_NUMBER() OVER (
        ORDER BY status_priority DESC, submitted_at DESC NULLS LAST
      ) as rn
    FROM team_member_progress
  )
  SELECT status, user_id INTO highest_status_val, submitted_by_val
  FROM highest_progress 
  WHERE rn = 1;

  -- Default to not_started if no progress found
  IF highest_status_val IS NULL THEN
    highest_status_val := 'not_started';
    submitted_by_val := NULL;
  END IF;

  -- Insert or update team progress
  INSERT INTO team_node_progress (
    team_id, 
    node_id, 
    status, 
    submitted_by, 
    completed_at,
    created_at,
    updated_at
  )
  VALUES (
    team_id_val, 
    COALESCE(NEW.node_id, OLD.node_id), 
    highest_status_val,
    submitted_by_val,
    CASE WHEN highest_status_val IN ('passed', 'passed_late', 'passed_zero_grade', 'failed') THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (team_id, node_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    submitted_by = EXCLUDED.submitted_by,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_team_progress_from_individual() OWNER TO postgres;

--
-- Name: FUNCTION update_team_progress_from_individual(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_team_progress_from_individual() IS 'Automatically updates team progress when individual team member progress changes, handling type conversions properly';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: admin_activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    action text NOT NULL,
    target_user_id uuid,
    target_resource_type text,
    target_resource_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.admin_activity_log OWNER TO postgres;

--
-- Name: TABLE admin_activity_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.admin_activity_log IS 'Logs admin actions for audit and security purposes';


--
-- Name: ai_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    use_case text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    system_prompt text NOT NULL,
    user_prompt_template text,
    model_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    last_used_at timestamp with time zone
);


ALTER TABLE public.ai_agents OWNER TO postgres;

--
-- Name: ai_roadmaps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_roadmaps (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    vision_statement text NOT NULL,
    top_university_id uuid,
    primary_interest text NOT NULL,
    roadmap_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_roadmaps OWNER TO postgres;

--
-- Name: assessment_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_by uuid
);


ALTER TABLE public.assessment_group_members OWNER TO postgres;

--
-- Name: TABLE assessment_group_members; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assessment_group_members IS 'Students assigned to assessment groups';


--
-- Name: assessment_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid NOT NULL,
    group_name text NOT NULL,
    group_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    is_locked boolean DEFAULT false NOT NULL,
    CONSTRAINT assessment_groups_group_name_length CHECK ((char_length(group_name) >= 1)),
    CONSTRAINT assessment_groups_group_number_positive CHECK ((group_number > 0))
);


ALTER TABLE public.assessment_groups OWNER TO postgres;

--
-- Name: TABLE assessment_groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assessment_groups IS 'Groups created for specific node assessments (separate from assignment_groups)';


--
-- Name: COLUMN assessment_groups.is_locked; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_groups.is_locked IS 'Whether this group is locked and should be excluded from shuffle operations';


--
-- Name: assessment_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assessment_submissions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    progress_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    text_answer text,
    image_url text,
    quiz_answers jsonb,
    submitted_at timestamp with time zone DEFAULT now(),
    file_urls text[] DEFAULT '{}'::text[],
    metadata jsonb,
    assessment_group_id uuid,
    submitted_for_group boolean DEFAULT false NOT NULL
);


ALTER TABLE public.assessment_submissions OWNER TO postgres;

--
-- Name: COLUMN assessment_submissions.file_urls; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_submissions.file_urls IS 'Array of file URLs for multiple file uploads';


--
-- Name: COLUMN assessment_submissions.assessment_group_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_submissions.assessment_group_id IS 'If this submission was made as part of a group assessment';


--
-- Name: COLUMN assessment_submissions.submitted_for_group; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assessment_submissions.submitted_for_group IS 'Whether this submission applies to all group members';


--
-- Name: assignment_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    due_date timestamp with time zone,
    enrolled_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    status character varying(20) DEFAULT 'assigned'::character varying NOT NULL,
    completion_percentage integer DEFAULT 0,
    total_points_earned integer DEFAULT 0,
    total_points_possible integer DEFAULT 0,
    notes text,
    CONSTRAINT assignment_enrollments_completion_logic CHECK (((((status)::text = 'completed'::text) AND (completed_at IS NOT NULL)) OR ((status)::text <> 'completed'::text))),
    CONSTRAINT assignment_enrollments_notes_length CHECK ((char_length(notes) <= 2000)),
    CONSTRAINT assignment_enrollments_percentage_range CHECK (((completion_percentage >= 0) AND (completion_percentage <= 100))),
    CONSTRAINT assignment_enrollments_points_non_negative CHECK (((total_points_earned >= 0) AND (total_points_possible >= 0) AND (total_points_earned <= total_points_possible))),
    CONSTRAINT assignment_enrollments_started_logic CHECK (((((status)::text = ANY ((ARRAY['in_progress'::character varying, 'submitted'::character varying, 'completed'::character varying])::text[])) AND (started_at IS NOT NULL)) OR ((status)::text = ANY ((ARRAY['assigned'::character varying, 'overdue'::character varying])::text[])))),
    CONSTRAINT assignment_enrollments_valid_status CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'in_progress'::character varying, 'submitted'::character varying, 'completed'::character varying, 'overdue'::character varying])::text[])))
);


ALTER TABLE public.assignment_enrollments OWNER TO postgres;

--
-- Name: TABLE assignment_enrollments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assignment_enrollments IS 'Tracks individual student progress and scores on assignments';


--
-- Name: COLUMN assignment_enrollments.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_enrollments.status IS 'Current status: assigned, in_progress, submitted, completed, overdue';


--
-- Name: COLUMN assignment_enrollments.completion_percentage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_enrollments.completion_percentage IS 'Percentage of required nodes completed (0-100)';


--
-- Name: COLUMN assignment_enrollments.total_points_earned; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_enrollments.total_points_earned IS 'Total points earned across all nodes';


--
-- Name: COLUMN assignment_enrollments.total_points_possible; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_enrollments.total_points_possible IS 'Total points possible across all nodes';


--
-- Name: assignment_group_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_group_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    group_id uuid NOT NULL,
    due_date timestamp with time zone,
    instructions text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL
);


ALTER TABLE public.assignment_group_assignments OWNER TO postgres;

--
-- Name: TABLE assignment_group_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assignment_group_assignments IS 'Assignments assigned to specific groups';


--
-- Name: COLUMN assignment_group_assignments.instructions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_group_assignments.instructions IS 'Group-specific instructions for the assignment';


--
-- Name: assignment_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT now(),
    added_by uuid,
    CONSTRAINT assignment_group_members_role_check CHECK (((role)::text = ANY ((ARRAY['leader'::character varying, 'member'::character varying])::text[])))
);


ALTER TABLE public.assignment_group_members OWNER TO postgres;

--
-- Name: TABLE assignment_group_members; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assignment_group_members IS 'Membership records for assignment groups';


--
-- Name: COLUMN assignment_group_members.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_group_members.role IS 'Role of the user in the group (leader or member)';


--
-- Name: COLUMN assignment_group_members.added_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_group_members.added_by IS 'User ID of who added this member to the group';


--
-- Name: assignment_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    max_members integer,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT assignment_groups_color_format CHECK (((color)::text ~ '^#[0-9A-Fa-f]{6}$'::text)),
    CONSTRAINT assignment_groups_max_members_positive CHECK (((max_members IS NULL) OR (max_members > 0))),
    CONSTRAINT assignment_groups_name_length CHECK ((char_length((name)::text) >= 1))
);


ALTER TABLE public.assignment_groups OWNER TO postgres;

--
-- Name: TABLE assignment_groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assignment_groups IS 'Groups for collaborative assignments within classrooms';


--
-- Name: COLUMN assignment_groups.color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_groups.color IS 'Hex color code for UI display of the group';


--
-- Name: COLUMN assignment_groups.max_members; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_groups.max_members IS 'Maximum number of members allowed in the group (NULL = unlimited)';


--
-- Name: assignment_nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    node_id uuid NOT NULL,
    sequence_order integer DEFAULT 1 NOT NULL,
    is_required boolean DEFAULT true,
    points_possible integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT assignment_nodes_points_non_negative CHECK ((points_possible >= 0)),
    CONSTRAINT assignment_nodes_sequence_positive CHECK ((sequence_order > 0))
);


ALTER TABLE public.assignment_nodes OWNER TO postgres;

--
-- Name: TABLE assignment_nodes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.assignment_nodes IS 'Links assignments to specific nodes from learning maps with sequence and requirements';


--
-- Name: COLUMN assignment_nodes.sequence_order; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_nodes.sequence_order IS 'Order in which nodes should be completed';


--
-- Name: COLUMN assignment_nodes.is_required; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_nodes.is_required IS 'Whether node completion is required for assignment completion';


--
-- Name: COLUMN assignment_nodes.points_possible; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.assignment_nodes.points_possible IS 'Maximum points available for this node in this assignment';


--
-- Name: branches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.branches (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    passion_tree_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    mastery integer DEFAULT 1 NOT NULL,
    importance integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.branches OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: TABLE chat_messages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.chat_messages IS 'Stores chat history between users and the assistant, migrated from the old reflections table.';


--
-- Name: classroom_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    instructions text,
    default_due_date timestamp with time zone,
    created_by uuid NOT NULL,
    is_published boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source_map_id uuid,
    map_context text,
    auto_assign boolean DEFAULT false NOT NULL,
    CONSTRAINT assignments_description_length CHECK ((char_length(description) <= 5000)),
    CONSTRAINT assignments_due_date_future CHECK (((default_due_date IS NULL) OR (default_due_date > created_at))),
    CONSTRAINT assignments_instructions_length CHECK ((char_length(instructions) <= 10000)),
    CONSTRAINT assignments_map_context_length CHECK ((char_length(map_context) <= 2000)),
    CONSTRAINT assignments_title_length CHECK (((char_length((title)::text) >= 1) AND (char_length((title)::text) <= 255)))
);


ALTER TABLE public.classroom_assignments OWNER TO postgres;

--
-- Name: TABLE classroom_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.classroom_assignments IS 'Custom assignments created by instructors containing specific learning nodes';


--
-- Name: COLUMN classroom_assignments.default_due_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_assignments.default_due_date IS 'Default due date (can be overridden per student)';


--
-- Name: COLUMN classroom_assignments.is_published; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_assignments.is_published IS 'Whether assignment is visible to students';


--
-- Name: COLUMN classroom_assignments.source_map_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_assignments.source_map_id IS 'Reference to the map this assignment was created from';


--
-- Name: COLUMN classroom_assignments.map_context; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_assignments.map_context IS 'Context about how this assignment relates to the source map';


--
-- Name: COLUMN classroom_assignments.auto_assign; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_assignments.auto_assign IS 'If true, automatically enrolls all current and future students in this assignment.';


--
-- Name: classroom_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#3b82f6'::text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.classroom_groups OWNER TO postgres;

--
-- Name: classroom_map_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_map_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    map_id uuid NOT NULL,
    feature_type text NOT NULL,
    feature_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT classroom_map_features_feature_type_valid CHECK ((feature_type = ANY (ARRAY['live_collaboration'::text, 'auto_assessment'::text, 'peer_review'::text, 'progress_tracking'::text, 'time_boxed_access'::text, 'custom_branding'::text, 'advanced_analytics'::text])))
);


ALTER TABLE public.classroom_map_features OWNER TO postgres;

--
-- Name: TABLE classroom_map_features; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.classroom_map_features IS 'Special features available to classroom-exclusive maps, such as live collaboration, auto-assessment, etc.';


--
-- Name: COLUMN classroom_map_features.feature_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_map_features.feature_type IS 'Type of special feature: live_collaboration, auto_assessment, peer_review, progress_tracking, time_boxed_access, custom_branding, advanced_analytics';


--
-- Name: COLUMN classroom_map_features.feature_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_map_features.feature_config IS 'JSON configuration for the feature, structure depends on feature_type';


--
-- Name: classroom_maps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    map_id uuid NOT NULL,
    added_by uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 1,
    notes text,
    CONSTRAINT classroom_maps_display_order_positive CHECK ((display_order > 0)),
    CONSTRAINT classroom_maps_notes_length CHECK ((char_length(notes) <= 1000))
);


ALTER TABLE public.classroom_maps OWNER TO postgres;

--
-- Name: TABLE classroom_maps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.classroom_maps IS 'Many-to-many relationship linking classrooms with learning maps for assignment creation';


--
-- Name: COLUMN classroom_maps.display_order; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_maps.display_order IS 'Order in which maps appear in classroom interface';


--
-- Name: COLUMN classroom_maps.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_maps.notes IS 'Instructor notes about why this map was linked to the classroom';


--
-- Name: classroom_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'student'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    last_active_at timestamp with time zone DEFAULT now(),
    CONSTRAINT classroom_memberships_valid_role CHECK (((role)::text = ANY ((ARRAY['student'::character varying, 'ta'::character varying, 'instructor'::character varying])::text[])))
);


ALTER TABLE public.classroom_memberships OWNER TO postgres;

--
-- Name: TABLE classroom_memberships; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.classroom_memberships IS 'Tracks user membership in classrooms with roles (student, ta, instructor)';


--
-- Name: COLUMN classroom_memberships.role; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_memberships.role IS 'User role: student, ta, or instructor';


--
-- Name: COLUMN classroom_memberships.last_active_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classroom_memberships.last_active_at IS 'Last time user was active in this classroom';


--
-- Name: classroom_team_maps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_team_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    map_id uuid NOT NULL,
    original_map_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    visibility text DEFAULT 'team'::text,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.classroom_team_maps OWNER TO postgres;

--
-- Name: classroom_teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    max_members integer,
    team_metadata jsonb,
    CONSTRAINT classroom_teams_description_length CHECK ((char_length(description) <= 2000)),
    CONSTRAINT classroom_teams_max_members_positive CHECK (((max_members IS NULL) OR (max_members > 0))),
    CONSTRAINT classroom_teams_name_length CHECK (((char_length((name)::text) >= 1) AND (char_length((name)::text) <= 255)))
);


ALTER TABLE public.classroom_teams OWNER TO postgres;

--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classrooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    instructor_id uuid NOT NULL,
    join_code character varying(6) DEFAULT public.generate_join_code() NOT NULL,
    max_students integer DEFAULT 30,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    enable_assignments boolean DEFAULT true,
    settings jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT classrooms_description_length CHECK ((char_length(description) <= 2000)),
    CONSTRAINT classrooms_join_code_format CHECK (((join_code)::text ~ '^[A-Z0-9]{6}$'::text)),
    CONSTRAINT classrooms_max_students_positive CHECK (((max_students > 0) AND (max_students <= 1000))),
    CONSTRAINT classrooms_name_length CHECK (((char_length((name)::text) >= 1) AND (char_length((name)::text) <= 500)))
);


ALTER TABLE public.classrooms OWNER TO postgres;

--
-- Name: TABLE classrooms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.classrooms IS 'Virtual classrooms for organizing students and assignments with unique join codes';


--
-- Name: COLUMN classrooms.join_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classrooms.join_code IS 'Unique 6-character alphanumeric code for students to join classroom';


--
-- Name: COLUMN classrooms.max_students; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classrooms.max_students IS 'Maximum number of students allowed in classroom (1-1000)';


--
-- Name: COLUMN classrooms.is_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classrooms.is_active IS 'Whether classroom accepts new members and assignments';


--
-- Name: COLUMN classrooms.enable_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classrooms.enable_assignments IS 'Toggle to enable/disable assignment features for this classroom';


--
-- Name: COLUMN classrooms.settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.classrooms.settings IS 'JSON object for storing additional classroom settings';


--
-- Name: cohort_map_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cohort_map_enrollments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    cohort_id uuid NOT NULL,
    map_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cohort_map_enrollments OWNER TO postgres;

--
-- Name: cohorts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cohorts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.cohorts OWNER TO postgres;

--
-- Name: communities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    member_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    slug text GENERATED ALWAYS AS (lower(replace(replace(TRIM(BOTH FROM name), ' '::text, '-'::text), '.'::text, ''::text))) STORED,
    short_description text,
    is_public boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.communities OWNER TO postgres;

--
-- Name: community_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_images (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    community_id uuid NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    storage_path text NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT community_images_type_check CHECK ((type = ANY (ARRAY['profile'::text, 'cover'::text])))
);


ALTER TABLE public.community_images OWNER TO postgres;

--
-- Name: community_mentors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_mentors (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    community_id uuid NOT NULL,
    user_id uuid NOT NULL,
    bio text,
    expertise text[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_mentors OWNER TO postgres;

--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_posts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    community_id uuid NOT NULL,
    author_id uuid NOT NULL,
    parent_id uuid,
    title text,
    content text,
    type public.post_type DEFAULT 'text'::public.post_type NOT NULL,
    metadata jsonb,
    is_pinned boolean DEFAULT false NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_posts OWNER TO postgres;

--
-- Name: community_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    community_id uuid NOT NULL,
    created_by uuid NOT NULL,
    title text NOT NULL,
    description text,
    status public.project_status DEFAULT 'planning'::public.project_status NOT NULL,
    start_date date,
    target_date date,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.community_projects OWNER TO postgres;

--
-- Name: connections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connections (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    passion_tree_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.connections OWNER TO postgres;

--
-- Name: direction_finder_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.direction_finder_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    answers jsonb NOT NULL,
    result jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    chat_history jsonb,
    chat_context text
);


ALTER TABLE public.direction_finder_results OWNER TO postgres;

--
-- Name: emotions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emotions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    passion_tree_id uuid NOT NULL,
    joy integer DEFAULT 5 NOT NULL,
    curiosity integer DEFAULT 5 NOT NULL,
    fulfillment integer DEFAULT 5 NOT NULL,
    challenge integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.emotions OWNER TO postgres;

--
-- Name: engagement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.engagement (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    passion_tree_id uuid NOT NULL,
    current_level integer DEFAULT 5 NOT NULL,
    date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.engagement OWNER TO postgres;

--
-- Name: group_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.group_memberships OWNER TO postgres;

--
-- Name: impacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.impacts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    connection_id uuid NOT NULL,
    interest_name character varying(255) NOT NULL,
    impact_type character varying(100) NOT NULL,
    strength integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.impacts OWNER TO postgres;

--
-- Name: influences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.influences (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    connection_id uuid NOT NULL,
    interest_name character varying(255) NOT NULL,
    influence_type character varying(100) NOT NULL,
    strength integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.influences OWNER TO postgres;

--
-- Name: insights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insights (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    passion_tree_id uuid NOT NULL,
    description text NOT NULL,
    date_discovered timestamp with time zone DEFAULT now(),
    application text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.insights OWNER TO postgres;

--
-- Name: interests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.interests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    level integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    emotion text NOT NULL,
    type text,
    CONSTRAINT interests_level_check CHECK (((level >= 0) AND (level <= 100)))
);


ALTER TABLE public.interests OWNER TO postgres;

--
-- Name: journey_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journey_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    goal text,
    why text,
    project_type text DEFAULT 'short_term'::text NOT NULL,
    is_main_quest boolean DEFAULT false,
    position_x double precision DEFAULT 0,
    position_y double precision DEFAULT 0,
    status text DEFAULT 'not_started'::text NOT NULL,
    color_theme text DEFAULT '#6366f1'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    icon text DEFAULT '🎯'::text,
    linked_north_star_id uuid,
    short_title text,
    CONSTRAINT journey_projects_color_format CHECK ((color_theme ~ '^#[0-9a-fA-F]{6}$'::text)),
    CONSTRAINT journey_projects_completion_logic CHECK ((((status = 'completed'::text) AND (completed_at IS NOT NULL)) OR ((status <> 'completed'::text) AND (completed_at IS NULL)))),
    CONSTRAINT journey_projects_description_length CHECK ((char_length(description) <= 5000)),
    CONSTRAINT journey_projects_goal_length CHECK ((char_length(goal) <= 2000)),
    CONSTRAINT journey_projects_icon_length CHECK ((char_length(icon) <= 4)),
    CONSTRAINT journey_projects_title_length CHECK (((char_length(title) >= 1) AND (char_length(title) <= 500))),
    CONSTRAINT journey_projects_valid_status CHECK ((status = ANY (ARRAY['not_started'::text, 'planning'::text, 'in_progress'::text, 'on_hold'::text, 'completed'::text, 'archived'::text]))),
    CONSTRAINT journey_projects_valid_type CHECK ((project_type = ANY (ARRAY['learning'::text, 'career'::text, 'personal'::text, 'creative'::text, 'research'::text, 'community'::text]))),
    CONSTRAINT journey_projects_why_length CHECK ((char_length(why) <= 2000))
);


ALTER TABLE public.journey_projects OWNER TO postgres;

--
-- Name: TABLE journey_projects; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.journey_projects IS 'User projects and goals. Linked to North Stars via linked_north_star_id.';


--
-- Name: COLUMN journey_projects.why; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.why IS 'User''s motivation and purpose for this project';


--
-- Name: COLUMN journey_projects.project_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.project_type IS 'Category of project: learning, career, personal, creative, research, or community';


--
-- Name: COLUMN journey_projects.is_main_quest; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.is_main_quest IS 'Indicates if this is the user''s primary current focus';


--
-- Name: COLUMN journey_projects.position_x; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.position_x IS 'X coordinate for visual map positioning';


--
-- Name: COLUMN journey_projects.position_y; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.position_y IS 'Y coordinate for visual map positioning';


--
-- Name: COLUMN journey_projects.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.status IS 'Current status: not_started, planning, in_progress, on_hold, completed, or archived.';


--
-- Name: COLUMN journey_projects.color_theme; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.color_theme IS 'Hex color code for visual theming';


--
-- Name: COLUMN journey_projects.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.metadata IS 'Flexible JSON storage for additional project data';


--
-- Name: COLUMN journey_projects.icon; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.icon IS 'Emoji icon for the project (single emoji character)';


--
-- Name: COLUMN journey_projects.linked_north_star_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.linked_north_star_id IS 'Links this project to a North Star from the north_stars table';


--
-- Name: COLUMN journey_projects.short_title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.journey_projects.short_title IS 'Optional short display title for compact views (e.g., journey map nodes)';


--
-- Name: learning_maps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.learning_maps (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description text,
    creator_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    difficulty integer DEFAULT 1,
    category text,
    total_students integer DEFAULT 0,
    finished_students integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    visibility text DEFAULT 'public'::text,
    cover_image_url text,
    version integer DEFAULT 1,
    last_modified_by uuid,
    cover_image_blurhash text,
    cover_image_key text,
    cover_image_updated_at timestamp with time zone DEFAULT now(),
    map_type public.map_type DEFAULT 'public'::public.map_type NOT NULL,
    parent_classroom_id uuid,
    CONSTRAINT learning_maps_category_check CHECK ((category = ANY (ARRAY['ai'::text, '3d'::text, 'unity'::text, 'hacking'::text, 'custom'::text, 'journey'::text]))),
    CONSTRAINT learning_maps_classroom_exclusive_check CHECK ((((map_type = 'classroom_exclusive'::public.map_type) AND (parent_classroom_id IS NOT NULL)) OR ((map_type <> 'classroom_exclusive'::public.map_type) AND (parent_classroom_id IS NULL)))),
    CONSTRAINT learning_maps_difficulty_check CHECK (((difficulty >= 1) AND (difficulty <= 10))),
    CONSTRAINT learning_maps_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text, 'team'::text])))
);


ALTER TABLE public.learning_maps OWNER TO postgres;

--
-- Name: COLUMN learning_maps.difficulty; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.difficulty IS 'Overall difficulty of the learning map (1-10)';


--
-- Name: COLUMN learning_maps.category; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.category IS 'Category of the learning map (ai, 3d, unity, hacking, custom)';


--
-- Name: COLUMN learning_maps.total_students; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.total_students IS 'Cached count of total students enrolled in this map';


--
-- Name: COLUMN learning_maps.finished_students; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.finished_students IS 'Cached count of students who completed this map';


--
-- Name: COLUMN learning_maps.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.metadata IS 'Additional metadata in JSON format for extensibility';


--
-- Name: COLUMN learning_maps.visibility; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.visibility IS 'Controls map visibility: public (visible to all), private (visible to creator only), team (visible to assigned teams)';


--
-- Name: COLUMN learning_maps.cover_image_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.cover_image_url IS 'Public URL to the optimized cover image stored in Backblaze B2';


--
-- Name: COLUMN learning_maps.cover_image_blurhash; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.cover_image_blurhash IS 'Blurhash string for placeholder while image loads';


--
-- Name: COLUMN learning_maps.cover_image_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.cover_image_key IS 'Backblaze B2 file key for deletion and management';


--
-- Name: COLUMN learning_maps.cover_image_updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.cover_image_updated_at IS 'Timestamp when cover image was last updated';


--
-- Name: COLUMN learning_maps.map_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.map_type IS 'Type of map: public (visible to all), private (visible to creator only), classroom_exclusive (visible to classroom members only)';


--
-- Name: COLUMN learning_maps.parent_classroom_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.learning_maps.parent_classroom_id IS 'For classroom_exclusive maps, the classroom they belong to. NULL for other map types.';


--
-- Name: CONSTRAINT learning_maps_category_check ON learning_maps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT learning_maps_category_check ON public.learning_maps IS 'Ensures category is one of: ai, 3d, unity, hacking, custom, or journey';


--
-- Name: learning_paths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.learning_paths (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    passion_tree_id uuid NOT NULL,
    current_focus character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.learning_paths OWNER TO postgres;

--
-- Name: map_editors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.map_editors (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    map_id uuid NOT NULL,
    user_id uuid NOT NULL,
    granted_by uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.map_editors OWNER TO postgres;

--
-- Name: TABLE map_editors; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.map_editors IS 'Grants edit access to learning maps for specific users. Editor permissions cascade to all map components: nodes, content, assessments, paths, and quiz questions.';


--
-- Name: map_nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.map_nodes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    map_id uuid NOT NULL,
    title character varying NOT NULL,
    instructions text,
    difficulty integer DEFAULT 1 NOT NULL,
    sprite_url text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    node_type text DEFAULT 'learning'::text,
    version integer DEFAULT 1,
    last_modified_by uuid,
    CONSTRAINT map_nodes_node_type_check CHECK ((node_type = ANY (ARRAY['learning'::text, 'text'::text])))
);


ALTER TABLE public.map_nodes OWNER TO postgres;

--
-- Name: TABLE map_nodes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.map_nodes IS 'Map node CRUD permissions restored on 2025-09-19 - users can now create/update/delete nodes based on RLS policies';


--
-- Name: COLUMN map_nodes.node_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.map_nodes.node_type IS 'Type of node: ''learning'' for interactive nodes, ''text'' for annotation/label nodes.';


--
-- Name: COLUMN map_nodes.version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.map_nodes.version IS 'Version number for node content tracking';


--
-- Name: COLUMN map_nodes.last_modified_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.map_nodes.last_modified_by IS 'User ID of the last person who modified this node';


--
-- Name: milestone_journals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestone_journals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    milestone_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    progress_percentage integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT milestone_journals_content_length CHECK (((char_length(content) >= 1) AND (char_length(content) <= 10000))),
    CONSTRAINT milestone_journals_progress_range CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);


ALTER TABLE public.milestone_journals OWNER TO postgres;

--
-- Name: TABLE milestone_journals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.milestone_journals IS 'Progress logs and journal entries for milestones';


--
-- Name: COLUMN milestone_journals.progress_percentage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.milestone_journals.progress_percentage IS 'Progress level at time of journal entry (0-100)';


--
-- Name: milestone_paths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestone_paths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_milestone_id uuid NOT NULL,
    destination_milestone_id uuid NOT NULL,
    path_type text DEFAULT 'linear'::text,
    CONSTRAINT milestone_paths_no_self_reference CHECK ((source_milestone_id <> destination_milestone_id)),
    CONSTRAINT milestone_paths_valid_type CHECK ((path_type = ANY (ARRAY['linear'::text, 'conditional'::text, 'parallel'::text])))
);


ALTER TABLE public.milestone_paths OWNER TO postgres;

--
-- Name: TABLE milestone_paths; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.milestone_paths IS 'Defines dependencies and relationships between milestones';


--
-- Name: COLUMN milestone_paths.path_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.milestone_paths.path_type IS 'Type of connection: linear (sequential), conditional, or parallel';


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.milestones (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    learning_path_id uuid NOT NULL,
    description text NOT NULL,
    achieved boolean DEFAULT false NOT NULL,
    date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.milestones OWNER TO postgres;

--
-- Name: mindmap_reflections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mindmap_reflections (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    satisfaction_rating integer NOT NULL,
    progress_rating integer NOT NULL,
    challenge_rating integer NOT NULL,
    overall_reflection text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mindmap_reflections_challenge_rating_check CHECK (((challenge_rating >= 0) AND (challenge_rating <= 100))),
    CONSTRAINT mindmap_reflections_progress_rating_check CHECK (((progress_rating >= 0) AND (progress_rating <= 100))),
    CONSTRAINT mindmap_reflections_satisfaction_rating_check CHECK (((satisfaction_rating >= 0) AND (satisfaction_rating <= 100)))
);


ALTER TABLE public.mindmap_reflections OWNER TO postgres;

--
-- Name: COLUMN mindmap_reflections.satisfaction_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_reflections.satisfaction_rating IS 'Average satisfaction rating across all topics';


--
-- Name: COLUMN mindmap_reflections.progress_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_reflections.progress_rating IS 'Average progress rating across all topics';


--
-- Name: COLUMN mindmap_reflections.challenge_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_reflections.challenge_rating IS 'Average challenge rating across all topics';


--
-- Name: COLUMN mindmap_reflections.overall_reflection; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_reflections.overall_reflection IS 'Overall reflection about the entire day (optional - individual topic reflections are stored in mindmap_topics)';


--
-- Name: mindmap_topics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mindmap_topics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    text text NOT NULL,
    position_x numeric NOT NULL,
    position_y numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reflection_id uuid,
    satisfaction_rating integer,
    progress_rating integer,
    challenge_rating integer,
    reflection_why text,
    CONSTRAINT mindmap_topics_challenge_rating_check CHECK (((challenge_rating >= 0) AND (challenge_rating <= 100))),
    CONSTRAINT mindmap_topics_progress_rating_check CHECK (((progress_rating >= 0) AND (progress_rating <= 100))),
    CONSTRAINT mindmap_topics_satisfaction_rating_check CHECK (((satisfaction_rating >= 0) AND (satisfaction_rating <= 100)))
);


ALTER TABLE public.mindmap_topics OWNER TO postgres;

--
-- Name: COLUMN mindmap_topics.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_topics.notes IS 'Updates/notes about what the user worked on for this topic';


--
-- Name: COLUMN mindmap_topics.satisfaction_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_topics.satisfaction_rating IS 'How satisfied the user felt about this topic (0-100)';


--
-- Name: COLUMN mindmap_topics.progress_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_topics.progress_rating IS 'How much progress the user made on this topic (0-100)';


--
-- Name: COLUMN mindmap_topics.challenge_rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_topics.challenge_rating IS 'How challenging this topic was (0-100)';


--
-- Name: COLUMN mindmap_topics.reflection_why; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mindmap_topics.reflection_why IS 'Why the user felt this way about their ratings for this topic';


--
-- Name: monthly_insights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_insights (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    year smallint NOT NULL,
    month smallint NOT NULL,
    top_emotion public.emotion,
    top_emotion_count integer DEFAULT 0,
    most_used_tag_id uuid,
    progress_notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.monthly_insights OWNER TO postgres;

--
-- Name: TABLE monthly_insights; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.monthly_insights IS 'Stores aggregated monthly insights for each user.';


--
-- Name: node_assessments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.node_assessments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    node_id uuid NOT NULL,
    assessment_type text NOT NULL,
    metadata jsonb,
    points_possible integer,
    is_graded boolean DEFAULT false NOT NULL,
    is_group_assessment boolean DEFAULT false NOT NULL,
    group_formation_method text DEFAULT 'manual'::text,
    target_group_size integer DEFAULT 3,
    allow_uneven_groups boolean DEFAULT true,
    groups_config jsonb DEFAULT '{}'::jsonb,
    group_submission_mode text DEFAULT 'all_members'::text,
    CONSTRAINT node_assessments_assessment_type_check CHECK ((assessment_type = ANY (ARRAY['quiz'::text, 'text_answer'::text, 'image_upload'::text, 'file_upload'::text, 'checklist'::text]))),
    CONSTRAINT node_assessments_group_formation_method_check CHECK ((group_formation_method = ANY (ARRAY['manual'::text, 'shuffle'::text]))),
    CONSTRAINT node_assessments_group_submission_mode_check CHECK ((group_submission_mode = ANY (ARRAY['all_members'::text, 'single_submission'::text]))),
    CONSTRAINT node_assessments_points_check CHECK (((points_possible IS NULL) OR (points_possible >= 0))),
    CONSTRAINT node_assessments_target_group_size_check CHECK (((target_group_size >= 2) AND (target_group_size <= 20)))
);


ALTER TABLE public.node_assessments OWNER TO postgres;

--
-- Name: TABLE node_assessments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.node_assessments IS 'Assessment creation permissions restored on 2025-09-19 - users can now create/update/delete assessments based on RLS policies';


--
-- Name: COLUMN node_assessments.is_group_assessment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_assessments.is_group_assessment IS 'Whether this assessment should be completed in groups';


--
-- Name: COLUMN node_assessments.group_formation_method; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_assessments.group_formation_method IS 'How groups are formed: manual assignment or auto shuffle';


--
-- Name: COLUMN node_assessments.target_group_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_assessments.target_group_size IS 'Target number of students per group (used for shuffle)';


--
-- Name: COLUMN node_assessments.allow_uneven_groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_assessments.allow_uneven_groups IS 'Whether to allow groups with different sizes';


--
-- Name: COLUMN node_assessments.groups_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_assessments.groups_config IS 'Additional JSON configuration for group settings';


--
-- Name: COLUMN node_assessments.group_submission_mode; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_assessments.group_submission_mode IS 'Controls group submission behavior: all_members (everyone must submit) or single_submission (one person submits for all)';


--
-- Name: node_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.node_content (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    node_id uuid NOT NULL,
    content_type text NOT NULL,
    content_url text,
    content_body text,
    created_at timestamp with time zone DEFAULT now(),
    content_title text,
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT node_content_content_type_check CHECK ((content_type = ANY (ARRAY['video'::text, 'canva_slide'::text, 'text'::text, 'image'::text, 'pdf'::text, 'resource_link'::text])))
);


ALTER TABLE public.node_content OWNER TO postgres;

--
-- Name: COLUMN node_content.content_title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_content.content_title IS 'The title of the content, if applicable.';


--
-- Name: COLUMN node_content.display_order; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.node_content.display_order IS 'Determines the display order of content items within a node. Lower numbers appear first.';


--
-- Name: node_leaderboard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.node_leaderboard (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    node_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rank integer NOT NULL,
    grade_rating integer,
    completion_speed_seconds bigint,
    ranked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.node_leaderboard OWNER TO postgres;

--
-- Name: node_paths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.node_paths (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    source_node_id uuid NOT NULL,
    destination_node_id uuid NOT NULL
);


ALTER TABLE public.node_paths OWNER TO postgres;

--
-- Name: north_stars; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.north_stars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    why text,
    icon text DEFAULT '⭐'::text,
    sdg_goals integer[] DEFAULT '{}'::integer[],
    career_path text,
    north_star_shape text DEFAULT 'classic'::text,
    north_star_color text DEFAULT 'golden'::text,
    position_x numeric,
    position_y numeric,
    progress_percentage integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    achieved_at timestamp with time zone,
    CONSTRAINT north_stars_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT north_stars_status_check CHECK ((status = ANY (ARRAY['active'::text, 'achieved'::text, 'on_hold'::text, 'archived'::text])))
);


ALTER TABLE public.north_stars OWNER TO postgres;

--
-- Name: TABLE north_stars; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.north_stars IS 'Long-term guiding goals that users work towards through their journey projects';


--
-- Name: COLUMN north_stars.sdg_goals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.north_stars.sdg_goals IS 'Array of UN Sustainable Development Goal numbers (1-17) that this North Star aligns with';


--
-- Name: COLUMN north_stars.career_path; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.north_stars.career_path IS 'Career path category this North Star aligns with';


--
-- Name: COLUMN north_stars.north_star_shape; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.north_stars.north_star_shape IS 'Visual icon shape for the North Star (classic, sparkle, shooting, glowing, compass, target, diamond, crown)';


--
-- Name: COLUMN north_stars.north_star_color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.north_stars.north_star_color IS 'Color theme for the North Star (golden, amber, rose, silver, blue, purple, green, orange)';


--
-- Name: passion_trees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.passion_trees (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(100) NOT NULL,
    growth_stage character varying(50) DEFAULT 'Seed'::character varying NOT NULL,
    depth numeric(3,1) DEFAULT 1.0 NOT NULL,
    mastery numeric(3,1) DEFAULT 1.0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.passion_trees OWNER TO postgres;

--
-- Name: post_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_comments OWNER TO postgres;

--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_likes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_likes OWNER TO postgres;

--
-- Name: post_media; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_media (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    post_id uuid NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    storage_path text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_media OWNER TO postgres;

--
-- Name: potential_offshoots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.potential_offshoots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    insight_id uuid NOT NULL,
    interest_name character varying(255) NOT NULL,
    germination_stage integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.potential_offshoots OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    discord_id text,
    email text,
    date_of_birth date,
    full_name text,
    education_level text DEFAULT 'high_school'::text,
    tos_accepted_at timestamp with time zone,
    tos_version text,
    preferred_language text DEFAULT 'en'::text NOT NULL,
    CONSTRAINT education_level_check CHECK ((education_level = ANY (ARRAY['high_school'::text, 'university'::text, 'unaffiliated'::text]))),
    CONSTRAINT profiles_preferred_language_check CHECK ((preferred_language = ANY (ARRAY['en'::text, 'th'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: COLUMN profiles.tos_accepted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.tos_accepted_at IS 'Timestamp when user last accepted Terms of Service';


--
-- Name: COLUMN profiles.tos_version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.tos_version IS 'Version of TOS that was accepted (e.g., "2025-01-24")';


--
-- Name: COLUMN profiles.preferred_language; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language (en or th)';


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_members (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'contributor'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.project_members OWNER TO postgres;

--
-- Name: project_milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    details text,
    order_index integer NOT NULL,
    progress_percentage integer DEFAULT 0,
    position_x double precision DEFAULT 0,
    position_y double precision DEFAULT 0,
    status text DEFAULT 'not_started'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT project_milestones_completion_logic CHECK ((((status = 'completed'::text) AND (completed_at IS NOT NULL)) OR (status <> 'completed'::text))),
    CONSTRAINT project_milestones_description_length CHECK ((char_length(description) <= 2000)),
    CONSTRAINT project_milestones_details_length CHECK ((char_length(details) <= 10000)),
    CONSTRAINT project_milestones_order_positive CHECK ((order_index >= 0)),
    CONSTRAINT project_milestones_progress_range CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT project_milestones_title_length CHECK (((char_length(title) >= 1) AND (char_length(title) <= 500))),
    CONSTRAINT project_milestones_valid_status CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'blocked'::text, 'completed'::text, 'skipped'::text])))
);


ALTER TABLE public.project_milestones OWNER TO postgres;

--
-- Name: TABLE project_milestones; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_milestones IS 'Individual milestones and steps within journey projects';


--
-- Name: COLUMN project_milestones.details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_milestones.details IS 'Combined detailed description and action items';


--
-- Name: COLUMN project_milestones.order_index; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_milestones.order_index IS 'Sequential ordering of milestones within project';


--
-- Name: COLUMN project_milestones.progress_percentage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_milestones.progress_percentage IS 'Current progress on milestone (0-100)';


--
-- Name: COLUMN project_milestones.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_milestones.metadata IS 'Stores additional milestone data including start_date, due_date, estimated_hours, actual_hours, style, dependencies, and tags';


--
-- Name: project_outcomes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_outcomes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    description text NOT NULL,
    type character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.project_outcomes OWNER TO postgres;

--
-- Name: project_paths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_paths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_project_id uuid NOT NULL,
    destination_project_id uuid NOT NULL,
    path_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT project_paths_no_self_reference CHECK ((source_project_id <> destination_project_id)),
    CONSTRAINT project_paths_path_type_check CHECK (((path_type)::text = ANY ((ARRAY['dependency'::character varying, 'relates_to'::character varying, 'leads_to'::character varying])::text[])))
);


ALTER TABLE public.project_paths OWNER TO postgres;

--
-- Name: TABLE project_paths; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_paths IS 'Stores relationships and dependencies between journey projects';


--
-- Name: COLUMN project_paths.source_project_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_paths.source_project_id IS 'The originating project in the relationship';


--
-- Name: COLUMN project_paths.destination_project_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_paths.destination_project_id IS 'The target project in the relationship';


--
-- Name: COLUMN project_paths.path_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_paths.path_type IS 'Type of relationship: dependency (required before), relates_to (thematically connected), leads_to (natural progression)';


--
-- Name: project_reflections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_reflections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    reflection_type text DEFAULT 'general'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_reflections_content_length CHECK (((char_length(content) >= 1) AND (char_length(content) <= 10000))),
    CONSTRAINT project_reflections_valid_type CHECK ((reflection_type = ANY (ARRAY['milestone_complete'::text, 'project_complete'::text, 'general'::text])))
);


ALTER TABLE public.project_reflections OWNER TO postgres;

--
-- Name: TABLE project_reflections; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.project_reflections IS 'High-level reflections on projects and achievements';


--
-- Name: COLUMN project_reflections.reflection_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.project_reflections.reflection_type IS 'Type of reflection: milestone_complete, project_complete, or general';


--
-- Name: project_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_tags (
    project_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.project_tags OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'Idea'::character varying NOT NULL,
    start_date timestamp with time zone,
    completion_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    goal text,
    image_url text,
    link text
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    assessment_id uuid NOT NULL,
    question_text text NOT NULL,
    options jsonb,
    correct_option character varying
);


ALTER TABLE public.quiz_questions OWNER TO postgres;

--
-- Name: reflection_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reflection_metrics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    reflection_id uuid NOT NULL,
    satisfaction numeric(3,1) NOT NULL,
    progress numeric(3,1) NOT NULL,
    challenge numeric(3,1) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reflection_metrics_challenge_check CHECK (((challenge >= (1)::numeric) AND (challenge <= (10)::numeric))),
    CONSTRAINT reflection_metrics_engagement_check CHECK (((progress >= (1)::numeric) AND (progress <= (10)::numeric))),
    CONSTRAINT reflection_metrics_satisfaction_check CHECK (((satisfaction >= (1)::numeric) AND (satisfaction <= (10)::numeric)))
);


ALTER TABLE public.reflection_metrics OWNER TO postgres;

--
-- Name: TABLE reflection_metrics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.reflection_metrics IS 'Metrics associated with each reflection entry.';


--
-- Name: reflections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reflections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    emotion public.emotion NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid,
    reason text
);


ALTER TABLE public.reflections OWNER TO postgres;

--
-- Name: related_interests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.related_interests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    connection_type character varying(100) NOT NULL,
    connection_strength integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.related_interests OWNER TO postgres;

--
-- Name: resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    learning_path_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'Not Started'::character varying NOT NULL,
    impact integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.resources OWNER TO postgres;

--
-- Name: roots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    passion_tree_id uuid NOT NULL,
    time_invested integer DEFAULT 0 NOT NULL,
    financial_investment integer DEFAULT 0 NOT NULL,
    root_strength integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.roots OWNER TO postgres;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: song_of_the_day; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.song_of_the_day (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    song_url text NOT NULL,
    song_title text NOT NULL,
    artist text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    album_cover_url text,
    preview_url text,
    spotify_id text,
    duration_ms integer,
    popularity integer,
    audio_features jsonb
);


ALTER TABLE public.song_of_the_day OWNER TO postgres;

--
-- Name: student_node_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_node_progress (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    node_id uuid NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    arrived_at timestamp with time zone,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    CONSTRAINT student_node_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'submitted'::text, 'passed'::text, 'failed'::text])))
);


ALTER TABLE public.student_node_progress OWNER TO postgres;

--
-- Name: CONSTRAINT student_node_progress_status_check ON student_node_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT student_node_progress_status_check ON public.student_node_progress IS 'Valid status values: not_started, in_progress, submitted, passed, failed';


--
-- Name: team_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    left_at timestamp with time zone,
    is_leader boolean DEFAULT false NOT NULL,
    member_metadata jsonb,
    CONSTRAINT team_memberships_valid_role CHECK (((role)::text = ANY (ARRAY[('member'::character varying)::text, ('co-leader'::character varying)::text, ('leader'::character varying)::text])))
);


ALTER TABLE public.team_memberships OWNER TO postgres;

--
-- Name: students_without_teams; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.students_without_teams AS
 SELECT cm.classroom_id,
    cm.user_id,
    p.username,
    p.full_name,
    p.avatar_url
   FROM (public.classroom_memberships cm
     JOIN public.profiles p ON ((cm.user_id = p.id)))
  WHERE (((cm.role)::text = 'student'::text) AND (NOT (EXISTS ( SELECT 1
           FROM (public.team_memberships tm
             JOIN public.classroom_teams ct ON ((tm.team_id = ct.id)))
          WHERE ((tm.user_id = cm.user_id) AND (ct.classroom_id = cm.classroom_id) AND (ct.is_active = true) AND (tm.left_at IS NULL))))));


ALTER TABLE public.students_without_teams OWNER TO postgres;

--
-- Name: VIEW students_without_teams; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.students_without_teams IS 'Pre-joined view of students who are not currently in any active team within their classroom';


--
-- Name: submission_grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submission_grades (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    submission_id uuid NOT NULL,
    graded_by uuid,
    grade text NOT NULL,
    rating integer,
    comments text,
    graded_at timestamp with time zone DEFAULT now(),
    points_awarded integer,
    CONSTRAINT submission_grades_grade_check CHECK ((grade = ANY (ARRAY['pass'::text, 'fail'::text]))),
    CONSTRAINT submission_grades_points_check CHECK (((points_awarded IS NULL) OR (points_awarded >= 0))),
    CONSTRAINT submission_grades_rating_check CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5))))
);


ALTER TABLE public.submission_grades OWNER TO postgres;

--
-- Name: TABLE submission_grades; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.submission_grades IS 'Grades for assessment submissions. Group grading is now handled in application layer to prevent database recursion.';


--
-- Name: COLUMN submission_grades.graded_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.submission_grades.graded_by IS 'User ID of instructor or TA who graded this submission';


--
-- Name: COLUMN submission_grades.grade; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.submission_grades.grade IS 'Pass or fail grade (pass, fail)';


--
-- Name: COLUMN submission_grades.rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.submission_grades.rating IS 'Optional numeric rating from 1 to 5';


--
-- Name: CONSTRAINT submission_grades_grade_check ON submission_grades; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT submission_grades_grade_check ON public.submission_grades IS 'Valid grade values: pass, fail (mapped to passed/failed in progress by trigger)';


--
-- Name: synergies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.synergies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    connection_id uuid NOT NULL,
    interest_name character varying(255) NOT NULL,
    potential_outcome text NOT NULL,
    exploration_level integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.synergies OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    color character varying DEFAULT '#6b7280'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: TABLE tags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tags IS 'User-defined tags for categorizing reflections.';


--
-- Name: team_meetings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    node_id uuid,
    scheduled_by uuid NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 30,
    meeting_topic text,
    description text,
    meeting_link text,
    status text DEFAULT 'scheduled'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.team_meetings OWNER TO postgres;

--
-- Name: team_members_with_profiles; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.team_members_with_profiles AS
 SELECT tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.is_leader,
    tm.joined_at,
    tm.left_at,
    tm.member_metadata,
    p.username,
    p.full_name,
    p.avatar_url
   FROM (public.team_memberships tm
     JOIN public.profiles p ON ((tm.user_id = p.id)))
  WHERE (tm.left_at IS NULL);


ALTER TABLE public.team_members_with_profiles OWNER TO postgres;

--
-- Name: team_node_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_node_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    node_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_node_assignments OWNER TO postgres;

--
-- Name: TABLE team_node_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.team_node_assignments IS 'Tracks multiple team member assignments to specific nodes, replacing the single assigned_to field in team_node_progress';


--
-- Name: team_progress_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_progress_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    node_id uuid NOT NULL,
    instructor_id uuid NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_progress_comments OWNER TO postgres;

--
-- Name: TABLE team_progress_comments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.team_progress_comments IS 'Stores instructor comments on team progress for specific nodes';


--
-- Name: COLUMN team_progress_comments.team_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_progress_comments.team_id IS 'Reference to the team this comment is about';


--
-- Name: COLUMN team_progress_comments.node_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_progress_comments.node_id IS 'Reference to the learning map node this comment is about';


--
-- Name: COLUMN team_progress_comments.instructor_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_progress_comments.instructor_id IS 'Reference to the instructor who made the comment';


--
-- Name: COLUMN team_progress_comments.comment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.team_progress_comments.comment IS 'The instructor comment text';


--
-- Name: tools_acquired; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tools_acquired (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    root_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tools_acquired OWNER TO postgres;

--
-- Name: universities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.universities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    short_name text,
    website_url text,
    logo_url text,
    description text,
    admission_requirements text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.universities OWNER TO postgres;

--
-- Name: university_example_maps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.university_example_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid,
    title text NOT NULL,
    description text,
    target_audience text,
    example_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


ALTER TABLE public.university_example_maps OWNER TO postgres;

--
-- Name: user_communities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_communities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    community_id uuid,
    role text DEFAULT 'Member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_communities OWNER TO postgres;

--
-- Name: user_interest_priorities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_interest_priorities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    interest_name text NOT NULL,
    priority_rank integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_interest_priorities_priority_rank_check CHECK ((priority_rank > 0))
);


ALTER TABLE public.user_interest_priorities OWNER TO postgres;

--
-- Name: user_map_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_map_enrollments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    map_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    progress_percentage integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    CONSTRAINT user_map_enrollments_valid_status CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'dropped'::text])))
);


ALTER TABLE public.user_map_enrollments OWNER TO postgres;

--
-- Name: COLUMN user_map_enrollments.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_map_enrollments.status IS 'Current enrollment status: active, completed, dropped';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text, 'admin'::text])))
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_stats (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    helpful_responses integer DEFAULT 0,
    communities_helped integer DEFAULT 0,
    kudos_received integer DEFAULT 0,
    workshops_contributed integer DEFAULT 0,
    average_rating numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_stats OWNER TO postgres;

--
-- Name: user_university_targets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_university_targets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    university_id uuid,
    priority_rank integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_university_targets_priority_rank_check CHECK (((priority_rank >= 1) AND (priority_rank <= 3)))
);


ALTER TABLE public.user_university_targets OWNER TO postgres;

--
-- Name: user_workshops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_workshops (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    workshop_id uuid,
    joined_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_workshops OWNER TO postgres;

--
-- Name: workshop_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workshop_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    workshop_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.workshop_comments OWNER TO postgres;

--
-- Name: workshop_suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workshop_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    suggestion text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.workshop_suggestions OWNER TO postgres;

--
-- Name: workshop_votes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workshop_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    workshop_id uuid,
    path_name text,
    vote_type text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT workshop_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['up'::text, 'down'::text, 'emoji'::text])))
);


ALTER TABLE public.workshop_votes OWNER TO postgres;

--
-- Name: workshops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workshops (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    instructor text,
    category text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    paths_in_development jsonb,
    voting_enabled boolean,
    start_date date,
    status text,
    paths jsonb,
    slug text,
    CONSTRAINT workshops_category_check CHECK ((category = ANY (ARRAY['Inspire'::text, 'Build'::text, 'Scale'::text])))
);


ALTER TABLE public.workshops OWNER TO postgres;

--
-- Name: admin_activity_log admin_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id);


--
-- Name: ai_agents ai_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agents
    ADD CONSTRAINT ai_agents_pkey PRIMARY KEY (id);


--
-- Name: ai_roadmaps ai_roadmaps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_roadmaps
    ADD CONSTRAINT ai_roadmaps_pkey PRIMARY KEY (id);


--
-- Name: assessment_group_members assessment_group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_group_members
    ADD CONSTRAINT assessment_group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: assessment_group_members assessment_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_group_members
    ADD CONSTRAINT assessment_group_members_pkey PRIMARY KEY (id);


--
-- Name: assessment_groups assessment_groups_assessment_id_group_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_groups
    ADD CONSTRAINT assessment_groups_assessment_id_group_number_key UNIQUE (assessment_id, group_number);


--
-- Name: assessment_groups assessment_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_groups
    ADD CONSTRAINT assessment_groups_pkey PRIMARY KEY (id);


--
-- Name: assessment_submissions assessment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignment_enrollments assignment_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_enrollments
    ADD CONSTRAINT assignment_enrollments_pkey PRIMARY KEY (id);


--
-- Name: assignment_enrollments assignment_enrollments_unique_enrollment; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_enrollments
    ADD CONSTRAINT assignment_enrollments_unique_enrollment UNIQUE (assignment_id, user_id);


--
-- Name: assignment_group_assignments assignment_group_assignments_assignment_id_group_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_assignments
    ADD CONSTRAINT assignment_group_assignments_assignment_id_group_id_key UNIQUE (assignment_id, group_id);


--
-- Name: assignment_group_assignments assignment_group_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_assignments
    ADD CONSTRAINT assignment_group_assignments_pkey PRIMARY KEY (id);


--
-- Name: assignment_group_members assignment_group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_members
    ADD CONSTRAINT assignment_group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: assignment_group_members assignment_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_members
    ADD CONSTRAINT assignment_group_members_pkey PRIMARY KEY (id);


--
-- Name: assignment_groups assignment_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_groups
    ADD CONSTRAINT assignment_groups_pkey PRIMARY KEY (id);


--
-- Name: assignment_nodes assignment_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_nodes
    ADD CONSTRAINT assignment_nodes_pkey PRIMARY KEY (id);


--
-- Name: assignment_nodes assignment_nodes_unique_assignment_node; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_nodes
    ADD CONSTRAINT assignment_nodes_unique_assignment_node UNIQUE (assignment_id, node_id);


--
-- Name: assignment_nodes assignment_nodes_unique_sequence; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_nodes
    ADD CONSTRAINT assignment_nodes_unique_sequence UNIQUE (assignment_id, sequence_order);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: classroom_assignments classroom_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_assignments
    ADD CONSTRAINT classroom_assignments_pkey PRIMARY KEY (id);


--
-- Name: classroom_groups classroom_groups_classroom_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_groups
    ADD CONSTRAINT classroom_groups_classroom_id_name_key UNIQUE (classroom_id, name);


--
-- Name: classroom_groups classroom_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_groups
    ADD CONSTRAINT classroom_groups_pkey PRIMARY KEY (id);


--
-- Name: classroom_map_features classroom_map_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_map_features
    ADD CONSTRAINT classroom_map_features_pkey PRIMARY KEY (id);


--
-- Name: classroom_map_features classroom_map_features_unique_per_map; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_map_features
    ADD CONSTRAINT classroom_map_features_unique_per_map UNIQUE (map_id, feature_type);


--
-- Name: classroom_maps classroom_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_maps
    ADD CONSTRAINT classroom_maps_pkey PRIMARY KEY (id);


--
-- Name: classroom_maps classroom_maps_unique_link; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_maps
    ADD CONSTRAINT classroom_maps_unique_link UNIQUE (classroom_id, map_id);


--
-- Name: classroom_memberships classroom_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_memberships
    ADD CONSTRAINT classroom_memberships_pkey PRIMARY KEY (id);


--
-- Name: classroom_memberships classroom_memberships_unique_membership; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_memberships
    ADD CONSTRAINT classroom_memberships_unique_membership UNIQUE (classroom_id, user_id);


--
-- Name: classroom_team_maps classroom_team_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_team_maps
    ADD CONSTRAINT classroom_team_maps_pkey PRIMARY KEY (id);


--
-- Name: classroom_teams classroom_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_teams
    ADD CONSTRAINT classroom_teams_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_join_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_join_code_key UNIQUE (join_code);


--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- Name: cohort_map_enrollments cohort_map_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cohort_map_enrollments
    ADD CONSTRAINT cohort_map_enrollments_pkey PRIMARY KEY (id);


--
-- Name: cohorts cohorts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cohorts
    ADD CONSTRAINT cohorts_pkey PRIMARY KEY (id);


--
-- Name: communities communities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);


--
-- Name: communities communities_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_slug_key UNIQUE (slug);


--
-- Name: community_images community_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_images
    ADD CONSTRAINT community_images_pkey PRIMARY KEY (id);


--
-- Name: community_mentors community_mentors_community_user_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_mentors
    ADD CONSTRAINT community_mentors_community_user_key UNIQUE (community_id, user_id);


--
-- Name: community_mentors community_mentors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_mentors
    ADD CONSTRAINT community_mentors_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: community_projects community_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_projects
    ADD CONSTRAINT community_projects_pkey PRIMARY KEY (id);


--
-- Name: connections connections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_pkey PRIMARY KEY (id);


--
-- Name: direction_finder_results direction_finder_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direction_finder_results
    ADD CONSTRAINT direction_finder_results_pkey PRIMARY KEY (id);


--
-- Name: emotions emotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emotions
    ADD CONSTRAINT emotions_pkey PRIMARY KEY (id);


--
-- Name: engagement engagement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.engagement
    ADD CONSTRAINT engagement_pkey PRIMARY KEY (id);


--
-- Name: group_memberships group_memberships_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_memberships group_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_pkey PRIMARY KEY (id);


--
-- Name: impacts impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impacts
    ADD CONSTRAINT impacts_pkey PRIMARY KEY (id);


--
-- Name: influences influences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influences
    ADD CONSTRAINT influences_pkey PRIMARY KEY (id);


--
-- Name: insights insights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_pkey PRIMARY KEY (id);


--
-- Name: interests interests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interests
    ADD CONSTRAINT interests_pkey PRIMARY KEY (id);


--
-- Name: journey_projects journey_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journey_projects
    ADD CONSTRAINT journey_projects_pkey PRIMARY KEY (id);


--
-- Name: learning_maps learning_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_maps
    ADD CONSTRAINT learning_maps_pkey PRIMARY KEY (id);


--
-- Name: learning_paths learning_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_pkey PRIMARY KEY (id);


--
-- Name: map_editors map_editors_map_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_editors
    ADD CONSTRAINT map_editors_map_id_user_id_key UNIQUE (map_id, user_id);


--
-- Name: map_editors map_editors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_editors
    ADD CONSTRAINT map_editors_pkey PRIMARY KEY (id);


--
-- Name: map_nodes map_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_nodes
    ADD CONSTRAINT map_nodes_pkey PRIMARY KEY (id);


--
-- Name: milestone_journals milestone_journals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_journals
    ADD CONSTRAINT milestone_journals_pkey PRIMARY KEY (id);


--
-- Name: milestone_paths milestone_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_paths
    ADD CONSTRAINT milestone_paths_pkey PRIMARY KEY (id);


--
-- Name: milestone_paths milestone_paths_unique_connection; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_paths
    ADD CONSTRAINT milestone_paths_unique_connection UNIQUE (source_milestone_id, destination_milestone_id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: mindmap_reflections mindmap_reflections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mindmap_reflections
    ADD CONSTRAINT mindmap_reflections_pkey PRIMARY KEY (id);


--
-- Name: mindmap_topics mindmap_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mindmap_topics
    ADD CONSTRAINT mindmap_topics_pkey PRIMARY KEY (id);


--
-- Name: monthly_insights monthly_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_insights
    ADD CONSTRAINT monthly_insights_pkey PRIMARY KEY (id);


--
-- Name: monthly_insights monthly_insights_user_year_month_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_insights
    ADD CONSTRAINT monthly_insights_user_year_month_uniq UNIQUE (user_id, year, month);


--
-- Name: node_assessments node_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_assessments
    ADD CONSTRAINT node_assessments_pkey PRIMARY KEY (id);


--
-- Name: node_content node_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_content
    ADD CONSTRAINT node_content_pkey PRIMARY KEY (id);


--
-- Name: node_leaderboard node_leaderboard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_leaderboard
    ADD CONSTRAINT node_leaderboard_pkey PRIMARY KEY (id);


--
-- Name: node_paths node_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_paths
    ADD CONSTRAINT node_paths_pkey PRIMARY KEY (id);


--
-- Name: north_stars north_stars_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.north_stars
    ADD CONSTRAINT north_stars_pkey PRIMARY KEY (id);


--
-- Name: passion_trees passion_trees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passion_trees
    ADD CONSTRAINT passion_trees_pkey PRIMARY KEY (id);


--
-- Name: post_comments post_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_post_user_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_user_key UNIQUE (post_id, user_id);


--
-- Name: post_media post_media_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_media
    ADD CONSTRAINT post_media_pkey PRIMARY KEY (id);


--
-- Name: potential_offshoots potential_offshoots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potential_offshoots
    ADD CONSTRAINT potential_offshoots_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_project_user_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_user_key UNIQUE (project_id, user_id);


--
-- Name: project_milestones project_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_pkey PRIMARY KEY (id);


--
-- Name: project_milestones project_milestones_unique_project_order; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_unique_project_order UNIQUE (project_id, order_index);


--
-- Name: project_outcomes project_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_outcomes
    ADD CONSTRAINT project_outcomes_pkey PRIMARY KEY (id);


--
-- Name: project_paths project_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_paths
    ADD CONSTRAINT project_paths_pkey PRIMARY KEY (id);


--
-- Name: project_paths project_paths_unique_connection; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_paths
    ADD CONSTRAINT project_paths_unique_connection UNIQUE (source_project_id, destination_project_id);


--
-- Name: project_reflections project_reflections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_reflections
    ADD CONSTRAINT project_reflections_pkey PRIMARY KEY (id);


--
-- Name: project_tags project_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT project_tags_pkey PRIMARY KEY (project_id, tag_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: reflection_metrics reflection_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reflection_metrics
    ADD CONSTRAINT reflection_metrics_pkey PRIMARY KEY (id);


--
-- Name: reflections reflections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reflections
    ADD CONSTRAINT reflections_pkey PRIMARY KEY (id);


--
-- Name: related_interests related_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.related_interests
    ADD CONSTRAINT related_interests_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: roots roots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roots
    ADD CONSTRAINT roots_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: song_of_the_day song_of_the_day_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.song_of_the_day
    ADD CONSTRAINT song_of_the_day_pkey PRIMARY KEY (id);


--
-- Name: student_node_progress student_node_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_node_progress
    ADD CONSTRAINT student_node_progress_pkey PRIMARY KEY (id);


--
-- Name: student_node_progress student_node_progress_user_id_node_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_node_progress
    ADD CONSTRAINT student_node_progress_user_id_node_id_key UNIQUE (user_id, node_id);


--
-- Name: submission_grades submission_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_grades
    ADD CONSTRAINT submission_grades_pkey PRIMARY KEY (id);


--
-- Name: synergies synergies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.synergies
    ADD CONSTRAINT synergies_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: team_meetings team_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_meetings
    ADD CONSTRAINT team_meetings_pkey PRIMARY KEY (id);


--
-- Name: team_memberships team_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_memberships
    ADD CONSTRAINT team_memberships_pkey PRIMARY KEY (id);


--
-- Name: team_node_assignments team_node_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_assignments
    ADD CONSTRAINT team_node_assignments_pkey PRIMARY KEY (id);


--
-- Name: team_node_assignments team_node_assignments_team_id_node_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_assignments
    ADD CONSTRAINT team_node_assignments_team_id_node_id_user_id_key UNIQUE (team_id, node_id, user_id);


--
-- Name: team_node_progress team_node_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_progress
    ADD CONSTRAINT team_node_progress_pkey PRIMARY KEY (id);


--
-- Name: team_node_progress team_node_progress_team_id_node_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_progress
    ADD CONSTRAINT team_node_progress_team_id_node_id_key UNIQUE (team_id, node_id);


--
-- Name: team_progress_comments team_progress_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_progress_comments
    ADD CONSTRAINT team_progress_comments_pkey PRIMARY KEY (id);


--
-- Name: tools_acquired tools_acquired_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tools_acquired
    ADD CONSTRAINT tools_acquired_pkey PRIMARY KEY (id);


--
-- Name: song_of_the_day unique_user_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.song_of_the_day
    ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);


--
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- Name: university_example_maps university_example_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_example_maps
    ADD CONSTRAINT university_example_maps_pkey PRIMARY KEY (id);


--
-- Name: user_communities user_communities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_communities
    ADD CONSTRAINT user_communities_pkey PRIMARY KEY (id);


--
-- Name: user_communities user_communities_user_id_community_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_communities
    ADD CONSTRAINT user_communities_user_id_community_id_key UNIQUE (user_id, community_id);


--
-- Name: user_interest_priorities user_interest_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_interest_priorities
    ADD CONSTRAINT user_interest_priorities_pkey PRIMARY KEY (id);


--
-- Name: user_interest_priorities user_interest_priorities_user_id_priority_rank_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_interest_priorities
    ADD CONSTRAINT user_interest_priorities_user_id_priority_rank_key UNIQUE (user_id, priority_rank);


--
-- Name: user_map_enrollments user_map_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_map_enrollments
    ADD CONSTRAINT user_map_enrollments_pkey PRIMARY KEY (id);


--
-- Name: user_map_enrollments user_map_enrollments_user_id_map_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_map_enrollments
    ADD CONSTRAINT user_map_enrollments_user_id_map_id_key UNIQUE (user_id, map_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (id);


--
-- Name: user_stats user_stats_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_key UNIQUE (user_id);


--
-- Name: user_university_targets user_university_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_university_targets
    ADD CONSTRAINT user_university_targets_pkey PRIMARY KEY (id);


--
-- Name: user_university_targets user_university_targets_user_id_priority_rank_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_university_targets
    ADD CONSTRAINT user_university_targets_user_id_priority_rank_key UNIQUE (user_id, priority_rank);


--
-- Name: user_university_targets user_university_targets_user_id_university_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_university_targets
    ADD CONSTRAINT user_university_targets_user_id_university_id_key UNIQUE (user_id, university_id);


--
-- Name: user_workshops user_workshops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_workshops
    ADD CONSTRAINT user_workshops_pkey PRIMARY KEY (id);


--
-- Name: user_workshops user_workshops_user_id_workshop_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_workshops
    ADD CONSTRAINT user_workshops_user_id_workshop_id_key UNIQUE (user_id, workshop_id);


--
-- Name: workshop_comments workshop_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_comments
    ADD CONSTRAINT workshop_comments_pkey PRIMARY KEY (id);


--
-- Name: workshop_suggestions workshop_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_suggestions
    ADD CONSTRAINT workshop_suggestions_pkey PRIMARY KEY (id);


--
-- Name: workshop_votes workshop_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_votes
    ADD CONSTRAINT workshop_votes_pkey PRIMARY KEY (id);


--
-- Name: workshops workshops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT workshops_pkey PRIMARY KEY (id);


--
-- Name: workshops workshops_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT workshops_slug_key UNIQUE (slug);


--
-- Name: classroom_map_features_enabled_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX classroom_map_features_enabled_idx ON public.classroom_map_features USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: classroom_map_features_feature_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX classroom_map_features_feature_type_idx ON public.classroom_map_features USING btree (feature_type);


--
-- Name: classroom_map_features_map_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX classroom_map_features_map_id_idx ON public.classroom_map_features USING btree (map_id);


--
-- Name: idx_admin_activity_log_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_activity_log_action ON public.admin_activity_log USING btree (action);


--
-- Name: idx_admin_activity_log_admin_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_activity_log_admin_user ON public.admin_activity_log USING btree (admin_user_id);


--
-- Name: idx_admin_activity_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log USING btree (created_at);


--
-- Name: idx_admin_activity_log_target_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_activity_log_target_user ON public.admin_activity_log USING btree (target_user_id);


--
-- Name: idx_ai_agents_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_agents_category ON public.ai_agents USING btree (category);


--
-- Name: idx_ai_agents_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_agents_is_active ON public.ai_agents USING btree (is_active);


--
-- Name: idx_ai_agents_use_case; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_agents_use_case ON public.ai_agents USING btree (use_case);


--
-- Name: idx_ai_roadmaps_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_roadmaps_user_id ON public.ai_roadmaps USING btree (user_id);


--
-- Name: idx_assessment_group_members_assigned_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_group_members_assigned_by ON public.assessment_group_members USING btree (assigned_by);


--
-- Name: idx_assessment_group_members_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_group_members_group_id ON public.assessment_group_members USING btree (group_id);


--
-- Name: idx_assessment_group_members_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_group_members_user_id ON public.assessment_group_members USING btree (user_id);


--
-- Name: idx_assessment_groups_assessment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_groups_assessment_id ON public.assessment_groups USING btree (assessment_id);


--
-- Name: idx_assessment_groups_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_groups_created_by ON public.assessment_groups USING btree (created_by);


--
-- Name: idx_assessment_groups_locked; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_groups_locked ON public.assessment_groups USING btree (assessment_id, is_locked) WHERE (is_locked = true);


--
-- Name: idx_assessment_submissions_assessment_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_submissions_assessment_group ON public.assessment_submissions USING btree (assessment_group_id) WHERE (assessment_group_id IS NOT NULL);


--
-- Name: idx_assessment_submissions_group_flag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assessment_submissions_group_flag ON public.assessment_submissions USING btree (submitted_for_group) WHERE (submitted_for_group = true);


--
-- Name: idx_assignment_enrollments_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_enrollments_assignment ON public.assignment_enrollments USING btree (assignment_id);


--
-- Name: idx_assignment_enrollments_assignment_user_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_enrollments_assignment_user_lookup ON public.assignment_enrollments USING btree (assignment_id, user_id);


--
-- Name: idx_assignment_enrollments_completion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_enrollments_completion ON public.assignment_enrollments USING btree (completed_at);


--
-- Name: idx_assignment_enrollments_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_enrollments_due_date ON public.assignment_enrollments USING btree (due_date);


--
-- Name: idx_assignment_enrollments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_enrollments_status ON public.assignment_enrollments USING btree (status);


--
-- Name: idx_assignment_enrollments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_enrollments_user ON public.assignment_enrollments USING btree (user_id);


--
-- Name: idx_assignment_group_assignments_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_group_assignments_assignment ON public.assignment_group_assignments USING btree (assignment_id);


--
-- Name: idx_assignment_group_assignments_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_group_assignments_group ON public.assignment_group_assignments USING btree (group_id);


--
-- Name: idx_assignment_group_members_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_group_members_group ON public.assignment_group_members USING btree (group_id);


--
-- Name: idx_assignment_group_members_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_group_members_role ON public.assignment_group_members USING btree (role);


--
-- Name: idx_assignment_group_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_group_members_user ON public.assignment_group_members USING btree (user_id);


--
-- Name: idx_assignment_groups_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_groups_active ON public.assignment_groups USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_assignment_groups_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_groups_classroom ON public.assignment_groups USING btree (classroom_id);


--
-- Name: idx_assignment_nodes_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_nodes_assignment ON public.assignment_nodes USING btree (assignment_id);


--
-- Name: idx_assignment_nodes_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_nodes_node ON public.assignment_nodes USING btree (node_id);


--
-- Name: idx_assignment_nodes_required; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_nodes_required ON public.assignment_nodes USING btree (is_required) WHERE (is_required = true);


--
-- Name: idx_assignment_nodes_sequence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_nodes_sequence ON public.assignment_nodes USING btree (assignment_id, sequence_order);


--
-- Name: idx_classroom_assignments_auto_assign_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_assignments_auto_assign_lookup ON public.classroom_assignments USING btree (classroom_id, auto_assign) WHERE ((auto_assign = true) AND (is_active = true) AND (is_published = true));


--
-- Name: idx_classroom_assignments_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_assignments_classroom ON public.classroom_assignments USING btree (classroom_id);


--
-- Name: idx_classroom_assignments_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_assignments_creator ON public.classroom_assignments USING btree (created_by);


--
-- Name: idx_classroom_assignments_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_assignments_due_date ON public.classroom_assignments USING btree (default_due_date);


--
-- Name: idx_classroom_assignments_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_assignments_published ON public.classroom_assignments USING btree (is_published) WHERE (is_published = true);


--
-- Name: idx_classroom_assignments_source_map; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_assignments_source_map ON public.classroom_assignments USING btree (source_map_id);


--
-- Name: idx_classroom_maps_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_maps_active ON public.classroom_maps USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_classroom_maps_added_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_maps_added_by ON public.classroom_maps USING btree (added_by);


--
-- Name: idx_classroom_maps_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_maps_classroom ON public.classroom_maps USING btree (classroom_id);


--
-- Name: idx_classroom_maps_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_maps_display_order ON public.classroom_maps USING btree (classroom_id, display_order);


--
-- Name: idx_classroom_maps_map; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_maps_map ON public.classroom_maps USING btree (map_id);


--
-- Name: idx_classroom_memberships_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_memberships_active ON public.classroom_memberships USING btree (last_active_at);


--
-- Name: idx_classroom_memberships_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_memberships_classroom ON public.classroom_memberships USING btree (classroom_id);


--
-- Name: idx_classroom_memberships_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_memberships_role ON public.classroom_memberships USING btree (role);


--
-- Name: idx_classroom_memberships_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_memberships_user ON public.classroom_memberships USING btree (user_id);


--
-- Name: idx_classroom_memberships_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_memberships_user_id ON public.classroom_memberships USING btree (user_id);


--
-- Name: idx_classroom_team_maps_map_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_team_maps_map_id ON public.classroom_team_maps USING btree (map_id);


--
-- Name: idx_classroom_team_maps_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_team_maps_team_id ON public.classroom_team_maps USING btree (team_id);


--
-- Name: idx_classroom_teams_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_teams_active ON public.classroom_teams USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_classroom_teams_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_teams_classroom ON public.classroom_teams USING btree (classroom_id);


--
-- Name: idx_classroom_teams_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_teams_created_by ON public.classroom_teams USING btree (created_by);


--
-- Name: idx_classrooms_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classrooms_active ON public.classrooms USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_classrooms_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classrooms_created_at ON public.classrooms USING btree (created_at);


--
-- Name: idx_classrooms_enable_assignments; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classrooms_enable_assignments ON public.classrooms USING btree (enable_assignments) WHERE (enable_assignments = true);


--
-- Name: idx_classrooms_instructor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classrooms_instructor ON public.classrooms USING btree (instructor_id);


--
-- Name: idx_classrooms_join_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classrooms_join_code ON public.classrooms USING btree (join_code);


--
-- Name: idx_communities_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_communities_slug ON public.communities USING btree (slug);


--
-- Name: idx_community_mentors_community; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_mentors_community ON public.community_mentors USING btree (community_id);


--
-- Name: idx_community_posts_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_posts_author ON public.community_posts USING btree (author_id);


--
-- Name: idx_community_posts_community; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_posts_community ON public.community_posts USING btree (community_id);


--
-- Name: idx_community_projects_community; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_projects_community ON public.community_projects USING btree (community_id);


--
-- Name: idx_journey_projects_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journey_projects_created_at ON public.journey_projects USING btree (created_at DESC);


--
-- Name: idx_journey_projects_linked_north_star_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journey_projects_linked_north_star_id ON public.journey_projects USING btree (linked_north_star_id);


--
-- Name: idx_journey_projects_main_quest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journey_projects_main_quest ON public.journey_projects USING btree (user_id, is_main_quest) WHERE (is_main_quest = true);


--
-- Name: idx_journey_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journey_projects_status ON public.journey_projects USING btree (status);


--
-- Name: idx_journey_projects_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journey_projects_type ON public.journey_projects USING btree (project_type);


--
-- Name: idx_journey_projects_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journey_projects_user ON public.journey_projects USING btree (user_id);


--
-- Name: idx_journey_projects_user_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_journey_projects_user_status ON public.journey_projects USING btree (user_id, status);


--
-- Name: idx_learning_maps_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_learning_maps_composite ON public.learning_maps USING btree (visibility, creator_id, created_at DESC);


--
-- Name: INDEX idx_learning_maps_composite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_learning_maps_composite IS 'Composite index for the most common learning_maps query patterns';


--
-- Name: idx_learning_maps_cover_image_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_learning_maps_cover_image_key ON public.learning_maps USING btree (cover_image_key) WHERE (cover_image_key IS NOT NULL);


--
-- Name: idx_learning_maps_cover_image_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_learning_maps_cover_image_url ON public.learning_maps USING btree (cover_image_url) WHERE (cover_image_url IS NOT NULL);


--
-- Name: idx_learning_maps_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_learning_maps_created_at ON public.learning_maps USING btree (created_at DESC);


--
-- Name: idx_learning_maps_creator_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_learning_maps_creator_created_at ON public.learning_maps USING btree (creator_id, created_at DESC);


--
-- Name: INDEX idx_learning_maps_creator_created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_learning_maps_creator_created_at IS 'Optimizes queries filtering by creator_id and ordering by created_at';


--
-- Name: idx_learning_maps_visibility_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_learning_maps_visibility_created_at ON public.learning_maps USING btree (visibility, created_at DESC);


--
-- Name: INDEX idx_learning_maps_visibility_created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_learning_maps_visibility_created_at IS 'Optimizes queries filtering by visibility and ordering by created_at';


--
-- Name: idx_map_nodes_last_modified_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_map_nodes_last_modified_by ON public.map_nodes USING btree (last_modified_by);


--
-- Name: idx_map_nodes_map_id_difficulty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_map_nodes_map_id_difficulty ON public.map_nodes USING btree (map_id, difficulty);


--
-- Name: INDEX idx_map_nodes_map_id_difficulty; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_map_nodes_map_id_difficulty IS 'Optimizes aggregation queries for node counts and average difficulty';


--
-- Name: idx_map_nodes_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_map_nodes_version ON public.map_nodes USING btree (version);


--
-- Name: idx_milestone_journals_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestone_journals_created_at ON public.milestone_journals USING btree (created_at DESC);


--
-- Name: idx_milestone_journals_milestone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestone_journals_milestone ON public.milestone_journals USING btree (milestone_id);


--
-- Name: idx_milestone_journals_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestone_journals_user ON public.milestone_journals USING btree (user_id);


--
-- Name: idx_milestone_journals_user_milestone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestone_journals_user_milestone ON public.milestone_journals USING btree (user_id, milestone_id);


--
-- Name: idx_milestone_paths_destination; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestone_paths_destination ON public.milestone_paths USING btree (destination_milestone_id);


--
-- Name: idx_milestone_paths_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_milestone_paths_source ON public.milestone_paths USING btree (source_milestone_id);


--
-- Name: idx_node_assessments_group_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_assessments_group_assessment ON public.node_assessments USING btree (is_group_assessment) WHERE (is_group_assessment = true);


--
-- Name: idx_node_assessments_group_submission_mode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_assessments_group_submission_mode ON public.node_assessments USING btree (group_submission_mode) WHERE (is_group_assessment = true);


--
-- Name: idx_node_content_display_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_node_content_display_order ON public.node_content USING btree (node_id, display_order);


--
-- Name: idx_north_stars_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_north_stars_status ON public.north_stars USING btree (status);


--
-- Name: idx_north_stars_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_north_stars_user_id ON public.north_stars USING btree (user_id);


--
-- Name: idx_profiles_id_names; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profiles_id_names ON public.profiles USING btree (id, username, full_name);


--
-- Name: idx_project_milestones_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_milestones_created_at ON public.project_milestones USING btree (created_at DESC);


--
-- Name: idx_project_milestones_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_milestones_order ON public.project_milestones USING btree (project_id, order_index);


--
-- Name: idx_project_milestones_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_milestones_project ON public.project_milestones USING btree (project_id);


--
-- Name: idx_project_milestones_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_milestones_status ON public.project_milestones USING btree (status);


--
-- Name: idx_project_paths_both; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_paths_both ON public.project_paths USING btree (source_project_id, destination_project_id);


--
-- Name: idx_project_paths_destination; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_paths_destination ON public.project_paths USING btree (destination_project_id);


--
-- Name: idx_project_paths_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_paths_source ON public.project_paths USING btree (source_project_id);


--
-- Name: idx_project_reflections_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_reflections_created_at ON public.project_reflections USING btree (created_at DESC);


--
-- Name: idx_project_reflections_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_reflections_project ON public.project_reflections USING btree (project_id);


--
-- Name: idx_project_reflections_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_reflections_type ON public.project_reflections USING btree (reflection_type);


--
-- Name: idx_project_reflections_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_reflections_user ON public.project_reflections USING btree (user_id);


--
-- Name: idx_project_reflections_user_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_reflections_user_project ON public.project_reflections USING btree (user_id, project_id);


--
-- Name: idx_song_of_the_day_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_song_of_the_day_date ON public.song_of_the_day USING btree (date);


--
-- Name: idx_song_of_the_day_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_song_of_the_day_user_date ON public.song_of_the_day USING btree (user_id, date);


--
-- Name: idx_team_meetings_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_meetings_node ON public.team_meetings USING btree (node_id);


--
-- Name: idx_team_meetings_scheduled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_meetings_scheduled ON public.team_meetings USING btree (scheduled_for);


--
-- Name: idx_team_meetings_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_meetings_status ON public.team_meetings USING btree (status);


--
-- Name: idx_team_meetings_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_meetings_team ON public.team_meetings USING btree (team_id);


--
-- Name: idx_team_memberships_leader; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_memberships_leader ON public.team_memberships USING btree (is_leader) WHERE (is_leader = true);


--
-- Name: idx_team_memberships_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_memberships_role ON public.team_memberships USING btree (role);


--
-- Name: idx_team_memberships_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_memberships_team ON public.team_memberships USING btree (team_id);


--
-- Name: idx_team_memberships_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_team_memberships_unique_active ON public.team_memberships USING btree (team_id, user_id) WHERE (left_at IS NULL);


--
-- Name: idx_team_memberships_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_memberships_user ON public.team_memberships USING btree (user_id);


--
-- Name: idx_team_memberships_user_id_left_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_memberships_user_id_left_at ON public.team_memberships USING btree (user_id, left_at);


--
-- Name: idx_team_memberships_user_team_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_memberships_user_team_active ON public.team_memberships USING btree (user_id, team_id, left_at) WHERE (left_at IS NULL);


--
-- Name: idx_team_node_assignments_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_assignments_node ON public.team_node_assignments USING btree (node_id);


--
-- Name: idx_team_node_assignments_team_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_assignments_team_node ON public.team_node_assignments USING btree (team_id, node_id);


--
-- Name: idx_team_node_assignments_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_assignments_user ON public.team_node_assignments USING btree (user_id);


--
-- Name: idx_team_node_progress_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_assigned ON public.team_node_progress USING btree (assigned_to);


--
-- Name: idx_team_node_progress_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_assigned_to ON public.team_node_progress USING btree (assigned_to);


--
-- Name: idx_team_node_progress_help; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_help ON public.team_node_progress USING btree (help_requested);


--
-- Name: idx_team_node_progress_help_requested; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_help_requested ON public.team_node_progress USING btree (help_requested) WHERE (help_requested = true);


--
-- Name: idx_team_node_progress_instructor_comment_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_instructor_comment_at ON public.team_node_progress USING btree (instructor_comment_at) WHERE (instructor_comment_at IS NOT NULL);


--
-- Name: idx_team_node_progress_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_node ON public.team_node_progress USING btree (node_id);


--
-- Name: idx_team_node_progress_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_status ON public.team_node_progress USING btree (status);


--
-- Name: idx_team_node_progress_submitted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_submitted_by ON public.team_node_progress USING btree (submitted_by);


--
-- Name: idx_team_node_progress_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_team ON public.team_node_progress USING btree (team_id);


--
-- Name: idx_team_node_progress_team_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_node_progress_team_node ON public.team_node_progress USING btree (team_id, node_id);


--
-- Name: idx_team_progress_comments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_progress_comments_created_at ON public.team_progress_comments USING btree (created_at);


--
-- Name: idx_team_progress_comments_instructor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_progress_comments_instructor ON public.team_progress_comments USING btree (instructor_id);


--
-- Name: idx_team_progress_comments_node; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_progress_comments_node ON public.team_progress_comments USING btree (node_id);


--
-- Name: idx_team_progress_comments_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_progress_comments_team ON public.team_progress_comments USING btree (team_id);


--
-- Name: idx_university_example_maps_target_audience; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_university_example_maps_target_audience ON public.university_example_maps USING btree (target_audience);


--
-- Name: idx_university_example_maps_university_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_university_example_maps_university_id ON public.university_example_maps USING btree (university_id);


--
-- Name: idx_user_interest_priorities_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_interest_priorities_user_id ON public.user_interest_priorities USING btree (user_id);


--
-- Name: idx_user_map_enrollments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_map_enrollments_status ON public.user_map_enrollments USING btree (status);


--
-- Name: idx_user_map_enrollments_user_map; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_map_enrollments_user_map ON public.user_map_enrollments USING btree (user_id, map_id);


--
-- Name: INDEX idx_user_map_enrollments_user_map; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_user_map_enrollments_user_map IS 'Optimizes user enrollment status lookups';


--
-- Name: idx_user_roles_user_id_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id_role ON public.user_roles USING btree (user_id, role);


--
-- Name: idx_user_roles_user_id_role_grading; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id_role_grading ON public.user_roles USING btree (user_id, role) WHERE (role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]));


--
-- Name: idx_user_university_targets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_university_targets_user_id ON public.user_university_targets USING btree (user_id);


--
-- Name: learning_maps_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX learning_maps_category_idx ON public.learning_maps USING btree (category);


--
-- Name: learning_maps_difficulty_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX learning_maps_difficulty_idx ON public.learning_maps USING btree (difficulty);


--
-- Name: learning_maps_map_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX learning_maps_map_type_idx ON public.learning_maps USING btree (map_type);


--
-- Name: learning_maps_parent_classroom_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX learning_maps_parent_classroom_idx ON public.learning_maps USING btree (parent_classroom_id) WHERE (parent_classroom_id IS NOT NULL);


--
-- Name: learning_maps_visibility_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX learning_maps_visibility_idx ON public.learning_maps USING btree (visibility);


--
-- Name: map_editors_map_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX map_editors_map_id_idx ON public.map_editors USING btree (map_id);


--
-- Name: map_editors_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX map_editors_user_id_idx ON public.map_editors USING btree (user_id);


--
-- Name: mindmap_reflections_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mindmap_reflections_created_at_idx ON public.mindmap_reflections USING btree (created_at DESC);


--
-- Name: mindmap_reflections_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mindmap_reflections_user_id_idx ON public.mindmap_reflections USING btree (user_id);


--
-- Name: mindmap_topics_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mindmap_topics_user_id_idx ON public.mindmap_topics USING btree (user_id);


--
-- Name: profiles_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_email_idx ON public.profiles USING btree (email);


--
-- Name: profiles_tos_accepted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_tos_accepted_at_idx ON public.profiles USING btree (tos_accepted_at) WHERE (tos_accepted_at IS NULL);


--
-- Name: profiles_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX profiles_username_idx ON public.profiles USING btree (username);


--
-- Name: reflections_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reflections_user_id_created_at_idx ON public.reflections USING btree (user_id, created_at);


--
-- Name: submission_grades_graded_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX submission_grades_graded_by_idx ON public.submission_grades USING btree (graded_by);


--
-- Name: submission_grades_submission_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX submission_grades_submission_id_idx ON public.submission_grades USING btree (submission_id);


--
-- Name: direction_finder_results handle_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.direction_finder_results FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


--
-- Name: submission_grades on_new_grade_update_progress; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_new_grade_update_progress AFTER INSERT OR UPDATE ON public.submission_grades FOR EACH ROW EXECUTE FUNCTION public.update_progress_on_grade();


--
-- Name: communities set_communities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_communities_updated_at BEFORE UPDATE ON public.communities FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: community_posts set_community_posts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_community_posts_updated_at BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: post_comments set_post_comments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_post_comments_updated_at BEFORE UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


--
-- Name: song_of_the_day song_of_the_day_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER song_of_the_day_updated_at BEFORE UPDATE ON public.song_of_the_day FOR EACH ROW EXECUTE FUNCTION public.update_song_of_the_day_updated_at();


--
-- Name: student_node_progress sync_assignment_progress_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER sync_assignment_progress_trigger AFTER INSERT OR DELETE OR UPDATE ON public.student_node_progress FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_progress();


--
-- Name: assignment_group_assignments trigger_assign_group_assignment_to_members; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_assign_group_assignment_to_members AFTER INSERT ON public.assignment_group_assignments FOR EACH ROW EXECUTE FUNCTION public.assign_group_assignment_to_members();


--
-- Name: classroom_memberships trigger_auto_enroll_on_join; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_enroll_on_join AFTER INSERT ON public.classroom_memberships FOR EACH ROW EXECUTE FUNCTION public.handle_auto_enroll_new_student();


--
-- Name: TRIGGER trigger_auto_enroll_on_join ON classroom_memberships; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TRIGGER trigger_auto_enroll_on_join ON public.classroom_memberships IS 'When a new student joins a classroom, this trigger executes the auto-enrollment logic.';


--
-- Name: classroom_map_features trigger_classroom_map_features_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_classroom_map_features_updated_at BEFORE UPDATE ON public.classroom_map_features FOR EACH ROW EXECUTE FUNCTION public.update_classroom_map_features_updated_at();


--
-- Name: assignment_group_members trigger_enroll_new_group_member_in_assignments; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_enroll_new_group_member_in_assignments AFTER INSERT ON public.assignment_group_members FOR EACH ROW EXECUTE FUNCTION public.enroll_new_group_member_in_assignments();


--
-- Name: team_memberships trigger_ensure_single_leader_per_team; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_ensure_single_leader_per_team BEFORE INSERT OR UPDATE ON public.team_memberships FOR EACH ROW EXECUTE FUNCTION public.ensure_single_leader_per_team();


--
-- Name: assessment_submissions trigger_handle_group_submission; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_handle_group_submission AFTER INSERT ON public.assessment_submissions FOR EACH ROW EXECUTE FUNCTION public.handle_group_submission();


--
-- Name: learning_maps trigger_update_cover_image_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_cover_image_timestamp BEFORE UPDATE ON public.learning_maps FOR EACH ROW EXECUTE FUNCTION public.update_cover_image_timestamp();


--
-- Name: team_meetings trigger_update_meeting_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_meeting_timestamp BEFORE UPDATE ON public.team_meetings FOR EACH ROW EXECUTE FUNCTION public.update_meeting_timestamp();


--
-- Name: milestone_journals trigger_update_milestone_progress; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_milestone_progress AFTER INSERT ON public.milestone_journals FOR EACH ROW EXECUTE FUNCTION public.update_milestone_progress_from_journal();


--
-- Name: project_milestones trigger_update_project_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_project_status AFTER INSERT OR DELETE OR UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.update_project_status_from_milestones();


--
-- Name: student_node_progress trigger_update_team_progress; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_team_progress AFTER INSERT OR DELETE OR UPDATE ON public.student_node_progress FOR EACH ROW EXECUTE FUNCTION public.update_team_progress_from_individual();


--
-- Name: ai_agents update_ai_agents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_roadmaps update_ai_roadmaps_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ai_roadmaps_updated_at BEFORE UPDATE ON public.ai_roadmaps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assignment_groups update_assignment_groups_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_assignment_groups_updated_at BEFORE UPDATE ON public.assignment_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: branches update_branches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: classroom_assignments update_classroom_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_classroom_assignments_updated_at BEFORE UPDATE ON public.classroom_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: classrooms update_classrooms_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON public.classrooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: connections update_connections_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: emotions update_emotions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_emotions_updated_at BEFORE UPDATE ON public.emotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: impacts update_impacts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_impacts_updated_at BEFORE UPDATE ON public.impacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: influences update_influences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_influences_updated_at BEFORE UPDATE ON public.influences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: insights update_insights_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_insights_updated_at BEFORE UPDATE ON public.insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: journey_projects update_journey_projects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_journey_projects_updated_at BEFORE UPDATE ON public.journey_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_paths update_learning_paths_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON public.learning_paths FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_communities update_member_count; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_member_count AFTER INSERT OR DELETE ON public.user_communities FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();


--
-- Name: classroom_memberships update_membership_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_membership_activity BEFORE UPDATE ON public.classroom_memberships FOR EACH ROW EXECUTE FUNCTION public.update_membership_activity();


--
-- Name: milestones update_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mindmap_reflections update_mindmap_reflections_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mindmap_reflections_updated_at BEFORE UPDATE ON public.mindmap_reflections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mindmap_topics update_mindmap_topics_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mindmap_topics_updated_at BEFORE UPDATE ON public.mindmap_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: north_stars update_north_stars_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_north_stars_updated_at BEFORE UPDATE ON public.north_stars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: passion_trees update_passion_trees_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_passion_trees_updated_at BEFORE UPDATE ON public.passion_trees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: potential_offshoots update_potential_offshoots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_potential_offshoots_updated_at BEFORE UPDATE ON public.potential_offshoots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_milestones update_project_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON public.project_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_outcomes update_project_outcomes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_outcomes_updated_at BEFORE UPDATE ON public.project_outcomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: related_interests update_related_interests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_related_interests_updated_at BEFORE UPDATE ON public.related_interests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: resources update_resources_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roots update_roots_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_roots_updated_at BEFORE UPDATE ON public.roots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: skills update_skills_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: synergies update_synergies_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_synergies_updated_at BEFORE UPDATE ON public.synergies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: universities update_universities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: university_example_maps update_university_example_maps_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_university_example_maps_updated_at BEFORE UPDATE ON public.university_example_maps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_interest_priorities update_user_interest_priorities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_interest_priorities_updated_at BEFORE UPDATE ON public.user_interest_priorities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_university_targets update_user_university_targets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_university_targets_updated_at BEFORE UPDATE ON public.user_university_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_activity_log admin_activity_log_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id);


--
-- Name: admin_activity_log admin_activity_log_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_activity_log
    ADD CONSTRAINT admin_activity_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id);


--
-- Name: ai_agents ai_agents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_agents
    ADD CONSTRAINT ai_agents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ai_roadmaps ai_roadmaps_top_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_roadmaps
    ADD CONSTRAINT ai_roadmaps_top_university_id_fkey FOREIGN KEY (top_university_id) REFERENCES public.universities(id);


--
-- Name: ai_roadmaps ai_roadmaps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_roadmaps
    ADD CONSTRAINT ai_roadmaps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assessment_group_members assessment_group_members_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_group_members
    ADD CONSTRAINT assessment_group_members_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: assessment_group_members assessment_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_group_members
    ADD CONSTRAINT assessment_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.assessment_groups(id) ON DELETE CASCADE;


--
-- Name: assessment_group_members assessment_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_group_members
    ADD CONSTRAINT assessment_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assessment_groups assessment_groups_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_groups
    ADD CONSTRAINT assessment_groups_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_groups assessment_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_groups
    ADD CONSTRAINT assessment_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: assessment_submissions assessment_submissions_assessment_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_assessment_group_id_fkey FOREIGN KEY (assessment_group_id) REFERENCES public.assessment_groups(id) ON DELETE SET NULL;


--
-- Name: assessment_submissions assessment_submissions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT assessment_submissions_assessment_id_fkey ON assessment_submissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT assessment_submissions_assessment_id_fkey ON public.assessment_submissions IS 'Cascade delete submissions when assessment is deleted';


--
-- Name: assessment_submissions assessment_submissions_progress_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_progress_id_fkey FOREIGN KEY (progress_id) REFERENCES public.student_node_progress(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT assessment_submissions_progress_id_fkey ON assessment_submissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT assessment_submissions_progress_id_fkey ON public.assessment_submissions IS 'Cascade delete submissions when progress is deleted';


--
-- Name: assignment_enrollments assignment_enrollments_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_enrollments
    ADD CONSTRAINT assignment_enrollments_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.classroom_assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_enrollments assignment_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_enrollments
    ADD CONSTRAINT assignment_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assignment_group_assignments assignment_group_assignments_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_assignments
    ADD CONSTRAINT assignment_group_assignments_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.classroom_assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_group_assignments assignment_group_assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_assignments
    ADD CONSTRAINT assignment_group_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: assignment_group_assignments assignment_group_assignments_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_assignments
    ADD CONSTRAINT assignment_group_assignments_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.assignment_groups(id) ON DELETE CASCADE;


--
-- Name: assignment_group_members assignment_group_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_members
    ADD CONSTRAINT assignment_group_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.profiles(id);


--
-- Name: assignment_group_members assignment_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_members
    ADD CONSTRAINT assignment_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.assignment_groups(id) ON DELETE CASCADE;


--
-- Name: assignment_group_members assignment_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_group_members
    ADD CONSTRAINT assignment_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: assignment_groups assignment_groups_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_groups
    ADD CONSTRAINT assignment_groups_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: assignment_groups assignment_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_groups
    ADD CONSTRAINT assignment_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: assignment_nodes assignment_nodes_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_nodes
    ADD CONSTRAINT assignment_nodes_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.classroom_assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_nodes assignment_nodes_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_nodes
    ADD CONSTRAINT assignment_nodes_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: branches branches_passion_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_passion_tree_id_fkey FOREIGN KEY (passion_tree_id) REFERENCES public.passion_trees(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: classroom_assignments classroom_assignments_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_assignments
    ADD CONSTRAINT classroom_assignments_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classroom_assignments classroom_assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_assignments
    ADD CONSTRAINT classroom_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: classroom_assignments classroom_assignments_source_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_assignments
    ADD CONSTRAINT classroom_assignments_source_map_id_fkey FOREIGN KEY (source_map_id) REFERENCES public.learning_maps(id) ON DELETE SET NULL;


--
-- Name: classroom_map_features classroom_map_features_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_map_features
    ADD CONSTRAINT classroom_map_features_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: classroom_map_features classroom_map_features_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_map_features
    ADD CONSTRAINT classroom_map_features_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE;


--
-- Name: classroom_maps classroom_maps_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_maps
    ADD CONSTRAINT classroom_maps_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: classroom_maps classroom_maps_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_maps
    ADD CONSTRAINT classroom_maps_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classroom_maps classroom_maps_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_maps
    ADD CONSTRAINT classroom_maps_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE;


--
-- Name: classroom_memberships classroom_memberships_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_memberships
    ADD CONSTRAINT classroom_memberships_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classroom_memberships classroom_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_memberships
    ADD CONSTRAINT classroom_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: classroom_team_maps classroom_team_maps_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_team_maps
    ADD CONSTRAINT classroom_team_maps_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: classroom_team_maps classroom_team_maps_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_team_maps
    ADD CONSTRAINT classroom_team_maps_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE;


--
-- Name: classroom_team_maps classroom_team_maps_original_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_team_maps
    ADD CONSTRAINT classroom_team_maps_original_map_id_fkey FOREIGN KEY (original_map_id) REFERENCES public.learning_maps(id);


--
-- Name: classroom_team_maps classroom_team_maps_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_team_maps
    ADD CONSTRAINT classroom_team_maps_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.classroom_teams(id) ON DELETE CASCADE;


--
-- Name: classroom_teams classroom_teams_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_teams
    ADD CONSTRAINT classroom_teams_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: classroom_teams classroom_teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_teams
    ADD CONSTRAINT classroom_teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: classrooms classrooms_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cohort_map_enrollments cohort_map_enrollments_cohort_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cohort_map_enrollments
    ADD CONSTRAINT cohort_map_enrollments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id);


--
-- Name: cohort_map_enrollments cohort_map_enrollments_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cohort_map_enrollments
    ADD CONSTRAINT cohort_map_enrollments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id);


--
-- Name: community_images community_images_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_images
    ADD CONSTRAINT community_images_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_images community_images_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_images
    ADD CONSTRAINT community_images_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: community_mentors community_mentors_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_mentors
    ADD CONSTRAINT community_mentors_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_mentors community_mentors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_mentors
    ADD CONSTRAINT community_mentors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: community_projects community_projects_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_projects
    ADD CONSTRAINT community_projects_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: community_projects community_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_projects
    ADD CONSTRAINT community_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: connections connections_passion_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_passion_tree_id_fkey FOREIGN KEY (passion_tree_id) REFERENCES public.passion_trees(id) ON DELETE CASCADE;


--
-- Name: direction_finder_results direction_finder_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direction_finder_results
    ADD CONSTRAINT direction_finder_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: emotions emotions_passion_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emotions
    ADD CONSTRAINT emotions_passion_tree_id_fkey FOREIGN KEY (passion_tree_id) REFERENCES public.passion_trees(id) ON DELETE CASCADE;


--
-- Name: engagement engagement_passion_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.engagement
    ADD CONSTRAINT engagement_passion_tree_id_fkey FOREIGN KEY (passion_tree_id) REFERENCES public.passion_trees(id) ON DELETE CASCADE;


--
-- Name: group_memberships group_memberships_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.classroom_groups(id) ON DELETE CASCADE;


--
-- Name: impacts impacts_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.impacts
    ADD CONSTRAINT impacts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON DELETE CASCADE;


--
-- Name: influences influences_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.influences
    ADD CONSTRAINT influences_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON DELETE CASCADE;


--
-- Name: insights insights_passion_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_passion_tree_id_fkey FOREIGN KEY (passion_tree_id) REFERENCES public.passion_trees(id) ON DELETE CASCADE;


--
-- Name: interests interests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.interests
    ADD CONSTRAINT interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: journey_projects journey_projects_linked_north_star_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journey_projects
    ADD CONSTRAINT journey_projects_linked_north_star_id_fkey FOREIGN KEY (linked_north_star_id) REFERENCES public.north_stars(id) ON DELETE SET NULL;


--
-- Name: journey_projects journey_projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journey_projects
    ADD CONSTRAINT journey_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: learning_maps learning_maps_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_maps
    ADD CONSTRAINT learning_maps_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id);


--
-- Name: learning_maps learning_maps_last_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_maps
    ADD CONSTRAINT learning_maps_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES auth.users(id);


--
-- Name: learning_maps learning_maps_parent_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_maps
    ADD CONSTRAINT learning_maps_parent_classroom_id_fkey FOREIGN KEY (parent_classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- Name: learning_paths learning_paths_passion_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learning_paths
    ADD CONSTRAINT learning_paths_passion_tree_id_fkey FOREIGN KEY (passion_tree_id) REFERENCES public.passion_trees(id) ON DELETE CASCADE;


--
-- Name: map_editors map_editors_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_editors
    ADD CONSTRAINT map_editors_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id);


--
-- Name: map_editors map_editors_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_editors
    ADD CONSTRAINT map_editors_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE;


--
-- Name: map_editors map_editors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_editors
    ADD CONSTRAINT map_editors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: map_nodes map_nodes_last_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_nodes
    ADD CONSTRAINT map_nodes_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES auth.users(id);


--
-- Name: map_nodes map_nodes_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map_nodes
    ADD CONSTRAINT map_nodes_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id);


--
-- Name: milestone_journals milestone_journals_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_journals
    ADD CONSTRAINT milestone_journals_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES public.project_milestones(id) ON DELETE CASCADE;


--
-- Name: milestone_journals milestone_journals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_journals
    ADD CONSTRAINT milestone_journals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: milestone_paths milestone_paths_destination_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_paths
    ADD CONSTRAINT milestone_paths_destination_milestone_id_fkey FOREIGN KEY (destination_milestone_id) REFERENCES public.project_milestones(id) ON DELETE CASCADE;


--
-- Name: milestone_paths milestone_paths_source_milestone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestone_paths
    ADD CONSTRAINT milestone_paths_source_milestone_id_fkey FOREIGN KEY (source_milestone_id) REFERENCES public.project_milestones(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_learning_path_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_learning_path_id_fkey FOREIGN KEY (learning_path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;


--
-- Name: mindmap_reflections mindmap_reflections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mindmap_reflections
    ADD CONSTRAINT mindmap_reflections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mindmap_topics mindmap_topics_reflection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mindmap_topics
    ADD CONSTRAINT mindmap_topics_reflection_id_fkey FOREIGN KEY (reflection_id) REFERENCES public.mindmap_reflections(id) ON DELETE CASCADE;


--
-- Name: mindmap_topics mindmap_topics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mindmap_topics
    ADD CONSTRAINT mindmap_topics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: monthly_insights monthly_insights_most_used_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_insights
    ADD CONSTRAINT monthly_insights_most_used_tag_id_fkey FOREIGN KEY (most_used_tag_id) REFERENCES public.tags(id);


--
-- Name: monthly_insights monthly_insights_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_insights
    ADD CONSTRAINT monthly_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: node_assessments node_assessments_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_assessments
    ADD CONSTRAINT node_assessments_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT node_assessments_node_id_fkey ON node_assessments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT node_assessments_node_id_fkey ON public.node_assessments IS 'Cascade delete assessments when node is deleted';


--
-- Name: node_content node_content_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_content
    ADD CONSTRAINT node_content_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT node_content_node_id_fkey ON node_content; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT node_content_node_id_fkey ON public.node_content IS 'Cascade delete content when node is deleted';


--
-- Name: node_leaderboard node_leaderboard_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_leaderboard
    ADD CONSTRAINT node_leaderboard_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: node_leaderboard node_leaderboard_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_leaderboard
    ADD CONSTRAINT node_leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: node_paths node_paths_destination_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_paths
    ADD CONSTRAINT node_paths_destination_node_id_fkey FOREIGN KEY (destination_node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: node_paths node_paths_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_paths
    ADD CONSTRAINT node_paths_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: north_stars north_stars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.north_stars
    ADD CONSTRAINT north_stars_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: passion_trees passion_trees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.passion_trees
    ADD CONSTRAINT passion_trees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.post_comments(id) ON DELETE CASCADE;


--
-- Name: post_comments post_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_comments
    ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: post_likes post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: post_media post_media_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_media
    ADD CONSTRAINT post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: potential_offshoots potential_offshoots_insight_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potential_offshoots
    ADD CONSTRAINT potential_offshoots_insight_id_fkey FOREIGN KEY (insight_id) REFERENCES public.insights(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.community_projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_milestones project_milestones_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_milestones
    ADD CONSTRAINT project_milestones_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.journey_projects(id) ON DELETE CASCADE;


--
-- Name: project_outcomes project_outcomes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_outcomes
    ADD CONSTRAINT project_outcomes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_paths project_paths_destination_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_paths
    ADD CONSTRAINT project_paths_destination_project_id_fkey FOREIGN KEY (destination_project_id) REFERENCES public.journey_projects(id) ON DELETE CASCADE;


--
-- Name: project_paths project_paths_source_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_paths
    ADD CONSTRAINT project_paths_source_project_id_fkey FOREIGN KEY (source_project_id) REFERENCES public.journey_projects(id) ON DELETE CASCADE;


--
-- Name: project_reflections project_reflections_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_reflections
    ADD CONSTRAINT project_reflections_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.journey_projects(id) ON DELETE CASCADE;


--
-- Name: project_reflections project_reflections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_reflections
    ADD CONSTRAINT project_reflections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_tags project_tags_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT project_tags_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_tags project_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_tags
    ADD CONSTRAINT project_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quiz_questions quiz_questions_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT quiz_questions_assessment_id_fkey ON quiz_questions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT quiz_questions_assessment_id_fkey ON public.quiz_questions IS 'Cascade delete quiz questions when assessment is deleted';


--
-- Name: reflection_metrics reflection_metrics_reflection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reflection_metrics
    ADD CONSTRAINT reflection_metrics_reflection_id_fkey FOREIGN KEY (reflection_id) REFERENCES public.reflections(id) ON DELETE CASCADE;


--
-- Name: reflections reflections_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reflections
    ADD CONSTRAINT reflections_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: reflections reflections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reflections
    ADD CONSTRAINT reflections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: related_interests related_interests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.related_interests
    ADD CONSTRAINT related_interests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: resources resources_learning_path_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_learning_path_id_fkey FOREIGN KEY (learning_path_id) REFERENCES public.learning_paths(id) ON DELETE CASCADE;


--
-- Name: roots roots_passion_tree_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roots
    ADD CONSTRAINT roots_passion_tree_id_fkey FOREIGN KEY (passion_tree_id) REFERENCES public.passion_trees(id) ON DELETE CASCADE;


--
-- Name: skills skills_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: song_of_the_day song_of_the_day_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.song_of_the_day
    ADD CONSTRAINT song_of_the_day_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: student_node_progress student_node_progress_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_node_progress
    ADD CONSTRAINT student_node_progress_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT student_node_progress_node_id_fkey ON student_node_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT student_node_progress_node_id_fkey ON public.student_node_progress IS 'Cascade delete progress when node is deleted';


--
-- Name: student_node_progress student_node_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_node_progress
    ADD CONSTRAINT student_node_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: submission_grades submission_grades_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_grades
    ADD CONSTRAINT submission_grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id);


--
-- Name: submission_grades submission_grades_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_grades
    ADD CONSTRAINT submission_grades_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT submission_grades_submission_id_fkey ON submission_grades; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT submission_grades_submission_id_fkey ON public.submission_grades IS 'Cascade delete grades when submission is deleted';


--
-- Name: synergies synergies_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.synergies
    ADD CONSTRAINT synergies_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON DELETE CASCADE;


--
-- Name: tags tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: team_meetings team_meetings_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_meetings
    ADD CONSTRAINT team_meetings_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE SET NULL;


--
-- Name: team_meetings team_meetings_scheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_meetings
    ADD CONSTRAINT team_meetings_scheduled_by_fkey FOREIGN KEY (scheduled_by) REFERENCES auth.users(id);


--
-- Name: team_meetings team_meetings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_meetings
    ADD CONSTRAINT team_meetings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.classroom_teams(id) ON DELETE CASCADE;


--
-- Name: team_memberships team_memberships_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_memberships
    ADD CONSTRAINT team_memberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.classroom_teams(id) ON DELETE CASCADE;


--
-- Name: team_memberships team_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_memberships
    ADD CONSTRAINT team_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_node_assignments team_node_assignments_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_assignments
    ADD CONSTRAINT team_node_assignments_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: team_node_assignments team_node_assignments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_assignments
    ADD CONSTRAINT team_node_assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.classroom_teams(id) ON DELETE CASCADE;


--
-- Name: team_node_assignments team_node_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_assignments
    ADD CONSTRAINT team_node_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_node_progress team_node_progress_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_progress
    ADD CONSTRAINT team_node_progress_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: team_node_progress team_node_progress_meeting_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_progress
    ADD CONSTRAINT team_node_progress_meeting_fkey FOREIGN KEY (scheduled_meeting_id) REFERENCES public.team_meetings(id) ON DELETE SET NULL;


--
-- Name: team_node_progress team_node_progress_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_progress
    ADD CONSTRAINT team_node_progress_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: team_node_progress team_node_progress_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_progress
    ADD CONSTRAINT team_node_progress_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id);


--
-- Name: team_node_progress team_node_progress_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_node_progress
    ADD CONSTRAINT team_node_progress_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.classroom_teams(id) ON DELETE CASCADE;


--
-- Name: team_progress_comments team_progress_comments_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_progress_comments
    ADD CONSTRAINT team_progress_comments_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_progress_comments team_progress_comments_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_progress_comments
    ADD CONSTRAINT team_progress_comments_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;


--
-- Name: team_progress_comments team_progress_comments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_progress_comments
    ADD CONSTRAINT team_progress_comments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.classroom_teams(id) ON DELETE CASCADE;


--
-- Name: tools_acquired tools_acquired_root_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tools_acquired
    ADD CONSTRAINT tools_acquired_root_id_fkey FOREIGN KEY (root_id) REFERENCES public.roots(id) ON DELETE CASCADE;


--
-- Name: university_example_maps university_example_maps_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_example_maps
    ADD CONSTRAINT university_example_maps_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: university_example_maps university_example_maps_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_example_maps
    ADD CONSTRAINT university_example_maps_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: user_communities user_communities_community_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_communities
    ADD CONSTRAINT user_communities_community_id_fkey FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;


--
-- Name: user_communities user_communities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_communities
    ADD CONSTRAINT user_communities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_interest_priorities user_interest_priorities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_interest_priorities
    ADD CONSTRAINT user_interest_priorities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_map_enrollments user_map_enrollments_map_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_map_enrollments
    ADD CONSTRAINT user_map_enrollments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE;


--
-- Name: user_map_enrollments user_map_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_map_enrollments
    ADD CONSTRAINT user_map_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_university_targets user_university_targets_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_university_targets
    ADD CONSTRAINT user_university_targets_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: user_university_targets user_university_targets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_university_targets
    ADD CONSTRAINT user_university_targets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_workshops user_workshops_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_workshops
    ADD CONSTRAINT user_workshops_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_workshops user_workshops_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_workshops
    ADD CONSTRAINT user_workshops_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE CASCADE;


--
-- Name: workshop_comments workshop_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_comments
    ADD CONSTRAINT workshop_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workshop_comments workshop_comments_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_comments
    ADD CONSTRAINT workshop_comments_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE CASCADE;


--
-- Name: workshop_suggestions workshop_suggestions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_suggestions
    ADD CONSTRAINT workshop_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workshop_votes workshop_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_votes
    ADD CONSTRAINT workshop_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workshop_votes workshop_votes_workshop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workshop_votes
    ADD CONSTRAINT workshop_votes_workshop_id_fkey FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE CASCADE;


--
-- Name: universities Admins can delete universities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete universities" ON public.universities FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: universities Admins can manage universities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage universities" ON public.universities FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: universities Admins can update universities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update universities" ON public.universities FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: team_node_progress Allow database triggers to insert team progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow database triggers to insert team progress" ON public.team_node_progress FOR INSERT WITH CHECK (true);


--
-- Name: POLICY "Allow database triggers to insert team progress" ON team_node_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Allow database triggers to insert team progress" ON public.team_node_progress IS 'Allows database triggers to create team progress records when auth.uid() is NULL';


--
-- Name: ai_agents Anyone can view active AI agents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view active AI agents" ON public.ai_agents FOR SELECT USING ((is_active = true));


--
-- Name: university_example_maps Anyone can view university example maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view university example maps" ON public.university_example_maps FOR SELECT USING (true);


--
-- Name: communities Authenticated users can create communities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: ai_agents Authenticated users can manage AI agents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can manage AI agents" ON public.ai_agents USING ((auth.uid() IS NOT NULL));


--
-- Name: university_example_maps Authenticated users can manage university example maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can manage university example maps" ON public.university_example_maps USING ((auth.uid() IS NOT NULL));


--
-- Name: classroom_teams Classroom members can create teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Classroom members can create teams" ON public.classroom_teams FOR INSERT WITH CHECK (((created_by = auth.uid()) AND (classroom_id IN ( SELECT classroom_memberships.classroom_id
   FROM public.classroom_memberships
  WHERE (classroom_memberships.user_id = auth.uid())))));


--
-- Name: POLICY "Classroom members can create teams" ON classroom_teams; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Classroom members can create teams" ON public.classroom_teams IS 'Allows any classroom member (students, TAs, instructors) to create teams within their classroom';


--
-- Name: communities Communities are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Communities are viewable by everyone" ON public.communities FOR SELECT USING (true);


--
-- Name: community_posts Community members can create posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Community members can create posts" ON public.community_posts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_communities uc
  WHERE ((uc.community_id = community_posts.community_id) AND (uc.user_id = auth.uid())))));


--
-- Name: community_posts Community posts are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Community posts are viewable by everyone" ON public.community_posts FOR SELECT USING (true);


--
-- Name: assignment_group_assignments Group members can view group assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Group members can view group assignments" ON public.assignment_group_assignments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assignment_group_members agm
  WHERE ((agm.group_id = assignment_group_assignments.group_id) AND (agm.user_id = auth.uid())))));


--
-- Name: assignment_group_members Group members can view group membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Group members can view group membership" ON public.assignment_group_members FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.assignment_group_members agm
  WHERE ((agm.group_id = assignment_group_members.group_id) AND (agm.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.assignment_groups ag
     JOIN public.classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY (ARRAY[('instructor'::character varying)::text, ('ta'::character varying)::text])))))));


--
-- Name: team_node_progress Instructors can add comments to team progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can add comments to team progress" ON public.team_node_progress FOR UPDATE USING (((auth.uid() IS NULL) OR (EXISTS ( SELECT 1
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((cm.classroom_id = ct.classroom_id)))
  WHERE ((ct.id = team_node_progress.team_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])))))));


--
-- Name: team_meetings Instructors can manage all team meetings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can manage all team meetings" ON public.team_meetings USING ((EXISTS ( SELECT 1
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((cm.classroom_id = ct.classroom_id)))
  WHERE ((ct.id = team_meetings.team_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: team_node_progress Instructors can manage all team progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can manage all team progress" ON public.team_node_progress USING (((auth.uid() IS NULL) OR (EXISTS ( SELECT 1
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((cm.classroom_id = ct.classroom_id)))
  WHERE ((ct.id = team_node_progress.team_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])))))));


--
-- Name: assignment_groups Instructors can manage assignment groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can manage assignment groups" ON public.assignment_groups USING ((EXISTS ( SELECT 1
   FROM public.classroom_memberships cm
  WHERE ((cm.classroom_id = assignment_groups.classroom_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: team_node_assignments Instructors can manage assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can manage assignments" ON public.team_node_assignments USING ((team_id IN ( SELECT ct.id
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((ct.classroom_id = cm.classroom_id)))
  WHERE ((cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: assignment_group_assignments Instructors can manage group assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can manage group assignments" ON public.assignment_group_assignments USING ((EXISTS ( SELECT 1
   FROM (public.classroom_assignments ca
     JOIN public.classroom_memberships cm ON ((ca.classroom_id = cm.classroom_id)))
  WHERE ((ca.id = assignment_group_assignments.assignment_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: assignment_group_members Instructors can manage group membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can manage group membership" ON public.assignment_group_members USING ((EXISTS ( SELECT 1
   FROM (public.assignment_groups ag
     JOIN public.classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY (ARRAY[('instructor'::character varying)::text, ('ta'::character varying)::text]))))));


--
-- Name: classroom_teams Instructors can manage their classroom teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can manage their classroom teams" ON public.classroom_teams TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE ((classrooms.id = classroom_teams.classroom_id) AND (classrooms.instructor_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE ((classrooms.id = classroom_teams.classroom_id) AND (classrooms.instructor_id = auth.uid())))));


--
-- Name: team_node_progress Instructors can view all team progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can view all team progress" ON public.team_node_progress FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((cm.classroom_id = ct.classroom_id)))
  WHERE ((ct.id = team_node_progress.team_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: team_progress_comments Instructors can view and manage all team progress comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can view and manage all team progress comments" ON public.team_progress_comments USING ((EXISTS ( SELECT 1
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((cm.classroom_id = ct.classroom_id)))
  WHERE ((ct.id = team_progress_comments.team_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: profiles Instructors can view student profiles in their classrooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Instructors can view student profiles in their classrooms" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM (public.classroom_memberships instructor_membership
     JOIN public.classroom_memberships student_membership ON ((instructor_membership.classroom_id = student_membership.classroom_id)))
  WHERE ((instructor_membership.user_id = auth.uid()) AND ((instructor_membership.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])) AND (student_membership.user_id = profiles.id) AND ((student_membership.role)::text = 'student'::text))))));


--
-- Name: profiles Service role can insert profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert profiles" ON public.profiles FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: assignment_group_members Students can join assignment groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Students can join assignment groups" ON public.assignment_group_members FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.assignment_groups ag
     JOIN public.classroom_memberships cm ON ((ag.classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assignment_group_members.group_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = 'student'::text) AND (ag.is_active = true) AND ((ag.max_members IS NULL) OR (( SELECT count(*) AS count
           FROM public.assignment_group_members assignment_group_members_1
          WHERE (assignment_group_members_1.group_id = ag.id)) < ag.max_members)))))));


--
-- Name: assignment_groups Students can view assignment groups; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Students can view assignment groups" ON public.assignment_groups FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.classroom_memberships cm
  WHERE ((cm.classroom_id = assignment_groups.classroom_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = 'student'::text))))));


--
-- Name: profiles System can insert profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT TO postgres WITH CHECK (true);


--
-- Name: team_node_assignments Team leaders can manage assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team leaders can manage assignments" ON public.team_node_assignments USING ((team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.is_leader = true) AND (team_memberships.left_at IS NULL)))));


--
-- Name: team_meetings Team leaders can manage their team's meetings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team leaders can manage their team's meetings" ON public.team_meetings USING ((team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.is_leader = true) AND (team_memberships.left_at IS NULL)))));


--
-- Name: team_node_progress Team leaders can update assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team leaders can update assignments" ON public.team_node_progress FOR UPDATE USING (((auth.uid() IS NULL) OR (team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.is_leader = true) AND (team_memberships.left_at IS NULL))))));


--
-- Name: team_node_progress Team members can create progress records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can create progress records" ON public.team_node_progress FOR INSERT WITH CHECK ((team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.left_at IS NULL)))));


--
-- Name: POLICY "Team members can create progress records" ON team_node_progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Team members can create progress records" ON public.team_node_progress IS 'Allows team members to create progress records for their team';


--
-- Name: team_node_progress Team members can update help requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can update help requests" ON public.team_node_progress FOR UPDATE USING (((auth.uid() IS NULL) OR (team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.left_at IS NULL))))));


--
-- Name: team_node_assignments Team members can view assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view assignments" ON public.team_node_assignments FOR SELECT USING ((team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.left_at IS NULL)))));


--
-- Name: team_progress_comments Team members can view comments on their team progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view comments on their team progress" ON public.team_progress_comments FOR SELECT USING ((team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.left_at IS NULL)))));


--
-- Name: team_meetings Team members can view their team's meetings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view their team's meetings" ON public.team_meetings FOR SELECT USING ((team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.left_at IS NULL)))));


--
-- Name: team_node_progress Team members can view their team's progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Team members can view their team's progress" ON public.team_node_progress FOR SELECT USING ((team_id IN ( SELECT team_memberships.team_id
   FROM public.team_memberships
  WHERE ((team_memberships.user_id = auth.uid()) AND (team_memberships.left_at IS NULL)))));


--
-- Name: universities Universities are viewable by authenticated users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Universities are viewable by authenticated users" ON public.universities FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: learning_maps Users can create and manage their own maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create and manage their own maps" ON public.learning_maps TO authenticated USING ((creator_id = auth.uid())) WITH CHECK ((creator_id = auth.uid()));


--
-- Name: project_paths Users can create paths in their projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create paths in their projects" ON public.project_paths FOR INSERT WITH CHECK (((source_project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid()))) AND (destination_project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid())))));


--
-- Name: user_map_enrollments Users can create their own map enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own map enrollments" ON public.user_map_enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: north_stars Users can create their own north stars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own north stars" ON public.north_stars FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: passion_trees Users can create their own passion trees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create their own passion trees" ON public.passion_trees FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: interests Users can delete their own interests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own interests" ON public.interests FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: north_stars Users can delete their own north stars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own north stars" ON public.north_stars FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: passion_trees Users can delete their own passion trees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own passion trees" ON public.passion_trees FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: projects Users can delete their own projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: song_of_the_day Users can delete their own songs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own songs" ON public.song_of_the_day FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: project_paths Users can delete their project paths; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their project paths" ON public.project_paths FOR DELETE USING ((source_project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid()))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: projects Users can insert their own projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: reflections Users can insert their own reflections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own reflections" ON public.reflections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: direction_finder_results Users can insert their own results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own results" ON public.direction_finder_results FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: song_of_the_day Users can insert their own songs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own songs" ON public.song_of_the_day FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: project_milestones Users can manage milestones in their projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage milestones in their projects" ON public.project_milestones USING ((project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid())))) WITH CHECK ((project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid()))));


--
-- Name: map_nodes Users can manage nodes of their own maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage nodes of their own maps" ON public.map_nodes TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_nodes.map_id) AND (learning_maps.creator_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_nodes.map_id) AND (learning_maps.creator_id = auth.uid())))));


--
-- Name: milestone_paths Users can manage paths in their projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage paths in their projects" ON public.milestone_paths USING ((source_milestone_id IN ( SELECT pm.id
   FROM (public.project_milestones pm
     JOIN public.journey_projects jp ON ((jp.id = pm.project_id)))
  WHERE (jp.user_id = auth.uid())))) WITH CHECK (((source_milestone_id IN ( SELECT pm.id
   FROM (public.project_milestones pm
     JOIN public.journey_projects jp ON ((jp.id = pm.project_id)))
  WHERE (jp.user_id = auth.uid()))) AND (destination_milestone_id IN ( SELECT pm.id
   FROM (public.project_milestones pm
     JOIN public.journey_projects jp ON ((jp.id = pm.project_id)))
  WHERE (jp.user_id = auth.uid())))));


--
-- Name: project_tags Users can manage tags for their own projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage tags for their own projects" ON public.project_tags USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = project_tags.project_id) AND (projects.user_id = auth.uid())))));


--
-- Name: classrooms Users can manage their own classrooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own classrooms" ON public.classrooms TO authenticated USING ((instructor_id = auth.uid())) WITH CHECK ((instructor_id = auth.uid()));


--
-- Name: user_interest_priorities Users can manage their own interest priorities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own interest priorities" ON public.user_interest_priorities USING ((auth.uid() = user_id));


--
-- Name: journey_projects Users can manage their own journey projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own journey projects" ON public.journey_projects USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_map_enrollments Users can manage their own map enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own map enrollments" ON public.user_map_enrollments TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: milestone_journals Users can manage their own milestone journals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own milestone journals" ON public.milestone_journals USING ((user_id = auth.uid())) WITH CHECK (((user_id = auth.uid()) AND (milestone_id IN ( SELECT pm.id
   FROM (public.project_milestones pm
     JOIN public.journey_projects jp ON ((jp.id = pm.project_id)))
  WHERE (jp.user_id = auth.uid())))));


--
-- Name: mindmap_reflections Users can manage their own mindmap reflections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own mindmap reflections" ON public.mindmap_reflections USING ((auth.uid() = user_id));


--
-- Name: mindmap_topics Users can manage their own mindmap topics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own mindmap topics" ON public.mindmap_topics USING ((auth.uid() = user_id));


--
-- Name: profiles Users can manage their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own profile" ON public.profiles TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: project_reflections Users can manage their own project reflections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own project reflections" ON public.project_reflections USING ((user_id = auth.uid())) WITH CHECK (((user_id = auth.uid()) AND (project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid())))));


--
-- Name: project_tags Users can manage their own project tags; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own project tags" ON public.project_tags TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = project_tags.project_id) AND (projects.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = project_tags.project_id) AND (projects.user_id = auth.uid())))));


--
-- Name: projects Users can manage their own projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own projects" ON public.projects TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: reflection_metrics Users can manage their own reflection metrics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own reflection metrics" ON public.reflection_metrics TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.reflections
  WHERE ((reflections.id = reflection_metrics.reflection_id) AND (reflections.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.reflections
  WHERE ((reflections.id = reflection_metrics.reflection_id) AND (reflections.user_id = auth.uid())))));


--
-- Name: reflections Users can manage their own reflections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own reflections" ON public.reflections TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_roadmaps Users can manage their own roadmaps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own roadmaps" ON public.ai_roadmaps USING ((auth.uid() = user_id));


--
-- Name: tags Users can manage their own tags; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own tags" ON public.tags TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: team_memberships Users can manage their own team memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own team memberships" ON public.team_memberships TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_university_targets Users can manage their own university targets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own university targets" ON public.user_university_targets USING ((auth.uid() = user_id));


--
-- Name: user_workshops Users can manage their own workshop enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own workshop enrollments" ON public.user_workshops TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can read their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can read their own roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: interests Users can update their own interests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own interests" ON public.interests FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_map_enrollments Users can update their own map enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own map enrollments" ON public.user_map_enrollments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: north_stars Users can update their own north stars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own north stars" ON public.north_stars FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: passion_trees Users can update their own passion trees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own passion trees" ON public.passion_trees FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: projects Users can update their own projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: direction_finder_results Users can update their own results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own results" ON public.direction_finder_results FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: song_of_the_day Users can update their own songs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own songs" ON public.song_of_the_day FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: project_paths Users can update their project paths; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their project paths" ON public.project_paths FOR UPDATE USING ((source_project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid())))) WITH CHECK (((source_project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid()))) AND (destination_project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid())))));


--
-- Name: classrooms Users can view accessible classrooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view accessible classrooms" ON public.classrooms FOR SELECT TO authenticated USING (((instructor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.classroom_memberships
  WHERE ((classroom_memberships.classroom_id = classrooms.id) AND (classroom_memberships.user_id = auth.uid()))))));


--
-- Name: node_assessments Users can view assessments for accessible nodes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view assessments for accessible nodes" ON public.node_assessments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_assessments.node_id) AND ((learning_maps.visibility = 'public'::text) OR (learning_maps.creator_id = auth.uid()))))));


--
-- Name: classroom_teams Users can view classroom teams; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view classroom teams" ON public.classroom_teams FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE ((classrooms.id = classroom_teams.classroom_id) AND (classrooms.instructor_id = auth.uid())))));


--
-- Name: community_projects Users can view community projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view community projects" ON public.community_projects FOR SELECT TO authenticated USING (true);


--
-- Name: node_content Users can view content for accessible nodes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view content for accessible nodes" ON public.node_content FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_content.node_id) AND ((learning_maps.visibility = 'public'::text) OR (learning_maps.creator_id = auth.uid()))))));


--
-- Name: map_nodes Users can view nodes of accessible maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view nodes of accessible maps" ON public.map_nodes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_nodes.map_id) AND ((learning_maps.visibility = 'public'::text) OR (learning_maps.creator_id = auth.uid()))))));


--
-- Name: learning_maps Users can view public maps and their own maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view public maps and their own maps" ON public.learning_maps FOR SELECT TO authenticated USING (((visibility = 'public'::text) OR (creator_id = auth.uid())));


--
-- Name: user_communities Users can view their own community memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own community memberships" ON public.user_communities FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_map_enrollments Users can view their own map enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own map enrollments" ON public.user_map_enrollments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: monthly_insights Users can view their own monthly insights; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own monthly insights" ON public.monthly_insights FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: north_stars Users can view their own north stars; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own north stars" ON public.north_stars FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: passion_trees Users can view their own passion trees; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own passion trees" ON public.passion_trees FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: projects Users can view their own projects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reflections Users can view their own reflections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own reflections" ON public.reflections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: direction_finder_results Users can view their own results; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own results" ON public.direction_finder_results FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: song_of_the_day Users can view their own songs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own songs" ON public.song_of_the_day FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: team_memberships Users can view their own team memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own team memberships" ON public.team_memberships FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: project_paths Users can view their project paths; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their project paths" ON public.project_paths FOR SELECT USING ((source_project_id IN ( SELECT journey_projects.id
   FROM public.journey_projects
  WHERE (journey_projects.user_id = auth.uid()))));


--
-- Name: workshops Users can view workshops; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view workshops" ON public.workshops FOR SELECT TO authenticated USING (true);


--
-- Name: admin_activity_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_activity_log admins_insert_activity_logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admins_insert_activity_logs ON public.admin_activity_log FOR INSERT WITH CHECK ((public.is_admin(auth.uid()) AND (admin_user_id = auth.uid())));


--
-- Name: admin_activity_log admins_view_activity_logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admins_view_activity_logs ON public.admin_activity_log FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: ai_agents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_roadmaps; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_roadmaps ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_submissions anon_users_can_create_submissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_users_can_create_submissions ON public.assessment_submissions FOR INSERT TO anon WITH CHECK (true);


--
-- Name: student_node_progress anon_users_can_manage_progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_users_can_manage_progress ON public.student_node_progress TO anon USING (true) WITH CHECK (true);


--
-- Name: node_assessments anon_users_can_read_assessments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_users_can_read_assessments ON public.node_assessments FOR SELECT TO anon USING (true);


--
-- Name: classroom_maps anon_users_can_view_classroom_maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_users_can_view_classroom_maps ON public.classroom_maps FOR SELECT TO anon USING (true);


--
-- Name: submission_grades anon_users_can_view_grades; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_users_can_view_grades ON public.submission_grades FOR SELECT TO anon USING (true);


--
-- Name: assessment_submissions anon_users_can_view_submissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY anon_users_can_view_submissions ON public.assessment_submissions FOR SELECT TO anon USING (true);


--
-- Name: assessment_group_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessment_group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_group_members assessment_group_members_classroom_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_group_members_classroom_access ON public.assessment_group_members USING ((EXISTS ( SELECT 1
   FROM ((((public.assessment_groups ag
     JOIN public.node_assessments na ON ((ag.assessment_id = na.id)))
     JOIN public.map_nodes mn ON ((na.node_id = mn.id)))
     JOIN public.learning_maps lm ON ((mn.map_id = lm.id)))
     JOIN public.classroom_memberships cm ON ((lm.parent_classroom_id = cm.classroom_id)))
  WHERE ((ag.id = assessment_group_members.group_id) AND (cm.user_id = auth.uid()) AND (lm.map_type = 'classroom_exclusive'::public.map_type)))));


--
-- Name: assessment_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assessment_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_groups assessment_groups_classroom_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY assessment_groups_classroom_access ON public.assessment_groups USING ((EXISTS ( SELECT 1
   FROM (((public.node_assessments na
     JOIN public.map_nodes mn ON ((na.node_id = mn.id)))
     JOIN public.learning_maps lm ON ((mn.map_id = lm.id)))
     JOIN public.classroom_memberships cm ON ((lm.parent_classroom_id = cm.classroom_id)))
  WHERE ((na.id = assessment_groups.assessment_id) AND (cm.user_id = auth.uid()) AND (lm.map_type = 'classroom_exclusive'::public.map_type)))));


--
-- Name: assignment_nodes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.assignment_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_submissions authenticated_users_can_create_submissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_users_can_create_submissions ON public.assessment_submissions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: student_node_progress authenticated_users_can_update_progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_users_can_update_progress ON public.student_node_progress FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: assessment_submissions authenticated_users_can_update_submissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_users_can_update_submissions ON public.assessment_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: classroom_maps authenticated_users_can_view_classroom_maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_users_can_view_classroom_maps ON public.classroom_maps FOR SELECT TO authenticated USING (true);


--
-- Name: student_node_progress authenticated_users_can_view_progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_users_can_view_progress ON public.student_node_progress FOR SELECT TO authenticated USING (true);


--
-- Name: assessment_submissions authenticated_users_can_view_submissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_users_can_view_submissions ON public.assessment_submissions FOR SELECT TO authenticated USING (true);


--
-- Name: submission_grades authenticated_users_full_access_grades; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_users_full_access_grades ON public.submission_grades TO authenticated USING (true) WITH CHECK (true);


--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: interests can create; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "can create" ON public.interests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: classroom_map_features; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classroom_map_features ENABLE ROW LEVEL SECURITY;

--
-- Name: classroom_memberships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: communities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

--
-- Name: community_images; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_images ENABLE ROW LEVEL SECURITY;

--
-- Name: community_mentors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_mentors ENABLE ROW LEVEL SECURITY;

--
-- Name: community_posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: community_projects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: connections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_maps create_maps_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY create_maps_policy ON public.learning_maps FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (creator_id = auth.uid())));


--
-- Name: node_assessments creators_and_editors_can_delete_assessments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_delete_assessments ON public.node_assessments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_assessments.node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: node_content creators_and_editors_can_delete_content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_delete_content ON public.node_content FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_content.node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: node_paths creators_and_editors_can_delete_paths; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_delete_paths ON public.node_paths FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_paths.source_node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: quiz_questions creators_and_editors_can_delete_quiz_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_delete_quiz_questions ON public.quiz_questions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ((public.node_assessments
     JOIN public.map_nodes ON ((map_nodes.id = node_assessments.node_id)))
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((node_assessments.id = quiz_questions.assessment_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: node_assessments creators_and_editors_can_insert_assessments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_insert_assessments ON public.node_assessments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_assessments.node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: node_content creators_and_editors_can_insert_content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_insert_content ON public.node_content FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_content.node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: node_paths creators_and_editors_can_insert_paths; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_insert_paths ON public.node_paths FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_paths.source_node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: quiz_questions creators_and_editors_can_insert_quiz_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_insert_quiz_questions ON public.quiz_questions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.node_assessments
     JOIN public.map_nodes ON ((map_nodes.id = node_assessments.node_id)))
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((node_assessments.id = quiz_questions.assessment_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: node_assessments creators_and_editors_can_update_assessments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_update_assessments ON public.node_assessments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_assessments.node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: node_content creators_and_editors_can_update_content; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_update_content ON public.node_content FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((map_nodes.id = node_content.node_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: quiz_questions creators_and_editors_can_update_quiz_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_and_editors_can_update_quiz_questions ON public.quiz_questions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ((public.node_assessments
     JOIN public.map_nodes ON ((map_nodes.id = node_assessments.node_id)))
     JOIN public.learning_maps ON ((learning_maps.id = map_nodes.map_id)))
  WHERE ((node_assessments.id = quiz_questions.assessment_id) AND ((learning_maps.creator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.map_editors
          WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text)))))))));


--
-- Name: assignment_nodes creators_manage_assignment_nodes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_manage_assignment_nodes ON public.assignment_nodes USING ((assignment_id IN ( SELECT classroom_assignments.id
   FROM public.classroom_assignments
  WHERE (classroom_assignments.created_by = auth.uid())))) WITH CHECK ((assignment_id IN ( SELECT classroom_assignments.id
   FROM public.classroom_assignments
  WHERE (classroom_assignments.created_by = auth.uid()))));


--
-- Name: classroom_assignments creators_manage_assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_manage_assignments ON public.classroom_assignments USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: assignment_enrollments creators_manage_enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY creators_manage_enrollments ON public.assignment_enrollments USING (((assignment_id IN ( SELECT classroom_assignments.id
   FROM public.classroom_assignments
  WHERE (classroom_assignments.created_by = auth.uid()))) OR (user_id = auth.uid()))) WITH CHECK (((assignment_id IN ( SELECT classroom_assignments.id
   FROM public.classroom_assignments
  WHERE (classroom_assignments.created_by = auth.uid()))) OR (user_id = auth.uid())));


--
-- Name: learning_maps delete_maps_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY delete_maps_policy ON public.learning_maps FOR DELETE USING (((creator_id = auth.uid()) OR ((map_type = 'classroom_exclusive'::public.map_type) AND (parent_classroom_id IN ( SELECT classroom_memberships.classroom_id
   FROM public.classroom_memberships
  WHERE ((classroom_memberships.user_id = auth.uid()) AND ((classroom_memberships.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))))));


--
-- Name: classroom_teams delete_teams_in_classroom; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY delete_teams_in_classroom ON public.classroom_teams FOR DELETE USING (((created_by = auth.uid()) OR (classroom_id IN ( SELECT cm.classroom_id
   FROM public.classroom_memberships cm
  WHERE ((cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])))))));


--
-- Name: POLICY delete_teams_in_classroom ON classroom_teams; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY delete_teams_in_classroom ON public.classroom_teams IS 'Allow team creators and classroom instructors to delete teams';


--
-- Name: direction_finder_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.direction_finder_results ENABLE ROW LEVEL SECURITY;

--
-- Name: emotions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.emotions ENABLE ROW LEVEL SECURITY;

--
-- Name: engagement; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.engagement ENABLE ROW LEVEL SECURITY;

--
-- Name: impacts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.impacts ENABLE ROW LEVEL SECURITY;

--
-- Name: influences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.influences ENABLE ROW LEVEL SECURITY;

--
-- Name: insights; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

--
-- Name: submission_grades instructors_and_admins_create_grades; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_and_admins_create_grades ON public.submission_grades FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));


--
-- Name: submission_grades instructors_and_admins_update_grades; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_and_admins_update_grades ON public.submission_grades FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));


--
-- Name: submission_grades instructors_and_admins_view_grades; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_and_admins_view_grades ON public.submission_grades FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));


--
-- Name: student_node_progress instructors_and_admins_view_progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_and_admins_view_progress ON public.student_node_progress FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));


--
-- Name: assessment_submissions instructors_and_admins_view_submissions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_and_admins_view_submissions ON public.assessment_submissions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text]))))));


--
-- Name: submission_grades instructors_can_manage_grades; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_can_manage_grades ON public.submission_grades USING ((EXISTS ( SELECT 1
   FROM ((((public.assessment_submissions asub
     JOIN public.student_node_progress snp ON ((asub.progress_id = snp.id)))
     JOIN public.map_nodes mn ON ((snp.node_id = mn.id)))
     JOIN public.classroom_maps cmap ON ((mn.map_id = cmap.map_id)))
     JOIN public.classroom_memberships cm ON ((cmap.classroom_id = cm.classroom_id)))
  WHERE ((asub.id = submission_grades.submission_id) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: classroom_maps instructors_manage_classroom_maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_manage_classroom_maps ON public.classroom_maps USING ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE ((classrooms.id = classroom_maps.classroom_id) AND (classrooms.instructor_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE ((classrooms.id = classroom_maps.classroom_id) AND (classrooms.instructor_id = auth.uid())))));


--
-- Name: classroom_memberships instructors_manage_memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_manage_memberships ON public.classroom_memberships TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE ((classrooms.id = classroom_memberships.classroom_id) AND (classrooms.instructor_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.classrooms
  WHERE ((classrooms.id = classroom_memberships.classroom_id) AND (classrooms.instructor_id = auth.uid())))));


--
-- Name: classrooms instructors_manage_own_classrooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_manage_own_classrooms ON public.classrooms USING ((instructor_id = auth.uid())) WITH CHECK ((instructor_id = auth.uid()));


--
-- Name: team_memberships instructors_manage_team_memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY instructors_manage_team_memberships ON public.team_memberships USING ((team_id IN ( SELECT ct.id
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((ct.classroom_id = cm.classroom_id)))
  WHERE ((cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: POLICY instructors_manage_team_memberships ON team_memberships; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY instructors_manage_team_memberships ON public.team_memberships IS 'Allow instructors/TAs to manage all team memberships in their classrooms';


--
-- Name: classroom_memberships join_as_student; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY join_as_student ON public.classroom_memberships FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND ((role)::text = 'student'::text)));


--
-- Name: team_memberships join_teams_in_classroom; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY join_teams_in_classroom ON public.team_memberships FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (team_id IN ( SELECT ct.id
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((ct.classroom_id = cm.classroom_id)))
  WHERE (cm.user_id = auth.uid())))));


--
-- Name: POLICY join_teams_in_classroom ON team_memberships; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY join_teams_in_classroom ON public.team_memberships IS 'Allow users to join teams in their classrooms';


--
-- Name: journey_projects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.journey_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_maps learning_maps_delete_creator_or_instructor; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY learning_maps_delete_creator_or_instructor ON public.learning_maps FOR DELETE USING (((creator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: learning_maps learning_maps_delete_secure; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY learning_maps_delete_secure ON public.learning_maps FOR DELETE USING (((creator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM (public.classroom_maps cm
     JOIN public.classroom_memberships cmem ON ((cm.classroom_id = cmem.classroom_id)))
  WHERE ((cm.map_id = learning_maps.id) AND (cmem.user_id = auth.uid()) AND ((cmem.role)::text = 'instructor'::text))))));


--
-- Name: learning_maps learning_maps_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY learning_maps_insert_authenticated ON public.learning_maps FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: learning_maps learning_maps_select_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY learning_maps_select_public ON public.learning_maps FOR SELECT USING (true);


--
-- Name: learning_maps learning_maps_update_creator_editor_or_instructor; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY learning_maps_update_creator_editor_or_instructor ON public.learning_maps FOR UPDATE USING (((creator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.map_editors
  WHERE ((map_editors.map_id = learning_maps.id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: learning_maps learning_maps_update_secure; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY learning_maps_update_secure ON public.learning_maps FOR UPDATE USING (((creator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM (public.classroom_maps cm
     JOIN public.classroom_memberships cmem ON ((cm.classroom_id = cmem.classroom_id)))
  WHERE ((cm.map_id = learning_maps.id) AND (cmem.user_id = auth.uid()) AND ((cmem.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])))))));


--
-- Name: learning_paths; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

--
-- Name: classroom_memberships leave_own_memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY leave_own_memberships ON public.classroom_memberships FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: team_memberships leave_own_team; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY leave_own_team ON public.team_memberships FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: POLICY leave_own_team ON team_memberships; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY leave_own_team ON public.team_memberships IS 'Allow users to leave teams by deleting their membership';


--
-- Name: classroom_map_features manage_classroom_map_features; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manage_classroom_map_features ON public.classroom_map_features USING ((EXISTS ( SELECT 1
   FROM (public.learning_maps lm
     JOIN public.classroom_memberships cm ON ((lm.parent_classroom_id = cm.classroom_id)))
  WHERE ((lm.id = classroom_map_features.map_id) AND (lm.map_type = 'classroom_exclusive'::public.map_type) AND (cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))));


--
-- Name: map_editors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.map_editors ENABLE ROW LEVEL SECURITY;

--
-- Name: map_editors map_editors_delete_if_creator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY map_editors_delete_if_creator ON public.map_editors FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_editors.map_id) AND (learning_maps.creator_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: map_editors map_editors_insert_if_creator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY map_editors_insert_if_creator ON public.map_editors FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_editors.map_id) AND (learning_maps.creator_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: map_editors map_editors_select_if_owner_or_editor; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY map_editors_select_if_owner_or_editor ON public.map_editors FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_editors.map_id) AND (learning_maps.creator_id = auth.uid())))) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: map_nodes map_nodes_delete_creator_editor_or_instructor; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY map_nodes_delete_creator_editor_or_instructor ON public.map_nodes FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_nodes.map_id) AND (learning_maps.creator_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.map_editors
     JOIN public.learning_maps ON ((map_editors.map_id = learning_maps.id)))
  WHERE ((learning_maps.id = map_nodes.map_id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: map_nodes map_nodes_insert_creator_editor_or_instructor; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY map_nodes_insert_creator_editor_or_instructor ON public.map_nodes FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_nodes.map_id) AND (learning_maps.creator_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.map_editors
     JOIN public.learning_maps ON ((map_editors.map_id = learning_maps.id)))
  WHERE ((learning_maps.id = map_nodes.map_id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: map_nodes map_nodes_update_creator_editor_or_instructor; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY map_nodes_update_creator_editor_or_instructor ON public.map_nodes FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.learning_maps
  WHERE ((learning_maps.id = map_nodes.map_id) AND (learning_maps.creator_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.map_editors
     JOIN public.learning_maps ON ((map_editors.map_id = learning_maps.id)))
  WHERE ((learning_maps.id = map_nodes.map_id) AND (map_editors.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'instructor'::text))))));


--
-- Name: student_node_progress members_can_view_progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY members_can_view_progress ON public.student_node_progress FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.map_nodes mn
     JOIN public.classroom_maps cm ON ((mn.map_id = cm.map_id)))
  WHERE ((mn.id = student_node_progress.node_id) AND (cm.classroom_id IN ( SELECT classroom_memberships.classroom_id
           FROM public.classroom_memberships
          WHERE (classroom_memberships.user_id = auth.uid())))))));


--
-- Name: milestone_journals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.milestone_journals ENABLE ROW LEVEL SECURITY;

--
-- Name: milestone_paths; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.milestone_paths ENABLE ROW LEVEL SECURITY;

--
-- Name: milestones; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: mindmap_reflections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mindmap_reflections ENABLE ROW LEVEL SECURITY;

--
-- Name: mindmap_topics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mindmap_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_insights; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.monthly_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: north_stars; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.north_stars ENABLE ROW LEVEL SECURITY;

--
-- Name: passion_trees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.passion_trees ENABLE ROW LEVEL SECURITY;

--
-- Name: post_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: post_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: post_media; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

--
-- Name: potential_offshoots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.potential_offshoots ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_policy ON public.profiles TO authenticated, service_role USING (((auth.uid() = id) OR (auth.role() = 'service_role'::text) OR true)) WITH CHECK (((auth.uid() = id) OR (auth.role() = 'service_role'::text)));


--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_milestones; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: project_outcomes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_outcomes ENABLE ROW LEVEL SECURITY;

--
-- Name: project_paths; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_paths ENABLE ROW LEVEL SECURITY;

--
-- Name: project_reflections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_reflections ENABLE ROW LEVEL SECURITY;

--
-- Name: project_tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: reflection_metrics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reflection_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: reflections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

--
-- Name: related_interests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.related_interests ENABLE ROW LEVEL SECURITY;

--
-- Name: resources; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

--
-- Name: roots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.roots ENABLE ROW LEVEL SECURITY;

--
-- Name: skills; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

--
-- Name: song_of_the_day; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.song_of_the_day ENABLE ROW LEVEL SECURITY;

--
-- Name: submission_grades students_can_view_own_grades; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_can_view_own_grades ON public.submission_grades FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.assessment_submissions asub
     JOIN public.student_node_progress snp ON ((asub.progress_id = snp.id)))
  WHERE ((asub.id = submission_grades.submission_id) AND (snp.user_id = auth.uid())))));


--
-- Name: classroom_maps students_view_classroom_maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_view_classroom_maps ON public.classroom_maps FOR SELECT USING (((is_active = true) AND public.is_classroom_member(classroom_id, auth.uid())));


--
-- Name: assignment_nodes students_view_enrolled_assignment_nodes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_view_enrolled_assignment_nodes ON public.assignment_nodes FOR SELECT USING (((assignment_id IN ( SELECT assignment_enrollments.assignment_id
   FROM public.assignment_enrollments
  WHERE (assignment_enrollments.user_id = auth.uid()))) OR (assignment_id IN ( SELECT ca.id
   FROM public.classroom_assignments ca
  WHERE ((ca.is_published = true) AND public.is_classroom_member(ca.classroom_id, auth.uid()))))));


--
-- Name: classroom_assignments students_view_published_assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_view_published_assignments ON public.classroom_assignments FOR SELECT USING (((is_published = true) AND public.is_classroom_member(classroom_id, auth.uid())));


--
-- Name: synergies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.synergies ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: team_meetings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: classroom_team_maps team_members_view_team_maps; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_view_team_maps ON public.classroom_team_maps FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.team_memberships tm
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = classroom_team_maps.team_id) AND (tm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM ((public.team_memberships tm
     JOIN public.classroom_teams ct ON ((tm.team_id = ct.id)))
     JOIN public.classroom_memberships cm ON ((ct.classroom_id = cm.classroom_id)))
  WHERE ((cm.user_id = auth.uid()) AND (tm.team_id = classroom_team_maps.team_id) AND (tm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = ANY (ARRAY['instructor'::text, 'admin'::text]))))) OR (EXISTS ( SELECT 1
   FROM (public.team_memberships tm
     LEFT JOIN public.user_roles ur ON ((ur.user_id = tm.user_id)))
  WHERE ((tm.user_id = auth.uid()) AND (tm.team_id = classroom_team_maps.team_id) AND (tm.left_at IS NULL) AND ((ur.role IS NULL) OR (ur.role = ANY (ARRAY['student'::text, 'instructor'::text, 'admin'::text, 'TA'::text]))))))));


--
-- Name: POLICY team_members_view_team_maps ON classroom_team_maps; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY team_members_view_team_maps ON public.classroom_team_maps IS 'Allows team members, classroom members, and users with appropriate roles to view team maps. Includes specific support for students who may not have explicit roles.';


--
-- Name: team_node_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_node_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: team_node_progress; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_node_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: team_progress_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_progress_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: tools_acquired; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tools_acquired ENABLE ROW LEVEL SECURITY;

--
-- Name: universities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

--
-- Name: university_example_maps; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.university_example_maps ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_maps update_maps_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY update_maps_policy ON public.learning_maps FOR UPDATE USING (((creator_id = auth.uid()) OR ((map_type = 'classroom_exclusive'::public.map_type) AND (parent_classroom_id IN ( SELECT classroom_memberships.classroom_id
   FROM public.classroom_memberships
  WHERE ((classroom_memberships.user_id = auth.uid()) AND ((classroom_memberships.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[]))))))));


--
-- Name: team_memberships update_own_team_membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY update_own_team_membership ON public.team_memberships FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: POLICY update_own_team_membership ON team_memberships; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY update_own_team_membership ON public.team_memberships IS 'Allow users to update their own team membership';


--
-- Name: classroom_teams update_teams_in_classroom; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY update_teams_in_classroom ON public.classroom_teams FOR UPDATE USING (((created_by = auth.uid()) OR (classroom_id IN ( SELECT cm.classroom_id
   FROM public.classroom_memberships cm
  WHERE ((cm.user_id = auth.uid()) AND ((cm.role)::text = ANY ((ARRAY['instructor'::character varying, 'ta'::character varying])::text[])))))));


--
-- Name: POLICY update_teams_in_classroom ON classroom_teams; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY update_teams_in_classroom ON public.classroom_teams IS 'Allow team creators and classroom instructors to update teams';


--
-- Name: user_communities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_communities ENABLE ROW LEVEL SECURITY;

--
-- Name: user_interest_priorities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_interest_priorities ENABLE ROW LEVEL SECURITY;

--
-- Name: user_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: user_university_targets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_university_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_workshops; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_workshops ENABLE ROW LEVEL SECURITY;

--
-- Name: classrooms users_access_classrooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_access_classrooms ON public.classrooms FOR SELECT USING (((is_active = true) OR public.is_classroom_member(id, auth.uid())));


--
-- Name: student_node_progress users_can_manage_own_progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_can_manage_own_progress ON public.student_node_progress USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: interests view interests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "view interests" ON public.interests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: classroom_map_features view_classroom_map_features; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY view_classroom_map_features ON public.classroom_map_features FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.learning_maps lm
  WHERE ((lm.id = classroom_map_features.map_id) AND (lm.map_type = 'classroom_exclusive'::public.map_type) AND (lm.parent_classroom_id IN ( SELECT classroom_memberships.classroom_id
           FROM public.classroom_memberships
          WHERE (classroom_memberships.user_id = auth.uid())))))));


--
-- Name: classroom_memberships view_classroom_memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY view_classroom_memberships ON public.classroom_memberships FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.classroom_memberships cm
  WHERE ((cm.classroom_id = classroom_memberships.classroom_id) AND (cm.user_id = auth.uid()))))));


--
-- Name: learning_maps view_maps_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY view_maps_policy ON public.learning_maps FOR SELECT USING (((map_type = 'public'::public.map_type) OR ((map_type = 'private'::public.map_type) AND (creator_id = auth.uid())) OR ((map_type = 'classroom_exclusive'::public.map_type) AND (parent_classroom_id IN ( SELECT classroom_memberships.classroom_id
   FROM public.classroom_memberships
  WHERE (classroom_memberships.user_id = auth.uid())))) OR (creator_id = auth.uid())));


--
-- Name: team_memberships view_team_memberships_in_classroom; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY view_team_memberships_in_classroom ON public.team_memberships FOR SELECT USING ((team_id IN ( SELECT ct.id
   FROM (public.classroom_teams ct
     JOIN public.classroom_memberships cm ON ((ct.classroom_id = cm.classroom_id)))
  WHERE (cm.user_id = auth.uid()))));


--
-- Name: POLICY view_team_memberships_in_classroom ON team_memberships; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY view_team_memberships_in_classroom ON public.team_memberships IS 'Allow viewing team memberships in classrooms user belongs to';


--
-- Name: workshops; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION archive_old_assignments(days_old integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.archive_old_assignments(days_old integer) TO anon;
GRANT ALL ON FUNCTION public.archive_old_assignments(days_old integer) TO authenticated;
GRANT ALL ON FUNCTION public.archive_old_assignments(days_old integer) TO service_role;


--
-- Name: FUNCTION assign_group_assignment_to_members(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.assign_group_assignment_to_members() TO anon;
GRANT ALL ON FUNCTION public.assign_group_assignment_to_members() TO authenticated;
GRANT ALL ON FUNCTION public.assign_group_assignment_to_members() TO service_role;


--
-- Name: FUNCTION auto_enroll_classroom_members(assignment_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_enroll_classroom_members(assignment_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.auto_enroll_classroom_members(assignment_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.auto_enroll_classroom_members(assignment_uuid uuid) TO service_role;


--
-- Name: FUNCTION bulk_enroll_students(classroom_uuid uuid, student_emails text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.bulk_enroll_students(classroom_uuid uuid, student_emails text[]) TO anon;
GRANT ALL ON FUNCTION public.bulk_enroll_students(classroom_uuid uuid, student_emails text[]) TO authenticated;
GRANT ALL ON FUNCTION public.bulk_enroll_students(classroom_uuid uuid, student_emails text[]) TO service_role;


--
-- Name: FUNCTION calculate_assignment_completion(enrollment_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_assignment_completion(enrollment_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.calculate_assignment_completion(enrollment_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_assignment_completion(enrollment_uuid uuid) TO service_role;


--
-- Name: FUNCTION create_assessment_groups_shuffle(p_assessment_id uuid, p_target_group_size integer, p_allow_uneven_groups boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_assessment_groups_shuffle(p_assessment_id uuid, p_target_group_size integer, p_allow_uneven_groups boolean) TO anon;
GRANT ALL ON FUNCTION public.create_assessment_groups_shuffle(p_assessment_id uuid, p_target_group_size integer, p_allow_uneven_groups boolean) TO authenticated;
GRANT ALL ON FUNCTION public.create_assessment_groups_shuffle(p_assessment_id uuid, p_target_group_size integer, p_allow_uneven_groups boolean) TO service_role;


--
-- Name: FUNCTION create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text, selected_node_ids uuid[], auto_enroll boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text, selected_node_ids uuid[], auto_enroll boolean) TO anon;
GRANT ALL ON FUNCTION public.create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text, selected_node_ids uuid[], auto_enroll boolean) TO authenticated;
GRANT ALL ON FUNCTION public.create_assignment_from_map(classroom_uuid uuid, map_uuid uuid, assignment_title text, assignment_description text, selected_node_ids uuid[], auto_enroll boolean) TO service_role;


--
-- Name: FUNCTION create_classroom_exclusive_map(classroom_uuid uuid, map_title text, map_description text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_classroom_exclusive_map(classroom_uuid uuid, map_title text, map_description text) TO anon;
GRANT ALL ON FUNCTION public.create_classroom_exclusive_map(classroom_uuid uuid, map_title text, map_description text) TO authenticated;
GRANT ALL ON FUNCTION public.create_classroom_exclusive_map(classroom_uuid uuid, map_title text, map_description text) TO service_role;


--
-- Name: FUNCTION debug_group_submissions(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.debug_group_submissions(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.debug_group_submissions(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.debug_group_submissions(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION delete_learning_map_cascade(map_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_learning_map_cascade(map_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_learning_map_cascade(map_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_learning_map_cascade(map_uuid uuid) TO service_role;


--
-- Name: FUNCTION enroll_new_group_member_in_assignments(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enroll_new_group_member_in_assignments() TO anon;
GRANT ALL ON FUNCTION public.enroll_new_group_member_in_assignments() TO authenticated;
GRANT ALL ON FUNCTION public.enroll_new_group_member_in_assignments() TO service_role;


--
-- Name: FUNCTION ensure_single_leader_per_team(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_single_leader_per_team() TO anon;
GRANT ALL ON FUNCTION public.ensure_single_leader_per_team() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_single_leader_per_team() TO service_role;


--
-- Name: FUNCTION fix_group_submissions(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fix_group_submissions(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.fix_group_submissions(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.fix_group_submissions(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION generate_join_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_join_code() TO anon;
GRANT ALL ON FUNCTION public.generate_join_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_join_code() TO service_role;


--
-- Name: FUNCTION get_admin_maps_optimized(limit_count integer, offset_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_admin_maps_optimized(limit_count integer, offset_count integer) TO anon;
GRANT ALL ON FUNCTION public.get_admin_maps_optimized(limit_count integer, offset_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_admin_maps_optimized(limit_count integer, offset_count integer) TO service_role;


--
-- Name: FUNCTION get_assessment_groups(p_assessment_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_assessment_groups(p_assessment_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_assessment_groups(p_assessment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_assessment_groups(p_assessment_id uuid) TO service_role;


--
-- Name: FUNCTION get_classroom_analytics(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_classroom_analytics(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_classroom_analytics(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_classroom_analytics(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_classroom_available_nodes(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_classroom_available_nodes(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_classroom_available_nodes(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_classroom_available_nodes(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_classroom_exclusive_maps(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_classroom_exclusive_maps(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_classroom_exclusive_maps(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_classroom_exclusive_maps(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_classroom_maps(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_classroom_maps(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_classroom_maps(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_classroom_maps(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_classroom_stats(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_classroom_stats(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_classroom_stats(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_classroom_stats(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_journey_overview(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_journey_overview(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_journey_overview(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_journey_overview(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_orphaned_image_keys(older_than_hours integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_orphaned_image_keys(older_than_hours integer) TO anon;
GRANT ALL ON FUNCTION public.get_orphaned_image_keys(older_than_hours integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_orphaned_image_keys(older_than_hours integer) TO service_role;


--
-- Name: FUNCTION get_project_stats(project_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_project_stats(project_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_project_stats(project_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_project_stats(project_uuid uuid) TO service_role;


--
-- Name: FUNCTION get_student_progress_overview(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_student_progress_overview(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_student_progress_overview(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_student_progress_overview(classroom_uuid uuid) TO service_role;


--
-- Name: TABLE team_node_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.team_node_progress TO authenticated;


--
-- Name: FUNCTION get_team_map_progress(map_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_team_map_progress(map_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.get_team_map_progress(map_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_team_map_progress(map_id_param uuid) TO service_role;


--
-- Name: FUNCTION handle_auto_enroll_new_student(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_auto_enroll_new_student() TO anon;
GRANT ALL ON FUNCTION public.handle_auto_enroll_new_student() TO authenticated;
GRANT ALL ON FUNCTION public.handle_auto_enroll_new_student() TO service_role;


--
-- Name: FUNCTION handle_group_submission(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_group_submission() TO anon;
GRANT ALL ON FUNCTION public.handle_group_submission() TO authenticated;
GRANT ALL ON FUNCTION public.handle_group_submission() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION is_admin(user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.is_admin(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_admin(user_uuid uuid) TO service_role;


--
-- Name: FUNCTION is_classroom_member(classroom_uuid uuid, user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_classroom_member(classroom_uuid uuid, user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.is_classroom_member(classroom_uuid uuid, user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_classroom_member(classroom_uuid uuid, user_uuid uuid) TO service_role;


--
-- Name: FUNCTION is_community_admin(community_id_param uuid, user_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_community_admin(community_id_param uuid, user_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.is_community_admin(community_id_param uuid, user_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_community_admin(community_id_param uuid, user_id_param uuid) TO service_role;


--
-- Name: FUNCTION is_community_member(community_id_param uuid, user_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_community_member(community_id_param uuid, user_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.is_community_member(community_id_param uuid, user_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_community_member(community_id_param uuid, user_id_param uuid) TO service_role;


--
-- Name: FUNCTION link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text) TO anon;
GRANT ALL ON FUNCTION public.link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text) TO authenticated;
GRANT ALL ON FUNCTION public.link_map_to_classroom(classroom_uuid uuid, map_uuid uuid, notes_text text) TO service_role;


--
-- Name: FUNCTION reorder_classroom_maps(classroom_uuid uuid, link_orders json); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.reorder_classroom_maps(classroom_uuid uuid, link_orders json) TO anon;
GRANT ALL ON FUNCTION public.reorder_classroom_maps(classroom_uuid uuid, link_orders json) TO authenticated;
GRANT ALL ON FUNCTION public.reorder_classroom_maps(classroom_uuid uuid, link_orders json) TO service_role;


--
-- Name: FUNCTION set_current_timestamp_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_current_timestamp_updated_at() TO service_role;


--
-- Name: FUNCTION simple_fix_group_submissions(classroom_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.simple_fix_group_submissions(classroom_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.simple_fix_group_submissions(classroom_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.simple_fix_group_submissions(classroom_uuid uuid) TO service_role;


--
-- Name: FUNCTION sync_assignment_progress(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_assignment_progress() TO anon;
GRANT ALL ON FUNCTION public.sync_assignment_progress() TO authenticated;
GRANT ALL ON FUNCTION public.sync_assignment_progress() TO service_role;


--
-- Name: FUNCTION unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unlink_map_from_classroom(classroom_uuid uuid, map_uuid uuid) TO service_role;


--
-- Name: FUNCTION update_classroom_map_feature(map_uuid uuid, feature_type_param text, feature_config_param jsonb, is_enabled_param boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_classroom_map_feature(map_uuid uuid, feature_type_param text, feature_config_param jsonb, is_enabled_param boolean) TO anon;
GRANT ALL ON FUNCTION public.update_classroom_map_feature(map_uuid uuid, feature_type_param text, feature_config_param jsonb, is_enabled_param boolean) TO authenticated;
GRANT ALL ON FUNCTION public.update_classroom_map_feature(map_uuid uuid, feature_type_param text, feature_config_param jsonb, is_enabled_param boolean) TO service_role;


--
-- Name: FUNCTION update_classroom_map_features_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_classroom_map_features_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_classroom_map_features_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_classroom_map_features_updated_at() TO service_role;


--
-- Name: FUNCTION update_community_member_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_community_member_count() TO anon;
GRANT ALL ON FUNCTION public.update_community_member_count() TO authenticated;
GRANT ALL ON FUNCTION public.update_community_member_count() TO service_role;


--
-- Name: FUNCTION update_cover_image_timestamp(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_cover_image_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_cover_image_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_cover_image_timestamp() TO service_role;


--
-- Name: FUNCTION update_journey_projects_positions(items jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_journey_projects_positions(items jsonb) TO anon;
GRANT ALL ON FUNCTION public.update_journey_projects_positions(items jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_journey_projects_positions(items jsonb) TO service_role;


--
-- Name: FUNCTION update_meeting_timestamp(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_meeting_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_meeting_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_meeting_timestamp() TO service_role;


--
-- Name: FUNCTION update_membership_activity(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_membership_activity() TO anon;
GRANT ALL ON FUNCTION public.update_membership_activity() TO authenticated;
GRANT ALL ON FUNCTION public.update_membership_activity() TO service_role;


--
-- Name: FUNCTION update_milestone_progress_from_journal(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_milestone_progress_from_journal() TO anon;
GRANT ALL ON FUNCTION public.update_milestone_progress_from_journal() TO authenticated;
GRANT ALL ON FUNCTION public.update_milestone_progress_from_journal() TO service_role;


--
-- Name: FUNCTION update_progress_on_grade(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_progress_on_grade() TO anon;
GRANT ALL ON FUNCTION public.update_progress_on_grade() TO authenticated;
GRANT ALL ON FUNCTION public.update_progress_on_grade() TO service_role;


--
-- Name: FUNCTION update_project_milestones_positions(items jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_project_milestones_positions(items jsonb) TO anon;
GRANT ALL ON FUNCTION public.update_project_milestones_positions(items jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.update_project_milestones_positions(items jsonb) TO service_role;


--
-- Name: FUNCTION update_project_status_from_milestones(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_project_status_from_milestones() TO anon;
GRANT ALL ON FUNCTION public.update_project_status_from_milestones() TO authenticated;
GRANT ALL ON FUNCTION public.update_project_status_from_milestones() TO service_role;


--
-- Name: FUNCTION update_song_of_the_day_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_song_of_the_day_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_song_of_the_day_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_song_of_the_day_updated_at() TO service_role;


--
-- Name: FUNCTION update_team_progress_from_individual(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_team_progress_from_individual() TO anon;
GRANT ALL ON FUNCTION public.update_team_progress_from_individual() TO authenticated;
GRANT ALL ON FUNCTION public.update_team_progress_from_individual() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: TABLE ai_agents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_agents TO anon;
GRANT ALL ON TABLE public.ai_agents TO authenticated;
GRANT ALL ON TABLE public.ai_agents TO service_role;


--
-- Name: TABLE ai_roadmaps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_roadmaps TO anon;
GRANT ALL ON TABLE public.ai_roadmaps TO authenticated;
GRANT ALL ON TABLE public.ai_roadmaps TO service_role;


--
-- Name: TABLE assessment_group_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessment_group_members TO anon;
GRANT ALL ON TABLE public.assessment_group_members TO authenticated;
GRANT ALL ON TABLE public.assessment_group_members TO service_role;


--
-- Name: TABLE assessment_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.assessment_groups TO anon;
GRANT ALL ON TABLE public.assessment_groups TO authenticated;
GRANT ALL ON TABLE public.assessment_groups TO service_role;


--
-- Name: TABLE assessment_submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assessment_submissions TO authenticated;


--
-- Name: TABLE assignment_enrollments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_enrollments TO authenticated;


--
-- Name: TABLE assignment_group_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_group_assignments TO authenticated;


--
-- Name: TABLE assignment_group_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_group_members TO authenticated;


--
-- Name: TABLE assignment_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.assignment_groups TO authenticated;


--
-- Name: TABLE assignment_nodes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.assignment_nodes TO authenticated;


--
-- Name: TABLE branches; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.branches TO authenticated;


--
-- Name: TABLE chat_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.chat_messages TO authenticated;


--
-- Name: TABLE classroom_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.classroom_assignments TO authenticated;


--
-- Name: TABLE classroom_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.classroom_groups TO anon;
GRANT ALL ON TABLE public.classroom_groups TO authenticated;
GRANT ALL ON TABLE public.classroom_groups TO service_role;


--
-- Name: TABLE classroom_map_features; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.classroom_map_features TO anon;
GRANT ALL ON TABLE public.classroom_map_features TO authenticated;
GRANT ALL ON TABLE public.classroom_map_features TO service_role;


--
-- Name: TABLE classroom_maps; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.classroom_maps TO authenticated;


--
-- Name: TABLE classroom_memberships; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.classroom_memberships TO authenticated;


--
-- Name: TABLE classroom_team_maps; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.classroom_team_maps TO authenticated;


--
-- Name: TABLE classroom_teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.classroom_teams TO authenticated;


--
-- Name: TABLE classrooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.classrooms TO authenticated;


--
-- Name: TABLE cohort_map_enrollments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.cohort_map_enrollments TO authenticated;


--
-- Name: TABLE cohorts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.cohorts TO authenticated;


--
-- Name: TABLE communities; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.communities TO authenticated;


--
-- Name: TABLE community_images; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.community_images TO authenticated;


--
-- Name: TABLE community_mentors; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.community_mentors TO authenticated;


--
-- Name: TABLE community_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.community_posts TO authenticated;


--
-- Name: TABLE community_projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.community_projects TO authenticated;


--
-- Name: TABLE connections; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.connections TO authenticated;


--
-- Name: TABLE direction_finder_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.direction_finder_results TO anon;
GRANT ALL ON TABLE public.direction_finder_results TO authenticated;
GRANT ALL ON TABLE public.direction_finder_results TO service_role;


--
-- Name: TABLE emotions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.emotions TO authenticated;


--
-- Name: TABLE engagement; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.engagement TO authenticated;


--
-- Name: TABLE group_memberships; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.group_memberships TO anon;
GRANT ALL ON TABLE public.group_memberships TO authenticated;
GRANT ALL ON TABLE public.group_memberships TO service_role;


--
-- Name: TABLE impacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.impacts TO authenticated;


--
-- Name: TABLE influences; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.influences TO authenticated;


--
-- Name: TABLE insights; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.insights TO authenticated;


--
-- Name: TABLE interests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.interests TO authenticated;


--
-- Name: TABLE journey_projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.journey_projects TO anon;
GRANT ALL ON TABLE public.journey_projects TO authenticated;
GRANT ALL ON TABLE public.journey_projects TO service_role;


--
-- Name: TABLE learning_maps; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.learning_maps TO authenticated;


--
-- Name: TABLE learning_paths; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.learning_paths TO authenticated;


--
-- Name: TABLE map_editors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.map_editors TO anon;
GRANT ALL ON TABLE public.map_editors TO authenticated;
GRANT ALL ON TABLE public.map_editors TO service_role;


--
-- Name: TABLE map_nodes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.map_nodes TO authenticated;


--
-- Name: TABLE milestone_journals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.milestone_journals TO anon;
GRANT ALL ON TABLE public.milestone_journals TO authenticated;
GRANT ALL ON TABLE public.milestone_journals TO service_role;


--
-- Name: TABLE milestone_paths; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.milestone_paths TO anon;
GRANT ALL ON TABLE public.milestone_paths TO authenticated;
GRANT ALL ON TABLE public.milestone_paths TO service_role;


--
-- Name: TABLE milestones; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.milestones TO authenticated;


--
-- Name: TABLE mindmap_reflections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mindmap_reflections TO anon;
GRANT ALL ON TABLE public.mindmap_reflections TO authenticated;
GRANT ALL ON TABLE public.mindmap_reflections TO service_role;


--
-- Name: TABLE mindmap_topics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mindmap_topics TO anon;
GRANT ALL ON TABLE public.mindmap_topics TO authenticated;
GRANT ALL ON TABLE public.mindmap_topics TO service_role;


--
-- Name: TABLE monthly_insights; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.monthly_insights TO authenticated;


--
-- Name: TABLE node_assessments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.node_assessments TO authenticated;


--
-- Name: TABLE node_content; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.node_content TO authenticated;


--
-- Name: TABLE node_leaderboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.node_leaderboard TO authenticated;


--
-- Name: TABLE node_paths; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.node_paths TO authenticated;


--
-- Name: TABLE north_stars; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.north_stars TO anon;
GRANT ALL ON TABLE public.north_stars TO authenticated;
GRANT ALL ON TABLE public.north_stars TO service_role;


--
-- Name: TABLE passion_trees; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.passion_trees TO authenticated;


--
-- Name: TABLE post_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.post_comments TO authenticated;


--
-- Name: TABLE post_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.post_likes TO authenticated;


--
-- Name: TABLE post_media; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.post_media TO authenticated;


--
-- Name: TABLE potential_offshoots; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.potential_offshoots TO authenticated;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO authenticated;
GRANT INSERT ON TABLE public.profiles TO service_role;


--
-- Name: TABLE project_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.project_members TO authenticated;


--
-- Name: TABLE project_milestones; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_milestones TO anon;
GRANT ALL ON TABLE public.project_milestones TO authenticated;
GRANT ALL ON TABLE public.project_milestones TO service_role;


--
-- Name: TABLE project_outcomes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.project_outcomes TO authenticated;


--
-- Name: TABLE project_paths; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_paths TO anon;
GRANT ALL ON TABLE public.project_paths TO authenticated;
GRANT ALL ON TABLE public.project_paths TO service_role;


--
-- Name: TABLE project_reflections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.project_reflections TO anon;
GRANT ALL ON TABLE public.project_reflections TO authenticated;
GRANT ALL ON TABLE public.project_reflections TO service_role;


--
-- Name: TABLE project_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.project_tags TO authenticated;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.projects TO authenticated;


--
-- Name: TABLE quiz_questions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.quiz_questions TO authenticated;


--
-- Name: TABLE reflection_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reflection_metrics TO authenticated;


--
-- Name: TABLE reflections; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.reflections TO authenticated;


--
-- Name: TABLE related_interests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.related_interests TO authenticated;


--
-- Name: TABLE resources; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.resources TO authenticated;


--
-- Name: TABLE roots; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.roots TO authenticated;


--
-- Name: TABLE skills; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.skills TO authenticated;


--
-- Name: TABLE song_of_the_day; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.song_of_the_day TO anon;
GRANT ALL ON TABLE public.song_of_the_day TO authenticated;
GRANT ALL ON TABLE public.song_of_the_day TO service_role;


--
-- Name: TABLE student_node_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_node_progress TO authenticated;


--
-- Name: TABLE team_memberships; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.team_memberships TO authenticated;


--
-- Name: TABLE students_without_teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.students_without_teams TO anon;
GRANT ALL ON TABLE public.students_without_teams TO authenticated;
GRANT ALL ON TABLE public.students_without_teams TO service_role;


--
-- Name: TABLE submission_grades; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.submission_grades TO authenticated;


--
-- Name: TABLE synergies; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.synergies TO authenticated;


--
-- Name: TABLE tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tags TO authenticated;


--
-- Name: TABLE team_meetings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.team_meetings TO authenticated;


--
-- Name: TABLE team_members_with_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_members_with_profiles TO anon;
GRANT ALL ON TABLE public.team_members_with_profiles TO authenticated;
GRANT ALL ON TABLE public.team_members_with_profiles TO service_role;


--
-- Name: TABLE team_node_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.team_node_assignments TO authenticated;


--
-- Name: TABLE team_progress_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.team_progress_comments TO authenticated;


--
-- Name: TABLE tools_acquired; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.tools_acquired TO authenticated;


--
-- Name: TABLE universities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.universities TO anon;
GRANT ALL ON TABLE public.universities TO authenticated;
GRANT ALL ON TABLE public.universities TO service_role;


--
-- Name: TABLE university_example_maps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.university_example_maps TO anon;
GRANT ALL ON TABLE public.university_example_maps TO authenticated;
GRANT ALL ON TABLE public.university_example_maps TO service_role;


--
-- Name: TABLE user_communities; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_communities TO authenticated;


--
-- Name: TABLE user_interest_priorities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_interest_priorities TO anon;
GRANT ALL ON TABLE public.user_interest_priorities TO authenticated;
GRANT ALL ON TABLE public.user_interest_priorities TO service_role;


--
-- Name: TABLE user_map_enrollments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_map_enrollments TO authenticated;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_roles TO authenticated;


--
-- Name: TABLE user_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_stats TO authenticated;


--
-- Name: TABLE user_university_targets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_university_targets TO anon;
GRANT ALL ON TABLE public.user_university_targets TO authenticated;
GRANT ALL ON TABLE public.user_university_targets TO service_role;


--
-- Name: TABLE user_workshops; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_workshops TO authenticated;


--
-- Name: TABLE workshop_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.workshop_comments TO authenticated;


--
-- Name: TABLE workshop_suggestions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.workshop_suggestions TO authenticated;


--
-- Name: TABLE workshop_votes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.workshop_votes TO authenticated;


--
-- Name: TABLE workshops; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.workshops TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- PostgreSQL database dump complete
--

