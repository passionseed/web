ALTER TABLE mentor_bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN mentor_bookings.cancellation_reason IS
  'Reason provided by the mentor when cancelling a confirmed booking. NULL for pending cancellations or non-confirmed bookings.';
