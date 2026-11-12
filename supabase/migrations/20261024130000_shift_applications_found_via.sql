-- SHIFT applications: where the applicant says they found us, picked from a
-- dropdown on /shift/apply (friend, Camphub, Instagram, Facebook). Separate
-- from `source`, which is the tracked UTM link they arrived on.
-- Additive, nullable and idempotent: rows from before this stay valid.

ALTER TABLE public.shift_applications
  ADD COLUMN IF NOT EXISTS found_via TEXT NULL
    CHECK (found_via IN ('friend', 'camphub', 'instagram', 'facebook'));

COMMENT ON COLUMN public.shift_applications.found_via IS 'Self-reported: friend, camphub, instagram or facebook';
