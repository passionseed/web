-- Mentor Booking System
-- Tables: mentor_profiles, mentor_availability, mentor_bookings, mentor_team_assignments, mentor_auth_sessions

-- Enums
DO $$ BEGIN
  CREATE TYPE mentor_session_type AS ENUM ('healthcare', 'group');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE mentor_booking_status AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- mentor_profiles
CREATE TABLE IF NOT EXISTS public.mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  profession TEXT NOT NULL DEFAULT '',
  institution TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  session_type mentor_session_type NOT NULL DEFAULT 'healthcare',
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mentor_profiles_user_id_key UNIQUE (user_id)
);

-- mentor_availability (weekly recurring slots)
CREATE TABLE IF NOT EXISTS public.mentor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  CONSTRAINT mentor_availability_unique_slot UNIQUE (mentor_id, day_of_week, hour)
);

-- mentor_bookings
CREATE TABLE IF NOT EXISTS public.mentor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slot_datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  status mentor_booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- mentor_team_assignments
CREATE TABLE IF NOT EXISTS public.mentor_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  hackathon_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- mentor_auth_sessions (session tokens for mentor portal login)
CREATE TABLE IF NOT EXISTS public.mentor_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS mentor_profiles_email_idx ON public.mentor_profiles(email);
CREATE INDEX IF NOT EXISTS mentor_availability_mentor_idx ON public.mentor_availability(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_bookings_mentor_idx ON public.mentor_bookings(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_bookings_student_idx ON public.mentor_bookings(student_id);
CREATE INDEX IF NOT EXISTS mentor_bookings_status_idx ON public.mentor_bookings(status);
CREATE INDEX IF NOT EXISTS mentor_team_assignments_mentor_idx ON public.mentor_team_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_auth_sessions_token_idx ON public.mentor_auth_sessions(token);
CREATE INDEX IF NOT EXISTS mentor_auth_sessions_mentor_idx ON public.mentor_auth_sessions(mentor_id);

-- updated_at trigger for mentor_profiles
CREATE OR REPLACE FUNCTION update_mentor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mentor_profiles_timestamp ON public.mentor_profiles;
CREATE TRIGGER update_mentor_profiles_timestamp
  BEFORE UPDATE ON public.mentor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_mentor_profiles_updated_at();

-- RLS
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_auth_sessions ENABLE ROW LEVEL SECURITY;

-- mentor_profiles policies
DROP POLICY IF EXISTS "Approved mentor profiles are public" ON public.mentor_profiles;
CREATE POLICY "Approved mentor profiles are public" ON public.mentor_profiles
  FOR SELECT USING (is_approved = TRUE);

DROP POLICY IF EXISTS "Mentors can view own profile" ON public.mentor_profiles;
CREATE POLICY "Mentors can view own profile" ON public.mentor_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Mentors can update own profile" ON public.mentor_profiles;
CREATE POLICY "Mentors can update own profile" ON public.mentor_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- mentor_availability policies
DROP POLICY IF EXISTS "Mentor availability is public" ON public.mentor_availability;
CREATE POLICY "Mentor availability is public" ON public.mentor_availability
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Mentors manage own availability" ON public.mentor_availability;
CREATE POLICY "Mentors manage own availability" ON public.mentor_availability
  FOR ALL USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid())
  );

-- mentor_bookings policies
DROP POLICY IF EXISTS "Mentors see own bookings" ON public.mentor_bookings;
CREATE POLICY "Mentors see own bookings" ON public.mentor_bookings
  FOR SELECT USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students see own bookings" ON public.mentor_bookings;
CREATE POLICY "Students see own bookings" ON public.mentor_bookings
  FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can create bookings" ON public.mentor_bookings;
CREATE POLICY "Students can create bookings" ON public.mentor_bookings
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- mentor_team_assignments policies
DROP POLICY IF EXISTS "Mentors see own assignments" ON public.mentor_team_assignments;
CREATE POLICY "Mentors see own assignments" ON public.mentor_team_assignments
  FOR SELECT USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid())
  );

-- mentor_auth_sessions: service-role only, no public RLS policies needed
