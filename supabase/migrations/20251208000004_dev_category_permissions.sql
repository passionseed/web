-- Temporary development-friendly permissions for seed categories
-- In production, these should be restricted to admin users

-- Drop the restrictive policies temporarily
DROP POLICY IF EXISTS "Seed categories are insertable by admins" ON seed_categories;
DROP POLICY IF EXISTS "Seed categories are updatable by admins" ON seed_categories;
DROP POLICY IF EXISTS "Seed categories are deletable by admins" ON seed_categories;

-- Create more permissive policies for development
CREATE POLICY "Authenticated users can manage seed categories (dev)" 
  ON seed_categories FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comment for clarity
COMMENT ON POLICY "Authenticated users can manage seed categories (dev)" ON seed_categories 
IS 'Development policy - allows authenticated users to manage categories. Replace with admin-only policies in production.';