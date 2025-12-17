-- Add columns for optimized image storage to seeds table
ALTER TABLE seeds 
ADD COLUMN IF NOT EXISTS cover_image_blurhash TEXT,
ADD COLUMN IF NOT EXISTS cover_image_key TEXT,
ADD COLUMN IF NOT EXISTS cover_image_updated_at TIMESTAMPTZ;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_seeds_cover_image_url ON seeds(cover_image_url);
