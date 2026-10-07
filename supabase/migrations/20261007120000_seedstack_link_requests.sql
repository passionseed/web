-- SeedStack device linking: OpenCode starts a request, the student approves it
-- on /shift/seedstack after signing in with Discord, and the CLI picks up its
-- token by polling. The token never passes through the AI chat.
-- Additive and idempotent: safe to apply straight to production.

CREATE TABLE IF NOT EXISTS public.seedstack_link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code_hash TEXT NOT NULL UNIQUE,
  user_code TEXT NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NULL,
  consumed_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seedstack_link_requests_open_code
  ON public.seedstack_link_requests(user_code) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS seedstack_link_requests_expires
  ON public.seedstack_link_requests(expires_at);

COMMENT ON TABLE public.seedstack_link_requests IS
  'Short-lived device link requests for SeedStack CLI (device code hashed). Service role only.';

ALTER TABLE public.seedstack_link_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seedstack_link_requests FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seedstack_link_requests TO service_role;
