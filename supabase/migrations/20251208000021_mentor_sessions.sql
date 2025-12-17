-- Create mentor_sessions table for tracking scheduled mentor sessions
CREATE TABLE IF NOT EXISTS public.mentor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.seed_rooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS mentor_sessions_room_idx ON public.mentor_sessions(room_id);
CREATE INDEX IF NOT EXISTS mentor_sessions_student_idx ON public.mentor_sessions(student_id);
CREATE INDEX IF NOT EXISTS mentor_sessions_mentor_idx ON public.mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_sessions_status_idx ON public.mentor_sessions(status);

-- Enable RLS
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Students can view their own sessions
DROP POLICY IF EXISTS "Students can view own sessions" ON public.mentor_sessions;
CREATE POLICY "Students can view own sessions" ON public.mentor_sessions
    FOR SELECT
    USING (student_id = auth.uid());

-- Students can create sessions
DROP POLICY IF EXISTS "Students can create sessions" ON public.mentor_sessions;
CREATE POLICY "Students can create sessions" ON public.mentor_sessions
    FOR INSERT
    WITH CHECK (student_id = auth.uid());

-- Mentors/Admins/Instructors can view sessions assigned to them
DROP POLICY IF EXISTS "Mentors can view assigned sessions" ON public.mentor_sessions;
CREATE POLICY "Mentors can view assigned sessions" ON public.mentor_sessions
    FOR SELECT
    USING (
        mentor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Mentors/Admins can update sessions
DROP POLICY IF EXISTS "Mentors can update sessions" ON public.mentor_sessions;
CREATE POLICY "Mentors can update sessions" ON public.mentor_sessions
    FOR UPDATE
    USING (
        mentor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'instructor')
        )
    );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_mentor_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mentor_sessions_timestamp ON public.mentor_sessions;
CREATE TRIGGER update_mentor_sessions_timestamp
    BEFORE UPDATE ON public.mentor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_sessions_updated_at();

-- Comments
COMMENT ON TABLE public.mentor_sessions IS 'Tracks scheduled mentor sessions for seed rooms';
COMMENT ON COLUMN public.mentor_sessions.status IS 'pending: awaiting confirmation, confirmed: mentor confirmed, completed: session done, cancelled: cancelled by either party';
