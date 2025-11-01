-- Create north_stars table
-- North Stars are long-term guiding goals that journey projects can link to

CREATE TABLE IF NOT EXISTS north_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  why TEXT, -- Why this North Star matters to the user
  icon TEXT DEFAULT '⭐',
  
  -- SDG alignment
  sdg_goals INTEGER[] DEFAULT '{}', -- Array of SDG goal numbers (1-17)
  
  -- Career path
  career_path TEXT, -- e.g., 'technology', 'healthcare', 'education'
  
  -- Visual customization
  north_star_shape TEXT DEFAULT 'classic', -- 'classic', 'sparkle', 'shooting', etc.
  north_star_color TEXT DEFAULT 'golden', -- 'golden', 'amber', 'blue', etc.
  
  -- Position for visualization
  position_x DECIMAL,
  position_y DECIMAL,
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'on_hold', 'archived')),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  achieved_at TIMESTAMPTZ
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_north_stars_user_id ON north_stars(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_north_stars_status ON north_stars(status);

-- Enable RLS
ALTER TABLE north_stars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own north stars"
  ON north_stars
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own north stars"
  ON north_stars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own north stars"
  ON north_stars
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own north stars"
  ON north_stars
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_north_stars_updated_at
  BEFORE UPDATE ON north_stars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add north_star_id column to journey_projects table to link projects to north stars
ALTER TABLE journey_projects
  ADD COLUMN IF NOT EXISTS linked_north_star_id UUID REFERENCES north_stars(id) ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_journey_projects_linked_north_star_id 
  ON journey_projects(linked_north_star_id);

-- Add comment
COMMENT ON TABLE north_stars IS 'Long-term guiding goals that users work towards through their journey projects';
COMMENT ON COLUMN north_stars.sdg_goals IS 'Array of UN Sustainable Development Goal numbers (1-17) that this North Star aligns with';
COMMENT ON COLUMN north_stars.career_path IS 'Career path category this North Star aligns with';
COMMENT ON COLUMN north_stars.north_star_shape IS 'Visual icon shape for the North Star (classic, sparkle, shooting, glowing, compass, target, diamond, crown)';
COMMENT ON COLUMN north_stars.north_star_color IS 'Color theme for the North Star (golden, amber, rose, silver, blue, purple, green, orange)';
