-- SHIFT High Island in Discord: the live island post and the suggestions
-- channel.
--
-- The SHIFT High Discord zone has a read-only live channel where the quest
-- bot keeps one message up to date (the island picture, the campfire count,
-- the Demo Day countdown, the island goal), editing it in place and never
-- posting a new one while it still exists, and a suggestions forum that the
-- website's menu links to. This file adds:
--
--   * shift_quest_settings.live_channel_id and .suggest_channel_id (nullable),
--     set through /admin channel (shift_quest_admin_set keys 'live_channel'
--     and 'suggest_channel', snowflake or empty to clear) and shown in
--     shift_quest_admin_status. Both replaced below with the body of
--     20261111090400_shift_quests_admin_functions plus these keys only.
--   * shift_quest_live_state: one row, the live post the bot keeps editing
--     (the channel it was posted in and its message id). The message id is
--     stored here, not looked up from Discord, so a restart edits the same
--     message: bot/src/quests/live.ts reads it through shift_quest_live_post,
--     and scans its own pinned messages for its marker only when no id is
--     stored (a post whose write here failed).
--   * The bot-only reader shift_quest_live_post(): {channel_id, message_id,
--     coworking_channel_id, plots, goal, season, trees, approved, campfire}.
--     plots, goal and season are exactly shift_quest_island_post_map() (the
--     weekly post's outsider view: a stage and a name only where every member
--     consented). message_id only while it was posted in the live channel set
--     now, so a moved channel gets one new post. campfire is {live, count},
--     the rule of shift_quest_campfire, never a name or a Discord user id.
--     approved is the mentor-approved main quests of the projects every
--     member agreed to show (their tree stages added up), 0 when none has:
--     never a quiet project's. A total over every tree would leak a quiet
--     project's stage, because students watch the post being edited as
--     teams opt in: the change in the total when one more team appears, or
--     their own stage on the web island, subtracts down to one quiet project.
--     Counting the shown trees only can never tell more than the picture.
--   * The bot-only writer shift_quest_live_mark(channel, message, previous):
--     compare and set on the state row. It stores the new message id only
--     while the stored one is still previous (or was posted in another
--     channel) and returns the id that won, so two bot processes overlapping
--     in a deploy keep one post: the loser deletes its own. Null, and nothing
--     written, when the channel is not the live channel now.
--   * The website-only reader shift_quest_island_links(actor):
--     {suggest_channel_id}, behind the same gate as shift_quest_island_map.
--     The website builds the Discord link from its own guild id.
--   * shift_quest_schema_version() = 8. The website still needs 6 and the bot
--     2: both fail soft without this file (no live post, no suggestion link),
--     and the bot starts the live post only from 8 (LIVE_SCHEMA in
--     bot/src/quests/live.ts).
--
-- Grants are per function in this file, with no grant loop: the live reader
-- and writer are the bot's (never the website's), the links reader is the
-- website's (never the bot's). Any later file that repeats the bot grant loop
-- of 20261111090600_shift_quest_bot_role must exclude shift_quest_island_links,
-- and any later web allowlist must list public.shift_quest_island_links(text).
--
-- This file never references the whiteboard tables or auth.users: the quest
-- sandbox (bot/quests-sandbox.sh, run-local.sh) has neither.
--
-- Prod-first apply: additive and idempotent (ADD COLUMN IF NOT EXISTS,
-- CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE; replaced functions keep
-- their grants). Keep this file after 20261111093000_shift_quest_campfire: a
-- second pass of the earlier files' loops grants the links reader to the bot
-- and takes it from the website, and this file puts both back.

-- ---------------------------------------------------------------------------
-- Settings and state
-- ---------------------------------------------------------------------------

-- The live post's text channel and the suggestions forum (or text channel).
-- Null means not configured: no live post, no link in the website's menu.
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS live_channel_id text NULL;
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS suggest_channel_id text NULL;

CREATE TABLE IF NOT EXISTS public.shift_quest_live_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- The channel the live post was posted in, and the post.
  channel_id text NULL CHECK (channel_id ~ '^[0-9]{5,25}$'),
  message_id text NULL CHECK (message_id ~ '^[0-9]{5,25}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.shift_quest_live_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.shift_quest_live_state IS
  'SHIFT High live island post: the one Discord message the quest bot keeps editing (channel and message id only, one row, no history).';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_live_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_live_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_live_state TO service_role;

-- ---------------------------------------------------------------------------
-- Settings functions (20261111090400 plus live_channel and suggest_channel)
-- ---------------------------------------------------------------------------

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
      'awards_enabled', s.awards_enabled,
      'redemption_enabled', s.redemption_enabled,
      'sharing_enabled', s.sharing_enabled,
      'reminders_enabled', s.reminders_enabled,
      'reward_terms', s.reward_terms IS NOT NULL,
      'redemption_terms', s.redemption_terms IS NOT NULL,
      'fulfillment_process', s.fulfillment_process IS NOT NULL,
      'fulfillment_owner', s.fulfillment_owner,
      -- 20261111090800_shift_quests_seasons (off before it; hook in 20261111090700).
      'squads_enabled', COALESCE((public.shift_quest__feature_flags() ->> 'squads')::boolean, false)
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
    -- live_channel and suggest_channel: 20261111094000_shift_quest_live. No
    -- outbox message waits for either, so the release below finds nothing.
    WHEN 'help_channel', 'staff_channel', 'celebrate_channel', 'coworking_channel',
         'live_channel', 'suggest_channel' THEN
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

-- ---------------------------------------------------------------------------
-- The live post (bot only)
-- ---------------------------------------------------------------------------

/**
 * Everything the live island post shows, read in one call (no caller; the
 * bot's live loop calls it about once a minute):
 *   channel_id: the live channel, or null (no live post).
 *   message_id: the stored post, only while it was posted in that channel.
 *   coworking_channel_id: the campfire's voice channel, or null.
 *   plots, goal, season: shift_quest_island_post_map(), the outsider view.
 *   trees: how many plots are drawn (non-archived projects with a plot).
 *   approved: the distinct mentor-approved main quests summed over the
 *     projects every member agreed to show (shift_quest__name_visible), 0
 *     when none has. Never over quiet projects: students watch every edit,
 *     so any total that includes them would give a quiet project's stage away
 *     as teams opt in one by one (see the header).
 *   campfire: {live, count}; live as in shift_quest_campfire (a coworking
 *     channel is set, the bot synced it and beat within 3 minutes), count 0
 *     when not live. Never a name, a Discord user id or joined_at.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_live_post()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_state public.shift_quest_live_state;
  v_voice public.shift_quest_voice_state;
  v_trees integer;
  v_approved integer;
  v_live boolean;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_state FROM public.shift_quest_live_state WHERE id;
  SELECT * INTO v_voice FROM public.shift_quest_voice_state WHERE id;

  SELECT count(*)::integer,
         COALESCE(sum(cardinality(public.shift_quest__milestones(p.id)))
                    FILTER (WHERE public.shift_quest__name_visible(p.id)), 0)::integer
  INTO v_trees, v_approved
  FROM public.shift_quest_plots pl
  JOIN public.shift_quest_projects p ON p.id = pl.project_id
  WHERE p.archived_at IS NULL;

  v_live := COALESCE(
    s.coworking_channel_id IS NOT NULL
      AND v_voice.channel_id = s.coworking_channel_id
      AND v_voice.beat_at > now() - interval '3 minutes',
    false
  );
  IF v_live THEN
    SELECT count(*)::integer INTO v_count
    FROM public.shift_quest_voice_presence WHERE channel_id = s.coworking_channel_id;
  END IF;

  RETURN jsonb_build_object(
    'channel_id', s.live_channel_id,
    'message_id', CASE WHEN s.live_channel_id IS NOT NULL AND v_state.channel_id = s.live_channel_id
                       THEN v_state.message_id END,
    'coworking_channel_id', s.coworking_channel_id,
    'plots', public.shift_quest__map_plots(NULL),
    'trees', v_trees,
    'approved', v_approved,
    'campfire', jsonb_build_object('live', v_live, 'count', v_count)
  ) || public.shift_quest__island_extras();
END;
$$;

/**
 * Records the live post, compare and set: the bot posted p_message_id in
 * p_channel_id after reading p_previous (the stored id, or null). Returns the
 * message id that is stored afterwards:
 *   * null, nothing written, when p_channel_id is not the live channel now
 *     (an admin moved or cleared it meanwhile);
 *   * the stored id, nothing written, when it was posted in p_channel_id and
 *     is no longer p_previous (another bot process stored its post first);
 *   * otherwise p_message_id, now stored (null clears it).
 * 'sq:invalid' for a channel id that is missing or not a snowflake, or a set
 * message id that is not one.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_live_mark(p_channel_id text, p_message_id text, p_previous text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.shift_quest_live_state;
BEGIN
  IF p_channel_id IS NULL OR p_channel_id !~ '^[0-9]{5,25}$'
     OR (p_message_id IS NOT NULL AND p_message_id !~ '^[0-9]{5,25}$') THEN
    PERFORM public.shift_quest__fail('invalid');
  END IF;
  INSERT INTO public.shift_quest_live_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
  SELECT * INTO v_state FROM public.shift_quest_live_state WHERE id FOR UPDATE;

  IF p_channel_id IS DISTINCT FROM (public.shift_quest__settings()).live_channel_id THEN
    RETURN NULL;
  END IF;
  IF v_state.channel_id = p_channel_id AND v_state.message_id IS DISTINCT FROM p_previous THEN
    RETURN v_state.message_id;
  END IF;

  UPDATE public.shift_quest_live_state
  SET channel_id = p_channel_id, message_id = p_message_id, updated_at = now()
  WHERE id;
  RETURN p_message_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- The website's menu links (website only)
-- ---------------------------------------------------------------------------

/**
 * The Discord channels the island's menu links to: {suggest_channel_id} (the
 * suggestions forum, or null when none is set). Channel ids only; the website
 * adds its own guild id. Same gate as shift_quest_island_map: a null or
 * unknown actor, or one who has not finished /start and holds no role, is
 * 'sq:not_started'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island_links(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  RETURN jsonb_build_object('suggest_channel_id', (public.shift_quest__settings()).suggest_channel_id);
END;
$$;

/** Island schema 8: the live island post and the suggestions channel. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 8;
$$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- The live post's reader and writer: the bot's only. Supabase's default
-- privileges grant every new function to anon and authenticated, and Postgres
-- to PUBLIC: take those back.
REVOKE ALL ON FUNCTION
  public.shift_quest_live_post(),
  public.shift_quest_live_mark(text, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_live_post(),
  public.shift_quest_live_mark(text, text, text)
TO service_role, shift_quest_bot;

-- The links reader: the website's only (a second pass of the earlier grant
-- loops gives it to the bot, so this takes it back).
REVOKE ALL ON FUNCTION public.shift_quest_island_links(text)
FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_island_links(text) TO service_role;

-- shift_quest_admin_status, shift_quest_admin_set and the schema version keep
-- the grants they already have: CREATE OR REPLACE leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board). Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges), web_board.ts,
-- web_canvas.ts and live.ts.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION
      public.shift_quest_live_post(),
      public.shift_quest_live_mark(text, text, text)
    FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_island_links(text) TO shift_quest_web;
  END IF;
END;
$$;
