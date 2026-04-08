-- Disable RLS on hackathon comments tables
-- Hackathon uses custom auth (tokens in hackathon_sessions) not Supabase Auth
-- Authorization is handled at the application level

-- Disable RLS on comments table
ALTER TABLE public.hackathon_activity_comments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on replies table
ALTER TABLE public.hackathon_activity_comment_replies DISABLE ROW LEVEL SECURITY;

-- Disable RLS on push tokens table
ALTER TABLE public.hackathon_participant_push_tokens DISABLE ROW LEVEL SECURITY;

-- Drop all policies (they won't be used anymore)
DROP POLICY IF EXISTS "Participants can view comments" ON public.hackathon_activity_comments;
DROP POLICY IF EXISTS "Participants can insert own comments" ON public.hackathon_activity_comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.hackathon_activity_comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.hackathon_activity_comments;
DROP POLICY IF EXISTS "Admins and mentors can delete any comment" ON public.hackathon_activity_comments;

DROP POLICY IF EXISTS "Participants can view replies" ON public.hackathon_activity_comment_replies;
DROP POLICY IF EXISTS "Participants can insert own replies" ON public.hackathon_activity_comment_replies;
DROP POLICY IF EXISTS "Authors can update own replies" ON public.hackathon_activity_comment_replies;
DROP POLICY IF EXISTS "Authors can delete own replies" ON public.hackathon_activity_comment_replies;
DROP POLICY IF EXISTS "Admins and mentors can delete any reply" ON public.hackathon_activity_comment_replies;

DROP POLICY IF EXISTS "Participants can view own push tokens" ON public.hackathon_participant_push_tokens;
DROP POLICY IF EXISTS "Participants can insert own push tokens" ON public.hackathon_participant_push_tokens;
DROP POLICY IF EXISTS "Participants can update own push tokens" ON public.hackathon_participant_push_tokens;
DROP POLICY IF EXISTS "Participants can delete own push tokens" ON public.hackathon_participant_push_tokens;
