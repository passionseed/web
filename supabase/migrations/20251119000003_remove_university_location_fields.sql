-- Remove location fields from universities table
-- Remove country, state, and city columns as they are no longer needed

-- Drop the index that references country and state
DROP INDEX IF EXISTS idx_universities_country_state;

-- Drop the location columns
ALTER TABLE public.universities 
DROP COLUMN IF EXISTS country,
DROP COLUMN IF EXISTS state, 
DROP COLUMN IF EXISTS city;