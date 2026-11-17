-- SHIFT High Island on the web: who stopped by today, as figures in the plaza.
--
-- Plan: docs/designs/shift-island-plaza-visitors.md. The island draws one
-- small figure in the plaza for each person who has checked in today (the
-- Bangkok day), like the campfire's seats. The figures carry no name, no team
-- and no plot; only the caller's own team is told how many of its members
-- came, and the caller's own figure is drawn from data the page already has.
-- This file adds:
--
--   * shift_quest_island_visitors(actor): {count, team}. count is how many
--     members have a check-in (a 'tap' in shift_quest_progress, at most one
--     per member per Bangkok day, 20261111090000) on today's Bangkok date,
--     the caller included. team is how many of the caller's active teammates
--     on their current project did, the caller left out; 0 without a project.
--     Two integers only: never a member id, a name, a project or a time. Same
--     gate as shift_quest_campfire: a null or unknown actor, or one who has
--     not finished /start and holds no role, is 'sq:not_started'. Erased
--     members are not counted. STABLE: it writes nothing and audits nothing.
--   * shift_quest_progress_tap_day: a partial index on the Bangkok date of
--     taps, so the island-wide count reads one day's rows, not every tap.
--   * shift_quest_schema_version() = 18. 16 is taken by
--     20261118090000_shift_quest_tree_grew_post (pull request #324, applied)
--     and 17 by 20261118100000_shift_quest_web_everything (pull request
--     #321): apply those first, or together in timestamp order, so the
--     version only ever goes up. If a file that says 17 were applied after
--     this one, the website would hide the figures until the version said 18
--     again (it fails soft, never breaks). The website reads the visitors only from 18
--     (VISITORS_SCHEMA in lib/shift-island/visitors.ts) and still needs 6;
--     the bot never calls this function.
--
-- Grants: the website's only (never the bot's). Mirrored in
-- supabase/tests/shift_quests/run-local.sh (web_allow and web_only),
-- web_board.ts, web_canvas.ts and db_rules.ts.
--
-- Prod-first apply: additive and idempotent (CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE, grants re-asserted). Nothing here touches the bot's
-- picture, the map or any existing function's result.

-- One Bangkok day's taps, without reading every member's history.
CREATE INDEX IF NOT EXISTS shift_quest_progress_tap_day
  ON public.shift_quest_progress (((created_at AT TIME ZONE 'Asia/Bangkok')::date))
  WHERE kind = 'tap';

/**
 * The plaza's visitors today: count, how many members checked in on today's
 * Bangkok date (the caller included), and team, how many of the caller's
 * active teammates on their current project did (the caller left out; 0
 * without a project). Integers only, nothing that names or places a person.
 * Same gate as shift_quest_campfire.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island_visitors(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_today date := public.shift_quest__bkk_today();
  v_project uuid;
  v_count integer := 0;
  v_team integer := 0;
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;

  SELECT count(DISTINCT p.member_id)::integer INTO v_count
  FROM public.shift_quest_progress p
  JOIN public.shift_quest_members m ON m.id = p.member_id
  WHERE p.kind = 'tap'
    AND (p.created_at AT TIME ZONE 'Asia/Bangkok')::date = v_today
    AND m.erased_at IS NULL;

  v_project := public.shift_quest__current_project(v_member);
  IF v_project IS NOT NULL THEN
    SELECT count(DISTINCT p.member_id)::integer INTO v_team
    FROM public.shift_quest_progress p
    JOIN public.shift_quest_project_members pm
      ON pm.member_id = p.member_id AND pm.project_id = v_project AND pm.status = 'active'
    JOIN public.shift_quest_members m ON m.id = p.member_id
    WHERE p.kind = 'tap'
      AND (p.created_at AT TIME ZONE 'Asia/Bangkok')::date = v_today
      AND p.member_id <> v_member.id
      AND m.erased_at IS NULL;
  END IF;

  RETURN jsonb_build_object('count', v_count, 'team', v_team);
END;
$$;

/** Island schema 18: the plaza's visitors (16 is 20261118090000_shift_quest_tree_grew_post, 17 is 20261118100000_shift_quest_web_everything). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 18; $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

-- The website's only. Supabase's default privileges grant every new function
-- to anon and authenticated, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION public.shift_quest_island_visitors(text)
  FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_island_visitors(text) TO service_role;

-- The schema version keeps the grants it already has: CREATE OR REPLACE
-- leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    GRANT EXECUTE ON FUNCTION public.shift_quest_island_visitors(text) TO shift_quest_web;
  END IF;
END;
$$;
