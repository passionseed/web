-- SHIFT High Island on the web: the coworking campfire (who is in the SHIFT
-- coworking voice channel right now).
--
-- Plan: docs/designs/shift-high-island-web.md ("Festival, notice board, voice
-- campfire, canvas link", section 4). The island draws one sitting figure per
-- person in the voice channel set as shift_quest_settings.coworking_channel_id,
-- at a campfire, never at a plot. This file adds:
--
--   * shift_quest_voice_presence: who is in the coworking voice channel now
--     (Discord user id, channel id, display name as the server shows it,
--     joined_at). Live presence only: a row is deleted when the person leaves,
--     and nothing keeps a history (no voice time, no sessions). No link to
--     shift_quest_members, projects or plots: adults in the channel are listed
--     the same way, it is a group space.
--   * shift_quest_voice_state: one row, the quest bot's last heartbeat (guild,
--     the channel it last synced, beat_at). The web treats presence as empty
--     when the bot has not beaten for 3 minutes or synced another channel.
--   * Bot-only writers, called by bot/src/quests/campfire.ts from the Discord
--     gateway (GuildVoiceStates), each serialised on the state row and checked
--     against the coworking setting, so no other channel is ever stored:
--       shift_quest_voice_set(guild, user, channel, name): one voice update;
--         true when the person is now stored, false (row deleted) otherwise.
--       shift_quest_voice_sync(guild, channel, user_ids, names): atomic full
--         replace on ready, resume and admin changes. With a null channel it
--         clears everything (a clean stop).
--       shift_quest_voice_beat(guild): the heartbeat; drops rows of an old
--         channel and returns {channel_id, student_role_ids} from the
--         settings. The bot publishes the channel only while those roles (or
--         @everyone when none is set) can see and join it, the same rule
--         /admin channel checks, so a channel staff make private later empties
--         the campfire.
--   * The web-only reader shift_quest_campfire(actor, names): behind the
--     same gate as shift_quest_island_map, returns {channel_id, guild_id,
--     live, count, names}. Names only when asked (the web asks on tap, for a
--     ready viewer), never a Discord user id or joined_at.
--   * shift_quest__voice_purge(): deletes every presence row once the bot
--     has not beaten for 10 minutes, so rows never outlive a bot that died
--     without its clean stop; pg_cron runs it every 5 minutes where pg_cron
--     exists. No login may call it.
--   * shift_quest_schema_version() = 7. The website still needs 6 and the bot
--     2: both fail soft without this file (no campfire), and the bot starts
--     its campfire only from 7 (CAMPFIRE_SCHEMA in bot/src/quests/campfire.ts).
--
-- Grants are per function in this file, with no grant loop: the writers are
-- the bot's (never the website's), the reader is the website's (never the
-- bot's). Any later file that repeats the bot grant loop of
-- 20261111090600_shift_quest_bot_role must exclude shift_quest_campfire, and
-- any later web allowlist must list public.shift_quest_campfire(text, boolean).
--
-- This file never references the whiteboard tables or auth.users: the quest
-- sandbox (bot/quests-sandbox.sh, run-local.sh) has neither.
--
-- Prod-first apply: additive and idempotent (CREATE TABLE IF NOT EXISTS,
-- CREATE OR REPLACE; shift_quest_voice_beat is dropped and created again,
-- since its return type changed, and its grants are set again below). Keep
-- this file after
-- 20261111091200_shift_quest_ownership_web: a second pass of that file's loops
-- grants the reader to the bot and takes it from the website, and this file
-- puts both back.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_voice_presence (
  discord_user_id text PRIMARY KEY CHECK (discord_user_id ~ '^[0-9]{5,25}$'),
  -- Always the coworking channel at the time of writing (the writers check).
  channel_id text NOT NULL CHECK (channel_id ~ '^[0-9]{5,25}$'),
  -- The name the server shows (nickname, else global name), trimmed; null when empty.
  display_name text NULL CHECK (char_length(display_name) <= 80),
  joined_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_quest_voice_presence IS
  'SHIFT High campfire: live presence in the coworking voice channel only, deleted on leave, no history. Never linked to members, projects or plots.';

CREATE TABLE IF NOT EXISTS public.shift_quest_voice_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  guild_id text NULL,
  -- The channel the bot last synced (the coworking channel then), or null.
  channel_id text NULL,
  beat_at timestamptz NULL
);

INSERT INTO public.shift_quest_voice_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.shift_quest_voice_state IS
  'SHIFT High campfire: the quest bot''s heartbeat for live presence in the coworking voice channel only (one row, no history).';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_voice_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_voice_presence FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_voice_presence TO service_role;

ALTER TABLE public.shift_quest_voice_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_voice_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_voice_state TO service_role;

-- ---------------------------------------------------------------------------
-- Bot writers
-- ---------------------------------------------------------------------------

/**
 * One voice update from the gateway: the person is in p_channel_id now (null:
 * in no voice channel). Stored only when that is the coworking channel, with
 * joined_at kept while they stay in it; anything else deletes their row.
 * True when the person is stored, false otherwise. 'sq:invalid' for a user id
 * that is not a snowflake, or a guild or channel id that is set and is not one.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_voice_set(
  p_guild_id text, p_user_id text, p_channel_id text, p_display_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_setting text;
BEGIN
  PERFORM 1 FROM public.shift_quest_voice_state WHERE id FOR UPDATE;
  IF p_user_id IS NULL OR p_user_id !~ '^[0-9]{5,25}$'
     OR (p_guild_id IS NOT NULL AND p_guild_id !~ '^[0-9]{5,25}$')
     OR (p_channel_id IS NOT NULL AND p_channel_id !~ '^[0-9]{5,25}$') THEN
    PERFORM public.shift_quest__fail('invalid');
  END IF;
  v_setting := (public.shift_quest__settings()).coworking_channel_id;

  IF p_channel_id IS NULL OR v_setting IS NULL OR p_channel_id <> v_setting THEN
    DELETE FROM public.shift_quest_voice_presence WHERE discord_user_id = p_user_id;
    RETURN false;
  END IF;

  INSERT INTO public.shift_quest_voice_presence AS v (discord_user_id, channel_id, display_name, joined_at)
  VALUES (p_user_id, p_channel_id, NULLIF(left(btrim(p_display_name), 80), ''), now())
  ON CONFLICT (discord_user_id) DO UPDATE
  SET channel_id = EXCLUDED.channel_id,
      display_name = EXCLUDED.display_name,
      joined_at = CASE WHEN v.channel_id = EXCLUDED.channel_id THEN v.joined_at ELSE EXCLUDED.joined_at END;
  RETURN true;
END;
$$;

/**
 * The full list of people in p_channel_id, replacing what is stored in one
 * transaction (on ready, resume and after the coworking channel changes).
 * When p_channel_id is null or is not the coworking channel, everything is
 * deleted and 0 returned (a clean stop passes null). Otherwise rows not in the
 * list are deleted and the list is stored, joined_at kept for people already
 * there; ids that are not snowflakes are skipped, a repeated id counts once.
 * Records the heartbeat (guild, synced channel, beat_at). Returns the number
 * of people stored. 'sq:invalid' for a set guild or channel id that is not a
 * snowflake, arrays of different lengths, or more than 200 people.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_voice_sync(
  p_guild_id text, p_channel_id text, p_user_ids text[], p_names text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids text[] := COALESCE(p_user_ids, '{}'::text[]);
  v_names text[] := COALESCE(p_names, '{}'::text[]);
  v_setting text;
  v_count integer;
BEGIN
  PERFORM 1 FROM public.shift_quest_voice_state WHERE id FOR UPDATE;
  IF (p_guild_id IS NOT NULL AND p_guild_id !~ '^[0-9]{5,25}$')
     OR (p_channel_id IS NOT NULL AND p_channel_id !~ '^[0-9]{5,25}$')
     OR cardinality(v_ids) <> cardinality(v_names)
     OR cardinality(v_ids) > 200 THEN
    PERFORM public.shift_quest__fail('invalid');
  END IF;
  v_setting := (public.shift_quest__settings()).coworking_channel_id;

  IF p_channel_id IS NULL OR v_setting IS NULL OR p_channel_id <> v_setting THEN
    DELETE FROM public.shift_quest_voice_presence WHERE true;
    UPDATE public.shift_quest_voice_state
    SET guild_id = p_guild_id, channel_id = NULL, beat_at = now()
    WHERE id;
    RETURN 0;
  END IF;

  -- array_remove: a null in the list must not keep everyone else (x = ANY is null then).
  DELETE FROM public.shift_quest_voice_presence v
  WHERE v.channel_id <> p_channel_id
     OR NOT (v.discord_user_id = ANY (array_remove(v_ids, NULL)));

  INSERT INTO public.shift_quest_voice_presence AS v (discord_user_id, channel_id, display_name, joined_at)
  SELECT DISTINCT ON (u.id) u.id, p_channel_id, NULLIF(left(btrim(u.name), 80), ''), now()
  FROM unnest(v_ids, v_names) WITH ORDINALITY AS u(id, name, ord)
  WHERE u.id ~ '^[0-9]{5,25}$'
  ORDER BY u.id, u.ord
  ON CONFLICT (discord_user_id) DO UPDATE
  SET channel_id = EXCLUDED.channel_id,
      display_name = EXCLUDED.display_name,
      joined_at = CASE WHEN v.channel_id = EXCLUDED.channel_id THEN v.joined_at ELSE EXCLUDED.joined_at END;

  UPDATE public.shift_quest_voice_state
  SET guild_id = p_guild_id, channel_id = p_channel_id, beat_at = now()
  WHERE id;

  SELECT count(*)::integer INTO v_count FROM public.shift_quest_voice_presence;
  RETURN v_count;
END;
$$;

/**
 * The bot's heartbeat (every minute or so): records beat_at and the guild,
 * deletes rows of any channel that is no longer the coworking channel (and
 * forgets a synced channel that is no longer it), and returns
 * {channel_id, student_role_ids}: the coworking channel id (null when none is
 * set) and the student role ids (an array, [] when none is set). A changed
 * channel id tells the bot to resync; the roles tell it whether students can
 * see the channel, so whether it may publish who sits in it at all.
 * 'sq:invalid' for a set guild id that is not a snowflake.
 *
 * The return type was text before this file's last edit (never applied to
 * production), so the function is dropped first; the grants below put back
 * exactly what it had.
 */
DROP FUNCTION IF EXISTS public.shift_quest_voice_beat(text);
CREATE FUNCTION public.shift_quest_voice_beat(p_guild_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.shift_quest_settings;
  v_setting text;
BEGIN
  PERFORM 1 FROM public.shift_quest_voice_state WHERE id FOR UPDATE;
  IF p_guild_id IS NOT NULL AND p_guild_id !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('invalid');
  END IF;
  v_settings := public.shift_quest__settings();
  v_setting := v_settings.coworking_channel_id;

  DELETE FROM public.shift_quest_voice_presence WHERE channel_id IS DISTINCT FROM v_setting;
  UPDATE public.shift_quest_voice_state
  SET guild_id = p_guild_id,
      channel_id = CASE WHEN channel_id IS DISTINCT FROM v_setting THEN NULL ELSE channel_id END,
      beat_at = now()
  WHERE id;
  RETURN jsonb_build_object(
    'channel_id', v_setting,
    'student_role_ids', to_jsonb(COALESCE(v_settings.student_role_ids, '{}'::text[]))
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Web reader
-- ---------------------------------------------------------------------------

/**
 * The campfire for the island: {channel_id (the coworking channel or null),
 * guild_id (the bot's guild or null), live, count, names}. live: a coworking
 * channel is set, the bot synced that channel and beat within 3 minutes.
 * count and names cover that channel only, and are 0 and [] when not live.
 * names: display names ordered by joined_at, at most 50, a null name kept as
 * null, only when p_names (else null). Never a Discord user id, joined_at, or
 * anything that links a person to a member, project or plot. Same gate as
 * shift_quest_island_map: a null or unknown actor, or one who has not
 * finished /start and holds no role, is 'sq:not_started'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_campfire(p_actor text, p_names boolean)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_setting text;
  v_state public.shift_quest_voice_state;
  v_live boolean;
  v_count integer := 0;
  v_names jsonb;
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  v_setting := (public.shift_quest__settings()).coworking_channel_id;
  SELECT * INTO v_state FROM public.shift_quest_voice_state WHERE id;
  v_live := COALESCE(
    v_setting IS NOT NULL
      AND v_state.channel_id = v_setting
      AND v_state.beat_at > now() - interval '3 minutes',
    false
  );

  IF v_live THEN
    SELECT count(*)::integer INTO v_count
    FROM public.shift_quest_voice_presence WHERE channel_id = v_setting;
  END IF;

  IF COALESCE(p_names, false) THEN
    IF v_live THEN
      SELECT COALESCE(jsonb_agg(s.display_name ORDER BY s.joined_at, s.discord_user_id), '[]'::jsonb)
      INTO v_names
      FROM (
        SELECT v.display_name, v.joined_at, v.discord_user_id
        FROM public.shift_quest_voice_presence v
        WHERE v.channel_id = v_setting
        ORDER BY v.joined_at, v.discord_user_id
        LIMIT 50
      ) s;
    ELSE
      v_names := '[]'::jsonb;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'channel_id', v_setting,
    'guild_id', v_state.guild_id,
    'live', v_live,
    'count', v_count,
    'names', v_names
  );
END;
$$;

/**
 * The purge that needs no bot: when the bot has not beaten for 10 minutes
 * (it died without its clean-stop sync, or the campfire is off), nobody is
 * shown at the campfire anyway (live needs a beat within 3 minutes), so the
 * presence rows are deleted. Returns how many. A helper: neither login may
 * run it; pg_cron runs it as the owner every 5 minutes where pg_cron exists.
 * Longest a row can outlive its person: about 15 minutes.
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

/** Island schema 7: the coworking campfire. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 7;
$$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- The writers: the bot's only. Supabase's default privileges grant every new
-- function to anon and authenticated, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION
  public.shift_quest_voice_set(text, text, text, text),
  public.shift_quest_voice_sync(text, text, text[], text[]),
  public.shift_quest_voice_beat(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_voice_set(text, text, text, text),
  public.shift_quest_voice_sync(text, text, text[], text[]),
  public.shift_quest_voice_beat(text)
TO service_role, shift_quest_bot;

-- The reader: the website's only. The bot never reads names (a second pass of
-- the earlier grant loops gives it the reader, so this takes it back).
REVOKE ALL ON FUNCTION public.shift_quest_campfire(text, boolean)
FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_campfire(text, boolean) TO service_role;

-- The purge helper: no login runs it, only its owner (pg_cron below).
REVOKE ALL ON FUNCTION public.shift_quest__voice_purge()
FROM PUBLIC, anon, authenticated, shift_quest_bot;

-- The schema version keeps the grants it already has: CREATE OR REPLACE
-- leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board). Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges), web_board.ts,
-- web_canvas.ts and campfire.ts.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION
      public.shift_quest_voice_set(text, text, text, text),
      public.shift_quest_voice_sync(text, text, text[], text[]),
      public.shift_quest_voice_beat(text)
    FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__voice_purge() FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_campfire(text, boolean) TO shift_quest_web;
  END IF;
END;
$$;

-- Every 5 minutes, where pg_cron is installed (production; the quest sandbox
-- has none): presence rows go even if the bot never comes back. Re-running
-- replaces the job under the same name.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('shift-quest-voice-purge') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'shift-quest-voice-purge');
    PERFORM cron.schedule('shift-quest-voice-purge', '*/5 * * * *', 'SELECT public.shift_quest__voice_purge()');
  END IF;
END;
$$;
