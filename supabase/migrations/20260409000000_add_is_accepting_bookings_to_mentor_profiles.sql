-- Add is_accepting_bookings flag to mentor_profiles
ALTER TABLE mentor_profiles
  ADD COLUMN IF NOT EXISTS is_accepting_bookings BOOLEAN NOT NULL DEFAULT TRUE;
