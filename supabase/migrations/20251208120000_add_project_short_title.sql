-- Add short_title column to journey_projects table
-- This allows users to set a shorter display name for compact views

ALTER TABLE journey_projects
ADD COLUMN IF NOT EXISTS short_title text;

-- Add comment for clarity
COMMENT ON COLUMN journey_projects.short_title IS 'Optional short display title for compact views (e.g., journey map nodes)';
