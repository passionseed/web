-- Migration: Add Auto Assignment Mode
-- Cre              SELECT 1 FROM public.assignment_enrollments ae
              WHERE ae.assignment_id = ca.id 
                AND ae.user_id = NEW.user_idd: 2025-08-12 13:00:00
-- Description: Adds auto assignment functionality to automatically enroll 
--              all current and future students in assignments

-- ========================================
-- ADD AUTO ASSIGNMENT COLUMN
-- ========================================

-- Add auto_assign column to classroom_assignments
ALTER TABLE public.classroom_assignments 
ADD COLUMN auto_assign BOOLEAN DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.classroom_assignments.auto_assign IS 'When true, automatically enrolls all current and future students in this assignment';

-- ========================================
-- CREATE AUTO ENROLLMENT TRIGGER FUNCTION
-- ========================================

-- Function to auto-enroll new students in auto-assignments
CREATE OR REPLACE FUNCTION auto_enroll_student_in_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if this is a student being added to a classroom
    IF NEW.role = 'student' THEN
        -- Enroll the student in all auto-assignments for this classroom
        INSERT INTO public.assignment_enrollments (
            assignment_id,
            user_id,
            due_date,
            enrolled_at
        )
        SELECT 
            ca.id as assignment_id,
            NEW.user_id as user_id,
            ca.default_due_date as due_date,
            now() as enrolled_at
        FROM public.classroom_assignments ca
        WHERE ca.classroom_id = NEW.classroom_id
          AND ca.auto_assign = true
          AND ca.is_active = true
          AND ca.is_published = true
          -- Don't enroll if already enrolled
          AND NOT EXISTS (
              SELECT 1 FROM public.assignment_enrollments ae
              WHERE ae.assignment_id = ca.id 
                AND ae.user_id = NEW.user_id
          );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- CREATE TRIGGER FOR AUTO ENROLLMENT
-- ========================================

-- Trigger to auto-enroll students when they join a classroom
DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON public.classroom_memberships;
CREATE TRIGGER trigger_auto_enroll_student
    AFTER INSERT ON public.classroom_memberships
    FOR EACH ROW
    EXECUTE FUNCTION auto_enroll_student_in_assignments();

-- ========================================
-- CREATE AUTO ASSIGNMENT MANAGEMENT FUNCTIONS
-- ========================================

-- Function to enable auto assignment for an existing assignment
CREATE OR REPLACE FUNCTION enable_auto_assignment(assignment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    classroom_id_var UUID;
    enrollment_count INTEGER;
BEGIN
    -- Get the classroom ID for this assignment
    SELECT classroom_id INTO classroom_id_var
    FROM public.classroom_assignments
    WHERE id = assignment_id;
    
    IF classroom_id_var IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;
    
    -- Enable auto assignment
    UPDATE public.classroom_assignments
    SET auto_assign = true, updated_at = now()
    WHERE id = assignment_id;
    
    -- Enroll all current students in the classroom
    INSERT INTO public.assignment_enrollments (
        assignment_id,
        user_id,
        due_date,
        enrolled_at
    )
    SELECT 
        assignment_id,
        cm.user_id,
        ca.default_due_date,
        now()
    FROM public.classroom_memberships cm
    JOIN public.classroom_assignments ca ON ca.id = assignment_id
    WHERE cm.classroom_id = classroom_id_var
      AND cm.role = 'student'
      -- Don't enroll if already enrolled
      AND NOT EXISTS (
          SELECT 1 FROM public.assignment_enrollments ae
          WHERE ae.assignment_id = assignment_id
            AND ae.user_id = cm.user_id
      );
    
    GET DIAGNOSTICS enrollment_count = ROW_COUNT;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable auto assignment
CREATE OR REPLACE FUNCTION disable_auto_assignment(assignment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Disable auto assignment
    UPDATE public.classroom_assignments
    SET auto_assign = false, updated_at = now()
    WHERE id = assignment_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ADD INDEXES FOR PERFORMANCE
-- ========================================

-- Index for auto assignment queries
CREATE INDEX idx_classroom_assignments_auto_assign 
ON public.classroom_assignments(classroom_id, auto_assign) 
WHERE auto_assign = true AND is_active = true AND is_published = true;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant access to authenticated users
GRANT SELECT ON public.classroom_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION auto_enroll_student_in_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION enable_auto_assignment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION disable_auto_assignment(UUID) TO authenticated;

-- ========================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION auto_enroll_student_in_assignments() IS 'Automatically enrolls new students in auto-assignments when they join a classroom';
COMMENT ON FUNCTION enable_auto_assignment(UUID) IS 'Enables auto assignment for an assignment and enrolls all current students';
COMMENT ON FUNCTION disable_auto_assignment(UUID) IS 'Disables auto assignment for an assignment';
COMMENT ON INDEX idx_classroom_assignments_auto_assign IS 'Optimizes queries for active auto-assignments';
