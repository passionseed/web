-- Fix RLS policies for hackathon comments to use hackathon token instead of auth.uid()

-- ============================================
-- SECTION 1: CREATE HELPER FUNCTION
-- ============================================

-- Function to get current hackathon participant ID from JWT token
CREATE OR REPLACE FUNCTION public.get_hackathon_participant_id()
RETURNS UUID AS $$
DECLARE
    token TEXT;
    participant_id UUID;
BEGIN
    -- Get token from JWT claims
    token := current_setting('request.jwt.claims', true)::json->>'hackathon_token';
    
    -- If no token, return NULL
    IF token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Look up participant_id from session
    SELECT hs.participant_id INTO participant_id
    FROM public.hackathon_sessions hs
    WHERE hs.token = token
    AND hs.expires_at > NOW();
    
    RETURN participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 2: DROP OLD POLICIES
-- ============================================

DROP POLICY IF EXISTS "Participants can insert own comments" ON public.hackathon_activity_comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.hackathon_activity_comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.hackathon_activity_comments;
DROP POLICY IF EXISTS "Admins and mentors can delete any comment" ON public.hackathon_activity_comments;

DROP POLICY IF EXISTS "Participants can insert own replies" ON public.hackathon_activity_comment_replies;
DROP POLICY IF EXISTS "Authors can update own replies" ON public.hackathon_activity_comment_replies;
DROP POLICY IF EXISTS "Authors can delete own replies" ON public.hackathon_activity_comment_replies;
DROP POLICY IF EXISTS "Admins and mentors can delete any reply" ON public.hackathon_activity_comment_replies;

DROP POLICY IF EXISTS "Participants can view own push tokens" ON public.hackathon_participant_push_tokens;
DROP POLICY IF EXISTS "Participants can insert own push tokens" ON public.hackathon_participant_push_tokens;
DROP POLICY IF EXISTS "Participants can update own push tokens" ON public.hackathon_participant_push_tokens;
DROP POLICY IF EXISTS "Participants can delete own push tokens" ON public.hackathon_participant_push_tokens;

-- ============================================
-- SECTION 3: NEW POLICIES FOR COMMENTS
-- ============================================

-- Policy: Participants can insert their own comments
CREATE POLICY "Participants can insert own comments"
    ON public.hackathon_activity_comments
    FOR INSERT
    WITH CHECK (participant_id = public.get_hackathon_participant_id());

-- Policy: Authors can update their own non-deleted comments
CREATE POLICY "Authors can update own comments"
    ON public.hackathon_activity_comments
    FOR UPDATE
    USING (participant_id = public.get_hackathon_participant_id() AND deleted_at IS NULL)
    WITH CHECK (participant_id = public.get_hackathon_participant_id());

-- Policy: Authors can delete their own comments
CREATE POLICY "Authors can delete own comments"
    ON public.hackathon_activity_comments
    FOR DELETE
    USING (participant_id = public.get_hackathon_participant_id());

-- Policy: Admins and mentors can delete any comment
CREATE POLICY "Admins and mentors can delete any comment"
    ON public.hackathon_activity_comments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.hackathon_participants hp
            WHERE hp.id = public.get_hackathon_participant_id()
            AND hp.role IN ('admin', 'mentor', 'organizer')
        )
    );

-- ============================================
-- SECTION 4: NEW POLICIES FOR REPLIES
-- ============================================

-- Policy: Participants can insert their own replies
CREATE POLICY "Participants can insert own replies"
    ON public.hackathon_activity_comment_replies
    FOR INSERT
    WITH CHECK (participant_id = public.get_hackathon_participant_id());

-- Policy: Authors can update their own non-deleted replies
CREATE POLICY "Authors can update own replies"
    ON public.hackathon_activity_comment_replies
    FOR UPDATE
    USING (participant_id = public.get_hackathon_participant_id() AND deleted_at IS NULL)
    WITH CHECK (participant_id = public.get_hackathon_participant_id());

-- Policy: Authors can delete their own replies
CREATE POLICY "Authors can delete own replies"
    ON public.hackathon_activity_comment_replies
    FOR DELETE
    USING (participant_id = public.get_hackathon_participant_id());

-- Policy: Admins and mentors can delete any reply
CREATE POLICY "Admins and mentors can delete any reply"
    ON public.hackathon_activity_comment_replies
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.hackathon_participants hp
            WHERE hp.id = public.get_hackathon_participant_id()
            AND hp.role IN ('admin', 'mentor', 'organizer')
        )
    );

-- ============================================
-- SECTION 5: NEW POLICIES FOR PUSH TOKENS
-- ============================================

-- Policy: Participants can view their own push tokens
CREATE POLICY "Participants can view own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR SELECT
    USING (participant_id = public.get_hackathon_participant_id());

-- Policy: Participants can insert their own push tokens
CREATE POLICY "Participants can insert own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR INSERT
    WITH CHECK (participant_id = public.get_hackathon_participant_id());

-- Policy: Participants can update their own push tokens
CREATE POLICY "Participants can update own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR UPDATE
    USING (participant_id = public.get_hackathon_participant_id())
    WITH CHECK (participant_id = public.get_hackathon_participant_id());

-- Policy: Participants can delete their own push tokens
CREATE POLICY "Participants can delete own push tokens"
    ON public.hackathon_participant_push_tokens
    FOR DELETE
    USING (participant_id = public.get_hackathon_participant_id());
