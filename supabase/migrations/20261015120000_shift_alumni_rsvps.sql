-- RSVPs for SHIFT alumni sessions (/shift/alumni). Students are minors and
-- anonymous (no login): nickname and round only. Inserts go through
-- /api/shift/alumni/rsvp with the service role; only admins can read. The
-- public page shows a count, never names.

CREATE TABLE IF NOT EXISTS public.shift_alumni_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL,
  nickname TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 30),
  cohort TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_alumni_rsvps IS 'Who said they are coming to a SHIFT alumni session (minors: admin-only read, nickname only)';

-- One RSVP per nickname and round per session; a repeat tap is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_alumni_rsvps_once
  ON public.shift_alumni_rsvps (session_date, lower(nickname), cohort);

ALTER TABLE public.shift_alumni_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift alumni rsvps" ON public.shift_alumni_rsvps;
CREATE POLICY "Admins can manage shift alumni rsvps"
  ON public.shift_alumni_rsvps
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_alumni_rsvps TO service_role;
