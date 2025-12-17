-- Create mentor_availability table for storing mentor available time slots
CREATE TABLE IF NOT EXISTS public.mentor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS mentor_availability_mentor_idx ON public.mentor_availability(mentor_id);
CREATE INDEX IF NOT EXISTS mentor_availability_day_idx ON public.mentor_availability(day_of_week);

-- Enable RLS
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view mentor availability (needed for booking)
DROP POLICY IF EXISTS "Anyone can view mentor availability" ON public.mentor_availability;
CREATE POLICY "Anyone can view mentor availability" ON public.mentor_availability
    FOR SELECT
    USING (true);

-- Mentors can manage their own availability
DROP POLICY IF EXISTS "Mentors can manage own availability" ON public.mentor_availability;
CREATE POLICY "Mentors can manage own availability" ON public.mentor_availability
    FOR ALL
    USING (mentor_id = auth.uid());

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_mentor_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mentor_availability_timestamp ON public.mentor_availability;
CREATE TRIGGER update_mentor_availability_timestamp
    BEFORE UPDATE ON public.mentor_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_availability_updated_at();

-- Comments
COMMENT ON TABLE public.mentor_availability IS 'Stores mentor available time slots by day of week (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN public.mentor_availability.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
