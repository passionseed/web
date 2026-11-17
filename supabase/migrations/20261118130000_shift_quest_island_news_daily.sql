-- SHIFT High Island in Discord: the nightly island news (ข่าวเกาะคืนนี้).
--
-- Design: docs/designs/shift-island-daily-news.md (founder, 2026-11-18).
-- Every evening at 20:00 Bangkok the bot posts one card in #island-news: the
-- night island picture, island-wide totals (people who checked in, quests a
-- mentor approved, tree stages grown, campfire rounds), the Demo Day
-- countdown, a lore line and links. When any team passes the AI consent gate,
-- the same card also carries the AI team lines. Something posts every day: the
-- card needs only the bot, this database and a news channel. It does not
-- depend on Vercel, the cron, the Anthropic key, digest_enabled or sharing.
-- This file adds:
--
--   * shift_quest_settings.news_channel_id (nullable), set through /admin
--     channel kind:news (shift_quest_admin_set key 'news_channel', a
--     snowflake or empty to clear) and shown in shift_quest_admin_status. Both
--     replaced below with the body of 20261111094000_shift_quest_live plus
--     this key only. Setting it turns the nightly card on; clearing it turns
--     it off.
--   * shift_quest_news_posts: one row per Bangkok day, the ledger that keeps
--     the card to one message a day (claim, then send, then a compare-and-set
--     mark). totals are frozen at claim time: integers and a date only.
--     Deliberately not shift_quest_digest_posts: an older bot image (a
--     rollback) would rewrite those rows' messages as taken down.
--   * Helpers (never granted to a login):
--       shift_quest__news_at(day): 20:00 Bangkok on that day.
--       shift_quest__news_due(day, now): from 20:00 to midnight, nothing
--         posted and no claim younger than 15 minutes; a new claim only
--         before 22:30, a stale claim (a process that stopped between claim
--         and mark) offered until midnight. Never a catch-up after midnight.
--       shift_quest__news_totals(day): over [20:00 the day before, 20:00 the
--         day), so each event counts once. {checked_in, approved, grew,
--         rounds, demo}: no id, name, slot, minute or time of day.
--       shift_quest__news_ai(day): {kind, entries}, the AI lines of teams
--         eligible now (shift_quest__digest_eligible) while digest_enabled.
--       shift_quest__news_next(now): what news_post_next answers at that
--         time (so the tests can pass fixed times).
--   * The bot's functions: shift_quest_news_post_next(),
--     shift_quest_news_claim(day, channel), shift_quest_news_mark(day,
--     channel, message) and shift_quest_news_post_current() (the last 7 days'
--     cards as they should read now: a hidden team or a withdrawn consent
--     takes its AI line out by an edit).
--   * shift_quest_digest_post_next() (20261111095000): one guard, null while
--     a news channel is set, so the AI news lands only inside the nightly
--     card, never in the live channel, even under an older bot image.
--   * shift_quest_admin_island_status(actor) (20261111095000): digest.channel
--     is 'news' while a news channel is set, last_day counts news days too,
--     and digest.today_summaries is how many teams have an AI summary stored
--     for today (so a cron or key that writes nothing shows up in /admin
--     island).
--   * Three indexes for the totals: the Bangkok tap day (byte-identical to
--     20261118110000's, so a no-op once that file is applied), approvals by
--     decision time, work sessions by start time.
--   * shift_quest_schema_version() = 19. 18 is
--     20261118110000_shift_quest_island_visitors (#325, applied): apply it
--     first, so the version only goes up. The bot starts the card only from
--     19 (NEWS_SCHEMA in bot/src/quests/news.ts) and still needs 2; the
--     website never calls these functions.
--
-- Hard lines, enforced here: totals only, never a name; a team name only
-- inside an AI line, only for a team every member opted in to show with AI
-- consent; approvals and stages count every team only while sharing_enabled
-- is on (as the tree_grew celebrations already show them), name-visible teams
-- only while it is off (the live post's rule). Campfire rounds are a count of
-- rounds started with an intention, never minutes: every focus round tells
-- students nobody counts their time.
--
-- Grants are per function, no grant loop. Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges), db_rules.ts,
-- web_board.ts and news.ts.
--
-- Prod-first apply: additive and idempotent (ADD COLUMN IF NOT EXISTS,
-- CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR REPLACE;
-- replaced functions keep their signatures and grants). No outbox object and
-- no existing CHECK is touched.

-- ---------------------------------------------------------------------------
-- Setting, ledger, indexes
-- ---------------------------------------------------------------------------

-- The nightly card's text or announcement channel. Null: no card.
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS news_channel_id text NULL;

CREATE TABLE IF NOT EXISTS public.shift_quest_news_posts (
  -- One Discord message per Bangkok day.
  day date PRIMARY KEY,
  channel_id text NOT NULL CHECK (channel_id ~ '^[0-9]{5,25}$'),
  message_id text NULL CHECK (message_id IS NULL OR message_id ~ '^[0-9]{5,25}$'),
  -- A bot process claims the day before it sends, so a restart between send
  -- and mark never posts twice.
  claimed_at timestamptz NULL,
  posted_at timestamptz NULL,
  -- The island totals the card shows, frozen at claim time: integers and a
  -- date only (shift_quest__news_totals), never a name or an id.
  totals jsonb NULL CHECK (totals IS NULL OR jsonb_typeof(totals) = 'object')
);

COMMENT ON TABLE public.shift_quest_news_posts IS
  'SHIFT High nightly island news: one Discord message per Bangkok day (channel, message id, claim time, island-wide integer totals). Never a name or a person.';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_news_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_news_posts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_news_posts TO service_role;

-- One Bangkok day's taps (the same index as 20261118110000_shift_quest_island_visitors).
CREATE INDEX IF NOT EXISTS shift_quest_progress_tap_day
  ON public.shift_quest_progress (((created_at AT TIME ZONE 'Asia/Bangkok')::date))
  WHERE kind = 'tap';
-- Approvals in a window, without reading every submission.
CREATE INDEX IF NOT EXISTS shift_quest_submissions_approved_decided
  ON public.shift_quest_submissions (decided_at)
  WHERE status = 'approved';
-- Campfire rounds started in a window.
CREATE INDEX IF NOT EXISTS shift_quest_work_sessions_started
  ON public.shift_quest_work_sessions (started_at);

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: never granted to the bot or the website)
-- ---------------------------------------------------------------------------

/** When the day's card goes out: 20:00 Bangkok on p_day. */
CREATE OR REPLACE FUNCTION public.shift_quest__news_at(p_day date)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.shift_quest__bkk_start(p_day) + interval '20 hours';
$$;

/**
 * Whether the card for p_day should be sent at p_now: from 20:00 up to (not
 * including) midnight Bangkok; nothing recorded for the day and no claim
 * younger than 15 minutes; and either before 22:30 (a new claim) or a stale
 * claim exists (claimed, never marked: a process stopped between claim and
 * mark, recovered until midnight). Never after midnight: no "yesterday" card.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__news_due(p_day date, p_now timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    p_now >= public.shift_quest__news_at(p_day)
    AND p_now < public.shift_quest__bkk_end(p_day)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_news_posts np
      WHERE np.day = p_day AND (np.message_id IS NOT NULL OR np.claimed_at > p_now - interval '15 minutes')
    )
    AND (
      p_now < public.shift_quest__news_at(p_day) + interval '150 minutes'
      OR EXISTS (
        SELECT 1 FROM public.shift_quest_news_posts np
        WHERE np.day = p_day AND np.message_id IS NULL AND np.claimed_at IS NOT NULL
      )
    ),
    false
  );
$$;

/**
 * The island-wide totals of the card for p_day, over [20:00 the day before,
 * 20:00 p_day) Bangkok, so every event counts exactly once:
 *   checked_in: members with a check-in (a tap) in the window; erased
 *     members never count.
 *   approved: quests a mentor approved in the window, one per quest.
 *   grew: tree stages risen in the window (a repeat approval of a milestone
 *     the tree already counts adds nothing; a side quest has no stage).
 *   approved and grew count every team while sharing_enabled is on, only
 *     the teams every member shows by name while it is off; archived
 *     projects never.
 *   rounds: campfire rounds started with an intention (work sessions), a
 *     count only. No duration, ever.
 *   demo: {day, days} to Demo Day of the active season, counted from p_day,
 *     while it is today or ahead; null otherwise.
 * No id, name, slot or time of day.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__news_totals(p_day date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz := public.shift_quest__news_at(p_day - 1);
  v_to timestamptz := public.shift_quest__news_at(p_day);
  v_sharing boolean := COALESCE((public.shift_quest__settings()).sharing_enabled, false);
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
  v_checked integer := 0;
  v_approved integer := 0;
  v_grew integer := 0;
  v_rounds integer := 0;
BEGIN
  IF p_day IS NULL THEN
    RETURN NULL;
  END IF;

  -- The two Bangkok dates the window touches, so the tap-day index applies.
  SELECT count(DISTINCT g.member_id)::integer INTO v_checked
  FROM public.shift_quest_progress g
  JOIN public.shift_quest_members m ON m.id = g.member_id
  WHERE g.kind = 'tap'
    AND (g.created_at AT TIME ZONE 'Asia/Bangkok')::date IN (p_day - 1, p_day)
    AND g.created_at >= v_from AND g.created_at < v_to
    AND m.erased_at IS NULL;

  WITH approvals AS (
    SELECT DISTINCT s.instance_id, i.project_id
    FROM public.shift_quest_submissions s
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    LEFT JOIN public.shift_quest_projects p ON p.id = i.project_id
    WHERE s.status = 'approved' AND s.decided_at >= v_from AND s.decided_at < v_to
      AND (i.project_id IS NULL OR p.archived_at IS NULL)
      AND (v_sharing OR (i.project_id IS NOT NULL AND public.shift_quest__name_visible(i.project_id)))
  )
  SELECT
    (SELECT count(*)::integer FROM approvals),
    (SELECT COALESCE(sum(cardinality(public.shift_quest__milestones(a.project_id, v_to))
                         - cardinality(public.shift_quest__milestones(a.project_id, v_from))), 0)::integer
     FROM (SELECT DISTINCT project_id FROM approvals WHERE project_id IS NOT NULL) a
     JOIN public.shift_quest_plots pl ON pl.project_id = a.project_id)
  INTO v_approved, v_grew;

  SELECT count(*)::integer INTO v_rounds
  FROM public.shift_quest_work_sessions w
  JOIN public.shift_quest_members m ON m.id = w.member_id
  WHERE w.started_at >= v_from AND w.started_at < v_to
    AND m.erased_at IS NULL;

  RETURN jsonb_build_object(
    'checked_in', v_checked,
    'approved', v_approved,
    'grew', GREATEST(v_grew, 0),
    'rounds', v_rounds,
    'demo', CASE WHEN v_season.id IS NOT NULL AND v_season.demo_day >= p_day
                 THEN jsonb_build_object('day', v_season.demo_day::text, 'days', v_season.demo_day - p_day) END
  );
END;
$$;

/**
 * The AI section of the card for p_day: {kind, entries}. entries is empty
 * while digest_enabled is off. Otherwise the rule of
 * shift_quest_digest_post_next: on a Bangkok Sunday the week recaps when
 * there are any, else the day's; [{slot, name, summary}] of teams eligible
 * now (shift_quest__digest_eligible: every active member shows the name, has
 * consent and AI consent, staff have not hidden the team) with a stored
 * summary, in plot order. No ids, no people.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__news_ai(p_day date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text := 'day';
  v_entries jsonb;
BEGIN
  IF p_day IS NULL OR NOT COALESCE((public.shift_quest__settings()).digest_enabled, false) THEN
    RETURN jsonb_build_object('kind', 'day', 'entries', '[]'::jsonb);
  END IF;
  FOREACH v_kind IN ARRAY CASE WHEN extract(isodow FROM p_day) = 7 THEN ARRAY['week', 'day'] ELSE ARRAY['day'] END LOOP
    SELECT jsonb_agg(jsonb_build_object('slot', pl.slot, 'name', p.name, 'summary', d.summary) ORDER BY pl.slot)
    INTO v_entries
    FROM public.shift_quest_digests d
    JOIN public.shift_quest_projects p ON p.id = d.project_id
    JOIN public.shift_quest_plots pl ON pl.project_id = p.id
    WHERE d.day = p_day AND d.kind = v_kind AND d.summary IS NOT NULL
      AND public.shift_quest__digest_eligible(d.project_id);
    EXIT WHEN v_entries IS NOT NULL;
  END LOOP;
  RETURN jsonb_build_object(
    'kind', CASE WHEN v_entries IS NULL THEN 'day' ELSE v_kind END,
    'entries', COALESCE(v_entries, '[]'::jsonb)
  );
END;
$$;

/**
 * What shift_quest_news_post_next answers at p_now: null without a news
 * channel or while the day's card is not due; else {day, channel_id,
 * coworking_channel_id, totals, ai}. Takes the time so the tests can pass
 * fixed times.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__news_next(p_now timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_day date := (p_now AT TIME ZONE 'Asia/Bangkok')::date;
BEGIN
  IF p_now IS NULL OR s.news_channel_id IS NULL OR NOT public.shift_quest__news_due(v_day, p_now) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'day', v_day::text,
    'channel_id', s.news_channel_id,
    'coworking_channel_id', s.coworking_channel_id,
    'totals', public.shift_quest__news_totals(v_day),
    'ai', public.shift_quest__news_ai(v_day)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- The nightly card (bot only)
-- ---------------------------------------------------------------------------

/**
 * The card the bot should send now, or null: {day, channel_id,
 * coworking_channel_id, totals, ai} while a news channel is set and today's
 * card is due (shift_quest__news_due). The bot reads it every 5 minutes.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_news_post_next()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.shift_quest__news_next(now());
END;
$$;

/**
 * Claims today's card before the bot sends it: 'new' (claimed now), 'stale'
 * (claimed over 15 minutes ago and never marked: the bot looks for its own
 * message of the day first and marks it, sending only when there is none), or
 * null (posted, claimed by another process in the last 15 minutes, or p_day
 * is not today in Bangkok). On 'new' and 'stale' the totals are frozen.
 * 'sq:bad_input' for a missing day or a channel that is not a snowflake.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_news_claim(p_day date, p_channel text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.shift_quest_news_posts;
BEGIN
  IF p_day IS NULL OR p_channel IS NULL OR p_channel !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_day <> public.shift_quest__bkk_today() THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.shift_quest_news_posts (day, channel_id, claimed_at, totals)
  VALUES (p_day, p_channel, now(), public.shift_quest__news_totals(p_day))
  ON CONFLICT (day) DO NOTHING;
  IF FOUND THEN
    RETURN 'new';
  END IF;
  SELECT * INTO v_row FROM public.shift_quest_news_posts WHERE day = p_day FOR UPDATE;
  IF v_row.message_id IS NOT NULL OR v_row.claimed_at > now() - interval '15 minutes' THEN
    RETURN NULL;
  END IF;
  UPDATE public.shift_quest_news_posts
  SET channel_id = p_channel, claimed_at = now(), totals = public.shift_quest__news_totals(p_day)
  WHERE day = p_day;
  -- A row without a claim time was marked before any claim; never offered as stale.
  RETURN CASE WHEN v_row.claimed_at IS NULL THEN 'new' ELSE 'stale' END;
END;
$$;

/**
 * Records the day's card, compare and set: stored only while no message is
 * recorded for p_day. Returns the message id stored afterwards (a second bot
 * process that posted too gets the first one's id and deletes its own).
 * 'sq:bad_input' for a missing day or a channel or message that is not a
 * snowflake.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_news_mark(p_day date, p_channel text, p_message text)
RETURNS text
LANGUAGE plpgsql
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
  INSERT INTO public.shift_quest_news_posts AS np (day, channel_id, message_id, posted_at)
  VALUES (p_day, p_channel, p_message, now())
  ON CONFLICT (day) DO UPDATE
  SET channel_id = EXCLUDED.channel_id, message_id = EXCLUDED.message_id, posted_at = EXCLUDED.posted_at
  WHERE np.message_id IS NULL;
  SELECT message_id INTO v_id FROM public.shift_quest_news_posts WHERE day = p_day;
  RETURN v_id;
END;
$$;

/**
 * The cards already in Discord from the last 7 Bangkok days, as they should
 * read now: [{day, channel_id, message_id, coworking_channel_id, totals, ai}],
 * newest first. totals are the ones frozen at claim time (computed when the
 * row has none); ai is re-read, so a hidden team, a withdrawn consent, a name
 * no longer shown or the AI switched off takes the team's line out by an
 * edit. The card itself stays.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_news_post_current()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_today date := public.shift_quest__bkk_today();
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'day', np.day::text,
      'channel_id', np.channel_id,
      'message_id', np.message_id,
      'coworking_channel_id', s.coworking_channel_id,
      'totals', COALESCE(np.totals, public.shift_quest__news_totals(np.day)),
      'ai', public.shift_quest__news_ai(np.day)
    ) ORDER BY np.day DESC)
    FROM public.shift_quest_news_posts np
    WHERE np.message_id IS NOT NULL AND np.day > v_today - 7
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- The AI digest goes quiet once the nightly card is on (20261111095000 plus one guard)
-- ---------------------------------------------------------------------------

/**
 * The Discord digest the bot should post now, or null: while the digest is
 * on, a channel is set (the live channel, else the celebrate channel), no
 * news channel is set (then the AI news is part of the nightly card,
 * 20261118130000) and no message is recorded for today (Bangkok). {day, kind,
 * channel_id, entries}: on a Bangkok Sunday the week recaps when there are
 * any, else today's summaries; entries are [{slot, name, summary}] of teams
 * eligible now with a summary. Null when there is nothing to post. No ids,
 * no people.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_post_next()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.shift_quest_settings := public.shift_quest__settings();
  v_today date := public.shift_quest__bkk_today();
  v_channel text := COALESCE(v_settings.live_channel_id, v_settings.celebrate_channel_id);
  v_kind text := 'day';
  v_entries jsonb;
BEGIN
  -- 20261118130000: with a news channel the AI lines go into the nightly card only.
  IF NOT v_settings.digest_enabled OR v_channel IS NULL OR v_settings.news_channel_id IS NOT NULL THEN
    RETURN NULL;
  END IF;
  -- Posted, or a bot process claimed it in the last 15 minutes (it is sending
  -- now). An older claim without a message is a process that stopped between
  -- claim and mark: offered again, and shift_quest_digest_claim says 'stale'
  -- so the bot looks for its own message before sending.
  IF EXISTS (
    SELECT 1 FROM public.shift_quest_digest_posts
    WHERE day = v_today AND (message_id IS NOT NULL OR claimed_at > now() - interval '15 minutes')
  ) THEN
    RETURN NULL;
  END IF;

  FOREACH v_kind IN ARRAY CASE WHEN extract(isodow FROM v_today) = 7 THEN ARRAY['week', 'day'] ELSE ARRAY['day'] END LOOP
    SELECT jsonb_agg(jsonb_build_object('slot', pl.slot, 'name', p.name, 'summary', d.summary) ORDER BY pl.slot)
    INTO v_entries
    FROM public.shift_quest_digests d
    JOIN public.shift_quest_projects p ON p.id = d.project_id
    JOIN public.shift_quest_plots pl ON pl.project_id = p.id
    WHERE d.day = v_today AND d.kind = v_kind AND d.summary IS NOT NULL
      AND public.shift_quest__digest_eligible(d.project_id);
    EXIT WHEN v_entries IS NOT NULL;
  END LOOP;
  IF v_entries IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('day', v_today::text, 'kind', v_kind, 'channel_id', v_channel, 'entries', v_entries);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin (20261111095000 and 20261111094000 plus the news channel)
-- ---------------------------------------------------------------------------

/**
 * /admin island status: consent counts among onboarded, non-erased members
 * (granted, waiting, none = everyone else) and the digest switch, where the
 * AI news goes ('news' while a news channel is set, 20261118130000; else the
 * live or celebrate channel), the last day anything went out, how many teams
 * have an AI summary stored for today, and the hidden teams. Counts only.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_island_status(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_settings public.shift_quest_settings := public.shift_quest__settings();
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'consent', jsonb_build_object(
        'required', v_settings.consent_required,
        'adult_age', v_settings.consent_adult_age,
        'granted', count(*) FILTER (WHERE c.state = 'granted'),
        'waiting', count(*) FILTER (WHERE c.state = 'waiting'),
        'none', count(*) FILTER (WHERE c.state IS NULL OR c.state NOT IN ('granted', 'waiting'))
      ),
      'digest', jsonb_build_object(
        'enabled', v_settings.digest_enabled,
        'channel', CASE WHEN v_settings.news_channel_id IS NOT NULL THEN 'news'
                        WHEN v_settings.live_channel_id IS NOT NULL THEN 'live'
                        WHEN v_settings.celebrate_channel_id IS NOT NULL THEN 'celebrate' END,
        'last_day', GREATEST(
          (SELECT max(day) FROM public.shift_quest_digest_posts WHERE message_id IS NOT NULL),
          (SELECT max(day) FROM public.shift_quest_news_posts WHERE message_id IS NOT NULL)
        )::text,
        'today_summaries', (
          SELECT count(DISTINCT d.project_id)::integer FROM public.shift_quest_digests d
          WHERE d.day = public.shift_quest__bkk_today() AND d.summary IS NOT NULL
        ),
        'hidden', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('slot', pl.slot, 'name', p.name) ORDER BY pl.slot)
          FROM public.shift_quest_digest_hides h
          JOIN public.shift_quest_projects p ON p.id = h.project_id
          JOIN public.shift_quest_plots pl ON pl.project_id = p.id
          WHERE p.archived_at IS NULL
        ), '[]'::jsonb)
      )
    )
    FROM public.shift_quest_members m
    LEFT JOIN public.shift_quest_consents c ON c.member_id = m.id
    WHERE m.onboarded_at IS NOT NULL AND m.erased_at IS NULL
  );
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
    -- live_channel and suggest_channel: 20261111094000_shift_quest_live;
    -- news_channel: 20261118130000_shift_quest_island_news_daily. No outbox
    -- message waits for any of them, so the release below finds nothing.
    WHEN 'help_channel', 'staff_channel', 'celebrate_channel', 'coworking_channel',
         'live_channel', 'suggest_channel', 'news_channel' THEN
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

/** Island schema 19: the nightly island news (18 is 20261118110000_shift_quest_island_visitors). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 19; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- Helpers: no login runs them. Supabase's default privileges grant every new
-- function to anon and authenticated, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION
  public.shift_quest__news_at(date),
  public.shift_quest__news_due(date, timestamptz),
  public.shift_quest__news_totals(date),
  public.shift_quest__news_ai(date),
  public.shift_quest__news_next(timestamptz)
FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION
  public.shift_quest__news_at(date),
  public.shift_quest__news_due(date, timestamptz),
  public.shift_quest__news_totals(date),
  public.shift_quest__news_ai(date),
  public.shift_quest__news_next(timestamptz)
TO service_role;

-- The bot's only.
REVOKE ALL ON FUNCTION
  public.shift_quest_news_post_next(),
  public.shift_quest_news_claim(date, text),
  public.shift_quest_news_mark(date, text, text),
  public.shift_quest_news_post_current()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_news_post_next(),
  public.shift_quest_news_claim(date, text),
  public.shift_quest_news_mark(date, text, text),
  public.shift_quest_news_post_current()
TO service_role, shift_quest_bot;

-- The replaced functions (shift_quest_digest_post_next,
-- shift_quest_admin_island_status, shift_quest_admin_status,
-- shift_quest_admin_set) and the schema version keep the grants they already
-- have: CREATE OR REPLACE leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board): the website never runs any of these.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION
      public.shift_quest__news_at(date),
      public.shift_quest__news_due(date, timestamptz),
      public.shift_quest__news_totals(date),
      public.shift_quest__news_ai(date),
      public.shift_quest__news_next(timestamptz),
      public.shift_quest_news_post_next(),
      public.shift_quest_news_claim(date, text),
      public.shift_quest_news_mark(date, text, text),
      public.shift_quest_news_post_current()
    FROM shift_quest_web;
  END IF;
END;
$$;
