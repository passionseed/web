-- Add logo_url column to tcas_universities for storing university logo CDN URLs

ALTER TABLE public.tcas_universities 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tcas_universities_logo_url ON tcas_universities(logo_url);
