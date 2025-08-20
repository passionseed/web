-- migration: add_points_to_assessments_and_grades
-- Add points_possible and is_graded to node_assessments
-- Add points_awarded to submission_grades
BEGIN;

ALTER TABLE public.node_assessments
  ADD COLUMN IF NOT EXISTS points_possible integer NULL,
  ADD COLUMN IF NOT EXISTS is_graded boolean NOT NULL DEFAULT false;

ALTER TABLE public.submission_grades
  ADD COLUMN IF NOT EXISTS points_awarded integer NULL;

-- Ensure non-negative points_possible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'node_assessments_points_check'
  ) THEN
    ALTER TABLE public.node_assessments
    ADD CONSTRAINT node_assessments_points_check
    CHECK (points_possible IS NULL OR points_possible >= 0);
  END IF;
END $$;

-- Ensure non-negative points_awarded
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'submission_grades_points_check'
  ) THEN
    ALTER TABLE public.submission_grades
    ADD CONSTRAINT submission_grades_points_check
    CHECK (points_awarded IS NULL OR points_awarded >= 0);
  END IF;
END $$;

COMMIT;