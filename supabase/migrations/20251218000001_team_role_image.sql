-- Add team_role_image_url to map_nodes
ALTER TABLE map_nodes
ADD COLUMN IF NOT EXISTS team_role_image_url TEXT;
