-- SeedStack telemetry: SHIFT students' OpenCode skills report progress
-- (install / scope / ship) so mentors can see who finished without asking.
--
-- PDPA: students are minors, so nothing is stored until BOTH the student and
-- a parent have consented on /shift/seedstack. Withdrawal revokes tokens and
-- deletes every event. Events older than 365 days are purged by
-- /api/cron/seedstack-retention.
--
-- All writes go through API routes / server actions with the service role.
-- Admins can read; nobody else can touch these tables directly.
-- Additive and idempotent: safe to apply straight to production.

CREATE TABLE IF NOT EXISTS public.seedstack_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_version TEXT NOT NULL,
  student_consented_at TIMESTAMPTZ NULL,
  parent_token_hash TEXT NULL,
  parent_name TEXT NULL,
  parent_relationship TEXT NULL,
  parent_consented_at TIMESTAMPTZ NULL,
  parent_declined_at TIMESTAMPTZ NULL,
  withdrawn_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seedstack_consents_parent_token
  ON public.seedstack_consents(parent_token_hash) WHERE parent_token_hash IS NOT NULL;

COMMENT ON TABLE public.seedstack_consents IS
  'PDPA consent for SeedStack telemetry: student + parent, per notice version. Admin-only read.';

CREATE TABLE IF NOT EXISTS public.seedstack_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seedstack_tokens_user ON public.seedstack_tokens(user_id);

COMMENT ON TABLE public.seedstack_tokens IS
  'CLI bearer tokens for SeedStack (sha256 only, raw shown once). Service role only.';

CREATE TABLE IF NOT EXISTS public.seedstack_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_event_id TEXT NOT NULL,
  step TEXT NOT NULL CHECK (step IN ('install', 'scope', 'ship')),
  event TEXT NOT NULL CHECK (event IN ('start', 'stuck', 'changed', 'ticket', 'done')),
  minutes INTEGER NULL CHECK (minutes IS NULL OR minutes BETWEEN 0 AND 10080),
  next TEXT NULL CHECK (next IS NULL OR char_length(next) <= 280),
  detail TEXT NULL CHECK (detail IS NULL OR char_length(detail) <= 280),
  live_url TEXT NULL CHECK (live_url IS NULL OR char_length(live_url) <= 500),
  client_ts TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seedstack_events_client_id
  ON public.seedstack_events(user_id, client_event_id);
CREATE INDEX IF NOT EXISTS seedstack_events_user_created
  ON public.seedstack_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seedstack_events_created
  ON public.seedstack_events(created_at);

COMMENT ON TABLE public.seedstack_events IS
  'SeedStack progress events from student OpenCode skills. No free-text PII by design; admin-only read.';

ALTER TABLE public.seedstack_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seedstack_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seedstack_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read seedstack consents" ON public.seedstack_consents;
CREATE POLICY "Admins can read seedstack consents"
  ON public.seedstack_consents
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can read seedstack events" ON public.seedstack_events;
CREATE POLICY "Admins can read seedstack events"
  ON public.seedstack_events
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

REVOKE ALL ON TABLE public.seedstack_consents FROM anon, authenticated;
REVOKE ALL ON TABLE public.seedstack_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.seedstack_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.seedstack_consents TO authenticated;
GRANT SELECT ON TABLE public.seedstack_events TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seedstack_consents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seedstack_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seedstack_events TO service_role;

DROP TRIGGER IF EXISTS seedstack_consents_handle_updated_at ON public.seedstack_consents;
CREATE TRIGGER seedstack_consents_handle_updated_at
  BEFORE UPDATE ON public.seedstack_consents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
