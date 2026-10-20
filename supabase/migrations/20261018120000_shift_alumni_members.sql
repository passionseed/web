-- SHIFT alumni RSVPs now go through a PassionSeed account (existing or new).
-- Each account that says "ไปด้วย" gets one alumni record: confirmed straight
-- away when it is already linked to a paid SHIFT application, otherwise
-- pending until an admin confirms it on /admin/shift/alumni.
-- Students are minors: admin-only read, apart from a student reading their own
-- record. Writes go through the service role. Additive and idempotent: safe to
-- apply straight to production.

CREATE TABLE IF NOT EXISTS public.shift_alumni_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 30),
  cohort TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  application_id UUID NULL REFERENCES public.shift_applications(id) ON DELETE SET NULL,
  reviewed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_alumni_members IS
  'PassionSeed accounts that joined SHIFT alumni sessions, confirmed by a paid application or an admin (minors: admin-only read)';
COMMENT ON COLUMN public.shift_alumni_members.application_id IS
  'The paid SHIFT application already linked to this account, when one was found. Null means an admin has to confirm.';

CREATE INDEX IF NOT EXISTS idx_shift_alumni_members_status
  ON public.shift_alumni_members (status, created_at DESC);

ALTER TABLE public.shift_alumni_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift alumni members" ON public.shift_alumni_members;
CREATE POLICY "Admins can manage shift alumni members"
  ON public.shift_alumni_members
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

DROP POLICY IF EXISTS "Students can read their own alumni record" ON public.shift_alumni_members;
CREATE POLICY "Students can read their own alumni record"
  ON public.shift_alumni_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON TABLE public.shift_alumni_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_alumni_members TO service_role;

DROP TRIGGER IF EXISTS shift_alumni_members_handle_updated_at ON public.shift_alumni_members;
CREATE TRIGGER shift_alumni_members_handle_updated_at
  BEFORE UPDATE ON public.shift_alumni_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RSVPs made before this change have no account; they keep counting.
ALTER TABLE public.shift_alumni_rsvps
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- One RSVP per account per session; a repeat tap is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_alumni_rsvps_user_once
  ON public.shift_alumni_rsvps (session_date, user_id) WHERE user_id IS NOT NULL;
