-- Add goal field to journey_projects table
ALTER TABLE public.journey_projects
ADD COLUMN IF NOT EXISTS goal TEXT;

-- Update project_milestones status constraint to include all status types
ALTER TABLE public.project_milestones
DROP CONSTRAINT IF EXISTS project_milestones_valid_status;

ALTER TABLE public.project_milestones
ADD CONSTRAINT project_milestones_valid_status
CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed', 'skipped'));

-- Add comment explaining that start_date and due_date are stored in metadata JSONB
COMMENT ON COLUMN public.project_milestones.metadata IS 'Stores additional milestone data including start_date, due_date, estimated_hours, actual_hours, style, dependencies, and tags';
