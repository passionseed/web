-- =====================================================
-- ADD SHORT_VIDEO CONTENT TYPE TO PATH_CONTENT
-- Adds 'short_video' to the allowed content types
-- =====================================================

-- Drop existing constraint
ALTER TABLE public.path_content
DROP CONSTRAINT IF EXISTS path_content_content_type_check;

-- Add new constraint with short_video included
ALTER TABLE public.path_content
ADD CONSTRAINT path_content_content_type_check
CHECK (content_type = ANY (ARRAY[
  'video'::text,
  'short_video'::text,
  'canva_slide'::text,
  'text'::text,
  'image'::text,
  'pdf'::text,
  'resource_link'::text,
  'order_code'::text,
  'daily_prompt'::text,
  'reflection_card'::text,
  'emotion_check'::text,
  'progress_snapshot'::text
]));

COMMENT ON CONSTRAINT path_content_content_type_check ON public.path_content IS 'Allowed content types including short_video for short-form content under 2 minutes';
