-- =====================================================
-- SIMPLIFY PATHLAB CONTENT AND ASSESSMENT TYPES
-- Remove unused content types and assessment types
-- Keeping content: video, short_video, canva_slide, text, image, pdf, ai_chat, npc_chat
-- Removing content: resource_link, order_code, daily_prompt, reflection_card, emotion_check, progress_snapshot
-- Keeping assessment: text_answer, file_upload, image_upload
-- Removing assessment: quiz, checklist, daily_reflection, interest_rating, energy_check
-- =====================================================

-- Migrate resource_link rows: move URL into content_body, change type to text
UPDATE public.path_content
SET
  content_type = 'text',
  content_body = COALESCE(content_body, '') || CASE WHEN content_url IS NOT NULL THEN E'\n\nLink: ' || content_url ELSE '' END,
  content_url = NULL
WHERE content_type = 'resource_link';

-- Migrate remaining removed types to text
UPDATE public.path_content
SET content_type = 'text'
WHERE content_type IN ('daily_prompt', 'reflection_card', 'emotion_check', 'progress_snapshot', 'order_code');

-- path_content: replace constraint with simplified enum
ALTER TABLE public.path_content
  DROP CONSTRAINT IF EXISTS path_content_content_type_check;

ALTER TABLE public.path_content
  ADD CONSTRAINT path_content_content_type_check
  CHECK (content_type IN (
    'video',
    'short_video',
    'canva_slide',
    'text',
    'image',
    'pdf',
    'ai_chat',
    'npc_chat'
  ));

-- path_assessments: replace constraint with simplified enum
ALTER TABLE public.path_assessments
  DROP CONSTRAINT IF EXISTS path_assessments_assessment_type_check;

ALTER TABLE public.path_assessments
  ADD CONSTRAINT path_assessments_assessment_type_check
  CHECK (assessment_type IN (
    'text_answer',
    'file_upload',
    'image_upload'
  ));

COMMENT ON COLUMN public.path_content.content_type IS 'Allowed: video, short_video, canva_slide, text, image, pdf, ai_chat, npc_chat';
COMMENT ON COLUMN public.path_assessments.assessment_type IS 'Allowed: text_answer, file_upload, image_upload';
