-- Outbox of web app events for the company brain (Pipe B). Admin actions
-- record a row here; the /api/cron/brain-sync cron renders them into
-- Markdown and commits them to passionseed/company-brain. Payloads hold
-- program facts and totals only, never student personal data.
-- Additive and idempotent. Service role only: RLS on, no policies.

CREATE TABLE IF NOT EXISTS public.brain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS brain_events_unsent_idx
  ON public.brain_events (created_at)
  WHERE sent_at IS NULL;

ALTER TABLE public.brain_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.brain_events FROM anon, authenticated;

COMMENT ON TABLE public.brain_events IS 'Outbox of app events pushed to the company brain by the brain-sync cron. Totals and program facts only.';
