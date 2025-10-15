-- Migration: Add 'journey' category to learning_maps
-- Description: Updates the category check constraint to include 'journey' as a valid category

-- Drop the existing check constraint
ALTER TABLE learning_maps DROP CONSTRAINT IF EXISTS learning_maps_category_check;

-- Add the new check constraint with 'journey' included
ALTER TABLE learning_maps
ADD CONSTRAINT learning_maps_category_check
CHECK (category IN ('ai', '3d', 'unity', 'hacking', 'custom', 'journey'));

-- Update any existing maps with is_personal_journey metadata to use 'journey' category
UPDATE learning_maps
SET category = 'journey'
WHERE metadata->>'is_personal_journey' = 'true'
AND category != 'journey';

-- Add comment
COMMENT ON CONSTRAINT learning_maps_category_check ON learning_maps IS
'Ensures category is one of: ai, 3d, unity, hacking, custom, or journey';
