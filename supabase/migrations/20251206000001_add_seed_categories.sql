-- Create seed_categories table
CREATE TABLE IF NOT EXISTS seed_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id to seeds table
ALTER TABLE seeds 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES seed_categories(id) ON DELETE SET NULL;

-- Insert default categories
INSERT INTO seed_categories (name) VALUES
  ('Workshop'),
  ('Course'),
  ('Event'),
  ('Tutorial')
ON CONFLICT (name) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_seeds_category_id ON seeds(category_id);

-- RLS policies for seed_categories
ALTER TABLE seed_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seed categories are viewable by everyone" ON seed_categories;
CREATE POLICY "Seed categories are viewable by everyone" 
  ON seed_categories FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Seed categories are insertable by admins" ON seed_categories;
CREATE POLICY "Seed categories are insertable by admins" 
  ON seed_categories FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Seed categories are updatable by admins" ON seed_categories;
CREATE POLICY "Seed categories are updatable by admins" 
  ON seed_categories FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Seed categories are deletable by admins" ON seed_categories;
CREATE POLICY "Seed categories are deletable by admins" 
  ON seed_categories FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
