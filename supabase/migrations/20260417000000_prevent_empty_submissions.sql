-- Add validation to prevent empty submissions
-- Empty submissions have no text_answer, no image_url, and no file_urls

-- First, clean up any existing empty submissions
DELETE FROM public.hackathon_phase_activity_submissions
WHERE text_answer IS NULL 
  AND image_url IS NULL 
  AND (file_urls IS NULL OR file_urls = '{}');

-- Add check constraint to prevent future empty submissions
-- This ensures at least one field has content
ALTER TABLE public.hackathon_phase_activity_submissions
ADD CONSTRAINT check_not_empty_submission
CHECK (
  text_answer IS NOT NULL 
  OR image_url IS NOT NULL 
  OR (file_urls IS NOT NULL AND array_length(file_urls, 1) > 0)
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT check_not_empty_submission ON public.hackathon_phase_activity_submissions 
IS 'Prevents submissions with no content - must have text, image, or files';
