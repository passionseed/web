-- Add minute column to mentor_availability for half-hour slots (0 or 30).
-- Existing rows default to 0 (on-the-hour). Unique constraint updated to include minute.

ALTER TABLE public.mentor_availability
  ADD COLUMN IF NOT EXISTS minute INT NOT NULL DEFAULT 0
    CHECK (minute = 0 OR minute = 30);

-- Drop old unique constraint and recreate with minute included
ALTER TABLE public.mentor_availability
  DROP CONSTRAINT IF EXISTS mentor_availability_unique_slot;

ALTER TABLE public.mentor_availability
  ADD CONSTRAINT mentor_availability_unique_slot
    UNIQUE (mentor_id, day_of_week, hour, minute);
