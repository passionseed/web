-- Migration: Add icon emoji field to journey_projects
-- Allows users to pick an emoji icon for each project
-- Created: 2025-10-27

-- ========================================
-- ADD ICON COLUMN
-- ========================================

-- Add emoji icon column (stores single emoji character)
ALTER TABLE public.journey_projects
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🎯';

-- Add constraint to ensure single emoji (1-4 UTF-8 characters for emoji)
ALTER TABLE public.journey_projects
ADD CONSTRAINT journey_projects_icon_length CHECK (char_length(icon) <= 4);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON COLUMN public.journey_projects.icon IS 'Emoji icon for the project (single emoji character)';

-- ========================================
-- UPDATE EXISTING PROJECTS WITH DEFAULT ICONS
-- ========================================

-- Set default icons based on project type for existing projects
UPDATE public.journey_projects
SET icon = CASE project_type
    WHEN 'learning' THEN '📚'
    WHEN 'career' THEN '💼'
    WHEN 'personal' THEN '🌱'
    WHEN 'creative' THEN '🎨'
    WHEN 'research' THEN '🔬'
    WHEN 'community' THEN '🤝'
    WHEN 'short_term' THEN '🎯'
    WHEN 'north_star' THEN '⭐'
    ELSE '🎯'
END
WHERE icon IS NULL;
