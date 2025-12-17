-- Add slogan column to seeds table
ALTER TABLE public.seeds
ADD COLUMN IF NOT EXISTS slogan TEXT DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN public.seeds.slogan IS 'Short catchy phrase displayed under the title';
