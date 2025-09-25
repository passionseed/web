-- Add new image storage columns to learning_maps table
-- This migration replaces base64 storage with B2 cloud storage + blurhash placeholders

-- Add new columns for optimized image storage
ALTER TABLE learning_maps
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_modified_by uuid NULL REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cover_image_blurhash TEXT,
ADD COLUMN IF NOT EXISTS cover_image_key TEXT,
ADD COLUMN IF NOT EXISTS cover_image_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for faster image queries
CREATE INDEX IF NOT EXISTS idx_learning_maps_cover_image_key
ON learning_maps (cover_image_key)
WHERE cover_image_key IS NOT NULL;

-- Add index for cover image URL lookups
CREATE INDEX IF NOT EXISTS idx_learning_maps_cover_image_url
ON learning_maps (cover_image_url)
WHERE cover_image_url IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN learning_maps.cover_image_url IS 'Public URL to the optimized cover image stored in Backblaze B2';
COMMENT ON COLUMN learning_maps.cover_image_blurhash IS 'Blurhash string for placeholder while image loads';
COMMENT ON COLUMN learning_maps.cover_image_key IS 'Backblaze B2 file key for deletion and management';
COMMENT ON COLUMN learning_maps.cover_image_updated_at IS 'Timestamp when cover image was last updated';

-- Create function to update cover_image_updated_at on image changes
CREATE OR REPLACE FUNCTION update_cover_image_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.cover_image_url IS DISTINCT FROM NEW.cover_image_url OR
      OLD.cover_image_key IS DISTINCT FROM NEW.cover_image_key) THEN
    NEW.cover_image_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
DROP TRIGGER IF EXISTS trigger_update_cover_image_timestamp ON learning_maps;
CREATE TRIGGER trigger_update_cover_image_timestamp
  BEFORE UPDATE ON learning_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_cover_image_timestamp();

-- Create function to cleanup orphaned images (to be used by cleanup service)
CREATE OR REPLACE FUNCTION get_orphaned_image_keys(older_than_hours INTEGER DEFAULT 24)
RETURNS TABLE(image_key TEXT, last_updated TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lm.cover_image_key::TEXT,
    lm.cover_image_updated_at
  FROM learning_maps lm
  WHERE lm.cover_image_key IS NOT NULL
    AND lm.cover_image_updated_at < NOW() - INTERVAL '1 hour' * older_than_hours
    AND (lm.cover_image_url IS NULL OR lm.cover_image_url = '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON learning_maps TO authenticated;
GRANT EXECUTE ON FUNCTION get_orphaned_image_keys TO authenticated;