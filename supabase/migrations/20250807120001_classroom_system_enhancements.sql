-- Migration: Classroom System Enhancements and Additional Features
-- Created: 2025-08-07 12:30:00
-- Description: Adds advanced features to the classroom system including auto-enrollment,
--              grade synchronization, notification triggers, and additional utility functions.

-- ========================================
-- ENHANCED ENROLLMENT FEATURES
-- ========================================

-- Function to auto-enroll all classroom members in a new assignment
CREATE OR REPLACE FUNCTION public.auto_enroll_classroom_members(assignment_uuid UUID)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate assignment completion status
CREATE OR REPLACE FUNCTION public.calculate_assignment_completion(enrollment_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- AUTOMATIC TRIGGERS FOR PROGRESS SYNC
-- ========================================

-- Function to automatically update enrollment progress when node progress changes
CREATE OR REPLACE FUNCTION public.sync_assignment_progress()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger on student_node_progress table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_node_progress') THEN
        DROP TRIGGER IF EXISTS sync_assignment_progress_trigger ON public.student_node_progress;
        CREATE TRIGGER sync_assignment_progress_trigger
            AFTER INSERT OR UPDATE OR DELETE ON public.student_node_progress
            FOR EACH ROW
            EXECUTE FUNCTION public.sync_assignment_progress();
        
        RAISE NOTICE 'Created trigger to sync assignment progress with node progress';
    ELSE
        RAISE NOTICE 'student_node_progress table not found, skipping trigger creation';
    END IF;
END$$;

-- ========================================
-- CLASSROOM ANALYTICS FUNCTIONS
-- ========================================

-- Get detailed classroom analytics
CREATE OR REPLACE FUNCTION public.get_classroom_analytics(classroom_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get student progress overview for instructors
CREATE OR REPLACE FUNCTION public.get_student_progress_overview(classroom_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- UTILITY FUNCTIONS FOR MANAGEMENT
-- ========================================

-- Function to bulk enroll students by email
CREATE OR REPLACE FUNCTION public.bulk_enroll_students(
    classroom_uuid UUID, 
    student_emails TEXT[]
)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old assignments
CREATE OR REPLACE FUNCTION public.archive_old_assignments(days_old INTEGER DEFAULT 365)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.auto_enroll_classroom_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_assignment_completion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_classroom_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_progress_overview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_enroll_students(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_old_assignments(INTEGER) TO authenticated;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION public.auto_enroll_classroom_members(UUID) IS 'Automatically enrolls all classroom students in a new assignment';
COMMENT ON FUNCTION public.calculate_assignment_completion(UUID) IS 'Calculates detailed completion statistics for an assignment enrollment';
COMMENT ON FUNCTION public.sync_assignment_progress() IS 'Trigger function to automatically sync assignment progress when node progress changes';
COMMENT ON FUNCTION public.get_classroom_analytics(UUID) IS 'Returns comprehensive analytics for classroom performance and activity';
COMMENT ON FUNCTION public.get_student_progress_overview(UUID) IS 'Returns detailed progress overview for all students in a classroom';
COMMENT ON FUNCTION public.bulk_enroll_students(UUID, TEXT[]) IS 'Bulk enrolls students in a classroom by email addresses';
COMMENT ON FUNCTION public.archive_old_assignments(INTEGER) IS 'Archives assignments older than specified days (default 365)';

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Classroom system enhancements migration completed successfully. Added advanced enrollment, analytics, and management functions.';
END$$;
