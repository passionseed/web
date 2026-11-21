-- Elemental hackathon (Dec 2026): the core schema and functions.
--
-- What lives here: editions, per-guild settings, one single-use claim code per
-- paid registration MEMBER ROW, Discord members, teams and their invites,
-- element boards, tester entries, lesson progress (table only; E21 adds the
-- function), check-ins, badges, scheduled posts, safety reports and an audit
-- log. Every function the core bot features call is here too, so totals and
-- the public island read only tables this file creates.
--
-- Access model:
--   * Every table has RLS on, an admin-only SELECT policy, and NO grants to
--     anon or authenticated (Supabase's default grants are revoked below). The
--     service role keeps its default access (server code, staff scripts).
--   * elemental_bot (NOLOGIN here; scripts/elemental/set-role-password.ts gives
--     it LOGIN out of band) may EXECUTE public.elemental_bot_* and nothing
--     else: no table, no other function. Every elemental_bot_* function is
--     SECURITY DEFINER with a fixed search_path and takes the guild id first;
--     the edition always comes from that guild's elemental_settings row, never
--     from the caller. Discord roles are checked by the bot (it is the only
--     caller); staff functions take the actor's Discord id for the audit log.
--   * elemental_issue_claims, elemental_issue_rehearsal_claims,
--     elemental_island_public, elemental_reset_edition and
--     elemental_purge_edition are service_role only.
--   * elemental__* helpers are granted to no one.
--
-- Errors raised on purpose are 'el:<code>' (SQLSTATE P0001), with an optional
-- DETAIL (a field name, or the Discord id an error is about) and never any
-- text a student typed. bot/src/elemental/api.ts turns them into
-- ElementalError(code).
--
-- PII: elemental__pii_kind mirrors lib/elemental/core/pii.ts (RULES). JS \b is
-- written as the lookbehind (?<![a-z0-9_]) (\b inside a Postgres regex is a
-- backspace, and \y would follow the server locale's idea of a word
-- character), \d as [0-9] and \s as the exact JS whitespace class.
-- supabase/tests/elemental/core/pii_parity.int.test.ts runs
-- lib/elemental/core/pii-cases.json through both: change them together.
--
-- No whiteboard_* or shift_quest_* object is created, altered or granted here,
-- and the hackathon registration tables are only read.
--
-- Prod-first apply (AGENTS.md): additive and idempotent, safe to run twice.

-- ---------------------------------------------------------------------------
-- The bot role
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elemental_bot') THEN
    CREATE ROLE elemental_bot NOLOGIN NOINHERIT;
  END IF;
END;
$$;

ALTER ROLE elemental_bot SET statement_timeout = '10s';
ALTER ROLE elemental_bot CONNECTION LIMIT 10;
GRANT USAGE ON SCHEMA public TO elemental_bot;

-- ---------------------------------------------------------------------------
-- Pure helpers used by CHECK constraints (defined before the tables)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elemental__elements()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  -- Fixed order (lib/elemental/core/elements.ts ELEMENT_KEYS): ties break by it.
  SELECT ARRAY['water', 'earth', 'air', 'fire', 'aether']::text[];
$$;

/** A Discord snowflake as text. */
CREATE OR REPLACE FUNCTION public.elemental__is_snowflake(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_value IS NOT NULL AND p_value ~ '^[0-9]{17,20}$';
$$;

/**
 * elemental_settings.schedule: {"YYYY-MM-DD": {"opening_at"?: "HH:MM",
 * "call_at": "HH:MM", "card_at": "HH:MM"}}, Bangkok wall clock
 * (lib/elemental/core/time.ts ScheduleDay).
 */
CREATE OR REPLACE FUNCTION public.elemental__valid_schedule(p_schedule jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_day text;
  v_value jsonb;
  v_key text;
BEGIN
  IF p_schedule IS NULL OR jsonb_typeof(p_schedule) <> 'object' THEN
    RETURN false;
  END IF;
  FOR v_day, v_value IN SELECT key, value FROM jsonb_each(p_schedule) LOOP
    IF v_day !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RETURN false;
    END IF;
    BEGIN
      PERFORM v_day::date;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    IF jsonb_typeof(v_value) <> 'object' OR NOT (v_value ? 'call_at' AND v_value ? 'card_at') THEN
      RETURN false;
    END IF;
    FOR v_key IN SELECT jsonb_object_keys(v_value) LOOP
      IF v_key NOT IN ('opening_at', 'call_at', 'card_at')
         OR jsonb_typeof(v_value -> v_key) <> 'string'
         OR (v_value ->> v_key) !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        RETURN false;
      END IF;
    END LOOP;
  END LOOP;
  RETURN true;
END;
$$;

/** elemental_settings.card_override: {"day": "YYYY-MM-DD", "url": "https://..."}. */
CREATE OR REPLACE FUNCTION public.elemental__valid_card_override(p_value jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_typeof(p_value) = 'object'
    AND (SELECT count(*) FROM jsonb_object_keys(p_value)) = 2
    AND jsonb_typeof(p_value -> 'day') = 'string'
    AND (p_value ->> 'day') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    AND jsonb_typeof(p_value -> 'url') = 'string'
    AND (p_value ->> 'url') ~ '^https://[^[:space:]]+$'
    AND char_length(p_value ->> 'url') <= 1000;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

/** One hackathon run. 'elemental-2026' is the real one; rehearsals have no registrations. */
CREATE TABLE IF NOT EXISTS public.elemental_editions (
  key text PRIMARY KEY CHECK (key ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  kind text NOT NULL CHECK (kind IN ('event', 'rehearsal')),
  -- hackathon_event_registrations.event_slug whose paid members get codes.
  event_slug text NULL,
  purged_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_editions_slug_kind CHECK ((kind = 'event') = (event_slug IS NOT NULL)),
  -- components/hackathon/poster/elemental/facts.ts slug: the real edition is never a rehearsal.
  CONSTRAINT elemental_editions_real_event CHECK (
    key <> 'elemental-2026' OR (kind = 'event' AND event_slug = 'elemental-2026')
  )
);

INSERT INTO public.elemental_editions (key, kind, event_slug) VALUES
  ('elemental-2026', 'event', 'elemental-2026'),
  ('elemental-dryrun', 'rehearsal', NULL)
ON CONFLICT (key) DO NOTHING;

/** One row per Discord guild: which edition it writes to, and its Discord ids. */
CREATE TABLE IF NOT EXISTS public.elemental_settings (
  guild_id text PRIMARY KEY CHECK (public.elemental__is_snowflake(guild_id)),
  -- One guild per edition: the real guild and the rehearsal guild never share rows.
  edition text NOT NULL UNIQUE REFERENCES public.elemental_editions (key),
  -- {host, helper, mentor, judge, safety, paid, water, earth, air, fire, aether}: role id.
  role_ids jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(role_ids) = 'object'),
  -- {start_here, news, mirror, reports, campfire}: channel id.
  channel_ids jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(channel_ids) = 'object'),
  -- {element: [category id, ...]} in fill order.
  element_category_ids jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(element_category_ids) = 'object'),
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (public.elemental__valid_schedule(schedule)),
  -- /team create is open in [opens_at, closes_at); closed while opens_at is NULL.
  team_create_opens_at timestamptz NULL,
  team_create_closes_at timestamptz NULL,
  tester_cap integer NOT NULL DEFAULT 10 CHECK (tester_cap BETWEEN 1 AND 100),
  team_cap integer NOT NULL DEFAULT 175 CHECK (team_cap BETWEEN 1 AND 200),
  heal_steps integer NOT NULL DEFAULT 5 CHECK (heal_steps BETWEEN 1 AND 20),
  heal_per_team integer NOT NULL DEFAULT 3 CHECK (heal_per_team BETWEEN 1 AND 50),
  healing_enabled boolean NOT NULL DEFAULT false,
  card_override jsonb NULL CHECK (card_override IS NULL OR public.elemental__valid_card_override(card_override)),
  -- elemental_purge_edition refuses before this.
  retention_until timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

/** One single-use /join code per registration member row (or a rehearsal code). */
CREATE TABLE IF NOT EXISTS public.elemental_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  kind text NOT NULL CHECK (kind IN ('member', 'rehearsal')),
  registration_member_id uuid NULL
    REFERENCES public.hackathon_event_registration_members (id) ON DELETE CASCADE,
  used_at timestamptz NULL,
  used_by text NULL CHECK (used_by IS NULL OR public.elemental__is_snowflake(used_by)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_claims_used_pair CHECK ((used_at IS NULL) = (used_by IS NULL)),
  -- One code per member position.
  CONSTRAINT elemental_claims_member_key UNIQUE (edition, registration_member_id)
);

/** A Discord account that claimed a code (or a staff account). No names are stored. */
CREATE TABLE IF NOT EXISTS public.elemental_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  -- NULL only after elemental_purge_edition.
  discord_user_id text NULL CHECK (discord_user_id IS NULL OR public.elemental__is_snowflake(discord_user_id)),
  registration_member_id uuid NULL
    REFERENCES public.hackathon_event_registration_members (id) ON DELETE SET NULL,
  claim_id uuid NULL REFERENCES public.elemental_claims (id) ON DELETE SET NULL,
  element_pick text NULL CHECK (element_pick IS NULL OR element_pick = ANY (public.elemental__elements())),
  -- Set when the team goes live; kept when the team is archived.
  team_id uuid NULL,
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_members_discord_key UNIQUE (edition, discord_user_id),
  CONSTRAINT elemental_members_registration_key UNIQUE (edition, registration_member_id)
);

/** A project team. pending (no slot) -> channel_pending (slot) -> active (channel) ; archived. */
CREATE TABLE IF NOT EXISTS public.elemental_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  project_name text NOT NULL CHECK (char_length(btrim(project_name)) BETWEEN 3 AND 60),
  element text NOT NULL CHECK (element = ANY (public.elemental__elements())),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'channel_pending', 'active', 'archived')),
  slot integer NULL CHECK (slot BETWEEN 1 AND 200),
  discord_channel_id text NULL UNIQUE CHECK (discord_channel_id IS NULL OR public.elemental__is_snowflake(discord_channel_id)),
  created_by text NULL CHECK (created_by IS NULL OR public.elemental__is_snowflake(created_by)),
  created_by_staff boolean NOT NULL DEFAULT false,
  activated_at timestamptz NULL,
  archived_at timestamptz NULL,
  lit_at timestamptz NULL,
  handin_url text NULL CHECK (handin_url IS NULL OR char_length(handin_url) <= 500),
  handin_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_teams_slot_key UNIQUE (edition, slot),
  CONSTRAINT elemental_teams_slot_status CHECK (
    (status = 'pending' AND slot IS NULL)
    OR (status IN ('channel_pending', 'active') AND slot IS NOT NULL)
    OR status = 'archived'
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'elemental_members_team_fkey') THEN
    ALTER TABLE public.elemental_members
      ADD CONSTRAINT elemental_members_team_fkey FOREIGN KEY (team_id)
      REFERENCES public.elemental_teams (id) ON DELETE SET NULL;
  END IF;
END;
$$;

/** Who was asked onto a team. The creator has an accepted row too. Expires after 24 h. */
CREATE TABLE IF NOT EXISTS public.elemental_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.elemental_teams (id) ON DELETE CASCADE,
  discord_user_id text NULL CHECK (discord_user_id IS NULL OR public.elemental__is_snowflake(discord_user_id)),
  is_creator boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'accepted', 'declined', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  responded_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_team_invites_key UNIQUE (team_id, discord_user_id)
);

/** The whiteboards teams make their project canvases on, per element. */
CREATE TABLE IF NOT EXISTS public.elemental_boards (
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  board_id uuid NOT NULL REFERENCES public.whiteboards (id) ON DELETE CASCADE,
  element text NOT NULL CHECK (element = ANY (public.elemental__elements())),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (edition, board_id)
);

/** /tester: one person a team tested with. Free text is purged after retention. */
CREATE TABLE IF NOT EXISTS public.elemental_tester_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  team_id uuid NOT NULL REFERENCES public.elemental_teams (id) ON DELETE CASCADE,
  logger_discord_id text NULL CHECK (logger_discord_id IS NULL OR public.elemental__is_snowflake(logger_discord_id)),
  -- 'bot' (/tester) or 'staff' (/el tester-add, the form fallback).
  source text NOT NULL DEFAULT 'bot' CHECK (source IN ('bot', 'staff')),
  who text NULL CHECK (who IS NULL OR char_length(who) <= 80),
  tried text NULL CHECK (tried IS NULL OR char_length(tried) <= 200),
  quote text NULL CHECK (quote IS NULL OR char_length(quote) <= 200),
  changed text NULL CHECK (changed IS NULL OR char_length(changed) <= 200),
  -- Within the team's tester_cap and not removed: what totals and the island count.
  counted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz NULL,
  removed_at timestamptz NULL,
  removed_by text NULL CHECK (removed_by IS NULL OR public.elemental__is_snowflake(removed_by)),
  removed_reason text NULL CHECK (removed_reason IS NULL OR char_length(removed_reason) <= 200),
  reviewed_at timestamptz NULL,
  reviewed_by text NULL CHECK (reviewed_by IS NULL OR public.elemental__is_snowflake(reviewed_by)),
  canvas_status text NOT NULL DEFAULT 'none' CHECK (canvas_status IN ('none', 'pending', 'written', 'failed', 'tombstoned')),
  canvas_ids text[] NULL
);

/** Lesson answers (E21 adds elemental_web_lesson_answer). */
CREATE TABLE IF NOT EXISTS public.elemental_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  member_id uuid NULL REFERENCES public.elemental_members (id) ON DELETE SET NULL,
  team_id uuid NULL REFERENCES public.elemental_teams (id) ON DELETE SET NULL,
  lesson_id text NOT NULL CHECK (lesson_id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  part integer NOT NULL CHECK (part BETWEEN 0 AND 50),
  answer text NULL CHECK (answer IS NULL OR char_length(answer) <= 1000),
  final boolean NOT NULL DEFAULT false,
  finished_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_lesson_progress_member_part_key UNIQUE (edition, member_id, lesson_id, part)
);

/** /checkin: one per team per Bangkok day. */
CREATE TABLE IF NOT EXISTS public.elemental_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  team_id uuid NOT NULL REFERENCES public.elemental_teams (id) ON DELETE CASCADE,
  day date NOT NULL,
  discord_user_id text NULL CHECK (discord_user_id IS NULL OR public.elemental__is_snowflake(discord_user_id)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_checkins_team_day_key UNIQUE (team_id, day)
);

/** Badges on a team's plot ('lesson', 'powerup', ...). ref tells repeats apart. */
CREATE TABLE IF NOT EXISTS public.elemental_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  team_id uuid NOT NULL REFERENCES public.elemental_teams (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind ~ '^[a-z][a-z0-9_]{1,29}$'),
  ref text NOT NULL DEFAULT '' CHECK (char_length(ref) <= 100),
  awarded_by text NULL CHECK (awarded_by IS NULL OR public.elemental__is_snowflake(awarded_by)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_badges_team_kind_ref_key UNIQUE (team_id, kind, ref)
);

/** Scheduled and one-off posts, claimed before sending so two pollers post once. */
CREATE TABLE IF NOT EXISTS public.elemental_posts (
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  kind text NOT NULL CHECK (kind ~ '^[a-z][a-z0-9_]{1,29}$'),
  key text NOT NULL CHECK (char_length(key) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'sent', 'failed')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  message_id text NULL CHECK (message_id IS NULL OR public.elemental__is_snowflake(message_id)),
  attempts integer NOT NULL DEFAULT 1,
  PRIMARY KEY (edition, kind, key)
);

/** /report: safety reports, posted to the staff-only #reports channel. */
CREATE TABLE IF NOT EXISTS public.elemental_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NOT NULL REFERENCES public.elemental_editions (key),
  guild_id text NOT NULL CHECK (public.elemental__is_snowflake(guild_id)),
  reporter_discord_id text NULL CHECK (reporter_discord_id IS NULL OR public.elemental__is_snowflake(reporter_discord_id)),
  text text NULL CHECK (text IS NULL OR char_length(text) BETWEEN 1 AND 1000),
  where_text text NULL CHECK (where_text IS NULL OR char_length(where_text) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz NULL,
  handled_by text NULL CHECK (handled_by IS NULL OR public.elemental__is_snowflake(handled_by))
);

/** Who did what. detail never holds text a student typed. */
CREATE TABLE IF NOT EXISTS public.elemental_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition text NULL REFERENCES public.elemental_editions (key),
  at timestamptz NOT NULL DEFAULT now(),
  actor text NULL,
  action text NOT NULL,
  target text NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS elemental_claims_member_idx ON public.elemental_claims (registration_member_id);
CREATE INDEX IF NOT EXISTS elemental_members_team_idx ON public.elemental_members (team_id);
CREATE INDEX IF NOT EXISTS elemental_members_registration_idx ON public.elemental_members (registration_member_id);
CREATE INDEX IF NOT EXISTS elemental_teams_edition_status_idx ON public.elemental_teams (edition, status);
CREATE INDEX IF NOT EXISTS elemental_team_invites_user_idx ON public.elemental_team_invites (discord_user_id, state);
CREATE INDEX IF NOT EXISTS elemental_boards_element_idx ON public.elemental_boards (edition, element);
CREATE INDEX IF NOT EXISTS elemental_tester_entries_team_idx ON public.elemental_tester_entries (team_id, created_at);
CREATE INDEX IF NOT EXISTS elemental_tester_entries_edition_idx ON public.elemental_tester_entries (edition, created_at);
CREATE INDEX IF NOT EXISTS elemental_lesson_progress_team_idx ON public.elemental_lesson_progress (team_id, finished_at);
CREATE INDEX IF NOT EXISTS elemental_checkins_edition_day_idx ON public.elemental_checkins (edition, day);
CREATE INDEX IF NOT EXISTS elemental_reports_edition_idx ON public.elemental_reports (edition, created_at);
CREATE INDEX IF NOT EXISTS elemental_audit_edition_idx ON public.elemental_audit (edition, at);

-- ---------------------------------------------------------------------------
-- Internal helpers (double underscore: granted to no one)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elemental__fail(p_code text, p_detail text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_detail IS NULL THEN
    RAISE EXCEPTION 'el:%', p_code USING ERRCODE = 'P0001';
  END IF;
  RAISE EXCEPTION 'el:%', p_code USING ERRCODE = 'P0001', DETAIL = p_detail;
END;
$$;

/**
 * The kind of contact a text seems to hold ('email', 'url', 'phone', 'line',
 * 'social', 'handle'), or NULL. A copy of lib/elemental/core/pii.ts: the same
 * rules in the same order, tested on the raw text (Thai digits made Arabic)
 * and on a folded copy (NFKC, invisible characters removed).
 */
CREATE OR REPLACE FUNCTION public.elemental__pii_kind(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
DECLARE
  -- JS \s (ASCII whitespace, NBSP, the Unicode spaces and BOM).
  s CONSTANT text := '[\t\n\v\f\r    -     　﻿]';
  -- JS \S.
  ns CONSTANT text := '[^\t\n\v\f\r    -     　﻿]';
  -- JS \b before a word character.
  wb CONSTANT text := '(?<![a-z0-9_])';
  social_latin CONSTANT text := 'ig|insta(?:gram)?|fb|facebook|tiktok|twitter';
  social_thai CONSTANT text := 'ไอจี|อินสตา(?:แกรม)?|เฟส(?:บุ๊ก|บุ๊ค)?|ติ๊กต็อก|ติ๊กต๊อก|ทวิต(?:เตอร์)?';
  social_thai_named CONSTANT text := 'ไอจี|อินสตา(?:แกรม)?|เฟสบุ๊ก|เฟสบุ๊ค|ติ๊กต็อก|ติ๊กต๊อก|ทวิต(?:เตอร์)?';
  tlds CONSTANT text := 'com|net|org|co|th|io|me|ly|gg|app|dev|xyz|link|to|tv|info|biz|page|site|online|shop|store|ee|be|gl';
  v_plain text;
  v_folded text;
  v_rules text[];
  v_kinds text[];
  i integer;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN
    RETURN NULL;
  END IF;
  v_plain := translate(p_text, '๐๑๒๓๔๕๖๗๘๙', '0123456789');
  v_folded := regexp_replace(
    translate(normalize(p_text, NFKC), '๐๑๒๓๔๕๖๗๘๙', '0123456789'),
    '[­​-‍⁠﻿]', '', 'g');

  v_kinds := ARRAY[
    'email', 'url', 'url', 'url', 'phone', 'phone', 'phone',
    'line', 'line', 'line', 'line',
    'social', 'social', 'social', 'social', 'social', 'social', 'handle'];
  v_rules := ARRAY[
    -- Emails.
    '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}',
    -- URLs: a scheme, www., or a bare domain on a common TLD.
    wb || '(?:https?|ftp)://' || ns,
    wb || 'www\.[a-z0-9-]',
    '(?:^|[^a-z0-9._%+@-])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:' || tlds || ')(?![a-z0-9-])',
    -- Phones: 0 and 8 more digits; +number with 8 or more digits; 9 digits in a row.
    '(?:^|[^0-9])0(?:[' || substr(s, 2, length(s) - 2) || '.()-]*[0-9]){8}',
    '\+' || s || '*[0-9](?:[' || substr(s, 2, length(s) - 2) || '.()-]*[0-9]){7}',
    '[0-9]{9,}',
    -- LINE ids, a handle of any length.
    'ไลน์' || s || '*(?:id' || s || '*)?[:：=]?' || s || '*@?[a-z0-9]',
    wb || 'line' || s || '*(?:id' || s || '*)?(?:[:：=]' || s || '*|@)@?[a-z0-9]',
    wb || 'line' || s || '*id' || s || '+@?[a-z0-9]',
    wb || 'id' || s || '*[:：=]' || s || '*@?[a-z0-9]',
    -- Labelled social handles.
    '(?:^|[^a-z])(?:' || social_latin || ')' || s || '*[:：=]?' || s || '*@?[a-z0-9_.]{3,}',
    '(?:^|[^a-z])(?:' || social_latin || ')(?![a-z])' || s || '*[:：=]?' || s || '*@?[a-z0-9_.]',
    '(?:' || social_thai || ')' || s || '*[:：=]?' || s || '*@?[a-z0-9_.]{3,}',
    '(?:' || social_thai_named || ')' || s || '*[:：=]?' || s || '*@?[a-z0-9_.]',
    '(?:' || social_thai || ')' || s || '*[:：]' || s || '*@?[a-z0-9_.]',
    '(?:^|[^a-z])(?:x|tt|yt|youtube|discord|snap(?:chat)?|threads|telegram|whatsapp)' || s || '*[:：]' || s || '*@?[a-z0-9_.]',
    -- @handles of any length.
    '@[a-z0-9_]'];

  FOR i IN 1 .. array_length(v_rules, 1) LOOP
    IF v_plain ~* v_rules[i] OR (v_folded <> v_plain AND v_folded ~* v_rules[i]) THEN
      RETURN v_kinds[i];
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

/** Raises el:pii (DETAIL the field, HINT the kind) when the text holds a contact. Never echoes it. */
CREATE OR REPLACE FUNCTION public.elemental__refuse_pii(p_field text, p_text text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_kind text := public.elemental__pii_kind(p_text);
BEGIN
  IF v_kind IS NOT NULL THEN
    RAISE EXCEPTION 'el:pii' USING ERRCODE = 'P0001', DETAIL = p_field, HINT = v_kind;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.elemental__user(p_user text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.elemental__is_snowflake(p_user) THEN
    PERFORM public.elemental__fail('bad_user');
  END IF;
  RETURN p_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.elemental__element(p_element text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v text := lower(btrim(coalesce(p_element, '')));
BEGIN
  IF NOT v = ANY (public.elemental__elements()) THEN
    PERFORM public.elemental__fail('bad_element');
  END IF;
  RETURN v;
END;
$$;

/** A project name: spaces collapsed, 3 to 60 characters, no contacts. */
CREATE OR REPLACE FUNCTION public.elemental__project_name(p_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v text := btrim(regexp_replace(coalesce(p_name, ''), '[[:space:]]+', ' ', 'g'));
BEGIN
  IF char_length(v) < 3 OR char_length(v) > 60 THEN
    PERFORM public.elemental__fail('bad_project_name');
  END IF;
  PERFORM public.elemental__refuse_pii('project_name', v);
  RETURN v;
END;
$$;

/** The guild's settings row; el:unknown_guild when it has none. */
CREATE OR REPLACE FUNCTION public.elemental__settings(p_guild_id text)
RETURNS public.elemental_settings
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_settings;
BEGIN
  SELECT * INTO v FROM public.elemental_settings WHERE guild_id = p_guild_id;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('unknown_guild');
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.elemental__edition(p_key text)
RETURNS public.elemental_editions
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_editions;
BEGIN
  SELECT * INTO v FROM public.elemental_editions WHERE key = p_key;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('unknown_edition');
  END IF;
  RETURN v;
END;
$$;

/** Serialises team changes in one edition (slots, caps, membership). */
CREATE OR REPLACE FUNCTION public.elemental__lock(p_edition text)
RETURNS void
LANGUAGE sql
AS $$
  SELECT pg_advisory_xact_lock(17740, hashtext('elemental:' || p_edition));
$$;

CREATE OR REPLACE FUNCTION public.elemental__audit(
  p_edition text, p_actor text, p_action text, p_target text, p_detail jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.elemental_audit (edition, actor, action, target, detail)
  VALUES (p_edition, p_actor, p_action, p_target, coalesce(p_detail, '{}'::jsonb));
$$;

/** An 8-character code from 32 unambiguous characters (no 0, 1, I or O). */
CREATE OR REPLACE FUNCTION public.elemental__new_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  alphabet CONSTANT text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v text := '';
  i integer;
BEGIN
  FOR i IN 0 .. 7 LOOP
    v := v || substr(alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN v;
END;
$$;

/** Inserts a claim with a fresh code, retrying on the (unlikely) code collision. */
CREATE OR REPLACE FUNCTION public.elemental__insert_claim(p_edition text, p_kind text, p_member_id uuid)
RETURNS public.elemental_claims
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_claims;
  i integer;
BEGIN
  FOR i IN 1 .. 10 LOOP
    BEGIN
      INSERT INTO public.elemental_claims (edition, code, kind, registration_member_id)
      VALUES (p_edition, public.elemental__new_code(), p_kind, p_member_id)
      RETURNING * INTO v;
      RETURN v;
    EXCEPTION WHEN unique_violation THEN
      -- Another session gave this member a code first: use that one.
      IF p_member_id IS NOT NULL THEN
        SELECT * INTO v FROM public.elemental_claims WHERE edition = p_edition AND registration_member_id = p_member_id;
        IF FOUND THEN
          RETURN v;
        END IF;
      END IF;
    END;
  END LOOP;
  PERFORM public.elemental__fail('code_space');
  RETURN NULL;
END;
$$;

/** A live team holds a slot and is on the island. */
CREATE OR REPLACE FUNCTION public.elemental__is_live(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_status IN ('channel_pending', 'active');
$$;

/** The member's live team id, or NULL (no team, or the team was archived). */
CREATE OR REPLACE FUNCTION public.elemental__live_team_of(p_member public.elemental_members)
RETURNS uuid
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT t.id FROM public.elemental_teams t
  WHERE t.id = p_member.team_id AND public.elemental__is_live(t.status);
$$;

CREATE OR REPLACE FUNCTION public.elemental__member(p_edition text, p_user text)
RETURNS public.elemental_members
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.elemental_members WHERE edition = p_edition AND discord_user_id = p_user;
$$;

/** The team as the bot sees it (Discord ids included; never sent to the web). */
CREATE OR REPLACE FUNCTION public.elemental__team_json(p_team_id uuid)
RETURNS jsonb
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'team_id', t.id,
    'edition', t.edition,
    'status', t.status,
    'slot', t.slot,
    'element', t.element,
    'project_name', t.project_name,
    'channel_id', t.discord_channel_id,
    'lit', t.lit_at IS NOT NULL,
    'member_ids', coalesce((
      SELECT jsonb_agg(m.discord_user_id ORDER BY m.created_at, m.discord_user_id)
      FROM public.elemental_members m
      WHERE m.team_id = t.id AND m.discord_user_id IS NOT NULL AND public.elemental__is_live(t.status)
    ), '[]'::jsonb),
    'invites', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'discord_user_id', i.discord_user_id, 'state', i.state, 'is_creator', i.is_creator, 'expires_at', i.expires_at)
        ORDER BY i.is_creator DESC, i.created_at, i.discord_user_id)
      FROM public.elemental_team_invites i WHERE i.team_id = t.id
    ), '[]'::jsonb))
  FROM public.elemental_teams t WHERE t.id = p_team_id;
$$;

/**
 * The slot for a team going live: the first free candidate (1..200, in the
 * order given: lib/elemental/island/sectors.ts candidateSlots), else the
 * lowest free slot. p_keep counts as free (the team's own slot on a re-slot).
 * Caller holds elemental__lock.
 */
CREATE OR REPLACE FUNCTION public.elemental__pick_slot(p_edition text, p_candidates integer[], p_keep integer DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v integer;
BEGIN
  SELECT c INTO v
  FROM unnest(coalesce(p_candidates, '{}'::integer[])) WITH ORDINALITY AS u(c, o)
  WHERE c BETWEEN 1 AND 200
    AND (c = p_keep OR NOT EXISTS (SELECT 1 FROM public.elemental_teams t WHERE t.edition = p_edition AND t.slot = c))
  ORDER BY o
  LIMIT 1;
  IF v IS NULL THEN
    SELECT s INTO v
    FROM generate_series(1, 200) AS s
    WHERE s = p_keep OR NOT EXISTS (SELECT 1 FROM public.elemental_teams t WHERE t.edition = p_edition AND t.slot = s)
    ORDER BY s
    LIMIT 1;
  END IF;
  IF v IS NULL THEN
    PERFORM public.elemental__fail('island_full');
  END IF;
  RETURN v;
END;
$$;

/**
 * Takes the pending team live: cap check, slot, members' team_id, and the
 * members' other open invites cancelled. Caller holds elemental__lock and has
 * checked that every accepted member is free.
 */
CREATE OR REPLACE FUNCTION public.elemental__activate(p_team_id uuid, p_candidates integer[])
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team public.elemental_teams;
  v_cap integer;
  v_live integer;
  v_slot integer;
BEGIN
  SELECT * INTO v_team FROM public.elemental_teams WHERE id = p_team_id FOR UPDATE;
  SELECT coalesce((SELECT team_cap FROM public.elemental_settings WHERE edition = v_team.edition), 175) INTO v_cap;
  SELECT count(*) INTO v_live FROM public.elemental_teams
  WHERE edition = v_team.edition AND public.elemental__is_live(status);
  IF v_live >= v_cap THEN
    PERFORM public.elemental__fail('island_full');
  END IF;
  v_slot := public.elemental__pick_slot(v_team.edition, p_candidates);

  UPDATE public.elemental_teams
  SET status = 'channel_pending', slot = v_slot, activated_at = now(), updated_at = now()
  WHERE id = p_team_id;

  UPDATE public.elemental_members m
  SET team_id = p_team_id, updated_at = now()
  FROM public.elemental_team_invites i
  WHERE i.team_id = p_team_id AND i.state = 'accepted'
    AND m.edition = v_team.edition AND m.discord_user_id = i.discord_user_id;

  -- Someone on this team can no longer join another.
  UPDATE public.elemental_team_invites o
  SET state = 'cancelled', responded_at = now()
  FROM public.elemental_teams ot, public.elemental_team_invites mine
  WHERE mine.team_id = p_team_id AND mine.state = 'accepted'
    AND o.discord_user_id = mine.discord_user_id AND o.team_id <> p_team_id
    AND o.state IN ('pending', 'accepted')
    AND ot.id = o.team_id AND ot.edition = v_team.edition AND ot.status = 'pending';
  RETURN v_slot;
END;
$$;

/** Members of a live team (for the size cap). */
CREATE OR REPLACE FUNCTION public.elemental__team_size(p_team_id uuid)
RETURNS integer
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer FROM public.elemental_members WHERE team_id = p_team_id;
$$;

/** A live team in the edition by slot; el:team_not_found otherwise. */
CREATE OR REPLACE FUNCTION public.elemental__team_by_slot(p_edition text, p_slot integer, p_live boolean DEFAULT true)
RETURNS public.elemental_teams
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_teams;
BEGIN
  SELECT * INTO v FROM public.elemental_teams WHERE edition = p_edition AND slot = p_slot FOR UPDATE;
  IF NOT FOUND OR (p_live AND NOT public.elemental__is_live(v.status)) THEN
    PERFORM public.elemental__fail('team_not_found');
  END IF;
  RETURN v;
END;
$$;

/** The island rows: live teams only, no Discord ids. */
CREATE OR REPLACE FUNCTION public.elemental__island(p_edition text)
RETURNS TABLE (team_id uuid, slot integer, element text, project_name text, status text, counted integer, lit boolean, badges text[])
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.slot, t.element, t.project_name, t.status,
    (SELECT count(*)::integer FROM public.elemental_tester_entries e
     WHERE e.team_id = t.id AND e.counted AND e.removed_at IS NULL),
    t.lit_at IS NOT NULL,
    coalesce((SELECT array_agg(DISTINCT b.kind ORDER BY b.kind) FROM public.elemental_badges b WHERE b.team_id = t.id), '{}'::text[])
  FROM public.elemental_teams t
  WHERE t.edition = p_edition AND public.elemental__is_live(t.status)
  ORDER BY t.slot;
$$;

-- ---------------------------------------------------------------------------
-- Claims guard: member codes belong to a registration of the edition's event;
-- rehearsal codes exist only on rehearsal editions.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elemental__claims_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_edition public.elemental_editions;
  v_slug text;
BEGIN
  SELECT * INTO v_edition FROM public.elemental_editions WHERE key = NEW.edition;
  IF NEW.kind = 'member' THEN
    IF NEW.registration_member_id IS NULL THEN
      PERFORM public.elemental__fail('claim_needs_member');
    END IF;
    IF v_edition.kind <> 'event' THEN
      PERFORM public.elemental__fail('wrong_edition');
    END IF;
    SELECT r.event_slug INTO v_slug
    FROM public.hackathon_event_registration_members m
    JOIN public.hackathon_event_registrations r ON r.id = m.registration_id
    WHERE m.id = NEW.registration_member_id;
    IF v_slug IS DISTINCT FROM v_edition.event_slug THEN
      PERFORM public.elemental__fail('wrong_event');
    END IF;
  ELSE
    IF NEW.registration_member_id IS NOT NULL THEN
      PERFORM public.elemental__fail('rehearsal_has_no_member');
    END IF;
    IF v_edition.kind <> 'rehearsal' THEN
      PERFORM public.elemental__fail('not_rehearsal');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elemental_claims_guard ON public.elemental_claims;
CREATE TRIGGER elemental_claims_guard
  BEFORE INSERT OR UPDATE OF edition, kind, registration_member_id ON public.elemental_claims
  FOR EACH ROW EXECUTE FUNCTION public.elemental__claims_guard();

/** An edition's kind and event slug are fixed once anyone has claimed in it. */
CREATE OR REPLACE FUNCTION public.elemental__editions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (NEW.kind IS DISTINCT FROM OLD.kind OR NEW.event_slug IS DISTINCT FROM OLD.event_slug OR NEW.key <> OLD.key)
     AND (EXISTS (SELECT 1 FROM public.elemental_claims WHERE edition = OLD.key)
          OR EXISTS (SELECT 1 FROM public.elemental_members WHERE edition = OLD.key)) THEN
    PERFORM public.elemental__fail('edition_in_use');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elemental_editions_guard ON public.elemental_editions;
CREATE TRIGGER elemental_editions_guard
  BEFORE UPDATE ON public.elemental_editions
  FOR EACH ROW EXECUTE FUNCTION public.elemental__editions_guard();

-- ---------------------------------------------------------------------------
-- Service role: codes, public island, reset, purge
-- ---------------------------------------------------------------------------

/**
 * One code per member row of each PAID registration of the edition's event,
 * positions 1..5 (rows past 5 come back as 'over_cap' with no code, for staff
 * to sort out). Idempotent: existing codes come back as 'existing'.
 */
CREATE OR REPLACE FUNCTION public.elemental_issue_claims(p_edition text)
RETURNS TABLE (registration_id uuid, team_name text, "position" integer, code text, state text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_edition public.elemental_editions := public.elemental__edition(p_edition);
  r record;
  v_claim public.elemental_claims;
BEGIN
  IF v_edition.kind <> 'event' THEN
    PERFORM public.elemental__fail('edition_not_event');
  END IF;
  FOR r IN
    SELECT reg.id AS reg_id, reg.team_name AS reg_team, m.id AS member_id, m.position AS pos
    FROM public.hackathon_event_registrations reg
    JOIN public.hackathon_event_registration_members m ON m.registration_id = reg.id
    WHERE reg.event_slug = v_edition.event_slug AND reg.status = 'paid'
    ORDER BY reg.created_at, reg.id, m.position
  LOOP
    registration_id := r.reg_id;
    team_name := r.reg_team;
    "position" := r.pos;
    IF r.pos > 5 THEN
      code := NULL;
      state := 'over_cap';
      RETURN NEXT;
      CONTINUE;
    END IF;
    SELECT * INTO v_claim FROM public.elemental_claims c
    WHERE c.edition = v_edition.key AND c.registration_member_id = r.member_id;
    IF FOUND THEN
      state := 'existing';
    ELSE
      v_claim := public.elemental__insert_claim(v_edition.key, 'member', r.member_id);
      state := 'new';
    END IF;
    code := v_claim.code;
    RETURN NEXT;
  END LOOP;
  PERFORM public.elemental__audit(v_edition.key, NULL, 'issue_claims', NULL, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.elemental__issue_rehearsal(p_edition text, p_n integer)
RETURNS SETOF text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_edition public.elemental_editions := public.elemental__edition(p_edition);
  i integer;
BEGIN
  IF v_edition.kind <> 'rehearsal' THEN
    PERFORM public.elemental__fail('not_rehearsal');
  END IF;
  IF p_n IS NULL OR p_n < 1 OR p_n > 200 THEN
    PERFORM public.elemental__fail('bad_count');
  END IF;
  FOR i IN 1 .. p_n LOOP
    RETURN NEXT (public.elemental__insert_claim(v_edition.key, 'rehearsal', NULL)).code;
  END LOOP;
END;
$$;

/** p_n new rehearsal codes; refused on any edition that is not a rehearsal. */
CREATE OR REPLACE FUNCTION public.elemental_issue_rehearsal_claims(p_edition text, p_n integer)
RETURNS TABLE (code text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c FROM public.elemental__issue_rehearsal(p_edition, p_n) AS c;
$$;

/** The island for the web: slot, element, project name, counts, lit, badges. No ids of people. */
CREATE OR REPLACE FUNCTION public.elemental_island_public(p_edition text)
RETURNS TABLE (slot integer, element text, project_name text, counted integer, lit boolean, badges text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT i.slot, i.element, i.project_name, i.counted, i.lit, i.badges
  FROM public.elemental__island(p_edition) AS i;
$$;

/**
 * Wipes a REHEARSAL edition's play data (claims, members, teams, entries,
 * check-ins, badges, posts, reports, lessons, audit), keeping its settings and
 * boards. p_confirm must be 'reset <edition>'. Refused on an event edition.
 */
CREATE OR REPLACE FUNCTION public.elemental_reset_edition(p_edition text, p_confirm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_edition public.elemental_editions := public.elemental__edition(p_edition);
  v_teams integer;
BEGIN
  IF v_edition.kind <> 'rehearsal' THEN
    PERFORM public.elemental__fail('not_rehearsal');
  END IF;
  IF p_confirm IS DISTINCT FROM 'reset ' || v_edition.key THEN
    PERFORM public.elemental__fail('bad_confirm');
  END IF;
  PERFORM public.elemental__lock(v_edition.key);
  SELECT count(*) INTO v_teams FROM public.elemental_teams WHERE edition = v_edition.key;
  DELETE FROM public.elemental_lesson_progress WHERE edition = v_edition.key;
  DELETE FROM public.elemental_tester_entries WHERE edition = v_edition.key;
  DELETE FROM public.elemental_checkins WHERE edition = v_edition.key;
  DELETE FROM public.elemental_badges WHERE edition = v_edition.key;
  DELETE FROM public.elemental_posts WHERE edition = v_edition.key;
  DELETE FROM public.elemental_reports WHERE edition = v_edition.key;
  UPDATE public.elemental_members SET team_id = NULL WHERE edition = v_edition.key;
  DELETE FROM public.elemental_teams WHERE edition = v_edition.key;
  DELETE FROM public.elemental_members WHERE edition = v_edition.key;
  DELETE FROM public.elemental_claims WHERE edition = v_edition.key;
  DELETE FROM public.elemental_audit WHERE edition = v_edition.key;
  PERFORM public.elemental__audit(v_edition.key, NULL, 'reset_edition', NULL, jsonb_build_object('teams', v_teams));
  RETURN jsonb_build_object('edition', v_edition.key, 'teams_removed', v_teams);
END;
$$;

/**
 * After the retention date: removes every Discord id, member link, code,
 * report and piece of free text in the edition, keeping teams, project names,
 * slots, elements and counts (anonymous totals). p_confirm must be
 * 'purge <edition>'.
 */
CREATE OR REPLACE FUNCTION public.elemental_purge_edition(p_edition text, p_confirm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_edition public.elemental_editions := public.elemental__edition(p_edition);
  v_retention timestamptz;
  v_members integer;
  v_entries integer;
BEGIN
  IF p_confirm IS DISTINCT FROM 'purge ' || v_edition.key THEN
    PERFORM public.elemental__fail('bad_confirm');
  END IF;
  SELECT retention_until INTO v_retention FROM public.elemental_settings WHERE edition = v_edition.key;
  IF v_edition.kind = 'event' AND (v_retention IS NULL OR now() < v_retention) THEN
    PERFORM public.elemental__fail('retention_not_reached');
  END IF;
  PERFORM public.elemental__lock(v_edition.key);

  UPDATE public.elemental_members
  SET discord_user_id = NULL, registration_member_id = NULL, claim_id = NULL, updated_at = now()
  WHERE edition = v_edition.key;
  GET DIAGNOSTICS v_members = ROW_COUNT;
  DELETE FROM public.elemental_claims WHERE edition = v_edition.key;
  UPDATE public.elemental_team_invites i SET discord_user_id = NULL
  FROM public.elemental_teams t WHERE t.id = i.team_id AND t.edition = v_edition.key;
  UPDATE public.elemental_teams
  SET created_by = NULL, discord_channel_id = NULL, handin_url = NULL, updated_at = now()
  WHERE edition = v_edition.key;
  UPDATE public.elemental_tester_entries
  SET logger_discord_id = NULL, who = NULL, tried = NULL, quote = NULL, changed = NULL,
      removed_by = NULL, removed_reason = NULL, reviewed_by = NULL, canvas_ids = NULL
  WHERE edition = v_edition.key;
  GET DIAGNOSTICS v_entries = ROW_COUNT;
  UPDATE public.elemental_lesson_progress SET answer = NULL, member_id = NULL WHERE edition = v_edition.key;
  UPDATE public.elemental_checkins SET discord_user_id = NULL WHERE edition = v_edition.key;
  UPDATE public.elemental_badges SET awarded_by = NULL WHERE edition = v_edition.key;
  UPDATE public.elemental_posts SET message_id = NULL WHERE edition = v_edition.key;
  DELETE FROM public.elemental_reports WHERE edition = v_edition.key;
  UPDATE public.elemental_audit SET actor = NULL, target = NULL WHERE edition = v_edition.key;
  UPDATE public.elemental_editions SET purged_at = now() WHERE key = v_edition.key;
  PERFORM public.elemental__audit(v_edition.key, NULL, 'purge_edition', NULL,
    jsonb_build_object('members', v_members, 'entries', v_entries));
  RETURN jsonb_build_object('edition', v_edition.key, 'members', v_members, 'entries', v_entries);
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: settings
-- ---------------------------------------------------------------------------

/**
 * The guild's settings as jsonb (bot/src/elemental/context.ts
 * normalizeSettings), or NULL when the guild has no row. Also the heartbeat's
 * database ping.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_settings_get(p_guild_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT to_jsonb(s) || jsonb_build_object('edition_kind', e.kind)
  FROM public.elemental_settings s
  JOIN public.elemental_editions e ON e.key = s.edition
  WHERE s.guild_id = p_guild_id;
$$;

/**
 * Staff changes to a guild's settings. Allowed keys: card_override (object or
 * null), schedule, team_create_opens_at, team_create_closes_at (ISO time or
 * null), healing_enabled, tester_cap, team_cap, heal_steps, heal_per_team.
 * Never the edition, Discord ids or the retention date (those are seeded by
 * staff scripts). Returns the new settings.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_settings_set(p_guild_id text, p_actor text, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_settings := public.elemental__settings(p_guild_id);
  v_key text;
  v_value jsonb;
BEGIN
  PERFORM public.elemental__user(p_actor);
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    PERFORM public.elemental__fail('bad_patch');
  END IF;
  FOR v_key, v_value IN SELECT key, value FROM jsonb_each(p_patch) LOOP
    BEGIN
      CASE v_key
        WHEN 'card_override' THEN
          v.card_override := CASE WHEN jsonb_typeof(v_value) = 'null' THEN NULL ELSE v_value END;
        WHEN 'schedule' THEN
          v.schedule := v_value;
        WHEN 'team_create_opens_at' THEN
          v.team_create_opens_at := (v_value #>> '{}')::timestamptz;
        WHEN 'team_create_closes_at' THEN
          v.team_create_closes_at := (v_value #>> '{}')::timestamptz;
        WHEN 'healing_enabled' THEN
          IF jsonb_typeof(v_value) <> 'boolean' THEN RAISE EXCEPTION 'type'; END IF;
          v.healing_enabled := v_value::boolean;
        WHEN 'tester_cap' THEN
          v.tester_cap := (v_value #>> '{}')::integer;
        WHEN 'team_cap' THEN
          v.team_cap := (v_value #>> '{}')::integer;
        WHEN 'heal_steps' THEN
          v.heal_steps := (v_value #>> '{}')::integer;
        WHEN 'heal_per_team' THEN
          v.heal_per_team := (v_value #>> '{}')::integer;
        ELSE
          PERFORM public.elemental__fail('bad_patch', v_key);
      END CASE;
    EXCEPTION
      WHEN raise_exception THEN
        IF SQLERRM = 'el:bad_patch' THEN RAISE; END IF;
        PERFORM public.elemental__fail('bad_patch', v_key);
      WHEN data_exception THEN
        PERFORM public.elemental__fail('bad_patch', v_key);
    END;
  END LOOP;

  BEGIN
    UPDATE public.elemental_settings SET
      card_override = v.card_override,
      schedule = v.schedule,
      team_create_opens_at = v.team_create_opens_at,
      team_create_closes_at = v.team_create_closes_at,
      healing_enabled = v.healing_enabled,
      tester_cap = v.tester_cap,
      team_cap = v.team_cap,
      heal_steps = v.heal_steps,
      heal_per_team = v.heal_per_team,
      updated_at = now()
    WHERE guild_id = p_guild_id;
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    PERFORM public.elemental__fail('bad_patch');
  END;
  PERFORM public.elemental__audit(v.edition, p_actor, 'settings_set', p_guild_id,
    jsonb_build_object('keys', (SELECT jsonb_agg(k ORDER BY k) FROM jsonb_object_keys(p_patch) AS k)));
  RETURN public.elemental_bot_settings_get(p_guild_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: identity (claim, staff link, whois, element)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elemental__member_json(p_member public.elemental_members, p_edition_kind text, p_already boolean)
RETURNS jsonb
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'member_id', p_member.id,
    'edition', p_member.edition,
    'edition_kind', p_edition_kind,
    'already', p_already,
    'is_staff', p_member.is_staff,
    'element_pick', p_member.element_pick,
    'team', CASE WHEN public.elemental__live_team_of(p_member) IS NULL THEN NULL
                 ELSE public.elemental__team_json(p_member.team_id) END);
$$;

/** Registration check shared by /join and /el link: still paid, same event. */
CREATE OR REPLACE FUNCTION public.elemental__check_paid(p_edition public.elemental_editions, p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slug text;
  v_status text;
BEGIN
  SELECT r.event_slug, r.status INTO v_slug, v_status
  FROM public.hackathon_event_registration_members m
  JOIN public.hackathon_event_registrations r ON r.id = m.registration_id
  WHERE m.id = p_member_id;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('registration_not_found');
  END IF;
  IF v_slug IS DISTINCT FROM p_edition.event_slug THEN
    PERFORM public.elemental__fail('wrong_event');
  END IF;
  IF v_status <> 'paid' THEN
    PERFORM public.elemental__fail('not_paid');
  END IF;
END;
$$;

/**
 * /join code: uses the code once and makes the Discord account a member of the
 * guild's edition. Re-checks that the registration is still paid. Repeating
 * with the same code and user returns already=true.
 * Errors: unknown_guild, bad_user, unknown_code, wrong_edition, code_used,
 * already_claimed, not_paid, wrong_event, registration_not_found.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_claim(p_guild_id text, p_code text, p_user text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_edition public.elemental_editions := public.elemental__edition(v_settings.edition);
  v_user text := public.elemental__user(p_user);
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_claim public.elemental_claims;
  v_member public.elemental_members;
BEGIN
  IF v_code !~ '^[A-HJ-NP-Z2-9]{8}$' THEN
    PERFORM public.elemental__fail('unknown_code');
  END IF;
  SELECT * INTO v_claim FROM public.elemental_claims WHERE code = v_code FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('unknown_code');
  END IF;
  IF v_claim.edition <> v_edition.key THEN
    PERFORM public.elemental__fail('wrong_edition');
  END IF;
  v_member := public.elemental__member(v_edition.key, v_user);
  IF v_claim.used_by IS NOT NULL THEN
    IF v_claim.used_by = v_user AND v_member.id IS NOT NULL THEN
      RETURN public.elemental__member_json(v_member, v_edition.kind, true);
    END IF;
    PERFORM public.elemental__fail('code_used');
  END IF;
  IF v_member.id IS NOT NULL THEN
    PERFORM public.elemental__fail('already_claimed');
  END IF;
  IF v_claim.kind = 'member' THEN
    PERFORM public.elemental__check_paid(v_edition, v_claim.registration_member_id);
    IF EXISTS (SELECT 1 FROM public.elemental_members
               WHERE edition = v_edition.key AND registration_member_id = v_claim.registration_member_id) THEN
      PERFORM public.elemental__fail('code_used');
    END IF;
  ELSIF v_edition.kind <> 'rehearsal' THEN
    PERFORM public.elemental__fail('wrong_edition');
  END IF;

  INSERT INTO public.elemental_members (edition, discord_user_id, registration_member_id, claim_id)
  VALUES (v_edition.key, v_user, v_claim.registration_member_id, v_claim.id)
  RETURNING * INTO v_member;
  UPDATE public.elemental_claims SET used_at = now(), used_by = v_user WHERE id = v_claim.id;
  PERFORM public.elemental__audit(v_edition.key, v_user, 'claim', v_user, jsonb_build_object('claim_kind', v_claim.kind));
  RETURN public.elemental__member_json(v_member, v_edition.kind, false);
END;
$$;

/**
 * /el link: a Host links a Discord account to a registration member row by
 * registration id and position (lost or misused code), through the same
 * checks as /join. With p_registration_id NULL it records a staff account
 * (is_staff, no registration). The member row's code, if any, is used up.
 * Errors: as elemental_bot_claim, plus member_linked (DETAIL: the Discord id
 * already holding that member row).
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_staff_link(
  p_guild_id text, p_actor text, p_user text, p_registration_id uuid, p_position integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_edition public.elemental_editions := public.elemental__edition(v_settings.edition);
  v_actor text := public.elemental__user(p_actor);
  v_user text := public.elemental__user(p_user);
  v_member public.elemental_members;
  v_reg_member uuid;
  v_holder text;
  v_claim public.elemental_claims;
BEGIN
  PERFORM public.elemental__lock(v_edition.key);
  v_member := public.elemental__member(v_edition.key, v_user);

  IF p_registration_id IS NULL THEN
    IF v_member.id IS NULL THEN
      INSERT INTO public.elemental_members (edition, discord_user_id, is_staff)
      VALUES (v_edition.key, v_user, true) RETURNING * INTO v_member;
    ELSIF NOT v_member.is_staff THEN
      UPDATE public.elemental_members SET is_staff = true, updated_at = now() WHERE id = v_member.id RETURNING * INTO v_member;
    END IF;
    PERFORM public.elemental__audit(v_edition.key, v_actor, 'staff_link', v_user, jsonb_build_object('staff', true));
    RETURN public.elemental__member_json(v_member, v_edition.kind, false);
  END IF;

  IF v_edition.kind <> 'event' THEN
    PERFORM public.elemental__fail('wrong_edition');
  END IF;
  SELECT m.id INTO v_reg_member FROM public.hackathon_event_registration_members m
  WHERE m.registration_id = p_registration_id AND m.position = p_position;
  IF v_reg_member IS NULL THEN
    PERFORM public.elemental__fail('registration_not_found');
  END IF;
  PERFORM public.elemental__check_paid(v_edition, v_reg_member);

  IF v_member.registration_member_id = v_reg_member THEN
    RETURN public.elemental__member_json(v_member, v_edition.kind, true);
  END IF;
  IF v_member.registration_member_id IS NOT NULL THEN
    PERFORM public.elemental__fail('already_claimed');
  END IF;
  SELECT discord_user_id INTO v_holder FROM public.elemental_members
  WHERE edition = v_edition.key AND registration_member_id = v_reg_member;
  IF FOUND THEN
    PERFORM public.elemental__fail('member_linked', v_holder);
  END IF;

  SELECT * INTO v_claim FROM public.elemental_claims
  WHERE edition = v_edition.key AND registration_member_id = v_reg_member FOR UPDATE;
  IF NOT FOUND THEN
    v_claim := public.elemental__insert_claim(v_edition.key, 'member', v_reg_member);
  END IF;
  UPDATE public.elemental_claims SET used_at = now(), used_by = v_user WHERE id = v_claim.id;

  IF v_member.id IS NULL THEN
    INSERT INTO public.elemental_members (edition, discord_user_id, registration_member_id, claim_id)
    VALUES (v_edition.key, v_user, v_reg_member, v_claim.id) RETURNING * INTO v_member;
  ELSE
    UPDATE public.elemental_members
    SET registration_member_id = v_reg_member, claim_id = v_claim.id, updated_at = now()
    WHERE id = v_member.id RETURNING * INTO v_member;
  END IF;
  PERFORM public.elemental__audit(v_edition.key, v_actor, 'staff_link', v_user,
    jsonb_build_object('registration_id', p_registration_id, 'position', p_position));
  RETURN public.elemental__member_json(v_member, v_edition.kind, false);
END;
$$;

/**
 * /el whois (Safety, Host): the registration id and position behind a
 * Discord account, so staff can look the parent contact up in the admin page.
 * Never a name, school or contact. Audited.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_whois(p_guild_id text, p_actor text, p_user text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_user text := public.elemental__user(p_user);
  v_member public.elemental_members := public.elemental__member(v_settings.edition, v_user);
  v_reg uuid;
  v_pos integer;
  v_team public.elemental_teams;
BEGIN
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'whois', v_user, '{}'::jsonb);
  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false);
  END IF;
  SELECT m.registration_id, m.position INTO v_reg, v_pos
  FROM public.hackathon_event_registration_members m WHERE m.id = v_member.registration_member_id;
  SELECT * INTO v_team FROM public.elemental_teams WHERE id = v_member.team_id;
  RETURN jsonb_build_object(
    'claimed', true,
    'is_staff', v_member.is_staff,
    'registration_id', v_reg,
    'position', v_pos,
    'element_pick', v_member.element_pick,
    'team_slot', CASE WHEN public.elemental__is_live(v_team.status) THEN v_team.slot END,
    'claimed_at', v_member.created_at);
END;
$$;

/** Who this Discord account is in the guild's edition, or NULL when not claimed. */
CREATE OR REPLACE FUNCTION public.elemental_bot_member_get(p_guild_id text, p_user text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_edition public.elemental_editions := public.elemental__edition(v_settings.edition);
  v_member public.elemental_members := public.elemental__member(v_edition.key, public.elemental__user(p_user));
BEGIN
  IF v_member.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.elemental__member_json(v_member, v_edition.kind, true);
END;
$$;

/**
 * Element picker: a claimed member picks one element; changeable until they
 * are on a live team. Errors: not_claimed, on_team, bad_element.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_set_element(p_guild_id text, p_user text, p_element text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_user text := public.elemental__user(p_user);
  v_element text := public.elemental__element(p_element);
  v_member public.elemental_members := public.elemental__member(v_settings.edition, v_user);
  v_previous text;
BEGIN
  IF v_member.id IS NULL THEN
    PERFORM public.elemental__fail('not_claimed');
  END IF;
  IF public.elemental__live_team_of(v_member) IS NOT NULL THEN
    PERFORM public.elemental__fail('on_team');
  END IF;
  v_previous := v_member.element_pick;
  UPDATE public.elemental_members SET element_pick = v_element, updated_at = now() WHERE id = v_member.id;
  RETURN jsonb_build_object('element', v_element, 'previous', v_previous);
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: teams
-- ---------------------------------------------------------------------------

/** A claimed member who is not on a live team, or the error for it. */
CREATE OR REPLACE FUNCTION public.elemental__free_member(p_edition text, p_user text, p_unclaimed text, p_teamed text)
RETURNS public.elemental_members
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_members := public.elemental__member(p_edition, p_user);
BEGIN
  IF v.id IS NULL THEN
    PERFORM public.elemental__fail(p_unclaimed, p_user);
  END IF;
  IF public.elemental__live_team_of(v) IS NOT NULL THEN
    PERFORM public.elemental__fail(p_teamed, p_user);
  END IF;
  RETURN v;
END;
$$;

/** 1-4 other claimed, free members (deduplicated), or the error. */
CREATE OR REPLACE FUNCTION public.elemental__check_people(
  p_edition text, p_creator text, p_others text[], p_min integer, p_max integer)
RETURNS text[]
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_others text[];
  v text;
BEGIN
  SELECT coalesce(array_agg(DISTINCT u ORDER BY u), '{}') INTO v_others
  FROM unnest(coalesce(p_others, '{}'::text[])) AS u WHERE u IS DISTINCT FROM p_creator;
  IF cardinality(v_others) < p_min OR cardinality(v_others) > p_max THEN
    PERFORM public.elemental__fail('team_size');
  END IF;
  FOREACH v IN ARRAY v_others LOOP
    PERFORM public.elemental__user(v);
    PERFORM public.elemental__free_member(p_edition, v, 'invitee_not_claimed', 'invitee_teamed');
  END LOOP;
  RETURN v_others;
END;
$$;

/**
 * /team create: a PENDING team (no slot) with the creator accepted and 1-4
 * invitees pending for 24 hours. Every person must be claimed and not on a
 * live team. Open only in [team_create_opens_at, team_create_closes_at).
 * Creating again with the same name, element and people within 10 minutes
 * returns the same team; otherwise the creator's older pending team is
 * archived. Errors: team_create_closed, bad_project_name, pii (DETAIL
 * project_name), bad_element, team_size, not_claimed, already_teamed,
 * invitee_not_claimed / invitee_teamed (DETAIL: that Discord id).
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_create(
  p_guild_id text, p_creator text, p_project_name text, p_element text, p_invitees text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_edition text := v_settings.edition;
  v_creator text := public.elemental__user(p_creator);
  v_name text;
  v_element text;
  v_others text[];
  v_team public.elemental_teams;
  v_existing uuid;
BEGIN
  IF v_settings.team_create_opens_at IS NULL OR now() < v_settings.team_create_opens_at
     OR (v_settings.team_create_closes_at IS NOT NULL AND now() >= v_settings.team_create_closes_at) THEN
    PERFORM public.elemental__fail('team_create_closed');
  END IF;
  v_name := public.elemental__project_name(p_project_name);
  v_element := public.elemental__element(p_element);

  PERFORM public.elemental__lock(v_edition);
  PERFORM public.elemental__free_member(v_edition, v_creator, 'not_claimed', 'already_teamed');
  v_others := public.elemental__check_people(v_edition, v_creator, p_invitees, 1, 4);

  -- A retry of the same request returns the team it made.
  SELECT t.id INTO v_existing
  FROM public.elemental_teams t
  WHERE t.edition = v_edition AND t.status = 'pending' AND t.created_by = v_creator AND NOT t.created_by_staff
    AND t.created_at > now() - interval '10 minutes'
    AND t.project_name = v_name AND t.element = v_element
    AND (SELECT array_agg(i.discord_user_id ORDER BY i.discord_user_id) FROM public.elemental_team_invites i
         WHERE i.team_id = t.id AND NOT i.is_creator) = v_others
  ORDER BY t.created_at DESC
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN public.elemental__team_json(v_existing) || jsonb_build_object('repeated', true);
  END IF;

  -- One open pending team per creator: the older one is withdrawn.
  UPDATE public.elemental_team_invites i SET state = 'cancelled', responded_at = now()
  FROM public.elemental_teams t
  WHERE t.id = i.team_id AND t.edition = v_edition AND t.status = 'pending' AND t.created_by = v_creator
    AND NOT t.created_by_staff AND i.state IN ('pending', 'accepted');
  UPDATE public.elemental_teams SET status = 'archived', archived_at = now(), updated_at = now()
  WHERE edition = v_edition AND status = 'pending' AND created_by = v_creator AND NOT created_by_staff;

  INSERT INTO public.elemental_teams (edition, project_name, element, status, created_by)
  VALUES (v_edition, v_name, v_element, 'pending', v_creator)
  RETURNING * INTO v_team;
  INSERT INTO public.elemental_team_invites (team_id, discord_user_id, is_creator, state, responded_at)
  VALUES (v_team.id, v_creator, true, 'accepted', now());
  INSERT INTO public.elemental_team_invites (team_id, discord_user_id)
  SELECT v_team.id, u FROM unnest(v_others) AS u;

  PERFORM public.elemental__audit(v_edition, v_creator, 'team_create', v_team.id::text,
    jsonb_build_object('element', v_element, 'invitees', cardinality(v_others)));
  RETURN public.elemental__team_json(v_team.id) || jsonb_build_object('repeated', false);
END;
$$;

/**
 * An invitee's Accept. The team goes live once 2 people (creator plus one)
 * have accepted: slot = first free of p_candidate_slots (pass
 * candidateSlots(element, []) from lib/elemental/island/sectors.ts), else the
 * lowest free; at most team_cap live teams (el:island_full). After that,
 * accepting joins the live team up to 5 people. Repeating returns the same
 * state. Returns the team plus activated (this call took it live) and joined.
 * Errors: team_not_found, team_archived, invite_not_found, invite_closed,
 * invite_expired, not_claimed, already_teamed, team_full, island_full.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_accept(
  p_guild_id text, p_team_id uuid, p_user text, p_candidate_slots integer[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_edition text := v_settings.edition;
  v_user text := public.elemental__user(p_user);
  v_team public.elemental_teams;
  v_invite public.elemental_team_invites;
  v_member public.elemental_members;
  v_accepted integer;
  v_activated boolean := false;
  v_joined boolean := false;
BEGIN
  PERFORM public.elemental__lock(v_edition);
  SELECT * INTO v_team FROM public.elemental_teams WHERE id = p_team_id AND edition = v_edition FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('team_not_found');
  END IF;
  IF v_team.status = 'archived' THEN
    PERFORM public.elemental__fail('team_archived');
  END IF;
  SELECT * INTO v_invite FROM public.elemental_team_invites
  WHERE team_id = v_team.id AND discord_user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('invite_not_found');
  END IF;
  v_member := public.elemental__member(v_edition, v_user);
  IF v_member.id IS NULL THEN
    PERFORM public.elemental__fail('not_claimed');
  END IF;

  IF v_invite.state = 'accepted' THEN
    RETURN public.elemental__team_json(v_team.id) || jsonb_build_object('activated', false, 'joined', false, 'repeated', true);
  END IF;
  IF v_invite.state <> 'pending' THEN
    PERFORM public.elemental__fail('invite_closed');
  END IF;
  IF v_invite.expires_at <= now() THEN
    PERFORM public.elemental__fail('invite_expired');
  END IF;
  IF public.elemental__live_team_of(v_member) IS NOT NULL THEN
    PERFORM public.elemental__fail('already_teamed');
  END IF;

  IF v_team.status = 'pending' THEN
    UPDATE public.elemental_team_invites SET state = 'accepted', responded_at = now() WHERE id = v_invite.id;
    -- Anyone who accepted but has since joined another team no longer counts.
    UPDATE public.elemental_team_invites i SET state = 'cancelled', responded_at = now()
    FROM public.elemental_members m
    WHERE i.team_id = v_team.id AND i.state = 'accepted'
      AND m.edition = v_edition AND m.discord_user_id = i.discord_user_id
      AND public.elemental__live_team_of(m) IS NOT NULL;
    SELECT count(*) INTO v_accepted FROM public.elemental_team_invites WHERE team_id = v_team.id AND state = 'accepted';
    IF v_accepted >= 2 THEN
      PERFORM public.elemental__activate(v_team.id, p_candidate_slots);
      v_activated := true;
    END IF;
  ELSE
    IF public.elemental__team_size(v_team.id) >= 5 THEN
      PERFORM public.elemental__fail('team_full');
    END IF;
    UPDATE public.elemental_team_invites SET state = 'accepted', responded_at = now() WHERE id = v_invite.id;
    UPDATE public.elemental_members SET team_id = v_team.id, updated_at = now() WHERE id = v_member.id;
    UPDATE public.elemental_team_invites o SET state = 'cancelled', responded_at = now()
    FROM public.elemental_teams ot
    WHERE o.discord_user_id = v_user AND o.team_id <> v_team.id AND o.state IN ('pending', 'accepted')
      AND ot.id = o.team_id AND ot.edition = v_edition AND ot.status = 'pending';
    v_joined := true;
  END IF;
  PERFORM public.elemental__audit(v_edition, v_user, 'team_accept', v_team.id::text,
    jsonb_build_object('activated', v_activated, 'joined', v_joined));
  RETURN public.elemental__team_json(v_team.id) || jsonb_build_object('activated', v_activated, 'joined', v_joined, 'repeated', false);
END;
$$;

/** An invitee's Decline. Repeating is a no-op. Errors: team_not_found, invite_not_found, invite_closed. */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_decline(p_guild_id text, p_team_id uuid, p_user text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_user text := public.elemental__user(p_user);
  v_invite public.elemental_team_invites;
BEGIN
  SELECT i.* INTO v_invite FROM public.elemental_team_invites i
  JOIN public.elemental_teams t ON t.id = i.team_id
  WHERE i.team_id = p_team_id AND t.edition = v_settings.edition AND i.discord_user_id = v_user
  FOR UPDATE OF i;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('invite_not_found');
  END IF;
  IF v_invite.state = 'declined' THEN
    RETURN public.elemental__team_json(p_team_id) || jsonb_build_object('repeated', true);
  END IF;
  IF v_invite.state <> 'pending' THEN
    PERFORM public.elemental__fail('invite_closed');
  END IF;
  UPDATE public.elemental_team_invites SET state = 'declined', responded_at = now() WHERE id = v_invite.id;
  PERFORM public.elemental__audit(v_settings.edition, v_user, 'team_decline', p_team_id::text, '{}'::jsonb);
  RETURN public.elemental__team_json(p_team_id) || jsonb_build_object('repeated', false);
END;
$$;

/**
 * /el team-create: staff make a live team from 2-5 claimed, free members
 * (matched solos); everyone counts as accepted. Ignores the create window.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_create_staff(
  p_guild_id text, p_actor text, p_project_name text, p_element text, p_members text[],
  p_candidate_slots integer[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_edition text := v_settings.edition;
  v_actor text := public.elemental__user(p_actor);
  v_name text := public.elemental__project_name(p_project_name);
  v_element text := public.elemental__element(p_element);
  v_people text[];
  v_team public.elemental_teams;
BEGIN
  PERFORM public.elemental__lock(v_edition);
  v_people := public.elemental__check_people(v_edition, NULL, p_members, 2, 5);
  INSERT INTO public.elemental_teams (edition, project_name, element, status, created_by, created_by_staff)
  VALUES (v_edition, v_name, v_element, 'pending', v_actor, true)
  RETURNING * INTO v_team;
  INSERT INTO public.elemental_team_invites (team_id, discord_user_id, is_creator, state, responded_at)
  SELECT v_team.id, u, false, 'accepted', now() FROM unnest(v_people) AS u;
  PERFORM public.elemental__activate(v_team.id, p_candidate_slots);
  PERFORM public.elemental__audit(v_edition, v_actor, 'team_create_staff', v_team.id::text,
    jsonb_build_object('element', v_element, 'members', cardinality(v_people)));
  RETURN public.elemental__team_json(v_team.id) || jsonb_build_object('activated', true);
END;
$$;

/** The team's Discord channel was made: channel_pending -> active. Same channel again is a no-op. */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_set_channel(p_guild_id text, p_team_id uuid, p_channel_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_team public.elemental_teams;
BEGIN
  IF NOT public.elemental__is_snowflake(p_channel_id) THEN
    PERFORM public.elemental__fail('bad_channel');
  END IF;
  SELECT * INTO v_team FROM public.elemental_teams WHERE id = p_team_id AND edition = v_settings.edition FOR UPDATE;
  IF NOT FOUND OR v_team.status = 'pending' THEN
    PERFORM public.elemental__fail('team_not_found');
  END IF;
  IF v_team.status = 'archived' THEN
    PERFORM public.elemental__fail('team_archived');
  END IF;
  IF v_team.discord_channel_id IS DISTINCT FROM p_channel_id OR v_team.status <> 'active' THEN
    BEGIN
      UPDATE public.elemental_teams
      SET discord_channel_id = p_channel_id, status = 'active', updated_at = now()
      WHERE id = v_team.id;
    EXCEPTION WHEN unique_violation THEN
      PERFORM public.elemental__fail('channel_in_use');
    END;
  END IF;
  RETURN public.elemental__team_json(v_team.id);
END;
$$;

/** Live teams still waiting for their channel (re-enqueued when the bot starts). */
CREATE OR REPLACE FUNCTION public.elemental_bot_teams_channel_pending(p_guild_id text)
RETURNS TABLE (team_id uuid, slot integer, element text, project_name text, member_ids text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
BEGIN
  RETURN QUERY
  SELECT t.id, t.slot, t.element, t.project_name,
    coalesce((SELECT array_agg(m.discord_user_id ORDER BY m.created_at, m.discord_user_id)
              FROM public.elemental_members m WHERE m.team_id = t.id AND m.discord_user_id IS NOT NULL), '{}'::text[])
  FROM public.elemental_teams t
  WHERE t.edition = v_settings.edition AND t.status = 'channel_pending'
  ORDER BY t.activated_at, t.slot;
END;
$$;

/** One team by id, slot or channel (first one given wins), or NULL. */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_get(
  p_guild_id text, p_team_id uuid DEFAULT NULL, p_slot integer DEFAULT NULL, p_channel_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_id uuid;
BEGIN
  IF p_team_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.elemental_teams WHERE id = p_team_id AND edition = v_settings.edition;
  ELSIF p_slot IS NOT NULL THEN
    SELECT id INTO v_id FROM public.elemental_teams WHERE slot = p_slot AND edition = v_settings.edition;
  ELSIF p_channel_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.elemental_teams WHERE discord_channel_id = p_channel_id AND edition = v_settings.edition;
  END IF;
  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN public.elemental__team_json(v_id);
END;
$$;

/** /el team-rename. Errors: team_not_found, bad_project_name, pii. */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_rename(p_guild_id text, p_actor text, p_slot integer, p_project_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_name text := public.elemental__project_name(p_project_name);
  v_team public.elemental_teams;
BEGIN
  PERFORM public.elemental__lock(v_settings.edition);
  v_team := public.elemental__team_by_slot(v_settings.edition, p_slot);
  UPDATE public.elemental_teams SET project_name = v_name, updated_at = now() WHERE id = v_team.id;
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'team_rename', v_team.id::text, '{}'::jsonb);
  RETURN public.elemental__team_json(v_team.id);
END;
$$;

/**
 * /el team-set-element: the team pivots to another element. It gets a new
 * slot (first free of p_candidate_slots for the new element), its canvas link
 * is cleared (elemental_canvas_links, added by the next migration) and its
 * tester entries are marked for a canvas rewrite. Returns the team plus
 * old_slot and old_element.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_set_element(
  p_guild_id text, p_actor text, p_slot integer, p_element text, p_candidate_slots integer[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_element text := public.elemental__element(p_element);
  v_team public.elemental_teams;
  v_slot integer;
BEGIN
  PERFORM public.elemental__lock(v_settings.edition);
  v_team := public.elemental__team_by_slot(v_settings.edition, p_slot);
  IF v_team.element = v_element THEN
    RETURN public.elemental__team_json(v_team.id)
      || jsonb_build_object('old_slot', v_team.slot, 'old_element', v_team.element, 'changed', false);
  END IF;
  v_slot := public.elemental__pick_slot(v_settings.edition, p_candidate_slots, v_team.slot);
  UPDATE public.elemental_teams SET element = v_element, slot = v_slot, updated_at = now() WHERE id = v_team.id;
  IF to_regclass('public.elemental_canvas_links') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.elemental_canvas_links WHERE team_id = $1' USING v_team.id;
  END IF;
  UPDATE public.elemental_tester_entries SET canvas_status = 'none'
  WHERE team_id = v_team.id AND removed_at IS NULL;
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'team_set_element', v_team.id::text,
    jsonb_build_object('from', v_team.element, 'to', v_element, 'old_slot', v_team.slot, 'slot', v_slot));
  RETURN public.elemental__team_json(v_team.id)
    || jsonb_build_object('old_slot', v_team.slot, 'old_element', v_team.element, 'changed', true);
END;
$$;

/**
 * /el team-archive (by slot, so live or already archived teams): the team
 * leaves the island, legend and totals. Its tester entries stop counting and
 * its lantern goes out; nothing else is freed: its slot stays taken and its
 * members keep the link (they count as free for a new team). Repeating is a
 * no-op. Returns the team with the member_ids it had.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_team_archive(p_guild_id text, p_actor text, p_slot integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_team public.elemental_teams;
  v_members jsonb;
BEGIN
  PERFORM public.elemental__lock(v_settings.edition);
  v_team := public.elemental__team_by_slot(v_settings.edition, p_slot, false);
  -- The member list, taken before archiving hides it, so the bot can fix the channel.
  v_members := public.elemental__team_json(v_team.id) -> 'member_ids';
  IF v_team.status <> 'archived' THEN
    UPDATE public.elemental_teams
    SET status = 'archived', archived_at = now(), lit_at = NULL, updated_at = now()
    WHERE id = v_team.id;
    UPDATE public.elemental_tester_entries SET counted = false WHERE team_id = v_team.id;
    UPDATE public.elemental_team_invites SET state = 'cancelled', responded_at = now()
    WHERE team_id = v_team.id AND state = 'pending';
    PERFORM public.elemental__audit(v_settings.edition, v_actor, 'team_archive', v_team.id::text, '{}'::jsonb);
  END IF;
  RETURN public.elemental__team_json(v_team.id) || jsonb_build_object('member_ids', v_members);
END;
$$;

/**
 * /el team-move-member: moves a claimed member onto the live team at
 * p_to_slot (at most 5 people). Returns {from: team|null, to: team}.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_member_move(p_guild_id text, p_actor text, p_user text, p_to_slot integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_user text := public.elemental__user(p_user);
  v_member public.elemental_members;
  v_to public.elemental_teams;
  v_from uuid;
BEGIN
  PERFORM public.elemental__lock(v_settings.edition);
  v_member := public.elemental__member(v_settings.edition, v_user);
  IF v_member.id IS NULL THEN
    PERFORM public.elemental__fail('not_claimed', v_user);
  END IF;
  v_to := public.elemental__team_by_slot(v_settings.edition, p_to_slot);
  v_from := public.elemental__live_team_of(v_member);
  IF v_from = v_to.id THEN
    RETURN jsonb_build_object('from', NULL, 'to', public.elemental__team_json(v_to.id), 'changed', false);
  END IF;
  IF public.elemental__team_size(v_to.id) >= 5 THEN
    PERFORM public.elemental__fail('team_full');
  END IF;
  UPDATE public.elemental_members SET team_id = v_to.id, updated_at = now() WHERE id = v_member.id;
  UPDATE public.elemental_team_invites o SET state = 'cancelled', responded_at = now()
  FROM public.elemental_teams ot
  WHERE o.discord_user_id = v_user AND o.state IN ('pending', 'accepted')
    AND ot.id = o.team_id AND ot.edition = v_settings.edition AND ot.status = 'pending';
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'member_move', v_user,
    jsonb_build_object('from', v_from, 'to', v_to.id));
  RETURN jsonb_build_object(
    'from', CASE WHEN v_from IS NULL THEN NULL ELSE public.elemental__team_json(v_from) END,
    'to', public.elemental__team_json(v_to.id),
    'changed', true);
END;
$$;

/**
 * /el unteamed: claimed, non-staff members not on a live team, optionally of
 * one picked element, with the registration's wants_team_matching flag.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_unteamed(p_guild_id text, p_element text DEFAULT NULL)
RETURNS TABLE (discord_user_id text, element_pick text, wants_team_matching boolean, claimed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_element text := CASE WHEN p_element IS NULL OR btrim(p_element) = '' THEN NULL ELSE public.elemental__element(p_element) END;
BEGIN
  RETURN QUERY
  SELECT m.discord_user_id, m.element_pick, coalesce(r.wants_team_matching, false), m.created_at
  FROM public.elemental_members m
  LEFT JOIN public.hackathon_event_registration_members rm ON rm.id = m.registration_member_id
  LEFT JOIN public.hackathon_event_registrations r ON r.id = rm.registration_id
  WHERE m.edition = v_settings.edition AND NOT m.is_staff AND m.discord_user_id IS NOT NULL
    AND public.elemental__live_team_of(m) IS NULL
    AND (v_element IS NULL OR m.element_pick = v_element)
  ORDER BY m.created_at, m.discord_user_id;
END;
$$;

/**
 * /el dryrun-cleanup, rehearsal guilds only: archives every team, frees
 * their slots and members, and returns the channels the bot should delete.
 * p_confirm must equal the edition key.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_dryrun_cleanup(p_guild_id text, p_actor text, p_confirm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_edition public.elemental_editions := public.elemental__edition(v_settings.edition);
  v_actor text := public.elemental__user(p_actor);
  v_teams jsonb;
BEGIN
  IF v_edition.kind <> 'rehearsal' THEN
    PERFORM public.elemental__fail('not_rehearsal');
  END IF;
  IF p_confirm IS DISTINCT FROM v_edition.key THEN
    PERFORM public.elemental__fail('bad_confirm');
  END IF;
  PERFORM public.elemental__lock(v_edition.key);
  SELECT coalesce(jsonb_agg(jsonb_build_object('team_id', id, 'slot', slot, 'channel_id', discord_channel_id) ORDER BY slot), '[]')
  INTO v_teams FROM public.elemental_teams WHERE edition = v_edition.key AND status <> 'archived';
  UPDATE public.elemental_team_invites i SET state = 'cancelled', responded_at = now()
  FROM public.elemental_teams t WHERE t.id = i.team_id AND t.edition = v_edition.key AND i.state = 'pending';
  UPDATE public.elemental_tester_entries SET counted = false WHERE edition = v_edition.key;
  UPDATE public.elemental_members SET team_id = NULL, updated_at = now() WHERE edition = v_edition.key;
  UPDATE public.elemental_teams
  SET status = 'archived', archived_at = coalesce(archived_at, now()), slot = NULL, lit_at = NULL, updated_at = now()
  WHERE edition = v_edition.key;
  PERFORM public.elemental__audit(v_edition.key, v_actor, 'dryrun_cleanup', NULL,
    jsonb_build_object('teams', jsonb_array_length(v_teams)));
  RETURN jsonb_build_object('edition', v_edition.key, 'teams', v_teams);
END;
$$;

/** /el test-codes, rehearsal guilds only: p_n new rehearsal codes. */
CREATE OR REPLACE FUNCTION public.elemental_bot_test_codes(p_guild_id text, p_actor text, p_n integer)
RETURNS TABLE (code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
BEGIN
  RETURN QUERY SELECT c FROM public.elemental__issue_rehearsal(v_settings.edition, p_n) AS c;
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'test_codes', NULL, jsonb_build_object('n', p_n));
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: check-ins, badges, posts, reports
-- ---------------------------------------------------------------------------

/**
 * /checkin in a team channel: one per team per Bangkok day; repeating
 * returns already=true. Errors: not_team_channel, not_team_member.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_checkin(p_guild_id text, p_channel_id text, p_user text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_user text := public.elemental__user(p_user);
  v_team public.elemental_teams;
  v_member public.elemental_members;
  v_day date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  v_id uuid;
BEGIN
  SELECT * INTO v_team FROM public.elemental_teams
  WHERE edition = v_settings.edition AND discord_channel_id = p_channel_id AND public.elemental__is_live(status);
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('not_team_channel');
  END IF;
  v_member := public.elemental__member(v_settings.edition, v_user);
  IF v_member.team_id IS DISTINCT FROM v_team.id THEN
    PERFORM public.elemental__fail('not_team_member');
  END IF;
  INSERT INTO public.elemental_checkins (edition, team_id, day, discord_user_id)
  VALUES (v_settings.edition, v_team.id, v_day, v_user)
  ON CONFLICT (team_id, day) DO NOTHING
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('team_id', v_team.id, 'slot', v_team.slot, 'day', v_day, 'already', v_id IS NULL);
END;
$$;

/** A badge on a live team's plot; (team, kind, ref) once. Returns awarded=false on a repeat. */
CREATE OR REPLACE FUNCTION public.elemental_bot_award_badge(
  p_guild_id text, p_team_id uuid, p_kind text, p_ref text DEFAULT '', p_actor text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_id uuid;
BEGIN
  IF p_kind IS NULL OR p_kind !~ '^[a-z][a-z0-9_]{1,29}$' THEN
    PERFORM public.elemental__fail('bad_kind');
  END IF;
  IF p_actor IS NOT NULL THEN
    PERFORM public.elemental__user(p_actor);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.elemental_teams
                 WHERE id = p_team_id AND edition = v_settings.edition AND public.elemental__is_live(status)) THEN
    PERFORM public.elemental__fail('team_not_found');
  END IF;
  BEGIN
    INSERT INTO public.elemental_badges (edition, team_id, kind, ref, awarded_by)
    VALUES (v_settings.edition, p_team_id, p_kind, coalesce(p_ref, ''), p_actor)
    ON CONFLICT (team_id, kind, ref) DO NOTHING
    RETURNING id INTO v_id;
  EXCEPTION WHEN check_violation THEN
    PERFORM public.elemental__fail('bad_ref');
  END;
  RETURN jsonb_build_object('team_id', p_team_id, 'kind', p_kind, 'ref', coalesce(p_ref, ''), 'awarded', v_id IS NOT NULL);
END;
$$;

/**
 * Claims a post before sending it: true for exactly one caller. A post that
 * failed can be claimed again; a claim that was never marked can be taken
 * over only after p_lease_seconds (NULL: never, so a crash between send and
 * mark cannot post twice; the missed-post note covers it).
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_post_claim(
  p_guild_id text, p_kind text, p_key text, p_lease_seconds integer DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_ok boolean;
BEGIN
  IF p_kind IS NULL OR p_kind !~ '^[a-z][a-z0-9_]{1,29}$' THEN
    PERFORM public.elemental__fail('bad_kind');
  END IF;
  IF p_key IS NULL OR char_length(p_key) NOT BETWEEN 1 AND 200 THEN
    PERFORM public.elemental__fail('bad_key');
  END IF;
  INSERT INTO public.elemental_posts AS p (edition, kind, key, status, claimed_at, attempts)
  VALUES (v_settings.edition, p_kind, p_key, 'claimed', now(), 1)
  ON CONFLICT (edition, kind, key) DO UPDATE
    SET status = 'claimed', claimed_at = now(), attempts = p.attempts + 1
    WHERE p.status = 'failed'
       OR (p.status = 'claimed' AND p_lease_seconds IS NOT NULL
           AND p.claimed_at < now() - make_interval(secs => p_lease_seconds))
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END;
$$;

/** Marks a claimed post 'sent' (with its message id) or 'failed' (claimable again). Compare-and-set. */
CREATE OR REPLACE FUNCTION public.elemental_bot_post_mark(
  p_guild_id text, p_kind text, p_key text, p_status text, p_message_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_ok boolean;
BEGIN
  IF p_status NOT IN ('sent', 'failed') THEN
    PERFORM public.elemental__fail('bad_status');
  END IF;
  IF p_message_id IS NOT NULL AND NOT public.elemental__is_snowflake(p_message_id) THEN
    PERFORM public.elemental__fail('bad_message');
  END IF;
  UPDATE public.elemental_posts
  SET status = p_status,
      sent_at = CASE WHEN p_status = 'sent' THEN now() END,
      message_id = CASE WHEN p_status = 'sent' THEN p_message_id END
  WHERE edition = v_settings.edition AND kind = p_kind AND key = p_key AND status = 'claimed'
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END;
$$;

/**
 * /report from anyone in the guild (claimed or not). The same text from the
 * same person within 2 minutes returns the first report (a retry). At most
 * 10 reports per person per hour. No PII refusal: a safety report may need
 * details. Errors: bad_text, rate_limited.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_report_add(p_guild_id text, p_reporter text, p_text text, p_where text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_reporter text := public.elemental__user(p_reporter);
  v_text text := btrim(coalesce(p_text, ''));
  v_where text := nullif(btrim(coalesce(p_where, '')), '');
  v_report public.elemental_reports;
BEGIN
  IF char_length(v_text) < 1 OR char_length(v_text) > 1000 THEN
    PERFORM public.elemental__fail('bad_text');
  END IF;
  IF v_where IS NOT NULL AND char_length(v_where) > 200 THEN
    PERFORM public.elemental__fail('bad_where');
  END IF;
  SELECT * INTO v_report FROM public.elemental_reports
  WHERE edition = v_settings.edition AND reporter_discord_id = v_reporter AND text = v_text
    AND created_at > now() - interval '2 minutes'
  ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('report_id', v_report.id, 'created_at', v_report.created_at, 'repeated', true);
  END IF;
  IF (SELECT count(*) FROM public.elemental_reports
      WHERE edition = v_settings.edition AND reporter_discord_id = v_reporter
        AND created_at > now() - interval '1 hour') >= 10 THEN
    PERFORM public.elemental__fail('rate_limited');
  END IF;
  INSERT INTO public.elemental_reports (edition, guild_id, reporter_discord_id, text, where_text)
  VALUES (v_settings.edition, p_guild_id, v_reporter, v_text, v_where)
  RETURNING * INTO v_report;
  PERFORM public.elemental__audit(v_settings.edition, v_reporter, 'report_add', v_report.id::text, '{}'::jsonb);
  RETURN jsonb_build_object('report_id', v_report.id, 'created_at', v_report.created_at, 'repeated', false);
END;
$$;

/** Safety's 'Handled' button. Repeating returns already=true. */
CREATE OR REPLACE FUNCTION public.elemental_bot_report_handled(p_guild_id text, p_report_id uuid, p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_report public.elemental_reports;
BEGIN
  SELECT * INTO v_report FROM public.elemental_reports
  WHERE id = p_report_id AND edition = v_settings.edition FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('report_not_found');
  END IF;
  IF v_report.handled_at IS NOT NULL THEN
    RETURN jsonb_build_object('report_id', v_report.id, 'handled_at', v_report.handled_at, 'already', true);
  END IF;
  UPDATE public.elemental_reports SET handled_at = now(), handled_by = v_actor WHERE id = v_report.id
  RETURNING * INTO v_report;
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'report_handled', v_report.id::text, '{}'::jsonb);
  RETURN jsonb_build_object('report_id', v_report.id, 'handled_at', v_report.handled_at, 'already', false);
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: island and totals
-- ---------------------------------------------------------------------------

/** The island for the bot's picture and the campfire legend: live teams, no Discord ids. */
CREATE OR REPLACE FUNCTION public.elemental_bot_island_state(p_edition text)
RETURNS TABLE (team_id uuid, slot integer, element text, project_name text, status text, counted integer, lit boolean, badges text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.elemental__island(p_edition);
$$;

/**
 * The nightly numbers for a Bangkok day (default today), live teams only:
 *   helped        counted tester entries made before the day ended
 *   helped_today  counted tester entries made that day
 *   checked_in    live teams with a /checkin, a tester entry or a finished lesson that day
 *   top_element   the element with the most counted entries that day (ties: fixed order; NULL when none)
 *   levels        {element: counted entries before the day ended}
 *   deltas        {element: counted entries that day}
 *   teams         {element: live teams}
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_totals(p_edition text, p_day date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_edition public.elemental_editions := public.elemental__edition(p_edition);
  v_day date := coalesce(p_day, (now() AT TIME ZONE 'Asia/Bangkok')::date);
  v_start timestamptz := v_day::timestamp AT TIME ZONE 'Asia/Bangkok';
  v_end timestamptz := (v_day + 1)::timestamp AT TIME ZONE 'Asia/Bangkok';
  v_per jsonb;
  v_levels jsonb := '{}'::jsonb;
  v_deltas jsonb := '{}'::jsonb;
  v_teams jsonb := '{}'::jsonb;
  v_top text;
  v_helped integer;
  v_helped_today integer;
  v_checked integer;
  r record;
BEGIN
  FOR r IN
    WITH els AS (
      SELECT e AS element, o FROM unnest(public.elemental__elements()) WITH ORDINALITY AS u(e, o)
    ), live AS (
      SELECT t.id, t.element FROM public.elemental_teams t
      WHERE t.edition = v_edition.key AND public.elemental__is_live(t.status)
    ), entries AS (
      SELECT l.element, e.created_at FROM public.elemental_tester_entries e
      JOIN live l ON l.id = e.team_id
      WHERE e.counted AND e.removed_at IS NULL AND e.created_at < v_end
    )
    SELECT els.element, els.o,
      (SELECT count(*) FROM entries x WHERE x.element = els.element)::integer AS level,
      (SELECT count(*) FROM entries x WHERE x.element = els.element AND x.created_at >= v_start)::integer AS delta,
      (SELECT count(*) FROM live l WHERE l.element = els.element)::integer AS teams
    FROM els ORDER BY els.o
  LOOP
    v_levels := v_levels || jsonb_build_object(r.element, r.level);
    v_deltas := v_deltas || jsonb_build_object(r.element, r.delta);
    v_teams := v_teams || jsonb_build_object(r.element, r.teams);
  END LOOP;

  SELECT e INTO v_top
  FROM unnest(public.elemental__elements()) WITH ORDINALITY AS u(e, o)
  WHERE (v_deltas ->> e)::integer > 0
  ORDER BY (v_deltas ->> e)::integer DESC, o
  LIMIT 1;

  SELECT coalesce(sum(value::integer), 0) INTO v_helped FROM jsonb_each_text(v_levels);
  SELECT coalesce(sum(value::integer), 0) INTO v_helped_today FROM jsonb_each_text(v_deltas);

  SELECT count(DISTINCT team_id) INTO v_checked FROM (
    SELECT c.team_id FROM public.elemental_checkins c WHERE c.edition = v_edition.key AND c.day = v_day
    UNION ALL
    SELECT e.team_id FROM public.elemental_tester_entries e
    WHERE e.edition = v_edition.key AND e.removed_at IS NULL AND e.created_at >= v_start AND e.created_at < v_end
    UNION ALL
    SELECT p.team_id FROM public.elemental_lesson_progress p
    WHERE p.edition = v_edition.key AND p.final AND p.team_id IS NOT NULL
      AND p.finished_at >= v_start AND p.finished_at < v_end
  ) AS x
  WHERE EXISTS (SELECT 1 FROM public.elemental_teams t WHERE t.id = x.team_id AND public.elemental__is_live(t.status));

  v_per := jsonb_build_object('levels', v_levels, 'deltas', v_deltas, 'teams', v_teams);
  RETURN jsonb_build_object(
    'edition', v_edition.key,
    'day', v_day,
    'helped', v_helped,
    'helped_today', v_helped_today,
    'checked_in', v_checked,
    'teams_total', (SELECT coalesce(sum(value::integer), 0) FROM jsonb_each_text(v_teams)),
    'top_element', v_top) || v_per;
END;
$$;

-- ---------------------------------------------------------------------------
-- Access: RLS on, no anon/authenticated grants, admin-only SELECT policy
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'elemental_editions', 'elemental_settings', 'elemental_claims', 'elemental_members', 'elemental_teams',
    'elemental_team_invites', 'elemental_boards', 'elemental_tester_entries', 'elemental_lesson_progress',
    'elemental_checkins', 'elemental_badges', 'elemental_posts', 'elemental_reports', 'elemental_audit'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, elemental_bot', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    -- Admins only. Inert while authenticated holds no grant; it keeps rows
    -- admin-only if a later migration grants SELECT for an admin page.
    EXECUTE format('DROP POLICY IF EXISTS "admins read %s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "admins read %s" ON public.%I FOR SELECT TO authenticated '
      'USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))', t, t);
  END LOOP;
END;
$$;

-- Functions: nothing for PUBLIC, anon or authenticated. Helpers for no one;
-- every other elemental_* function for service_role; elemental_bot_* also for
-- elemental_bot. A later elemental migration repeats this for its functions.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'elemental\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, elemental_bot', fn.sig);
    IF fn.proname LIKE 'elemental\_\_%' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM service_role', fn.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    END IF;
    IF fn.proname LIKE 'elemental\_bot\_%' AND fn.proname NOT LIKE 'elemental\_bot\_\_%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO elemental_bot', fn.sig);
    END IF;
  END LOOP;
END;
$$;

-- The pure CHECK-constraint helpers run as whoever writes the row, so the
-- service role (staff scripts, server code) may execute them.
GRANT EXECUTE ON FUNCTION public.elemental__elements() TO service_role;
GRANT EXECUTE ON FUNCTION public.elemental__is_snowflake(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.elemental__valid_schedule(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.elemental__valid_card_override(jsonb) TO service_role;
