-- Migration: Add Auto Assignment Trigger
-- Created: 2025-08-12 13:00:00
-- Description: Creates a trigger to automatically enroll new students 
--              into assignments that have auto_assign = true

-- ========================================
-- FUNCTION: Auto-enroll students in auto-assign assignments
-- ========================================

CREATE OR REPLACE FUNCTION auto_enroll_new_student()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Only process if this is a student joining a classroom
  IF NEW.role = 'student' THEN
    -- Enroll the student in all auto-assign assignments for this classroom
    INSERT INTO public.assignment_enrollments (
      assignment_id,
      user_id,
      enrolled_at,
      status,
      due_date
    )
    SELECT 
      ca.id,
      NEW.user_id,
      now(),
      'assigned',
      ca.default_due_date
    FROM public.classroom_assignments ca
    WHERE ca.classroom_id = NEW.classroom_id
      AND ca.auto_assign = true
      AND ca.is_active = true
      AND ca.is_published = true
      -- Avoid duplicate enrollments
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
$$;

-- ========================================
-- TRIGGER: Auto-enroll on classroom membership
-- ========================================

DROP TRIGGER IF EXISTS trigger_auto_enroll_student ON public.classroom_memberships;

CREATE TRIGGER trigger_auto_enroll_student
  AFTER INSERT ON public.classroom_memberships
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_new_student();

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Add index for auto_assign lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_auto_assign 
ON public.classroom_assignments(classroom_id, auto_assign, is_active, is_published) 
WHERE auto_assign = true AND is_active = true AND is_published = true;

-- Add index for enrollment lookups to avoid duplicates
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_unique_check
ON public.assignment_enrollments(assignment_id, user_id);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON FUNCTION auto_enroll_new_student() IS 
'Automatically enrolls new students into assignments with auto_assign = true when they join a classroom';

COMMENT ON TRIGGER trigger_auto_enroll_student ON public.classroom_memberships IS 
'Triggers auto-enrollment when a student joins a classroom';
