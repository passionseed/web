-- Migration: Add group submission mode configuration
-- This adds support for controlling whether all group members must submit or just one

BEGIN;

-- ========================================
-- 1. ADD GROUP SUBMISSION MODE TO NODE_ASSESSMENTS
-- ========================================

-- Add group submission mode configuration to node_assessments
ALTER TABLE public.node_assessments 
ADD COLUMN IF NOT EXISTS group_submission_mode TEXT DEFAULT 'all_members';

-- Add constraint for group submission mode values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'node_assessments_group_submission_mode_check'
        AND table_name = 'node_assessments'
    ) THEN
        ALTER TABLE public.node_assessments
        ADD CONSTRAINT node_assessments_group_submission_mode_check
        CHECK (group_submission_mode IN ('all_members', 'single_submission'));
    END IF;
END $$;

-- Add index for group submission mode
CREATE INDEX IF NOT EXISTS idx_node_assessments_group_submission_mode 
ON public.node_assessments(group_submission_mode) WHERE is_group_assessment = true;

-- ========================================
-- 2. UPDATE EXISTING RECORDS
-- ========================================

-- Set default mode for existing group assessments
UPDATE public.node_assessments 
SET group_submission_mode = 'all_members' 
WHERE is_group_assessment = true AND group_submission_mode IS NULL;

-- ========================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON COLUMN public.node_assessments.group_submission_mode IS 
'Controls group submission behavior: all_members (everyone must submit) or single_submission (one person submits for all)';

COMMIT;