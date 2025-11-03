-- Migration: Fix schema conflicts in journey_projects table
-- Created: 2025-11-02
-- Description: Clean up conflicting fields and constraints after North Stars table creation

-- ========================================
-- REMOVE DUPLICATE/CONFLICTING FIELDS
-- ========================================

-- Remove North Star fields from journey_projects since we now have a separate north_stars table
ALTER TABLE public.journey_projects
  DROP COLUMN IF EXISTS sdg_goals,
  DROP COLUMN IF EXISTS career_path,
  DROP COLUMN IF EXISTS north_star_shape,
  DROP COLUMN IF EXISTS north_star_color;

-- Remove the old self-referencing north_star_id (keep linked_north_star_id)
ALTER TABLE public.journey_projects
  DROP CONSTRAINT IF EXISTS journey_projects_north_star_id_fkey,
  DROP COLUMN IF EXISTS north_star_id;

-- Remove the old index on north_star_id
DROP INDEX IF EXISTS public.idx_journey_projects_north_star;

-- ========================================
-- FIX PROJECT TYPE CONSTRAINTS
-- ========================================

-- Update the project_type constraint to only allow category types (remove north_star since we have separate table)
ALTER TABLE public.journey_projects
  DROP CONSTRAINT IF EXISTS journey_projects_valid_type;

ALTER TABLE public.journey_projects
  ADD CONSTRAINT journey_projects_valid_type CHECK (
    project_type = ANY (ARRAY[
      'learning'::text,
      'career'::text,
      'personal'::text,
      'creative'::text,
      'research'::text,
      'community'::text
    ])
  );

-- ========================================
-- FIX BROKEN COLOR CONSTRAINT
-- ========================================

-- Remove the broken color constraint
ALTER TABLE public.journey_projects
  DROP CONSTRAINT IF EXISTS journey_projects_color_format;

-- Add proper color constraint
ALTER TABLE public.journey_projects
  ADD CONSTRAINT journey_projects_color_format CHECK (color_theme ~ '^#[0-9a-fA-F]{6}$');

-- ========================================
-- UPDATE STATUS CONSTRAINTS
-- ========================================

-- Ensure journey_projects status constraint includes all valid statuses
ALTER TABLE public.journey_projects
  DROP CONSTRAINT IF EXISTS journey_projects_valid_status;

ALTER TABLE public.journey_projects
  ADD CONSTRAINT journey_projects_valid_status CHECK (
    status = ANY (ARRAY[
      'not_started'::text,
      'planning'::text,
      'in_progress'::text,
      'on_hold'::text,
      'completed'::text,
      'archived'::text
    ])
  );

-- ========================================
-- DATA CLEANUP
-- ========================================

-- Migrate any existing projects with project_type 'north_star' or 'short_term' to appropriate categories
UPDATE public.journey_projects
SET project_type = 'personal'
WHERE project_type IN ('north_star', 'short_term');

-- ========================================
-- VALIDATION
-- ========================================

-- Verify the schema is clean
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Check that the constraints were applied correctly
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_name = 'journey_projects'
    AND constraint_name IN (
        'journey_projects_valid_type',
        'journey_projects_color_format',
        'journey_projects_valid_status'
    );

    IF constraint_count != 3 THEN
        RAISE EXCEPTION 'Schema fix incomplete. Expected 3 constraints, found %', constraint_count;
    END IF;

    RAISE NOTICE 'Schema cleanup completed successfully. Journey projects table now properly separated from North Stars.';
END$$;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE public.journey_projects IS 'User projects and goals. Linked to North Stars via linked_north_star_id.';
COMMENT ON COLUMN public.journey_projects.linked_north_star_id IS 'Links this project to a North Star from the north_stars table';
COMMENT ON COLUMN public.journey_projects.project_type IS 'Category of project: learning, career, personal, creative, research, or community';
COMMENT ON TABLE public.north_stars IS 'Long-term guiding goals that users work towards through their journey projects';