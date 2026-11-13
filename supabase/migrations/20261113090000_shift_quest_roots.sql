-- SHIFT High Island: roots. Reflections grow a tree's roots.
--
-- Design: docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md,
-- goal 2 "Roots" (approach A). A tree's 7 stages still come only from
-- mentor-confirmed milestones, and the shop's gates stay on stage: roots are a
-- second visible layer drawn at the tree's base and change nothing else (no
-- coin, no stage, no gate). This file adds:
--
--   * The read shift_quest_island_roots(): a jsonb array of {slot, roots} for
--     every drawn plot (a project that is not archived) whose roots level is
--     above 0, by slot. roots is a level only: 1 (1 to 4 counted
--     reflections), 2 (5 to 14) or 3 (15 or more). Never a name, a member id,
--     a count or any journal text.
--   * What counts: a journal note (shift_quest_progress, kind 'note') whose
--     learned text has at least 10 characters (the journal trims it on write),
--     written for this project (its project_id: the writer's current project
--     when they wrote it) by someone who is an active member of it now. At most
--     3 count per member per Bangkok day (Asia/Bangkok date of created_at); the
--     earliest 3 of the day are the ones counted. A member who leaves takes
--     their reflections with them; an erased member's journal is already gone.
--     Private and team notes count the same way: only the level ever leaves.
--   * Roots follow the outsider rule of the stage: only plots every active
--     member agreed to show (shift_quest__name_visible, with consent from
--     20261111095000) have roots here, so a quiet project's writing is never
--     measured in public. The bot and the website draw roots 0 for every plain
--     plot too (bot/src/quests/island/scene.ts), whatever they are sent.
--   * shift_quest_schema_version() = 10. The website still needs 6 and the bot
--     2: both read roots only from 10 (ROOTS_SCHEMA in
--     bot/src/quests/island/roots.ts) and draw none below it or when the read
--     fails.
--
-- Grants are per function in this file, with no grant loop: the roots read is
-- the bot's (the live post and /island) and the website's (the island page
-- and its picture). Any later web allowlist must list
-- public.shift_quest_island_roots().
--
-- This file never references the whiteboard tables or auth.users: the quest
-- sandbox (bot/quests-sandbox.sh, run-local.sh) has neither.
--
-- Prod-first apply: additive and idempotent (CREATE OR REPLACE only, no table
-- or column changes; replaced functions keep their grants). Keep this file
-- after 20261111095000_shift_quest_player: it uses that file's
-- shift_quest__name_visible (consent) and raises its schema version.

-- ---------------------------------------------------------------------------
-- The roots read (bot and website)
-- ---------------------------------------------------------------------------

/**
 * Roots of every shown tree: [{slot, roots}] by slot, only where roots > 0.
 * No caller: the answer is the outsider view, the same for everyone (the live
 * post, /island and the island page all see it). See the header for what
 * counts; the per-day cap is applied per member and project, ordered by
 * created_at then id so the same journal always gives the same level.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island_roots()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shown AS (
    SELECT pl.slot, pl.project_id
    FROM public.shift_quest_plots pl
    JOIN public.shift_quest_projects p ON p.id = pl.project_id
    WHERE p.archived_at IS NULL
      AND public.shift_quest__name_visible(pl.project_id)
  ),
  notes AS (
    SELECT s.slot,
           row_number() OVER (
             PARTITION BY e.project_id, e.member_id, (e.created_at AT TIME ZONE 'Asia/Bangkok')::date
             ORDER BY e.created_at, e.id
           ) AS nth
    FROM shown s
    JOIN public.shift_quest_project_members pm
      ON pm.project_id = s.project_id AND pm.status = 'active'
    JOIN public.shift_quest_progress e
      ON e.project_id = s.project_id AND e.member_id = pm.member_id
    WHERE e.kind = 'note'
      AND char_length(COALESCE(e.learned, '')) >= 10
  ),
  counted AS (
    SELECT slot, count(*) AS n
    FROM notes
    WHERE nth <= 3
    GROUP BY slot
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('slot', slot, 'roots', CASE WHEN n >= 15 THEN 3 WHEN n >= 5 THEN 2 ELSE 1 END)
      ORDER BY slot
    ),
    '[]'::jsonb
  )
  FROM counted
  WHERE n >= 1;
$$;

/** Island schema 10: roots (reflections grow a tree's roots). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 10;
$$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- The roots read: the bot's and the website's. Supabase's default privileges
-- grant every new function to anon and authenticated, and Postgres to PUBLIC:
-- take those back.
REVOKE ALL ON FUNCTION public.shift_quest_island_roots() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_island_roots() TO service_role, shift_quest_bot;

-- The schema version keeps the grants it already has: CREATE OR REPLACE
-- leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board). Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges), web_board.ts,
-- web_canvas.ts and roots.ts.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    GRANT EXECUTE ON FUNCTION public.shift_quest_island_roots() TO shift_quest_web;
  END IF;
END;
$$;
