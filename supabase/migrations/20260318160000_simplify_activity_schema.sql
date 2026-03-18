-- =====================================================
-- SIMPLIFY ACTIVITY SCHEMA
-- Remove activity_type, use content_type as primary type
-- Each activity has ONE content or ONE assessment (not both)
-- =====================================================

-- Step 1: Remove activity_type from path_activities
ALTER TABLE public.path_activities
  DROP COLUMN IF EXISTS activity_type;

-- Step 2: Remove the npc_dialogue activity_type check constraint (no longer needed)
-- (Already removed with the column)

-- Step 3: Update comments
COMMENT ON TABLE public.path_activities IS 'Learning activities within PathLab days - type determined by content_type in path_content or assessment_type in path_assessments';

-- =====================================================
-- NOTES FOR DEVELOPERS
-- =====================================================
-- After this migration:
-- - Activities no longer have activity_type
-- - An activity's type is determined by:
--   * content_type from path_content (if has content)
--   * assessment_type from path_assessments (if has assessment)
-- - Each activity should have EITHER content OR assessment, not both
-- - Use content_type values: 'npc_chat', 'ai_chat', 'video', 'text', etc.
-- - Use assessment_type values: 'quiz', 'daily_reflection', 'daily_prompt', etc.
