-- Drop the FK constraint that references auth.users,
-- since student_id stores hackathon_participants.id (not auth users)
ALTER TABLE public.mentor_bookings
  DROP CONSTRAINT IF EXISTS mentor_bookings_student_id_fkey;
