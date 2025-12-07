-- Add logo_url column to seed_categories table
ALTER TABLE seed_categories 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_seed_categories_logo_url ON seed_categories(logo_url);
