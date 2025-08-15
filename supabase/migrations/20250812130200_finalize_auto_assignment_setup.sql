-- Migration: Finalize Auto Assignment Setup
-- Created: 2025-08-12 13:02:00
-- Description: Ensures the auto assignment trigger is properly configured
--              and adds any missing indexes

-- ========================================
-- VERIFY AND UPDATE TRIGGER FUNCTION
-- ========================================

-- Ensure the trigger function is properly created with correct column references
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
            enrolled_at,
            status
        )
        SELECT 
            ca.id as assignment_id,
            NEW.user_id as user_id,
            ca.default_due_date as due_date,
            now() as enrolled_at,
            'assigned' as status
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

        -- Log the auto-enrollment for debugging
        RAISE NOTICE 'Auto-enrolled student % in % auto-assign assignments for classroom %', 
          NEW.user_id, 
          (SELECT COUNT(*) FROM public.classroom_assignments ca
           WHERE ca.classroom_id = NEW.classroom_id
             AND ca.auto_assign = true
             AND ca.is_active = true
             AND ca.is_published = true),
          NEW.classroom_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ENSURE TRIGGER EXISTS
-- ========================================

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON public.classroom_memberships;
CREATE TRIGGER trigger_auto_enroll_student
    AFTER INSERT ON public.classroom_memberships
    FOR EACH ROW
    EXECUTE FUNCTION auto_enroll_student_in_assignments();

-- ========================================
-- ADD MISSING INDEXES
-- ========================================

-- Add index for enrollment lookups to avoid duplicates
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_unique_check
ON public.assignment_enrollments(assignment_id, user_id);

-- ========================================
-- UPDATE COMMENTS
-- ========================================

COMMENT ON FUNCTION auto_enroll_student_in_assignments() IS 
'Automatically enrolls new students into assignments with auto_assign = true when they join a classroom';

COMMENT ON TRIGGER trigger_auto_enroll_student ON public.classroom_memberships IS 
'Triggers auto-enrollment when a student joins a classroom';
