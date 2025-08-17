-- Migration: Add Auto-Assignment Feature for Classrooms
-- Created: 2025-08-12 13:05:00
-- Description: This migration introduces an "auto-assign" feature. When enabled for an
--              assignment, it automatically enrolls any new student who joins the classroom.

-- ========================================
-- STEP 1: ADD SCHEMA CHANGES
-- ========================================

-- Add the auto_assign column to the classroom_assignments table
ALTER TABLE public.classroom_assignments
ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.classroom_assignments.auto_assign IS 'If true, automatically enrolls all current and future students in this assignment.';

-- ========================================
-- STEP 2: CREATE THE TRIGGER FUNCTION
-- ========================================

-- This function will be triggered when a new user joins a classroom.
-- It checks for any "auto-assign" assignments in that classroom and enrolls the new student.
CREATE OR REPLACE FUNCTION public.handle_auto_enroll_new_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_auto_enroll_new_student() IS 'Trigger function to automatically enroll a new student member into assignments marked for auto-assignment.';

-- ========================================
-- STEP 3: CREATE THE TRIGGER
-- ========================================

-- Drop any previous versions of the trigger to ensure a clean setup
DROP TRIGGER IF EXISTS trigger_auto_enroll_on_join ON public.classroom_memberships;

-- Create the trigger that fires AFTER a new membership is inserted
CREATE TRIGGER trigger_auto_enroll_on_join
  AFTER INSERT ON public.classroom_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_enroll_new_student();

-- Add comment for documentation
COMMENT ON TRIGGER trigger_auto_enroll_on_join ON public.classroom_memberships IS 'When a new student joins a classroom, this trigger executes the auto-enrollment logic.';

-- ========================================
-- STEP 4: ADD INDEXES FOR PERFORMANCE
-- ========================================

-- Creates an index to quickly find active auto-assignments for a classroom.
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_auto_assign_lookup
ON public.classroom_assignments(classroom_id, auto_assign)
WHERE auto_assign = true AND is_active = true AND is_published = true;

-- Creates an index to speed up the "NOT EXISTS" check for duplicate enrollments.
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_assignment_user_lookup
ON public.assignment_enrollments(assignment_id, user_id);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================