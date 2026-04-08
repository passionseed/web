-- Migration: Create Activity Comments System
-- Description: Tables, indexes, triggers, and RLS policies for hackathon activity comments
-- Created: 2026-04-06

-- ============================================
-- SECTION 1: CREATE TABLES
-- ============================================

-- Table: hackathon_activity_comments
-- Stores comments on hackathon phase activities
CREATE TABLE IF NOT EXISTS public.hackathon_activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 500),
    engagement_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    is_edited BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE public.hackathon_activity_comments IS 'Comments on hackathon phase activities';
COMMENT ON COLUMN public.hackathon_activity_comments.engagement_score IS 'Calculated score based on reply count * 2';
COMMENT ON COLUMN public.hackathon_activity_comments.deleted_at IS 'Soft delete timestamp';

-- Table: hackathon_activity_comment_replies
-- Stores replies to activity comments
CREATE TABLE IF NOT EXISTS public.hackathon_activity_comment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.hackathon_activity_comments(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    is_edited BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE public.hackathon_activity_comment_replies IS 'Replies to activity comments';
COMMENT ON COLUMN public.hackathon_activity_comment_replies.deleted_at IS 'Soft delete timestamp';

-- Table: hackathon_participant_push_tokens
-- Stores push notification tokens for participants
CREATE TABLE IF NOT EXISTS public.hackathon_participant_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.hackathon_participant_push_tokens IS 'Push notification tokens for hackathon participants';
COMMENT ON COLUMN public.hackathon_participant_push_tokens.platform IS 'Device platform: ios, android, or web';

-- ============================================
-- SECTION 2: CREATE INDEXES
-- ============================================

-- Index for fetching comments by activity with soft delete filter
CREATE INDEX IF NOT EXISTS idx_comments_activity 
ON public.hackathon_activity_comments(activity_id, deleted_at);

-- Index for sorting comments by engagement score
CREATE INDEX IF NOT EXISTS idx_comments_engagement 
ON public.hackathon_activity_comments(activity_id, engagement_score DESC NULLS LAST);

-- Index for fetching replies by comment with soft delete filter
CREATE INDEX IF NOT EXISTS idx_replies_comment 
ON public.hackathon_activity_comment_replies(comment_id, deleted_at);

-- Index for fetching push tokens by participant
CREATE INDEX IF NOT EXISTS idx_push_tokens_participant 
ON public.hackathon_participant_push_tokens(participant_id);

-- ============================================
-- SECTION 3: CREATE ENGAGEMENT SCORE FUNCTION AND TRIGGERS
-- ============================================

-- Function: update_comment_engagement_score
-- Updates parent comment's engagement_score based on reply count
CREATE OR REPLACE FUNCTION public.update_comment_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
    reply_count INTEGER;
    target_comment_id UUID;
BEGIN
    -- Determine which comment_id to update
    IF TG_OP = 'INSERT' THEN
        target_comment_id := NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        target_comment_id := OLD.comment_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If comment_id changed (unlikely but possible), update both
        IF OLD.comment_id IS DISTINCT FROM NEW.comment_id THEN
            -- Update old comment
            SELECT COUNT(*) INTO reply_count 
            FROM public.hackathon_activity_comment_replies 
            WHERE comment_id = OLD.comment_id AND deleted_at IS NULL;
            
            UPDATE public.hackathon_activity_comments 
            SET engagement_score = reply_count * 2 
            WHERE id = OLD.comment_id;
            
            -- Update new comment
            target_comment_id := NEW.comment_id;
        ELSE
            target_comment_id := NEW.comment_id;
        END IF;
    END IF;
    
    -- Count non-deleted replies for the target comment
    SELECT COUNT(*) INTO reply_count 
    FROM public.hackathon_activity_comment_replies 
    WHERE comment_id = target_comment_id AND deleted_at IS NULL;
    
    -- Update engagement score (reply count * 2)
    UPDATE public.hackathon_activity_comments 
    SET engagement_score = reply_count * 2 
    WHERE id = target_comment_id;
    
    -- Return appropriate row based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_comment_engagement_score() IS 'Updates parent comment engagement_score based on reply count * 2';

-- Trigger: Update engagement score on reply insert
DROP TRIGGER IF EXISTS trg_update_engagement_on_insert ON public.hackathon_activity_comment_replies;
CREATE TRIGGER trg_update_engagement_on_insert
    AFTER INSERT ON public.hackathon_activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_comment_engagement_score();

-- Trigger: Update engagement score on reply delete
DROP TRIGGER IF EXISTS trg_update_engagement_on_delete ON public.hackathon_activity_comment_replies;
CREATE TRIGGER trg_update_engagement_on_delete
    AFTER DELETE ON public.hackathon_activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_comment_engagement_score();

-- Trigger: Update engagement score on reply update (handles soft delete)
DROP TRIGGER IF EXISTS trg_update_engagement_on_update ON public.hackathon_activity_comment_replies;
CREATE TRIGGER trg_update_engagement_on_update
    AFTER UPDATE ON public.hackathon_activity_comment_replies
    FOR EACH ROW
    WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION public.update_comment_engagement_score();

-- ============================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on comment tables
ALTER TABLE public.hackathon_activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_activity_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_participant_push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECTION 5: RLS POLICIES FOR COMMENTS
-- ============================================

-- Policy: Participants can view all non-deleted comments
DROP POLICY IF EXISTS "Participants can view comments" ON public.hackathon_activity_comments;
CREATE POLICY "Participants can view comments"
    ON public.hackathon_activity_comments
    FOR SELECT
    USING (deleted_at IS NULL);

-- Policy: Participants can insert their own comments
DROP POLICY IF EXISTS "Participants can insert own comments" ON public.hackathon_activity_comments;
CREATE POLICY "Participants can insert own comments"
    ON public.hackathon_activity_comments
    FOR INSERT
    WITH CHECK (participant_id = auth.uid());

-- Policy: Authors can update their own non-deleted comments
DROP POLICY IF EXISTS "Authors can update own comments" ON public.hackathon_activity_comments;
CREATE POLICY "Authors can update own comments"
    ON public.hackathon_activity_comments
    FOR UPDATE
    USING (participant_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (participant_id = auth.uid());

-- Policy: Authors can delete their own comments
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.hackathon_activity_comments;
CREATE POLICY "Authors can delete own comments"
    ON public.hackathon_activity_comments
    FOR DELETE
    USING (participant_id = auth.uid());

-- Policy: Admins and mentors can delete any comment
DROP POLICY IF EXISTS "Admins and mentors can delete any comment" ON public.hackathon_activity_comments;
CREATE POLICY "Admins and mentors can delete any comment"
    ON public.hackathon_activity_comments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.hackathon_participants hp
            WHERE hp.id = auth.uid() 
            AND hp.role IN ('admin', 'mentor')
        )
    );

-- ============================================
-- SECTION 6: RLS POLICIES FOR REPLIES
-- ============================================

-- Policy: Participants can view all non-deleted replies
DROP POLICY IF EXISTS "Participants can view replies" ON public.hackathon_activity_comment_replies;
CREATE POLICY "Participants can view replies"
    ON public.hackathon_activity_comment_replies
    FOR SELECT
    USING (deleted_at IS NULL);

-- Policy: Participants can insert their own replies
DROP POLICY IF EXISTS "Participants can insert own replies" ON public.hackathon_activity_comment_replies;
CREATE POLICY "Participants can insert own replies"
    ON public.hackathon_activity_comment_replies
    FOR INSERT
    WITH CHECK (participant_id = auth.uid());

-- Policy: Authors can update their own non-deleted replies
DROP POLICY IF EXISTS "Authors can update own replies" ON public.hackathon_activity_comment_replies;
CREATE POLICY "Authors can update own replies"
    ON public.hackathon_activity_comment_replies
    FOR UPDATE
    USING (participant_id = auth.uid() AND deleted_at IS NULL)
    WITH CHECK (participant_id = auth.uid());

-- Policy: Authors can delete their own replies
DROP POLICY IF EXISTS "Authors can delete own replies" ON public.hackathon_activity_comment_replies;
CREATE POLICY "Authors can delete own replies"
    ON public.hackathon_activity_comment_replies
    FOR DELETE
    USING (participant_id = auth.uid());

-- Policy: Admins and mentors can delete any reply
DROP POLICY IF EXISTS "Admins and mentors can delete any reply" ON public.hackathon_activity_comment_replies;
CREATE POLICY "Admins and mentors can delete any reply"
    ON public.hackathon_activity_comment_replies
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.hackathon_participants hp
            WHERE hp.id = auth.uid() 
            AND hp.role IN ('admin', 'mentor')
        )
    );

-- ============================================
-- SECTION 7: RLS POLICIES FOR PUSH TOKENS
-- ============================================

-- Policy: Participants can view their own push tokens
DROP POLICY IF EXISTS "Participants can view own push tokens" ON public.hackathon_participant_push_tokens;
CREATE POLICY "Participants can view own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR SELECT
    USING (participant_id = auth.uid());

-- Policy: Participants can insert their own push tokens
DROP POLICY IF EXISTS "Participants can insert own push tokens" ON public.hackathon_participant_push_tokens;
CREATE POLICY "Participants can insert own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR INSERT
    WITH CHECK (participant_id = auth.uid());

-- Policy: Participants can update their own push tokens
DROP POLICY IF EXISTS "Participants can update own push tokens" ON public.hackathon_participant_push_tokens;
CREATE POLICY "Participants can update own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR UPDATE
    USING (participant_id = auth.uid())
    WITH CHECK (participant_id = auth.uid());

-- Policy: Participants can delete their own push tokens
DROP POLICY IF EXISTS "Participants can delete own push tokens" ON public.hackathon_participant_push_tokens;
CREATE POLICY "Participants can delete own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR DELETE
    USING (participant_id = auth.uid());

-- ============================================
-- SECTION 8: AUTO-UPDATE TRIGGER FOR updated_at
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments
DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.hackathon_activity_comments;
CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON public.hackathon_activity_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for replies
DROP TRIGGER IF EXISTS trg_replies_updated_at ON public.hackathon_activity_comment_replies;
CREATE TRIGGER trg_replies_updated_at
    BEFORE UPDATE ON public.hackathon_activity_comment_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for push tokens
DROP TRIGGER IF EXISTS trg_push_tokens_updated_at ON public.hackathon_participant_push_tokens;
CREATE TRIGGER trg_push_tokens_updated_at
    BEFORE UPDATE ON public.hackathon_participant_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
