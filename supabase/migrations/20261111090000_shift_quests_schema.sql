-- SHIFT High quests: tables for the Discord quest bot (bot/src/quests).
--
-- Spec: mentor/packs/shift-high-discord-quest-spec.md (founder draft, 2026-11-10).
-- Students choose or propose quests, keep a private progress journal, ask for
-- help in group channels, and submit work for human review. Approved work can
-- earn Passioncoin under a published reward rule, and coins can be redeemed
-- against an admin-configured catalog. Every reward and redemption feature is
-- off until an admin publishes the rules (see shift_quest_settings).
--
-- Students are minors. Nothing here is readable through the Data API: RLS is
-- on with no policies, anon and authenticated hold no grants, and the bot
-- reaches the data only through the shift_quest_* functions (next migration)
-- as the least-privilege shift_quest_bot login.
--
-- Not recorded, by design: voice time, screen share, audio, message content,
-- passwords or tokens, contact details, test users' identities.
--
-- Prod-first apply: additive and idempotent.

-- ---------------------------------------------------------------------------
-- Settings: one row. Every feature that can embarrass us starts switched off.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- Discord roles whose holders may use the student flows (pilot cohort).
  -- Empty: the pilot is closed to students; staff can still test.
  student_role_ids text[] NOT NULL DEFAULT '{}',
  -- Group channels. Null means "not configured": messages wait, never vanish.
  help_channel_id text NULL,       -- community help requests
  staff_channel_id text NULL,      -- review queue and mentors-only help notices
  celebrate_channel_id text NULL,  -- opt-in celebrations and recognitions
  coworking_channel_id text NULL,  -- opt-in session intentions
  awards_enabled boolean NOT NULL DEFAULT false,
  redemption_enabled boolean NOT NULL DEFAULT false,
  sharing_enabled boolean NOT NULL DEFAULT false,
  reminders_enabled boolean NOT NULL DEFAULT false,
  -- Published before awards can be switched on: earning, caps, review,
  -- reversal and appeal rules in words students read.
  reward_terms text NULL,
  -- Published before redemption can be switched on.
  redemption_terms text NULL,
  fulfillment_process text NULL,
  fulfillment_owner text NULL,
  updated_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.shift_quest_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_members (
  -- Opaque ID used everywhere else, so erasing the Discord link anonymizes
  -- the ledger and history without rewriting them.
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_user_id text NULL UNIQUE,
  display_name text NULL CHECK (display_name IS NULL OR char_length(display_name) <= 80),
  -- Application roles. Discord server permissions grant nothing here.
  roles text[] NOT NULL DEFAULT '{}'
    CHECK (roles <@ ARRAY['reviewer', 'admin', 'fulfillment']::text[]),
  onboarded_at timestamptz NULL,
  current_project_id uuid NULL,
  -- Preferences. All off by default: joining never opts anyone in.
  reminders_opt_in boolean NOT NULL DEFAULT false,
  reminder_days smallint[] NOT NULL DEFAULT '{}'
    CHECK (reminder_days <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  reminder_hour smallint NULL CHECK (reminder_hour BETWEEN 0 AND 23),
  notify_dm boolean NOT NULL DEFAULT false,
  erased_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_quest_members_erased CHECK (
    erased_at IS NULL OR (discord_user_id IS NULL AND display_name IS NULL)
  )
);

COMMENT ON TABLE public.shift_quest_members IS
  'SHIFT High quest bot users. discord_user_id is personal data: never copy it into the brain, logs or fixtures.';

CREATE TABLE IF NOT EXISTS public.shift_quest_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  route text NOT NULL CHECK (route IN ('software', 'creative', 'service', 'other')),
  ambition text NULL CHECK (ambition IS NULL OR char_length(ambition) <= 500),
  created_by uuid NOT NULL REFERENCES public.shift_quest_members(id),
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_quest_members_current_project_fkey') THEN
    ALTER TABLE public.shift_quest_members
      ADD CONSTRAINT shift_quest_members_current_project_fkey
      FOREIGN KEY (current_project_id) REFERENCES public.shift_quest_projects(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- A teammate link exists only after the invited student accepts.
CREATE TABLE IF NOT EXISTS public.shift_quest_project_members (
  project_id uuid NOT NULL REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  status text NOT NULL CHECK (status IN ('invited', 'active', 'declined', 'left')),
  invited_by uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz NULL,
  PRIMARY KEY (project_id, member_id)
);

CREATE INDEX IF NOT EXISTS shift_quest_project_members_member
  ON public.shift_quest_project_members (member_id, status);

-- ---------------------------------------------------------------------------
-- Quests
-- ---------------------------------------------------------------------------

-- Versioned. A completed award keeps the rule version it was earned under.
CREATE TABLE IF NOT EXISTS public.shift_quest_reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL CHECK (key ~ '^[a-z0-9-]{2,40}$'),
  version integer NOT NULL CHECK (version > 0),
  amount integer NOT NULL CHECK (amount > 0),
  -- Most awards one member can earn under this key, all versions together.
  cap_per_member integer NULL CHECK (cap_per_member IS NULL OR cap_per_member > 0),
  -- How a shared completion is credited. Null: team completions earn nothing
  -- until an admin decides (no equal split or multiplied award is inferred).
  team_allocation text NULL CHECK (team_allocation IN ('each_confirmed', 'split_confirmed')),
  eligibility text NOT NULL CHECK (char_length(eligibility) BETWEEN 1 AND 1000),
  review_process text NOT NULL CHECK (char_length(review_process) BETWEEN 1 AND 1000),
  reversal_policy text NOT NULL CHECK (char_length(reversal_policy) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'retired')),
  created_by uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_reward_rules_one_published
  ON public.shift_quest_reward_rules (key) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.shift_quest_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,60}$'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  purpose text NOT NULL,
  routes text NOT NULL,
  examples text NOT NULL,
  evidence_criteria text NOT NULL,
  reflection_prompt text NOT NULL,
  support_options text NOT NULL,
  repeatable boolean NOT NULL DEFAULT false,
  -- Reward rule key; the published version at choose time is pinned on the quest.
  reward_rule_key text NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'retired')),
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_templates_one_published
  ON public.shift_quest_templates (slug) WHERE status = 'published';

CREATE TABLE IF NOT EXISTS public.shift_quest_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  project_id uuid NULL REFERENCES public.shift_quest_projects(id) ON DELETE SET NULL,
  -- Null for a quest the student proposed.
  template_id uuid NULL REFERENCES public.shift_quest_templates(id),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  why text NULL CHECK (why IS NULL OR char_length(why) <= 1000),
  goal text NOT NULL CHECK (char_length(goal) BETWEEN 1 AND 1000),
  next_step text NOT NULL CHECK (char_length(next_step) BETWEEN 1 AND 500),
  criteria text NOT NULL CHECK (char_length(criteria) BETWEEN 1 AND 1000),
  review_date date NULL,
  state text NOT NULL DEFAULT 'active' CHECK (state IN (
    'active', 'paused', 'submitted', 'clarification', 'approved', 'declined', 'appealed', 'archived'
  )),
  -- Optimistic lock for long-running edits: every change bumps it.
  version integer NOT NULL DEFAULT 1,
  -- Pinned reward rule version. For proposed quests a reviewer agrees it
  -- (reward_agreed_at) before reward-bearing work is submitted.
  reward_rule_id uuid NULL REFERENCES public.shift_quest_reward_rules(id),
  reward_agreed_by uuid NULL REFERENCES public.shift_quest_members(id),
  reward_agreed_at timestamptz NULL,
  -- Outcome of the last award attempt, for the student and reviewers.
  award_status text NULL CHECK (award_status IN ('issued', 'not_issued')),
  award_note text NULL,
  -- Follow-up work after an approval is a new linked quest.
  parent_instance_id uuid NULL REFERENCES public.shift_quest_instances(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_quest_instances_member
  ON public.shift_quest_instances (member_id, state);
CREATE INDEX IF NOT EXISTS shift_quest_instances_project
  ON public.shift_quest_instances (project_id) WHERE project_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.shift_quest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.shift_quest_instances(id),
  revision integer NOT NULL CHECK (revision > 0),
  submitted_by uuid NOT NULL REFERENCES public.shift_quest_members(id),
  evidence text NULL CHECK (evidence IS NULL OR char_length(evidence) <= 2000),
  reflection text NULL CHECK (reflection IS NULL OR char_length(reflection) <= 2000),
  artifact_url text NULL CHECK (artifact_url IS NULL OR artifact_url ~ '^https://'),
  -- Reviewers always see a submission. 'team' also shows it to active teammates.
  visibility text NOT NULL DEFAULT 'reviewers' CHECK (visibility IN ('reviewers', 'team')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'withdrawn', 'superseded', 'approved', 'clarification', 'declined'
  )),
  -- Reviewer confirmed this repeat has distinct scope and learning.
  distinct_confirmed boolean NOT NULL DEFAULT false,
  redacted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NULL,
  UNIQUE (instance_id, revision)
);

-- At most one revision waits for review per quest.
CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_submissions_one_pending
  ON public.shift_quest_submissions (instance_id) WHERE status = 'pending';

-- Each person on a shared completion declares their own part.
CREATE TABLE IF NOT EXISTS public.shift_quest_contributions (
  submission_id uuid NOT NULL REFERENCES public.shift_quest_submissions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  contribution text NULL CHECK (contribution IS NULL OR char_length(contribution) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  responded_at timestamptz NULL,
  PRIMARY KEY (submission_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.shift_quest_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.shift_quest_submissions(id),
  reviewer_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  outcome text NOT NULL CHECK (outcome IN ('approved', 'clarification', 'declined')),
  feedback text NULL CHECK (feedback IS NULL OR char_length(feedback) <= 2000),
  is_appeal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_quest_reviews_submission
  ON public.shift_quest_reviews (submission_id, created_at);

CREATE TABLE IF NOT EXISTS public.shift_quest_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.shift_quest_instances(id),
  submission_id uuid NOT NULL REFERENCES public.shift_quest_submissions(id),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  -- The reviewer who declined: a different reviewer must decide the appeal.
  declined_by uuid NOT NULL REFERENCES public.shift_quest_members(id),
  reason text NULL CHECK (reason IS NULL OR char_length(reason) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_appeals_one_open
  ON public.shift_quest_appeals (instance_id) WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- Journal, coworking, help, ownership, sharing
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  project_id uuid NULL REFERENCES public.shift_quest_projects(id) ON DELETE SET NULL,
  instance_id uuid NULL REFERENCES public.shift_quest_instances(id) ON DELETE SET NULL,
  -- 'tap': "I worked on it today" with no words (one per member per Bangkok
  -- day, shift_quest_checkin). 'note': a journal entry. A tap never grows a
  -- tree, mints a coin or counts toward anything but activity totals.
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('tap', 'note')),
  changed text NULL CHECK (changed IS NULL OR char_length(changed) BETWEEN 1 AND 1000),
  learned text NULL CHECK (learned IS NULL OR char_length(learned) <= 1000),
  next_step text NULL CHECK (next_step IS NULL OR char_length(next_step) <= 500),
  blocker text NULL CHECK (blocker IS NULL OR char_length(blocker) <= 1000),
  artifact_url text NULL CHECK (artifact_url IS NULL OR artifact_url ~ '^https://'),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz NULL,
  CONSTRAINT shift_quest_progress_note_text CHECK (kind <> 'note' OR changed IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS shift_quest_progress_member
  ON public.shift_quest_progress (member_id, created_at DESC);
-- Backstop for the member lock in shift_quest_checkin: one tap per Bangkok day.
CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_progress_one_tap_a_day
  ON public.shift_quest_progress (member_id, ((created_at AT TIME ZONE 'Asia/Bangkok')::date))
  WHERE kind = 'tap';
CREATE INDEX IF NOT EXISTS shift_quest_progress_project
  ON public.shift_quest_progress (project_id, created_at DESC) WHERE visibility = 'team';

-- An explicit intention and an optional reflection. Never voice time.
CREATE TABLE IF NOT EXISTS public.shift_quest_work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  intention text NOT NULL CHECK (char_length(intention) BETWEEN 1 AND 300),
  reflection text NULL CHECK (reflection IS NULL OR char_length(reflection) <= 1000),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_work_sessions_one_open
  ON public.shift_quest_work_sessions (member_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS public.shift_quest_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  project_id uuid NULL REFERENCES public.shift_quest_projects(id) ON DELETE SET NULL,
  instance_id uuid NULL REFERENCES public.shift_quest_instances(id) ON DELETE SET NULL,
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 1000),
  -- 'community': posted in the help channel. 'mentors': staff channel only.
  visibility text NOT NULL CHECK (visibility IN ('community', 'mentors')),
  source text NOT NULL DEFAULT 'student' CHECK (source IN ('student', 'ownership', 'progress')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'resolved', 'withdrawn')),
  claimed_by uuid NULL REFERENCES public.shift_quest_members(id),
  resolution_note text NULL CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS shift_quest_help_requests_open
  ON public.shift_quest_help_requests (status, created_at) WHERE status IN ('open', 'claimed');

CREATE TABLE IF NOT EXISTS public.shift_quest_ownership_checks (
  project_id uuid NOT NULL REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  item text NOT NULL CHECK (item IN ('access', 'export', 'team', 'costs', 'portability')),
  state text NOT NULL DEFAULT 'not_checked'
    CHECK (state IN ('not_checked', 'demonstrated', 'needs_help', 'not_applicable')),
  note text NULL CHECK (note IS NULL OR char_length(note) <= 1000),
  -- The work sits in an account a mentor controls.
  mentor_held boolean NOT NULL DEFAULT false,
  continuation_path text NULL CHECK (continuation_path IS NULL OR char_length(continuation_path) <= 1000),
  help_request_id uuid NULL REFERENCES public.shift_quest_help_requests(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES public.shift_quest_members(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, item),
  CONSTRAINT shift_quest_ownership_na_reason CHECK (state <> 'not_applicable' OR note IS NOT NULL),
  -- A mentor-held account is not independent without a way to keep going.
  CONSTRAINT shift_quest_ownership_mentor_held CHECK (
    NOT (state = 'demonstrated' AND mentor_held AND continuation_path IS NULL)
  )
);

-- Celebrations, peer recognitions and coworking intentions. Nothing is posted
-- until the author confirms a preview, and a recognized peer must accept.
CREATE TABLE IF NOT EXISTS public.shift_quest_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  kind text NOT NULL CHECK (kind IN ('celebration', 'recognition', 'intention')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  instance_id uuid NULL REFERENCES public.shift_quest_instances(id) ON DELETE SET NULL,
  peer_member_id uuid NULL REFERENCES public.shift_quest_members(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'awaiting_peer', 'queued', 'cancelled', 'peer_declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_quest_shares_peer CHECK ((kind = 'recognition') = (peer_member_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS shift_quest_shares_peer
  ON public.shift_quest_shares (peer_member_id) WHERE status = 'awaiting_peer';

-- ---------------------------------------------------------------------------
-- Passioncoin: append-only ledger, catalog, redemptions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  amount integer NOT NULL CHECK (amount <> 0),
  kind text NOT NULL CHECK (kind IN ('award', 'reversal', 'redemption_hold', 'redemption_release', 'recognition')),
  -- Idempotency: one entry per source, ever. award:<quest>:<member>,
  -- unlock:<season unlock>:<member>, redeem:<redemption>, release:<redemption>,
  -- reversal:<request key>, recognition:<request key>.
  source_key text NOT NULL UNIQUE,
  reward_rule_id uuid NULL REFERENCES public.shift_quest_reward_rules(id),
  instance_id uuid NULL REFERENCES public.shift_quest_instances(id),
  redemption_id uuid NULL,
  references_entry_id uuid NULL REFERENCES public.shift_quest_ledger(id),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  actor_id uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_quest_ledger_reversal_ref CHECK (kind <> 'reversal' OR references_entry_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS shift_quest_ledger_member
  ON public.shift_quest_ledger (member_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.shift_quest__ledger_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'sq:ledger_append_only' USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS shift_quest_ledger_append_only ON public.shift_quest_ledger;
CREATE TRIGGER shift_quest_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.shift_quest_ledger
  FOR EACH ROW EXECUTE FUNCTION public.shift_quest__ledger_append_only();

CREATE TABLE IF NOT EXISTS public.shift_quest_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text NULL CHECK (description IS NULL OR char_length(description) <= 1000),
  cost integer NOT NULL CHECK (cost > 0),
  -- Units not yet reserved. Reserving takes one, a cancellation returns it.
  stock_available integer NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shift_quest_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  item_id uuid NOT NULL REFERENCES public.shift_quest_catalog(id),
  cost integer NOT NULL CHECK (cost > 0),
  -- From the confirm button: a double click finds the first request.
  request_key text NOT NULL UNIQUE CHECK (char_length(request_key) BETWEEN 8 AND 100),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'processing', 'completed', 'cancelled')),
  operator_id uuid NULL REFERENCES public.shift_quest_members(id),
  operator_note text NULL CHECK (operator_note IS NULL OR char_length(operator_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS shift_quest_redemptions_open
  ON public.shift_quest_redemptions (status, created_at) WHERE status IN ('reserved', 'processing');

-- ---------------------------------------------------------------------------
-- Delivery, inbox, reminders, data requests, audit
-- ---------------------------------------------------------------------------

-- Durable outbox: a Discord failure never undoes an approval or loses a help
-- request. Channels are resolved from settings when the message is sent, so
-- configuring a missing channel releases what waited for it.
CREATE TABLE IF NOT EXISTS public.shift_quest_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  target_kind text NOT NULL CHECK (target_kind IN ('channel', 'dm')),
  -- For 'channel': help | staff | celebrate | coworking. For 'dm': null.
  channel_key text NULL CHECK (channel_key IN ('help', 'staff', 'celebrate', 'coworking')),
  -- DM recipient. Channel messages name people through params instead.
  member_id uuid NULL REFERENCES public.shift_quest_members(id),
  -- What to say; the bot owns the wording (bot/src/quests/copy.ts). Member IDs
  -- in params ('member_id', 'peer_member_id') become pings when sent, and a
  -- message about an erased member is dropped.
  kind text NOT NULL CHECK (kind ~ '^[a-z_]{2,40}$'),
  params jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'blocked', 'dropped')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz NULL,
  last_error text NULL,
  discord_message_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  CONSTRAINT shift_quest_outbox_target CHECK (
    (target_kind = 'channel' AND channel_key IS NOT NULL)
    OR (target_kind = 'dm' AND member_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS shift_quest_outbox_due
  ON public.shift_quest_outbox (next_attempt_at) WHERE status IN ('pending', 'sending');

-- Private notices, shown to the student inside the bot (ephemeral). A DM is
-- only ever a content-free nudge for members who opted in.
CREATE TABLE IF NOT EXISTS public.shift_quest_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  dedupe_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind ~ '^[a-z_]{2,40}$'),
  params jsonb NOT NULL DEFAULT '{}',
  ref_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS shift_quest_inbox_unread
  ON public.shift_quest_inbox (member_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.shift_quest_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  kind text NOT NULL CHECK (kind IN ('correction', 'erasure')),
  note text NULL CHECK (note IS NULL OR char_length(note) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'rejected')),
  handled_by uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz NULL
);

-- Who did what to which record. No free text, evidence or credentials.
CREATE TABLE IF NOT EXISTS public.shift_quest_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid NULL REFERENCES public.shift_quest_members(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NULL,
  outcome text NOT NULL DEFAULT 'ok',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_quest_audit_resource
  ON public.shift_quest_audit (resource_type, resource_id, created_at);

-- ---------------------------------------------------------------------------
-- Lock everything down: no Data API access at all.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shift_quest_settings', 'shift_quest_members', 'shift_quest_projects',
    'shift_quest_project_members', 'shift_quest_reward_rules', 'shift_quest_templates',
    'shift_quest_instances', 'shift_quest_submissions', 'shift_quest_contributions',
    'shift_quest_reviews', 'shift_quest_appeals', 'shift_quest_progress',
    'shift_quest_work_sessions', 'shift_quest_help_requests', 'shift_quest_ownership_checks',
    'shift_quest_shares', 'shift_quest_ledger', 'shift_quest_catalog',
    'shift_quest_redemptions', 'shift_quest_outbox', 'shift_quest_inbox',
    'shift_quest_data_requests', 'shift_quest_audit'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END;
$$;

-- Sequences too (the audit identity): Supabase grants new sequences to anon
-- and authenticated by default.
DO $$
DECLARE
  s text;
BEGIN
  FOR s IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S' AND c.relname LIKE 'shift\_quest\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM PUBLIC, anon, authenticated', s);
    EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO service_role', s);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.shift_quest__ledger_append_only() FROM PUBLIC;
