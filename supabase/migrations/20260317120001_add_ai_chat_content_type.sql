-- =====================================================
-- ADD AI_CHAT CONTENT TYPE TO PATH_CONTENT
-- Updates the check constraint to allow ai_chat content type
-- =====================================================

-- Drop the existing check constraint
ALTER TABLE public.path_content
  DROP CONSTRAINT IF EXISTS path_content_content_type_check;

-- Add updated check constraint with ai_chat included
ALTER TABLE public.path_content
  ADD CONSTRAINT path_content_content_type_check
  CHECK (content_type IN (
    -- Inherited from nodes
    'video',
    'short_video',
    'canva_slide',
    'text',
    'image',
    'pdf',
    'resource_link',
    'order_code',
    -- PathLab-specific content types
    'daily_prompt',
    'reflection_card',
    'emotion_check',
    'progress_snapshot',
    'ai_chat'
  ));

-- Update comment
COMMENT ON COLUMN public.path_content.content_type IS 'Type of learning content - includes ai_chat for AI-powered conversations';
