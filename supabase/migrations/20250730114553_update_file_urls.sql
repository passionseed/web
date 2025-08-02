-- Update assessment_submissions table to support multiple file URLs
ALTER TABLE public.assessment_submissions 
  DROP COLUMN IF EXISTS file_url,
  ADD COLUMN file_urls text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.assessment_submissions.file_urls IS 'Array of file URLs for multiple file uploads';

-- Update any existing data if needed (this migration assumes no existing critical data)
-- If there's existing data in file_url, you might want to migrate it first before dropping
