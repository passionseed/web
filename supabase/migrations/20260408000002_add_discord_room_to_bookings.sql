ALTER TABLE mentor_bookings
  ADD COLUMN IF NOT EXISTS discord_room INT DEFAULT NULL;

COMMENT ON COLUMN mentor_bookings.discord_room IS
  'Discord room number assigned when session is confirmed. NULL when pending or cancelled. Recomputed on cancellation of overlapping sessions.';
