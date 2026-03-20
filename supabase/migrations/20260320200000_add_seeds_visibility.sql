-- Add visibility column to seeds table
-- Allows controlling which PathLabs are shown in the app
-- Values: 'hidden' (default), 'visible', 'featured'

ALTER TABLE seeds ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'hidden' 
  CHECK (visibility IN ('hidden', 'visible', 'featured'));

-- Set visibility for approved PathLabs
UPDATE seeds SET visibility = 'visible' WHERE title IN (
  'Startup: Learn from Big Fang',
  'Economics Explorer: Charting Your Future',
  'Web Developer: Ship Your First Project'
);

-- Ensure all other seeds are hidden
UPDATE seeds SET visibility = 'hidden' WHERE visibility IS NULL;

-- Add index for filtering by visibility
CREATE INDEX IF NOT EXISTS idx_seeds_visibility ON seeds(visibility);

-- Add comment for documentation
COMMENT ON COLUMN seeds.visibility IS 'Controls PathLab visibility in app: hidden (default), visible, featured';