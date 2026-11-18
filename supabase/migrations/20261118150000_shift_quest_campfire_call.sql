-- SHIFT High Island in Discord: the 18:50 campfire call and the evening guest's drop.
--
-- Design: docs/designs/shift-island-campfire-call.md (founder decisions,
-- 2026-11-18). Every evening at 18:50 Bangkok the bot posts one call in the
-- news channel (#island-news): the campfire lights at 19:00, come and work
-- next to each other. It pings the student roles once, when it is first sent
-- (edits never ping), and is edited through the evening: invite, lit (19:00),
-- the guest (19:25), embers (21:00). Yesterday's call is deleted when today's
-- is recorded. It runs every day, all year; staff switch it off for SHIFT
-- cohort weeks (/admin feature campfire_call off).
--
-- During an active season an evening guest comes to the fire at the first
-- rest (19:25 Bangkok): a trader's boat, a gull, fireflies or a sea turtle, in
-- a fixed rotation by season day. Each guest brings 2 colour looks of its own
-- (8 tree items only guests give). When it arrives, the bot reads who sits in
-- the campfire voice room from its gateway voice cache and passes their
-- Discord ids to shift_quest_campfire_drop: the first call in that rest
-- decides the night, even with no team there, so arriving first is never
-- rewarded. Every team with at least one student there gets exactly one
-- roll, however many teammates came; a winning roll gives the team one of the
-- guest's looks it does not have yet, as a one-option gift on its tree. Staff
-- and mentors never win. The chance is one constant,
-- shift_quest__guest_drop_chance() (1 in 2). Everyone sees how many teams got
-- a look only when that cannot tell anyone's result (shift_quest__guest_reveal:
-- 3 or more teams rolled, some but not all won); never which.
--
-- What the database keeps (minimised on purpose):
--   * shift_quest_guest_drops: one row per team that was at the fire when the
--     guest arrived, and night: (day, project_id, guest, look or null). Never
--     a member, a Discord id, a count of people or a time. It answers the
--     private "did my team get something tonight" button, and the one roll
--     per team per night (its primary key). Rows of earlier days are deleted
--     the next day (shift_quest__guest_purge: on every call read and drop,
--     and in pg_cron's 5-minute shift_quest__voice_purge, so no bot is
--     needed), and a one-person team's go with its member's erasure
--     (shift_quest__island_erase): no presence history is kept. For a team of
--     one, the team's row is that student's, until the next day.
--   * shift_quest_guest_nights: one row per night the drop happened (day,
--     guest, when). No person, no team.
--   * shift_quest_tree_gifts: a winning team's gift, source 'drop:<day>', with
--     member_id null (made nullable here): it says which team, never who sat
--     at the fire, and stays with the team like every gift (with its date).
--     An erasure that leaves the team with no member deletes it. Picking it
--     is the normal tree_pick (audited as before).
--   * shift_quest_call_posts: one row per Bangkok day, the call's ledger
--     (claim, send, compare-and-set mark), with whether it pinged. No person.
--   The live presence table (shift_quest_voice_presence) is untouched: still
--   who is in the room now, deleted on leave.
--
-- This file adds:
--
--   * shift_quest_settings.campfire_call_enabled and .campfire_call_ping,
--     both on by default (founder decisions 1 and 3), switched with
--     /admin feature (shift_quest_admin_set's ELSE branch, through
--     shift_quest__set_feature, audited 'settings_<key>') and shown in
--     shift_quest_admin_status.
--   * shift_quest_tree_items.guest (nullable) and the 8 guest looks, sort 23
--     to 30, in lib/shift-island/tree-style.ts TREE_ITEMS order.
--     shift_quest__gift_create never offers a guest look (AND i.guest IS
--     NULL), so round and quest gifts keep to the common catalog.
--   * shift_quest_tree_gifts.member_id DROP NOT NULL (a guest's gift has no
--     member). Nothing reads it as non-null: the round cap counts the
--     member's own 'round:%' gifts, erasure and reset delete by project.
--   * Helpers (never granted to a login): shift_quest__call_at(day, what),
--     shift_quest__call_on(), shift_quest__guest_of(day),
--     shift_quest__guest_tonight(day), shift_quest__call_due(day, now),
--     shift_quest__call_today(now), shift_quest__call_claim(day, channel,
--     now), shift_quest__guest_drop_chance(),
--     shift_quest__guest_purge(day), shift_quest__guest_reveal(day, now),
--     shift_quest__guest_drop(now, ids, chance),
--     shift_quest__guest_status(member, now). The times are parameters so
--     the tests can pass fixed times and chances.
--   * The bot's functions: shift_quest_call_today(),
--     shift_quest_call_claim(day, channel), shift_quest_call_mark(day,
--     channel, message), shift_quest_campfire_drop(day, ids),
--     shift_quest_guest_status(actor). Never the website's.
--   * shift_quest__set_feature (20261111090800 plus two keys),
--     shift_quest_admin_status (20261118130000 plus two settings),
--     shift_quest__gift_create (20261114120000 plus one predicate),
--     shift_quest__voice_purge (20261111093000 plus the guest's purge) and
--     shift_quest__island_erase (20261115140000 plus a lone member's drops).
--   * shift_quest_schema_version() = 21. 20 is
--     20261118140000_shift_quest_island_news_missed (#329): apply it first,
--     so the version only goes up.
--
-- Deploy order (founder decision 5): merge, deploy the bot, then this file on
-- the founder's go. The bot reads the schema version on every call tick, so
-- the call starts by itself once this is applied, with no restart. Applying
-- it turns the call on (both switches default on): check the bot's
-- permissions in #island-news and the campfire voice chat first, and apply
-- it outside 18:45 to 21:00 Bangkok (within 30 seconds a call is due until
-- 19:15 and a drop until 19:30), or switch the call off right after
-- (docs/runbooks/shift-high-island-rollout.md).
--
-- Grants are per function, no grant loop. Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges), web_board.ts,
-- tree.ts and campfire_call.ts.
--
-- Prod-first apply: additive and idempotent (ADD COLUMN IF NOT EXISTS,
-- CREATE TABLE IF NOT EXISTS, ON CONFLICT DO NOTHING, CREATE OR REPLACE;
-- replaced functions keep their signatures and grants). No outbox object and
-- no existing CHECK is touched.

-- ---------------------------------------------------------------------------
-- Settings, the guest looks, the tables
-- ---------------------------------------------------------------------------

-- The call itself (founder decision 3: every day, on unless staff switch it off).
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS campfire_call_enabled boolean NOT NULL DEFAULT true;
-- The one role ping when the call is first sent (founder decision 1: on from day one).
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS campfire_call_ping boolean NOT NULL DEFAULT true;

-- Which evening guest gives an item; null for the common catalog.
ALTER TABLE public.shift_quest_tree_items ADD COLUMN IF NOT EXISTS guest text NULL
  CHECK (guest IS NULL OR guest ~ '^[a-z]{2,20}$');

-- The 8 guest looks (colours only, no new canopy shape), after the 22 common
-- items, in TREE_ITEMS order. New items are new rows; ids never change.
INSERT INTO public.shift_quest_tree_items (id, slot, is_default, sort, guest)
VALUES
  ('leaf:seaglass', 'leaf', false, 23, 'boat'),
  ('bark:driftwood', 'bark', false, 24, 'boat'),
  ('bloom:shell', 'bloom', false, 25, 'gull'),
  ('leaf:seafoam', 'leaf', false, 26, 'gull'),
  ('bloom:firefly', 'bloom', false, 27, 'fireflies'),
  ('bark:moonlit', 'bark', false, 28, 'fireflies'),
  ('bloom:pearl', 'bloom', false, 29, 'turtle'),
  ('leaf:kelp', 'leaf', false, 30, 'turtle')
ON CONFLICT (id) DO NOTHING;

-- A guest's gift belongs to the team and names nobody: no member.
ALTER TABLE public.shift_quest_tree_gifts ALTER COLUMN member_id DROP NOT NULL;

COMMENT ON TABLE public.shift_quest_tree_gifts IS
  'SHIFT Island tree gifts: pick 1 of up to 3 items, one per project and source (a campfire round, a quest, or an evening guest''s drop:<day>, which has no member). member_id never leaves the database.';

CREATE TABLE IF NOT EXISTS public.shift_quest_call_posts (
  -- One call per Bangkok day.
  day date PRIMARY KEY,
  channel_id text NOT NULL CHECK (channel_id ~ '^[0-9]{5,25}$'),
  message_id text NULL CHECK (message_id IS NULL OR message_id ~ '^[0-9]{5,25}$'),
  -- Whether the call pings the student roles, frozen at the first claim, so
  -- a restarted bot renders the same text.
  pinged boolean NOT NULL DEFAULT false,
  -- A bot process claims the day before it sends, so a restart between send
  -- and mark never posts (and pings) twice.
  claimed_at timestamptz NULL,
  posted_at timestamptz NULL
);

COMMENT ON TABLE public.shift_quest_call_posts IS
  'SHIFT High campfire call: one Discord message per Bangkok day (channel, message id, claim time, whether it pinged the student roles). Never a person, a name or a count.';

CREATE TABLE IF NOT EXISTS public.shift_quest_guest_nights (
  -- The night the evening guest arrived and the drop was made: at most once.
  day date PRIMARY KEY,
  guest text NOT NULL CHECK (guest ~ '^[a-z]{2,20}$'),
  dropped_at timestamptz NOT NULL
);

COMMENT ON TABLE public.shift_quest_guest_nights IS
  'SHIFT High campfire: the nights the evening guest''s drop was made (day, guest, when). No person, no team.';

CREATE TABLE IF NOT EXISTS public.shift_quest_guest_drops (
  day date NOT NULL,
  -- A team with a student at the fire when the guest arrived. Never a member.
  project_id uuid NOT NULL REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  guest text NOT NULL CHECK (guest ~ '^[a-z]{2,20}$'),
  -- The look the team got, or null (no luck tonight, or it has every look this guest brings).
  look text NULL REFERENCES public.shift_quest_tree_items(id),
  -- One roll per team per night.
  PRIMARY KEY (day, project_id)
);

COMMENT ON TABLE public.shift_quest_guest_drops IS
  'SHIFT High campfire: the evening guest''s roll per team and night (day, project, guest, look or null). Never a member, a Discord id or a count of people; rows of earlier days are deleted the next day.';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_call_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_quest_guest_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_quest_guest_drops ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_call_posts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.shift_quest_guest_nights FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.shift_quest_guest_drops FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_call_posts TO service_role;
GRANT ALL ON public.shift_quest_guest_nights TO service_role;
GRANT ALL ON public.shift_quest_guest_drops TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: never granted to the bot or the website)
-- ---------------------------------------------------------------------------

/**
 * The evening's clock on p_day, Bangkok: 'call' 18:50 (the call goes out),
 * 'lit' 19:00 (the first focus round), 'guest' 19:25 (the first rest: the
 * guest arrives and the drop is made), 'drop_end' 19:30 (the drop's window
 * closes with that rest), 'until' 21:00 (the guest leaves, the fire's embers).
 * Null for anything else. The bot reads these times from
 * shift_quest_call_today (unix seconds), never its own copy.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__call_at(p_day date, p_what text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.shift_quest__bkk_start(p_day) + CASE p_what
    WHEN 'call' THEN interval '18 hours 50 minutes'
    WHEN 'lit' THEN interval '19 hours'
    WHEN 'guest' THEN interval '19 hours 25 minutes'
    WHEN 'drop_end' THEN interval '19 hours 30 minutes'
    WHEN 'until' THEN interval '21 hours'
  END;
$$;

/** Whether the call runs: the switch on, and a news channel and a coworking channel set. Every day. */
CREATE OR REPLACE FUNCTION public.shift_quest__call_on()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
BEGIN
  RETURN COALESCE(s.campfire_call_enabled, false)
    AND s.news_channel_id IS NOT NULL
    AND s.coworking_channel_id IS NOT NULL;
END;
$$;

/**
 * The evening guest of p_day: a fixed rotation by season day, the same for
 * everyone (boat, gull, fireflies, turtle, from the active season's
 * starts_on), so no guest comes two nights running and each comes back every
 * 4 nights. Null while the call is off, with no active season, or before it
 * starts (the guest pauses; the call itself still runs). The keys match
 * shift_quest_tree_items.guest and GUESTS in bot/src/quests/callCopy.ts.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__guest_of(p_day date)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
BEGIN
  IF p_day IS NULL OR v_season.id IS NULL OR p_day < v_season.starts_on OR NOT public.shift_quest__call_on() THEN
    RETURN NULL;
  END IF;
  RETURN (ARRAY['boat', 'gull', 'fireflies', 'turtle'])[((p_day - v_season.starts_on) % 4) + 1];
END;
$$;

/** Tonight's guest: the one whose drop was made, else the rotation's (shift_quest__guest_of). */
CREATE OR REPLACE FUNCTION public.shift_quest__guest_tonight(p_day date)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT n.guest FROM public.shift_quest_guest_nights n WHERE n.day = p_day),
    public.shift_quest__guest_of(p_day)
  );
$$;

/**
 * Whether the call for p_day should be sent at p_now: the call on, from 18:50
 * Bangkok; nothing recorded for the day and no claim younger than 3 minutes;
 * and either before 19:15 (a new claim) or a stale claim exists (claimed,
 * never marked: a process stopped between claim and mark), recovered until
 * 19:30. Never later: no late call, no catch-up.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__call_due(p_day date, p_now timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.shift_quest__call_on()
    AND p_now >= public.shift_quest__call_at(p_day, 'call')
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_call_posts cp
      WHERE cp.day = p_day AND (cp.message_id IS NOT NULL OR cp.claimed_at > p_now - interval '3 minutes')
    )
    AND (
      p_now < public.shift_quest__call_at(p_day, 'lit') + interval '15 minutes'
      OR (
        p_now < public.shift_quest__call_at(p_day, 'lit') + interval '30 minutes'
        AND EXISTS (
          SELECT 1 FROM public.shift_quest_call_posts cp
          WHERE cp.day = p_day AND cp.message_id IS NULL AND cp.claimed_at IS NOT NULL
        )
      )
    ),
    false
  );
$$;

/**
 * What shift_quest_call_today answers at p_now. While the call is off (the
 * switch, or no news or coworking channel): {off: true, day, message_id,
 * message_channel_id} for the latest recorded call, so the bot edits it once
 * into a paused note (no stale "lit" or "tomorrow at 19:00" left up), or null
 * when there is none. Else {day, guest, call_at, lit_at, guest_from,
 * guest_until (unix seconds), channel_id (news), coworking_channel_id,
 * ping_role_ids, due, message_id and message_channel_id (tonight's recorded
 * call, or null), previous: {channel_id, message_id} | null, drop: {teams} |
 * null}.
 *   ping_role_ids: the student roles (at most 5) while the call pings: the
 *     value frozen at the claim once there is one, else the switch now.
 *   previous: the latest earlier day's recorded call, for the bot to delete.
 *   drop: on a guest night, once the drop is decided (made, or the guest's
 *     first rest over without one): shift_quest__guest_reveal. Null before.
 * No member, no name, no count of people.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__call_today(p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_day date := (p_now AT TIME ZONE 'Asia/Bangkok')::date;
  v_row public.shift_quest_call_posts;
  v_prev public.shift_quest_call_posts;
  v_ping boolean;
BEGIN
  IF p_now IS NULL THEN
    RETURN NULL;
  END IF;
  IF NOT public.shift_quest__call_on() THEN
    SELECT * INTO v_prev FROM public.shift_quest_call_posts
    WHERE day <= v_day AND message_id IS NOT NULL
    ORDER BY day DESC LIMIT 1;
    IF v_prev.day IS NULL THEN
      RETURN NULL;
    END IF;
    RETURN jsonb_build_object(
      'off', true,
      'day', v_prev.day::text,
      'message_id', v_prev.message_id,
      'message_channel_id', v_prev.channel_id
    );
  END IF;
  SELECT * INTO v_row FROM public.shift_quest_call_posts WHERE day = v_day;
  SELECT * INTO v_prev FROM public.shift_quest_call_posts
  WHERE day < v_day AND message_id IS NOT NULL
  ORDER BY day DESC LIMIT 1;
  v_ping := CASE WHEN v_row.day IS NOT NULL THEN v_row.pinged ELSE COALESCE(s.campfire_call_ping, false) END;
  RETURN jsonb_build_object(
    'day', v_day::text,
    'guest', public.shift_quest__guest_tonight(v_day),
    'call_at', extract(epoch FROM public.shift_quest__call_at(v_day, 'call'))::bigint,
    'lit_at', extract(epoch FROM public.shift_quest__call_at(v_day, 'lit'))::bigint,
    'guest_from', extract(epoch FROM public.shift_quest__call_at(v_day, 'guest'))::bigint,
    'guest_until', extract(epoch FROM public.shift_quest__call_at(v_day, 'until'))::bigint,
    'channel_id', s.news_channel_id,
    'coworking_channel_id', s.coworking_channel_id,
    'ping_role_ids', CASE WHEN v_ping THEN COALESCE(to_jsonb(s.student_role_ids[1:5]), '[]'::jsonb) ELSE '[]'::jsonb END,
    'due', public.shift_quest__call_due(v_day, p_now),
    'message_id', v_row.message_id,
    -- Where tonight's call was posted (the news channel may have changed since).
    'message_channel_id', CASE WHEN v_row.message_id IS NOT NULL THEN v_row.channel_id END,
    'previous', CASE WHEN v_prev.day IS NULL THEN NULL
                     ELSE jsonb_build_object('channel_id', v_prev.channel_id, 'message_id', v_prev.message_id) END,
    'drop', CASE WHEN public.shift_quest__guest_tonight(v_day) IS NOT NULL
                 THEN public.shift_quest__guest_reveal(v_day, p_now) END
  );
END;
$$;

/**
 * The chance that a team at the fire gets a look when the evening guest
 * arrives: 1 in 2 (founder decision 4: generous for a small cohort). The one place
 * it lives; every roll reads it.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__guest_drop_chance()
RETURNS double precision
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 0.5::double precision; $$;

/** Deletes the guest's rolls of days before p_day: who was at the fire is never kept past its night. */
CREATE OR REPLACE FUNCTION public.shift_quest__guest_purge(p_day date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.shift_quest_guest_drops WHERE day < p_day;
$$;

/**
 * The guest's drop on p_day as everyone may read it at p_now (the call in
 * #island-news and the round messages in the voice chat): {teams}, or null
 * while it is not decided (no drop made and the guest's first rest not over).
 * Who sits at the fire is public (Discord's voice list, the web campfire), so
 * the count never tells a team's result:
 *   * 0 when no team rolled: nobody's team was at the fire when the guest
 *     arrived, or its first rest passed with no drop (the bot was away);
 *   * how many teams got a look, only when 3 or more teams rolled
 *     (PEOPLE_FLOOR in bot/src/quests/newsCopy.ts) and some but not all of
 *     them won: then nobody can tell which;
 *   * else null (withheld): 1 or 2 teams, or all or none of them won.
 * Never which team.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__guest_reveal(p_day date, p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rolled integer;
  v_won integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_guest_nights WHERE day = p_day) THEN
    IF p_now IS NOT NULL AND p_now >= public.shift_quest__call_at(p_day, 'drop_end') THEN
      RETURN jsonb_build_object('teams', 0);
    END IF;
    RETURN NULL;
  END IF;
  SELECT count(*), count(*) FILTER (WHERE look IS NOT NULL) INTO v_rolled, v_won
  FROM public.shift_quest_guest_drops WHERE day = p_day;
  RETURN jsonb_build_object('teams', CASE
    WHEN v_rolled = 0 THEN 0
    WHEN v_rolled >= 3 AND v_won > 0 AND v_won < v_rolled THEN v_won
  END);
END;
$$;

/**
 * The evening guest's drop at p_now, for the people p_ids (Discord ids) at
 * the fire. Only during the guest's first rest (19:25 to 19:30 Bangkok) on a
 * night with a guest, once per night (a lock and shift_quest_guest_nights).
 * The first call in that rest is the guest's arrival and decides the night,
 * even with nobody's team there: a student who sits down later in the rest
 * gets nothing extra, so arriving first is never rewarded.
 *   * the teams: the current projects (not archived) of started, non-erased
 *     members among p_ids who hold no staff role (staff and mentors never
 *     win) and are active teammates. Unknown ids are ignored;
 *   * each team gets exactly one roll, however many teammates sit there:
 *     when the team has a guest look it neither owns nor waits on in an
 *     unpicked gift, random() < p_chance gives it one of those (at random) as
 *     a one-option gift, source 'drop:<day>', member null; otherwise no look;
 *   * one row per team (day, project, guest, look or null).
 * Returns {guest, done: true, fresh, teams}: teams is the public count
 * (shift_quest__guest_reveal: withheld as null when it could tell anyone's
 * result, never which); fresh is false when the night was already done.
 * Null outside the window, without a guest, or with the call off. p_ids are
 * never stored.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__guest_drop(p_now timestamptz, p_ids text[], p_chance double precision)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (p_now AT TIME ZONE 'Asia/Bangkok')::date;
  v_guest text;
  v_projects uuid[];
  v_project uuid;
  v_open text[];
  v_look text;
BEGIN
  IF p_now IS NULL OR NOT public.shift_quest__call_on()
     OR p_now < public.shift_quest__call_at(v_day, 'guest')
     OR p_now >= public.shift_quest__call_at(v_day, 'drop_end') THEN
    RETURN NULL;
  END IF;
  -- One drop a night: a second bot process waits here, then finds it done.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_guest_drop:' || v_day::text));
  IF EXISTS (SELECT 1 FROM public.shift_quest_guest_nights WHERE day = v_day) THEN
    RETURN jsonb_build_object(
      'guest', (SELECT guest FROM public.shift_quest_guest_nights WHERE day = v_day),
      'done', true,
      'fresh', false,
      'teams', public.shift_quest__guest_reveal(v_day, p_now) -> 'teams'
    );
  END IF;
  v_guest := public.shift_quest__guest_of(v_day);
  IF v_guest IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(DISTINCT p.id ORDER BY p.id) INTO v_projects
  FROM public.shift_quest_members m
  JOIN public.shift_quest_projects p ON p.id = m.current_project_id AND p.archived_at IS NULL
  WHERE m.discord_user_id = ANY (COALESCE(p_ids, '{}'::text[]))
    AND m.onboarded_at IS NOT NULL
    AND m.erased_at IS NULL
    AND cardinality(m.roles) = 0
    AND public.shift_quest__is_teammate(p.id, m.id);

  PERFORM public.shift_quest__guest_purge(v_day);
  -- The guest has arrived: the night is decided now, with or without a team there.
  INSERT INTO public.shift_quest_guest_nights (day, guest, dropped_at) VALUES (v_day, v_guest, p_now);

  FOREACH v_project IN ARRAY COALESCE(v_projects, '{}'::uuid[]) LOOP
    -- The same lock as shift_quest__gift_create: gift decisions of one team take turns.
    PERFORM pg_advisory_xact_lock(hashtext('shift_quest_tree_gift_project:' || v_project));
    v_open := ARRAY(
      SELECT i.id FROM public.shift_quest_tree_items i
      WHERE i.guest = v_guest
        AND NOT (i.id = ANY (COALESCE(
          (SELECT owned FROM public.shift_quest_tree_style WHERE project_id = v_project), '{}'::text[])))
        AND NOT EXISTS (
          SELECT 1 FROM public.shift_quest_tree_gifts g
          WHERE g.project_id = v_project AND g.picked IS NULL AND i.id = ANY (g.options)
        )
      ORDER BY i.sort
    );
    v_look := NULL;
    IF cardinality(v_open) > 0 AND random() < p_chance THEN
      v_look := v_open[1 + floor(random() * cardinality(v_open))::integer];
      INSERT INTO public.shift_quest_tree_gifts (project_id, member_id, source, options)
      VALUES (v_project, NULL, 'drop:' || v_day::text, ARRAY[v_look])
      ON CONFLICT (project_id, source) DO NOTHING;
      IF NOT FOUND THEN
        v_look := NULL;
      END IF;
    END IF;
    INSERT INTO public.shift_quest_guest_drops (day, project_id, guest, look)
    VALUES (v_day, v_project, v_guest, v_look);
  END LOOP;

  RETURN jsonb_build_object('guest', v_guest, 'done', true, 'fresh', true,
                            'teams', public.shift_quest__guest_reveal(v_day, p_now) -> 'teams');
END;
$$;

/**
 * What the private "did my team get something" button answers for p_member at
 * p_now: {state, day} plus, once the guest has come, {guest, looks}:
 *   'gone'      no guest tonight (or the call off before its drop), or before
 *               19:25 (an old button). A drop made tonight still answers after
 *               the call is switched off.
 *   'noplot'    the caller has no current project
 *   'arriving'  the guest is here but the drop is not made yet (19:25 to 19:30)
 *   'quiet'     the guest's first rest passed with no drop (the bot was away):
 *               the guest only stopped by, for every team
 *   'away'      no roll for the caller's team tonight (nobody from it was at
 *               the fire when the guest arrived)
 *   'won'       {look, gift: {id, options} while it waits to be picked, else null}
 *   'full'      no look tonight, and the team has every look this guest brings
 *   'lost'      no look tonight
 * Booleans and ids of the caller's own team only: never a name, never which
 * teammate was there.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__guest_status(p_member uuid, p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (p_now AT TIME ZONE 'Asia/Bangkok')::date;
  v_guest text := public.shift_quest__guest_tonight(v_day);
  v_member public.shift_quest_members;
  v_project uuid;
  v_drop public.shift_quest_guest_drops;
  v_gift public.shift_quest_tree_gifts;
  v_base jsonb;
  v_left integer;
BEGIN
  -- v_guest: the night's drop when made, else the rotation's (null while the call is off).
  IF v_guest IS NULL OR p_now < public.shift_quest__call_at(v_day, 'guest') THEN
    RETURN jsonb_build_object('state', 'gone', 'day', v_day::text);
  END IF;
  v_base := jsonb_build_object(
    'day', v_day::text,
    'guest', v_guest,
    'looks', COALESCE((SELECT jsonb_agg(i.id ORDER BY i.sort) FROM public.shift_quest_tree_items i WHERE i.guest = v_guest), '[]'::jsonb)
  );
  SELECT * INTO v_member FROM public.shift_quest_members WHERE id = p_member;
  v_project := public.shift_quest__current_project(v_member);
  IF v_project IS NULL THEN
    RETURN v_base || jsonb_build_object('state', 'noplot');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_guest_nights WHERE day = v_day) THEN
    RETURN v_base || jsonb_build_object(
      'state', CASE WHEN p_now < public.shift_quest__call_at(v_day, 'drop_end') THEN 'arriving' ELSE 'quiet' END);
  END IF;
  SELECT * INTO v_drop FROM public.shift_quest_guest_drops WHERE day = v_day AND project_id = v_project;
  IF NOT FOUND THEN
    RETURN v_base || jsonb_build_object('state', 'away');
  END IF;
  IF v_drop.look IS NOT NULL THEN
    SELECT * INTO v_gift FROM public.shift_quest_tree_gifts
    WHERE project_id = v_project AND source = 'drop:' || v_day::text;
    RETURN v_base || jsonb_build_object(
      'state', 'won',
      'look', v_drop.look,
      'gift', CASE WHEN v_gift.id IS NOT NULL AND v_gift.picked IS NULL
                   THEN jsonb_build_object('id', v_gift.id, 'options', to_jsonb(v_gift.options)) END
    );
  END IF;
  SELECT count(*) INTO v_left FROM public.shift_quest_tree_items i
  WHERE i.guest = v_drop.guest
    AND NOT (i.id = ANY (COALESCE(
      (SELECT owned FROM public.shift_quest_tree_style WHERE project_id = v_project), '{}'::text[])))
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_tree_gifts g
      WHERE g.project_id = v_project AND g.picked IS NULL AND i.id = ANY (g.options)
    );
  RETURN v_base || jsonb_build_object('state', CASE WHEN v_left = 0 THEN 'full' ELSE 'lost' END);
END;
$$;

-- ---------------------------------------------------------------------------
-- The call and the guest (bot only)
-- ---------------------------------------------------------------------------

/**
 * Tonight's call as the bot should show it now (shift_quest__call_today at
 * now()): the latest call to retire while the call is off, or null. Also
 * deletes the guest's rolls of earlier days (shift_quest__guest_purge): the
 * bot reads this every 30 seconds, and pg_cron's voice purge does the same
 * every 5 minutes without any bot.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_call_today()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.shift_quest__guest_purge(public.shift_quest__bkk_today());
  RETURN public.shift_quest__call_today(now());
END;
$$;

/**
 * The claim at p_now (shift_quest_call_claim's body, with the time as a
 * parameter so the tests can pass fixed times): 'new' (claimed now),
 * 'stale' (claimed 3 or more minutes ago and never marked: the bot looks for
 * its own call of the day first and marks it, sends only when there is none,
 * and sends nothing when it cannot look), or null (not due: recorded,
 * claimed in the last 3 minutes, outside 18:50 to 19:15 (19:30 for a stale
 * claim), the call off, or p_day is not p_now's Bangkok day). The first claim
 * freezes whether the call pings. 'sq:bad_input' for a missing day or a
 * channel that is not a snowflake.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__call_claim(p_day date, p_channel text, p_now timestamptz)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_row public.shift_quest_call_posts;
BEGIN
  IF p_day IS NULL OR p_channel IS NULL OR p_channel !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_now IS NULL OR p_day <> (p_now AT TIME ZONE 'Asia/Bangkok')::date
     OR NOT public.shift_quest__call_due(p_day, p_now) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.shift_quest_call_posts (day, channel_id, pinged, claimed_at)
  VALUES (p_day, p_channel, COALESCE(s.campfire_call_ping, false) AND cardinality(s.student_role_ids) > 0, p_now)
  ON CONFLICT (day) DO NOTHING;
  IF FOUND THEN
    RETURN 'new';
  END IF;
  SELECT * INTO v_row FROM public.shift_quest_call_posts WHERE day = p_day FOR UPDATE;
  IF v_row.message_id IS NOT NULL OR v_row.claimed_at > p_now - interval '3 minutes' THEN
    RETURN NULL;
  END IF;
  UPDATE public.shift_quest_call_posts SET channel_id = p_channel, claimed_at = p_now WHERE day = p_day;
  -- A row without a claim time was marked before any claim; never offered as stale.
  RETURN CASE WHEN v_row.claimed_at IS NULL THEN 'new' ELSE 'stale' END;
END;
$$;

/** Claims today's call before the bot sends it (shift_quest__call_claim at now()). */
CREATE OR REPLACE FUNCTION public.shift_quest_call_claim(p_day date, p_channel text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.shift_quest__call_claim(p_day, p_channel, now());
END;
$$;

/**
 * Records the day's call, compare and set: stored only while no message is
 * recorded for p_day. Returns the message id stored afterwards (a second bot
 * process that posted too gets the first one's id and deletes its own).
 * 'sq:bad_input' for a missing day or a channel or message that is not a
 * snowflake.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_call_mark(p_day date, p_channel text, p_message text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
BEGIN
  IF p_day IS NULL OR p_channel IS NULL OR p_channel !~ '^[0-9]{5,25}$'
     OR p_message IS NULL OR p_message !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  INSERT INTO public.shift_quest_call_posts AS cp (day, channel_id, message_id, posted_at)
  VALUES (p_day, p_channel, p_message, now())
  ON CONFLICT (day) DO UPDATE
  SET channel_id = EXCLUDED.channel_id, message_id = EXCLUDED.message_id, posted_at = EXCLUDED.posted_at
  WHERE cp.message_id IS NULL;
  SELECT message_id INTO v_id FROM public.shift_quest_call_posts WHERE day = p_day;
  RETURN v_id;
END;
$$;

/**
 * The evening guest's drop, now: p_ids are the Discord ids of the people in
 * the campfire voice room right now (the bot's gateway voice cache, bots
 * left out). Null unless p_day is today in Bangkok (an old tick) or the drop
 * is open (shift_quest__guest_drop). Non-snowflakes are dropped, at most 200
 * ids are read, none is stored. Every call deletes earlier nights' rolls.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_campfire_drop(p_day date, p_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.shift_quest__guest_purge(public.shift_quest__bkk_today());
  IF p_day IS NULL OR p_day <> public.shift_quest__bkk_today() THEN
    RETURN NULL;
  END IF;
  RETURN public.shift_quest__guest_drop(
    now(),
    ARRAY(
      SELECT DISTINCT x FROM unnest(COALESCE(p_ids, '{}'::text[])) AS x
      WHERE x ~ '^[0-9]{5,25}$'
      LIMIT 200
    ),
    public.shift_quest__guest_drop_chance()
  );
END;
$$;

/** The caller's own team and tonight's guest (shift_quest__guest_status at now()). 'sq:not_started' before /start. */
CREATE OR REPLACE FUNCTION public.shift_quest_guest_status(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN public.shift_quest__guest_status(v_member.id, now());
END;
$$;

-- ---------------------------------------------------------------------------
-- Replaced (same signatures: grants are kept)
-- ---------------------------------------------------------------------------

/**
 * 20261114120000_shift_quest_tree_style's body, plus one predicate: a guest's
 * look (shift_quest_tree_items.guest) is never offered here, so round and
 * quest gifts keep to the common catalog and guest looks stay the guests'.
 *
 * Creates a project's gift for one source, at most once ever: null when the
 * source already has a gift or the team owns every item, else {id, options}.
 * Options are up to 3 catalog items the team does not own (defaults are
 * always owned). An item that one of the project's waiting (unpicked) gifts
 * already offers is held back: it comes only after every fresh item, so two
 * waiting gifts never share an option while 3 fresh items are left, and a
 * gift still offers 3 until the team owns all but 2 items.
 *   1. Fresh items first. The slot with the most fresh items gives them, in
 *      catalog order.
 *   2. Ties between slots: the slots in catalog order (shape, leaf, bark,
 *      bloom: each slot by its first item's sort) rotated by the number of
 *      gifts the project already has, so gift 0 prefers shape, gift 1 leaf,
 *      gift 2 bark, gift 3 bloom, gift 4 shape again; the first tied slot in
 *      that rotated order wins.
 *   3. When the winning slot has fewer than 3 fresh items, the rest come from
 *      the other slots in the same order (most fresh first, ties by the
 *      rotation), each in catalog order.
 *   4. Then, only when fewer than 3 fresh items are left, the held-back items
 *      fill the gift, ranked the same way among themselves.
 * So a gift offers 3 until the team owns all but 2 items, then 2, then 1,
 * then none. Options are what was unowned when the gift was made; a later
 * pick of an item owned since adds nothing twice (shift_quest_tree_pick), and
 * the pickers hide options the team owns by then.
 * Gift decisions of one project take turns (a transaction advisory lock), so
 * two at once cannot both choose the same fresh items.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__gift_create(p_project uuid, p_member uuid, p_source text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owned text[];
  v_offered text[];
  v_turn integer;
  v_options text[];
  v_id uuid;
BEGIN
  -- Read the project's items and gifts only once the lock is held (each
  -- statement below sees what a gift decision before this one committed).
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_tree_gift_project:' || p_project));
  v_owned := COALESCE(
    (SELECT owned FROM public.shift_quest_tree_style WHERE project_id = p_project), '{}'::text[]
  );
  v_offered := COALESCE(
    (SELECT array_agg(DISTINCT o.item)
     FROM public.shift_quest_tree_gifts g, unnest(g.options) AS o (item)
     WHERE g.project_id = p_project AND g.picked IS NULL),
    '{}'::text[]
  );
  v_turn := (SELECT count(*) FROM public.shift_quest_tree_gifts WHERE project_id = p_project);

  WITH unowned AS (
    SELECT i.id, i.slot, i.sort, i.id = ANY (v_offered) AS held
    FROM public.shift_quest_tree_items i
    -- 20261118150000: never a guest's look.
    WHERE NOT i.is_default AND NOT (i.id = ANY (v_owned)) AND i.guest IS NULL
  ),
  counted AS (
    -- left_n: the slot's fresh items for a fresh item, its held-back ones for a held-back item.
    SELECT u.*, count(*) OVER (PARTITION BY u.slot, u.held) AS left_n
    FROM unowned u
  ),
  slots AS (
    SELECT i.slot,
           row_number() OVER (ORDER BY min(i.sort)) - 1 AS pos,
           count(*) OVER () AS n
    FROM public.shift_quest_tree_items i
    GROUP BY i.slot
  ),
  ranked AS (
    SELECT s.slot, ((s.pos - v_turn) % s.n + s.n) % s.n AS turn_pos
    FROM slots s
  )
  SELECT array_agg(x.id ORDER BY x.rn) INTO v_options
  FROM (
    SELECT c.id, row_number() OVER (ORDER BY c.held, c.left_n DESC, r.turn_pos, c.sort) AS rn
    FROM counted c JOIN ranked r ON r.slot = c.slot
  ) x
  WHERE x.rn <= 3;

  IF v_options IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.shift_quest_tree_gifts (project_id, member_id, source, options)
  VALUES (p_project, p_member, p_source, v_options)
  ON CONFLICT (project_id, source) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('id', v_id, 'options', to_jsonb(v_options));
END;
$$;

/**
 * 'squads' (20261111090800_shift_quests_seasons), plus 'campfire_call' and
 * 'campfire_call_ping' (20261118150000), on or off. No blockers: none needs
 * anything published first. Reached through shift_quest_admin_set's ELSE
 * branch, which audits 'settings_<key>'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__set_feature(p_key text, p_on boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_key = 'squads' THEN
    UPDATE public.shift_quest_settings SET squads_enabled = COALESCE(p_on, false) WHERE id;
    RETURN true;
  END IF;
  IF p_key = 'campfire_call' THEN
    UPDATE public.shift_quest_settings SET campfire_call_enabled = COALESCE(p_on, false) WHERE id;
    RETURN true;
  END IF;
  IF p_key = 'campfire_call_ping' THEN
    UPDATE public.shift_quest_settings SET campfire_call_ping = COALESCE(p_on, false) WHERE id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_status(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  s public.shift_quest_settings := public.shift_quest__settings();
BEGIN
  RETURN jsonb_build_object(
    'settings', jsonb_build_object(
      'student_role_ids', to_jsonb(s.student_role_ids),
      'help_channel_id', s.help_channel_id,
      'staff_channel_id', s.staff_channel_id,
      'celebrate_channel_id', s.celebrate_channel_id,
      'coworking_channel_id', s.coworking_channel_id,
      -- 20261111094000_shift_quest_live.
      'live_channel_id', s.live_channel_id,
      'suggest_channel_id', s.suggest_channel_id,
      -- 20261118130000_shift_quest_island_news_daily.
      'news_channel_id', s.news_channel_id,
      'awards_enabled', s.awards_enabled,
      'redemption_enabled', s.redemption_enabled,
      'sharing_enabled', s.sharing_enabled,
      'reminders_enabled', s.reminders_enabled,
      'reward_terms', s.reward_terms IS NOT NULL,
      'redemption_terms', s.redemption_terms IS NOT NULL,
      'fulfillment_process', s.fulfillment_process IS NOT NULL,
      'fulfillment_owner', s.fulfillment_owner,
      -- 20261111090800_shift_quests_seasons (off before it; hook in 20261111090700).
      'squads_enabled', COALESCE((public.shift_quest__feature_flags() ->> 'squads')::boolean, false),
      -- 20261118150000_shift_quest_campfire_call.
      'campfire_call_enabled', s.campfire_call_enabled,
      'campfire_call_ping', s.campfire_call_ping
    ),
    'live', jsonb_build_object(
      'awards', public.shift_quest__awards_live(),
      'redemption', public.shift_quest__redemption_live()
    ),
    'blockers', public.shift_quest__blockers(),
    'rules', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', key, 'version', version, 'amount', amount,
                                          'cap', cap_per_member, 'team_allocation', team_allocation) ORDER BY key)
      FROM public.shift_quest_reward_rules WHERE status = 'published'
    ), '[]'::jsonb),
    'staff', jsonb_build_object(
      'admin', (SELECT count(*) FROM public.shift_quest_members WHERE 'admin' = ANY (roles)),
      'reviewer', (SELECT count(*) FROM public.shift_quest_members WHERE 'reviewer' = ANY (roles)),
      'fulfillment', (SELECT count(*) FROM public.shift_quest_members WHERE 'fulfillment' = ANY (roles))
    ),
    'outbox', jsonb_build_object(
      'pending', (SELECT count(*) FROM public.shift_quest_outbox WHERE status IN ('pending', 'sending')),
      'blocked', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'blocked'),
      'failed', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'failed')
    ),
    'data_requests_open', (SELECT count(*) FROM public.shift_quest_data_requests WHERE status = 'open')
  );
END;
$$;

/**
 * 20261111093000_shift_quest_campfire's purge, plus the evening guest's rolls
 * of earlier nights (shift_quest__guest_purge). pg_cron runs this every 5
 * minutes in production (20261111093000 schedules it), so those rows go the
 * next day even with no bot of schema 21 running (a rollback, a bot down for
 * days). Returns how many presence rows it deleted, as before.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__voice_purge()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- 20261118150000: the guest's rolls of earlier nights, whatever the bot.
  PERFORM public.shift_quest__guest_purge(public.shift_quest__bkk_today());
  PERFORM 1 FROM public.shift_quest_voice_state WHERE id FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM public.shift_quest_voice_state
    WHERE id AND beat_at > now() - interval '10 minutes'
  ) THEN
    DELETE FROM public.shift_quest_voice_presence WHERE true;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  RETURN v_count;
END;
$$;

/**
 * 20261115140000_shift_quest_peer_check's erasure hook, plus the evening
 * guest's drops (20261118150000): a team the erased member leaves with no
 * active member (a team of one) loses its rolls and its drop gifts, which
 * would say on which nights that student sat at the campfire. A team that
 * goes on keeps its gifts: they name no one.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__island_erase(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_quest_squad_members SET status = 'left', responded_at = now()
  WHERE member_id = p_member AND status IN ('active', 'invited');
  UPDATE public.shift_quest_squads SET name = '[erased]', target = '[erased]'
  WHERE created_by = p_member AND (name <> '[erased]' OR target <> '[erased]');
  UPDATE public.shift_quest_inbox SET params = params || '{"name": "[erased]"}'::jsonb
  WHERE kind = 'squad_invite'
    AND ref_id IN (SELECT id FROM public.shift_quest_squads WHERE created_by = p_member);
  -- 20261111095000_shift_quest_player: the consent row, and every AI summary
  -- of a project the member was ever on or contributed to (they were written
  -- from evidence the erasure clears, and go back to the model as 'previous').
  DELETE FROM public.shift_quest_consents WHERE member_id = p_member;
  DELETE FROM public.shift_quest_digests
  WHERE project_id IN (
    SELECT project_id FROM public.shift_quest_project_members WHERE member_id = p_member
    UNION
    SELECT i.project_id
    FROM public.shift_quest_contributions c
    JOIN public.shift_quest_submissions s ON s.id = c.submission_id
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE c.member_id = p_member AND i.project_id IS NOT NULL
    UNION
    SELECT i.project_id
    FROM public.shift_quest_submissions s
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE s.submitted_by = p_member AND i.project_id IS NOT NULL
  );
  -- 20261115130000_shift_quest_evidence_photos: the member's photos.
  DELETE FROM public.shift_quest_evidence_photos WHERE member_id = p_member;
  -- 20261115140000_shift_quest_peer_check: the checks the member wrote (their words about others' work).
  DELETE FROM public.shift_quest_peer_checks WHERE peer_id = p_member;
  -- 20261118150000_shift_quest_campfire_call: the evening guest's rolls and
  -- drop gifts of the teams they leave empty (shift_quest_admin_erase sets
  -- their memberships to 'left' before this runs).
  DELETE FROM public.shift_quest_guest_drops d
  WHERE d.project_id IN (SELECT pm.project_id FROM public.shift_quest_project_members pm WHERE pm.member_id = p_member)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members pm WHERE pm.project_id = d.project_id AND pm.status = 'active'
    );
  DELETE FROM public.shift_quest_tree_gifts g
  WHERE g.source LIKE 'drop:%'
    AND g.project_id IN (SELECT pm.project_id FROM public.shift_quest_project_members pm WHERE pm.member_id = p_member)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members pm WHERE pm.project_id = g.project_id AND pm.status = 'active'
    );
END;
$$;

/** Island schema 21: the campfire call and the evening guest (20 is 20261118140000_shift_quest_island_news_missed). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 21; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- Helpers: no login runs them, service_role included (as every helper since
-- 20261113173515). Supabase's default privileges grant every new function to
-- anon, authenticated and service_role, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION
  public.shift_quest__call_at(date, text),
  public.shift_quest__call_on(),
  public.shift_quest__guest_of(date),
  public.shift_quest__guest_tonight(date),
  public.shift_quest__call_due(date, timestamptz),
  public.shift_quest__call_today(timestamptz),
  public.shift_quest__call_claim(date, text, timestamptz),
  public.shift_quest__guest_drop_chance(),
  public.shift_quest__guest_purge(date),
  public.shift_quest__guest_reveal(date, timestamptz),
  public.shift_quest__guest_drop(timestamptz, text[], double precision),
  public.shift_quest__guest_status(uuid, timestamptz)
FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;

-- The bot's only.
REVOKE ALL ON FUNCTION
  public.shift_quest_call_today(),
  public.shift_quest_call_claim(date, text),
  public.shift_quest_call_mark(date, text, text),
  public.shift_quest_campfire_drop(date, text[]),
  public.shift_quest_guest_status(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_call_today(),
  public.shift_quest_call_claim(date, text),
  public.shift_quest_call_mark(date, text, text),
  public.shift_quest_campfire_drop(date, text[]),
  public.shift_quest_guest_status(text)
TO service_role, shift_quest_bot;

-- The replaced functions (shift_quest__gift_create, shift_quest__set_feature,
-- shift_quest_admin_status, shift_quest__voice_purge,
-- shift_quest__island_erase) and the schema version keep the grants they
-- already have: CREATE OR REPLACE leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board): the website never runs any of these.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION
      public.shift_quest__call_at(date, text),
      public.shift_quest__call_on(),
      public.shift_quest__guest_of(date),
      public.shift_quest__guest_tonight(date),
      public.shift_quest__call_due(date, timestamptz),
      public.shift_quest__call_today(timestamptz),
      public.shift_quest__call_claim(date, text, timestamptz),
      public.shift_quest__guest_drop_chance(),
      public.shift_quest__guest_purge(date),
      public.shift_quest__guest_reveal(date, timestamptz),
      public.shift_quest__guest_drop(timestamptz, text[], double precision),
      public.shift_quest__guest_status(uuid, timestamptz),
      public.shift_quest_call_today(),
      public.shift_quest_call_claim(date, text),
      public.shift_quest_call_mark(date, text, text),
      public.shift_quest_campfire_drop(date, text[]),
      public.shift_quest_guest_status(text)
    FROM shift_quest_web;
  END IF;
END;
$$;
