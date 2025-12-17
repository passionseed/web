-- Fix mentor_sessions foreign keys to reference profiles instead of auth.users
-- This allows PostgREST embedded queries to work properly

-- Drop existing foreign keys
ALTER TABLE public.mentor_sessions
    DROP CONSTRAINT IF EXISTS mentor_sessions_student_id_fkey,
    DROP CONSTRAINT IF EXISTS mentor_sessions_mentor_id_fkey;

-- Add foreign keys to profiles table
ALTER TABLE public.mentor_sessions
    ADD CONSTRAINT mentor_sessions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.mentor_sessions
    ADD CONSTRAINT mentor_sessions_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update RLS policies to ensure students can also update their sessions (for cancellation)
DROP POLICY IF EXISTS "Students can update own sessions" ON public.mentor_sessions;
CREATE POLICY "Students can update own sessions" ON public.mentor_sessions
    FOR UPDATE
    USING (student_id = auth.uid());
