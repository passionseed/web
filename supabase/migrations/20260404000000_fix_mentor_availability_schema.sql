-- Fix mentor_availability table: replace start_time/end_time schema with hour-based schema
-- The old migration (20251208000023) created the table with start_time/end_time columns.
-- The booking system (20260403100000) expects an 'hour' integer column instead.

DROP TABLE IF EXISTS public.mentor_availability;

CREATE TABLE public.mentor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour INT NOT NULL CHECK (hour >= 0 AND hour <= 23),
  CONSTRAINT mentor_availability_unique_slot UNIQUE (mentor_id, day_of_week, hour)
);

CREATE INDEX IF NOT EXISTS mentor_availability_mentor_idx ON public.mentor_availability(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_availability_day_idx ON public.mentor_availability(day_of_week);

ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view mentor availability" ON public.mentor_availability;
CREATE POLICY "Anyone can view mentor availability" ON public.mentor_availability
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mentor availability is public" ON public.mentor_availability;
CREATE POLICY "Mentor availability is public" ON public.mentor_availability
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Mentors can manage own availability" ON public.mentor_availability;
DROP POLICY IF EXISTS "Mentors manage own availability" ON public.mentor_availability;
CREATE POLICY "Mentors manage own availability" ON public.mentor_availability
  FOR ALL USING (
    mentor_id IN (SELECT id FROM public.mentor_profiles WHERE user_id = auth.uid())
  );
