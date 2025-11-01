-- Add new columns to journey_projects table
ALTER TABLE journey_projects
ADD COLUMN IF NOT EXISTS sdg_goals integer[],
ADD COLUMN IF NOT EXISTS career_path text,
ADD COLUMN IF NOT EXISTS north_star_shape text DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS north_star_color text DEFAULT 'golden';
