-- SHIFT High Island: the deep fire (กองไฟโฟกัส), a room of your own for deep work.
--
-- Design: docs/designs/shift-island-deep-fire.md (founder, 2026-11-20: "deep
-- fire room in island and discord, like for deep work. Click it and you have
-- a private room built for you to deep work. Locked: nobody else can enter.").
-- Staff make one lobby voice channel in a category and set it with
-- /admin channel kind:deepfire. Whoever joins the lobby gets a new voice
-- channel built for them in that category (generic name, never theirs), and
-- the bot moves them in. Nobody else may connect: the room copies the lobby's
-- role overwrites (so everyone who sees the lobby sees the room and who sits
-- in it: closed, never secret), denies Connect and text chat to every role,
-- and allows only the owner and the bot. The bot is the lock: anyone else
-- found in a room (an Administrator, someone dragged in) is disconnected at
-- once, so an adult and a student can never stay alone in one. A room is
-- deleted the moment it is empty. The island shows a small one-person fire on
-- the plaza whose button opens the lobby.
--
-- What the database keeps (minimised on purpose): the lobby setting and one
-- heartbeat row. Nothing per person: no table of rooms, no owner, no member
-- or Discord id, no time anyone sat in a room. The bot recognises its rooms
-- and their owners from the rooms' own permission overwrites (bot/src/quests/
-- deepfire.ts), so it needs nothing stored to survive a restart.
--
-- This file adds:
--
--   * shift_quest_settings.deepfire_channel_id (nullable, no CHECK, like its
--     sibling *_channel_id columns: shift_quest_admin_set takes only a
--     snowflake or empty), set through /admin channel kind:deepfire
--     (shift_quest_admin_set key 'deepfire_channel', a snowflake, or empty to
--     clear: clearing turns the deep fire off on the island and in Discord)
--     and shown in shift_quest_admin_status as deepfire_channel_id. The
--     website's shift_quest_admin_web_status (20261118100000) turns every
--     *_channel_id key into a yes/no by itself, so it shows deepfire_channel
--     (true or false, never the id) with no change.
--   * shift_quest_deepfire_state: one row, the bot's last heartbeat (guild,
--     the lobby setting at that beat, whether the bot can build rooms there,
--     beat_at). No person, no history.
--   * shift_quest_deepfire_beat(guild, ready) (the bot's only): records the
--     beat with channel_id = the current setting and returns
--     {"channel_id": the setting or null}. ready is true only when the bot
--     holds View Channel, Connect, Manage Channels and Move Members on the
--     lobby and on its category (fail closed: unknown is false).
--   * shift_quest_deepfire(actor) (the website's only): {channel_id,
--     guild_id, live}. live: the lobby is set, the last beat named that lobby,
--     said ready, and is under 3 minutes old. guild_id only when it is a
--     snowflake (else null: the website falls back to DISCORD_SHIFT_GUILD_ID,
--     as campfireJoinUrl does). Same gate as shift_quest_campfire: a null or
--     unknown actor, or one who has not finished /start and holds no role,
--     is 'sq:not_started'. No count and no names: who sits in a room is never
--     read here.
--   * shift_quest_admin_set (20261118130000 plus the 'deepfire_channel'
--     key) and shift_quest_admin_status (20261118150000 plus
--     deepfire_channel_id), each its latest body with only the deep fire
--     lines added.
--   * shift_quest_schema_version() = 22. 21 is
--     20261118150000_shift_quest_campfire_call: apply it first, so the
--     version only goes up. The bot builds rooms only from 22 (it reads the
--     version again on every tick, so it starts with no restart once this is
--     applied); the website still needs 6 and shows no deep fire before this
--     file (shift_quest_deepfire missing, SQLSTATE 42883, logged once).
--
-- Not touched, on purpose: the evening guest and the campfire call (the deep
-- fire rooms never count for the 19:25 guest), the voice presence tables
-- (nobody's presence in a room is stored), /data's export and the erasure
-- (shift_quest__island_export and shift_quest__island_erase: nothing here
-- belongs to a person), and every function that reads the settings row
-- (none returns the whole row; each names its columns).
--
-- Grants are per function in this file, with no grant loop: the beat is the
-- bot's (never the website's), the read is the website's (never the bot's).
-- Any later file that repeats the bot grant loop of
-- 20261111090600_shift_quest_bot_role must exclude shift_quest_deepfire, and
-- any later web allowlist must list public.shift_quest_deepfire(text).
-- Mirrored in supabase/tests/shift_quests/run-local.sh (check_privileges),
-- db_rules.ts, web_board.ts, web_canvas.ts, deepfire.ts and
-- docs/runbooks/shift-high-island-checks.sql.
--
-- Deploy order: merge, deploy the bot (below 22 its deep fire idles), then
-- this file on the founder's go, after schema 21 is in production. Then staff
-- make the lobby and run /admin channel kind:deepfire (the room is off until
-- a lobby is set).
--
-- Prod-first apply: additive and idempotent (ADD COLUMN IF NOT EXISTS,
-- CREATE TABLE IF NOT EXISTS, ON CONFLICT DO NOTHING, CREATE OR REPLACE;
-- replaced functions keep their signatures and grants). No outbox object and
-- no existing CHECK is touched. Never references the whiteboard tables or
-- auth.users: the quest sandbox (bot/quests-sandbox.sh, run-local.sh) has
-- neither.

-- ---------------------------------------------------------------------------
-- Setting and heartbeat
-- ---------------------------------------------------------------------------

-- The deep fire's lobby voice channel. Null: no deep fire anywhere.
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS deepfire_channel_id text NULL;

CREATE TABLE IF NOT EXISTS public.shift_quest_deepfire_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  guild_id text NULL CHECK (guild_id IS NULL OR guild_id ~ '^[0-9]{5,25}$'),
  -- The lobby setting at the last beat, or null.
  channel_id text NULL CHECK (channel_id IS NULL OR channel_id ~ '^[0-9]{5,25}$'),
  -- The bot could build rooms in that lobby at the last beat.
  ready boolean NOT NULL DEFAULT false,
  beat_at timestamptz NULL
);

INSERT INTO public.shift_quest_deepfire_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.shift_quest_deepfire_state IS
  'SHIFT High deep fire: the quest bot''s heartbeat for the deep fire lobby only (one row: guild, lobby, ready, beat_at). No person, no room, no history.';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_deepfire_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_deepfire_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_deepfire_state TO service_role;

-- ---------------------------------------------------------------------------
-- The bot's heartbeat
-- ---------------------------------------------------------------------------

/**
 * The bot's deep fire heartbeat (every minute or so, from schema 22):
 * records the guild, the lobby setting as it is now, whether the bot can
 * build rooms (p_ready; null counts as false) and beat_at, and returns
 * {"channel_id": the lobby setting, or null when none is set}. A changed id
 * tells the bot to switch lobbies (and check its permissions there before it
 * says ready again). 'sq:invalid' for a set guild id that is not a snowflake.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_deepfire_beat(p_guild_id text, p_ready boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_setting text;
BEGIN
  IF p_guild_id IS NOT NULL AND p_guild_id !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('invalid');
  END IF;
  v_setting := (public.shift_quest__settings()).deepfire_channel_id;
  UPDATE public.shift_quest_deepfire_state
  SET guild_id = p_guild_id,
      channel_id = v_setting,
      ready = COALESCE(p_ready, false),
      beat_at = now()
  WHERE id;
  RETURN jsonb_build_object('channel_id', v_setting);
END;
$$;

-- ---------------------------------------------------------------------------
-- The website's read
-- ---------------------------------------------------------------------------

/**
 * The deep fire for the island: {channel_id (the lobby or null), guild_id
 * (the bot's guild when it is a snowflake, else null), live}. live: a lobby
 * is set, the bot's last beat named that lobby, said it can build rooms
 * there, and came within 3 minutes. Never a count, a name, a Discord user id
 * or anything about who sits in a room. Same gate as shift_quest_campfire: a
 * null or unknown actor, or one who has not finished /start and holds no
 * role, is 'sq:not_started'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_deepfire(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_setting text;
  v_state public.shift_quest_deepfire_state;
  v_live boolean;
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  v_setting := (public.shift_quest__settings()).deepfire_channel_id;
  SELECT * INTO v_state FROM public.shift_quest_deepfire_state WHERE id;
  v_live := COALESCE(
    v_setting IS NOT NULL
      AND v_state.channel_id = v_setting
      AND v_state.ready
      AND v_state.beat_at > now() - interval '3 minutes',
    false
  );
  RETURN jsonb_build_object(
    'channel_id', v_setting,
    'guild_id', CASE WHEN v_state.guild_id ~ '^[0-9]{5,25}$' THEN v_state.guild_id END,
    'live', v_live
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Settings: the latest bodies plus the deep fire lines only
-- ---------------------------------------------------------------------------

/** 20261118150000_shift_quest_campfire_call's body, plus deepfire_channel_id (20261120120000). */
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
      -- 20261120120000_shift_quest_deep_fire: the deep fire's lobby.
      'deepfire_channel_id', s.deepfire_channel_id,
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
 * One setting at a time. Switching a reward feature on is refused while
 * anything it needs is missing, so an incomplete configuration can never go
 * live by accident. Switching anything off always works.
 * (20261118130000_shift_quest_island_news_daily's body, plus the
 * 'deepfire_channel' key of 20261120120000.)
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_set(p_actor text, p_key text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_value text := public.shift_quest__trim(p_value);
  v_on boolean := lower(COALESCE(p_value, '')) IN ('on', 'true', '1');
  v_blockers jsonb;
BEGIN
  PERFORM 1 FROM public.shift_quest_settings WHERE id FOR NO KEY UPDATE;

  CASE p_key
    WHEN 'awards', 'redemption', 'sharing', 'reminders' THEN
      IF v_on THEN
        v_blockers := public.shift_quest__blockers() -> p_key;
        IF jsonb_array_length(v_blockers) > 0 THEN
          RAISE EXCEPTION 'sq:config_incomplete' USING ERRCODE = 'P0001', DETAIL = v_blockers::text;
        END IF;
      END IF;
      EXECUTE format('UPDATE public.shift_quest_settings SET %I = $1 WHERE id', p_key || '_enabled') USING v_on;
      -- Redemption depends on awards: pausing awards pauses redemption too.
      IF p_key = 'awards' AND NOT v_on THEN
        UPDATE public.shift_quest_settings SET redemption_enabled = false WHERE id;
      END IF;
    -- live_channel and suggest_channel: 20261111094000_shift_quest_live;
    -- news_channel: 20261118130000_shift_quest_island_news_daily;
    -- deepfire_channel: 20261120120000_shift_quest_deep_fire. No outbox
    -- message waits for any of them, so the release below finds nothing.
    WHEN 'help_channel', 'staff_channel', 'celebrate_channel', 'coworking_channel',
         'live_channel', 'suggest_channel', 'news_channel', 'deepfire_channel' THEN
      IF v_value IS NOT NULL AND v_value !~ '^[0-9]{5,25}$' THEN
        PERFORM public.shift_quest__fail('bad_input');
      END IF;
      EXECUTE format('UPDATE public.shift_quest_settings SET %I = $1 WHERE id', p_key || '_id') USING v_value;
      IF p_key = 'celebrate_channel' AND v_value IS NULL THEN
        UPDATE public.shift_quest_settings SET sharing_enabled = false WHERE id;
      END IF;
      -- Messages that waited for this channel can go now.
      IF v_value IS NOT NULL THEN
        UPDATE public.shift_quest_outbox
        SET status = 'pending', next_attempt_at = now(), last_error = NULL
        WHERE status = 'blocked' AND channel_key = replace(p_key, '_channel', '');
      END IF;
    WHEN 'student_role_add', 'student_role_remove' THEN
      IF v_value IS NULL OR v_value !~ '^[0-9]{5,25}$' THEN
        PERFORM public.shift_quest__fail('bad_input');
      END IF;
      UPDATE public.shift_quest_settings
      SET student_role_ids = CASE WHEN p_key = 'student_role_add'
        THEN array_append(array_remove(student_role_ids, v_value), v_value)
        ELSE array_remove(student_role_ids, v_value) END
      WHERE id;
    WHEN 'reward_terms', 'redemption_terms', 'fulfillment_process', 'fulfillment_owner' THEN
      IF char_length(v_value) > 3000 THEN
        PERFORM public.shift_quest__fail('text_too_long');
      END IF;
      EXECUTE format('UPDATE public.shift_quest_settings SET %I = $1 WHERE id', p_key) USING v_value;
      -- Clearing what a live feature depends on switches it off.
      IF v_value IS NULL THEN
        UPDATE public.shift_quest_settings
        SET awards_enabled = awards_enabled AND p_key <> 'reward_terms',
            redemption_enabled = false
        WHERE id;
      END IF;
    ELSE
      -- Switches from later migrations ('squads', 20261111090800_shift_quests_seasons)
      -- need nothing published first; an unknown key is bad_input.
      IF NOT public.shift_quest__set_feature(p_key, v_on) THEN
        PERFORM public.shift_quest__fail('bad_input');
      END IF;
  END CASE;

  UPDATE public.shift_quest_settings SET updated_by = v_me.id, updated_at = now() WHERE id;
  PERFORM public.shift_quest__audit(v_me.id, 'settings_' || p_key, 'settings', NULL);
  RETURN public.shift_quest_admin_status(p_actor);
END;
$$;

/** Island schema 22: the deep fire (21 is 20261118150000_shift_quest_campfire_call). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 22; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- The heartbeat: the bot's only. Supabase's default privileges grant every
-- new function to anon and authenticated, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION public.shift_quest_deepfire_beat(text, boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_deepfire_beat(text, boolean)
TO service_role, shift_quest_bot;

-- The read: the website's only. A second pass of the earlier grant loops
-- (20261111090600, 091000, 091200) gives it to the bot, so this takes it back.
REVOKE ALL ON FUNCTION public.shift_quest_deepfire(text)
FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_deepfire(text) TO service_role;

-- The replaced functions (shift_quest_admin_status, shift_quest_admin_set)
-- and the schema version keep the grants they already have: CREATE OR
-- REPLACE leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION public.shift_quest_deepfire_beat(text, boolean) FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_deepfire(text) TO shift_quest_web;
  END IF;
END;
$$;
