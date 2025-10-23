-- Migration: Fix journey_projects project_type constraint
-- Description: Updates the project_type constraint to accept all category types
--              (learning, career, personal, creative, research, community)
--              instead of just short_term/north_star. North Star designation
--              will be tracked separately via metadata or additional column.

-- Drop the obsolete north_star_logic constraint
-- This constraint was preventing category-based project types from working
ALTER TABLE public.journey_projects
DROP CONSTRAINT IF EXISTS journey_projects_north_star_logic;

-- Drop the old project_type CHECK constraint
ALTER TABLE public.journey_projects
DROP CONSTRAINT IF EXISTS journey_projects_valid_type;

-- Add new CHECK constraint that accepts all project category types
ALTER TABLE public.journey_projects
ADD CONSTRAINT journey_projects_valid_type CHECK (
    project_type IN (
        'short_term',
        'north_star',
        'learning',
        'career',
        'personal',
        'creative',
        'research',
        'community'
    )
);

-- Drop and recreate status constraint to include all valid statuses
ALTER TABLE public.journey_projects
DROP CONSTRAINT IF EXISTS journey_projects_valid_status;

ALTER TABLE public.journey_projects
ADD CONSTRAINT journey_projects_valid_status CHECK (
    status IN (
        'not_started',
        'planning',
        'in_progress',
        'on_hold',
        'completed',
        'archived'
    )
);

-- Update column comments to reflect the new usage
COMMENT ON COLUMN public.journey_projects.project_type IS 'Category type of project: learning, career, personal, creative, research, or community. Also supports legacy short_term and north_star values.';
COMMENT ON COLUMN public.journey_projects.status IS 'Current status: not_started, planning, in_progress, on_hold, completed, or archived.';

-- Add metadata column to project_milestones if it doesn't exist
ALTER TABLE public.project_milestones
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.project_milestones.metadata IS 'Flexible JSON storage for additional milestone data (estimated_hours, due_date, style, dependencies, tags, etc.)';

-- Verify the change
DO $$
BEGIN
    RAISE NOTICE 'Fixed journey_projects constraints:';
    RAISE NOTICE '  - Removed north_star_logic constraint';
    RAISE NOTICE '  - Updated project_type to accept category types (learning, career, personal, creative, research, community)';
    RAISE NOTICE '  - Updated status to accept all valid statuses (not_started, planning, in_progress, on_hold, completed, archived)';
    RAISE NOTICE '  - Added metadata column to project_milestones';
END$$;
