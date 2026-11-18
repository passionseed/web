-- SHIFT High Island in Discord: a staff note when the nightly island news
-- card did not post.
--
-- Founder decision (2026-11-18): when a news channel is set and no card has
-- been posted for today's Bangkok day by 22:30 Bangkok (the end of the
-- new-claim window of shift_quest__news_due, 20261118130000), one short note
-- goes to the staff channel slot (#ai-staff): tonight's card did not post,
-- and what to check (the bot's permissions in the news channel, /admin
-- island). At most one note per Bangkok day, restart-safe and safe with two
-- bot processes: the outbox's unique dedupe_key 'news_missed:<day>'. The
-- note carries the day and nothing else: no student, no team, no count. It
-- only ever goes to the staff channel slot, never a student channel.
--
-- This file adds:
--
--   * shift_quest__news_missed(now) (helper, never granted to a login):
--     queues the note when, at p_now,
--       - a news channel and a staff channel are both set (with no staff
--         channel the note would wait as 'blocked' and turn up days later,
--         so it is not queued at all);
--       - it is 22:30 Bangkok or later, before midnight (never a note about
--         yesterday);
--       - no card is recorded for the day (shift_quest_news_posts.message_id)
--         and no bot process claimed it in the last 2 minutes (another
--         process sending it right now). Not the 15 minutes of
--         shift_quest__news_due: a failed send keeps its claim, and the bot
--         claims that stale row again every 15 to 20 minutes until midnight,
--         each time just before its own check in the same tick (news.ts:
--         tonight's card, then this check). A send takes seconds, so the
--         bot's own claim is finished, posted or failed, by its check; a
--         2-minute window, shorter than the 5-minute tick, lets the next
--         tick queue the note whichever tick reclaims;
--       - the news channel was not set or changed from 22:24 that day
--         (shift_quest_admin_set audits 'settings_news_channel'): the bot
--         tries a new card only on its 5-minute ticks and none after 22:30,
--         so a channel set from 6 minutes before (one tick and a margin)
--         may never have had a card to post, which is no alarm;
--       - no note was queued for the day yet.
--     Returns 1 when it queued the note, else 0. The time is a parameter so
--     the tests can pass fixed times.
--   * shift_quest_enqueue_news_missed() (the bot's only): the helper at now().
--     The bot calls it on every nightly news check (every 5 minutes, after
--     its own attempt at tonight's card), from schema 20 only
--     (NEWS_MISSED_SCHEMA in bot/src/quests/news.ts). The outbox delivers the
--     note like every staff post (kind 'news_missed', rendered in
--     bot/src/quests/copy.ts).
--   * shift_quest_schema_version() = 20. 19 is
--     20261118130000_shift_quest_island_news_daily (#328, applied): the
--     version only goes up.
--
-- After a failed send the bot keeps claiming the stale row until midnight
-- (shift_quest__news_due), so a card can still post after the note, once
-- staff fix what blocked it: the note says so (NEWS_MISSED.note).
--
-- Deploy order: the bot first, then this file. A bot older than the one that
-- knows kind 'news_missed' would fail such a row permanently (an unknown
-- kind). Only the new bot calls shift_quest_enqueue_news_missed, so with
-- this file applied and an older bot running, nothing is queued; the new bot
-- reads the version again on each check until it is 20, so no restart is
-- needed after the apply.
--
-- Grants are per function, no grant loop. Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges), web_board.ts
-- and news_missed.ts.
--
-- Prod-first apply: additive and idempotent (CREATE OR REPLACE only). No
-- table, column, index, CHECK or outbox object is created or changed: the
-- outbox's kind CHECK (^[a-z_]{2,40}$) and channel_key 'staff' already allow
-- the row.

-- ---------------------------------------------------------------------------
-- The check (helper: double underscore, never granted to the bot or the website)
-- ---------------------------------------------------------------------------

/**
 * Queues the staff note for p_now's Bangkok day when tonight's card was
 * missed: a news channel and a staff channel set, 22:30 to midnight Bangkok,
 * no card recorded and none being sent by another bot process (no claim
 * under 2 minutes old), the news channel not set or changed from 22:24 that
 * day, and no note queued for the day. Returns 1 when it queued the note,
 * else 0. The note's params are {day} only.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__news_missed(p_now timestamptz)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_day date := (p_now AT TIME ZONE 'Asia/Bangkok')::date;
  v_from timestamptz;
  v_key text;
BEGIN
  IF p_now IS NULL OR s.news_channel_id IS NULL OR s.staff_channel_id IS NULL THEN
    RETURN 0;
  END IF;
  -- 22:30 Bangkok: new cards stop (shift_quest__news_due). Never after midnight.
  v_from := public.shift_quest__news_at(v_day) + interval '150 minutes';
  IF p_now < v_from OR p_now >= public.shift_quest__bkk_end(v_day) THEN
    RETURN 0;
  END IF;
  v_key := 'news_missed:' || v_day::text;
  IF EXISTS (SELECT 1 FROM public.shift_quest_outbox WHERE dedupe_key = v_key) THEN
    RETURN 0;
  END IF;
  -- Posted, or another bot process is sending it right now. A send takes
  -- seconds and the bot checks after its own try, so an older claim without a
  -- message is a send that failed (its stale retries keep the claim fresh).
  IF EXISTS (
    SELECT 1 FROM public.shift_quest_news_posts np
    WHERE np.day = v_day AND (np.message_id IS NOT NULL OR np.claimed_at > p_now - interval '2 minutes')
  ) THEN
    RETURN 0;
  END IF;
  -- The news channel was set or changed too late for a 5-minute tick before
  -- 22:30 (from 22:24: one tick and a margin): no card was missed.
  IF EXISTS (
    SELECT 1 FROM public.shift_quest_audit a
    WHERE a.resource_type = 'settings' AND a.action = 'settings_news_channel'
      AND a.created_at >= v_from - interval '6 minutes' AND a.created_at <= p_now
  ) THEN
    RETURN 0;
  END IF;
  -- One per Bangkok day: the dedupe key holds against a second bot process too.
  PERFORM public.shift_quest__post(v_key, 'staff', 'news_missed', jsonb_build_object('day', v_day::text));
  RETURN 1;
END;
$$;

-- ---------------------------------------------------------------------------
-- The bot's entry point
-- ---------------------------------------------------------------------------

/**
 * The missed-night check at now(): 1 when it queued tonight's staff note,
 * else 0. The bot calls it on every nightly news check.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_enqueue_news_missed()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.shift_quest__news_missed(now());
END;
$$;

/** Island schema 20: the missed-night staff note (19 is 20261118130000_shift_quest_island_news_daily). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 20; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- The helper: no login runs it, service_role included (as every helper since
-- 20261113173515). Supabase's default privileges grant every new function to
-- anon, authenticated and service_role, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION public.shift_quest__news_missed(timestamptz)
FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;

-- The bot's only.
REVOKE ALL ON FUNCTION public.shift_quest_enqueue_news_missed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_enqueue_news_missed() TO service_role, shift_quest_bot;

-- The schema version keeps the grants it already has: CREATE OR REPLACE
-- leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board): the website never runs either.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION
      public.shift_quest__news_missed(timestamptz),
      public.shift_quest_enqueue_news_missed()
    FROM shift_quest_web;
  END IF;
END;
$$;
