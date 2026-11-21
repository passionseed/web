-- Elemental lessons: elemental_web_lesson_answer (refusals, saving, one badge,
-- the public island, totals check-in, the canvas target, grants).
\ir ../core/helpers.psql
SELECT pg_temp.setup();

-- Fire team: people 1..2, slot 10. Water team: people 3..4, slot 20 (no other activity).
-- Person 5 claimed with no team; person 101 is in the rehearsal edition.
CREATE TEMP TABLE t (name text PRIMARY KEY, id uuid);
INSERT INTO t VALUES
  ('fire', (pg_temp.team('Fire Lessons', 'fire', 1, 2, '{10}') ->> 'team_id')::uuid),
  ('water', (pg_temp.team('Water Lessons', 'water', 3, 4, '{20}') ->> 'team_id')::uuid);
SELECT pg_temp.claimed(5);
SELECT pg_temp.claimed(101, pg_temp.g_dry());

CREATE FUNCTION pg_temp.answer(n integer, p_lesson text, p_part integer, p_answer text, p_final boolean DEFAULT false,
  p_edition text DEFAULT 'elemental-2026')
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.elemental_web_lesson_answer(p_edition, pg_temp.uid(n), p_lesson, p_part, p_answer, p_final);
$$;

-- Refusals: unknown edition, bad or unknown user, no live team, bad lesson, part or answer.
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, 'interviews', 0, 'ok', false, 'no-such-edition')$q$, 'unknown_edition');
SELECT pg_temp.expect_error($q$SELECT public.elemental_web_lesson_answer('elemental-2026', '12345', 'interviews', 0, 'ok', false)$q$, 'bad_user');
SELECT pg_temp.expect_error($q$SELECT public.elemental_web_lesson_answer('elemental-2026', NULL, 'interviews', 0, 'ok', false)$q$, 'bad_user');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(77, 'interviews', 0, 'ok')$q$, 'not_claimed');
-- A rehearsal member is unknown in the real edition.
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(101, 'interviews', 0, 'ok')$q$, 'not_claimed');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(5, 'interviews', 0, 'ok')$q$, 'no_team');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, 'Bad Lesson!', 0, 'ok')$q$, 'bad_lesson');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, '', 0, 'ok')$q$, 'bad_lesson');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, 'interviews', 51, 'ok')$q$, 'bad_part');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, 'interviews', -1, 'ok')$q$, 'bad_part');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, 'interviews', NULL, 'ok')$q$, 'bad_part');
SELECT pg_temp.expect_error(format('SELECT pg_temp.answer(1, %L, 0, %L)', 'interviews', repeat('a', 1001)), 'bad_answer');

-- PII: refused with DETAIL 'answer', and nothing is written.
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, 'interviews', 0, 'line me at 0812345678')$q$, 'pii');
SELECT pg_temp.expect_error($q$SELECT pg_temp.answer(1, 'interviews', 3, 'mail test@example.com', true)$q$, 'pii');
DO $$
BEGIN
  ASSERT pg_temp.error_detail($q$SELECT pg_temp.answer(1, 'interviews', 0, 'ig: @someone_x')$q$) = 'answer', 'pii DETAIL should be the field';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_lesson_progress), 'a refused answer was written';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_badges), 'a refused answer gave a badge';
END $$;

-- Saving parts: one row per member, lesson and part; a re-save replaces the answer.
DO $$
DECLARE
  r jsonb;
  r2 jsonb;
BEGIN
  r := pg_temp.answer(1, ' Interviews ', 0, '  ask what they do first  ');
  ASSERT r ->> 'lesson_id' = 'interviews' AND (r ->> 'part')::integer = 0, 'lesson id trimmed and lowercased: ' || r::text;
  ASSERT NOT (r ->> 'final')::boolean AND r -> 'finished_at' = 'null'::jsonb AND NOT (r ->> 'badge_awarded')::boolean
     AND NOT (r ->> 'first_finish')::boolean, 'a non-final part: ' || r::text;
  ASSERT (r -> 'team' ->> 'team_id')::uuid = (SELECT id FROM t WHERE name = 'fire') AND (r -> 'team' ->> 'slot')::integer = 10
     AND r -> 'team' ->> 'element' = 'fire', 'team from elemental_members: ' || r::text;
  ASSERT r -> 'canvas' = 'null'::jsonb, 'no canvas linked yet: ' || r::text;
  ASSERT r::text !~ '9000000000', 'the result carries a Discord id';
  ASSERT r::text !~ 'ask what they do', 'the result echoes the answer';
  ASSERT (SELECT answer FROM public.elemental_lesson_progress WHERE id = (r ->> 'progress_id')::uuid) = 'ask what they do first',
    'answer trimmed and stored';

  r2 := pg_temp.answer(1, 'interviews', 0, 'listen more');
  ASSERT r2 ->> 'progress_id' = r ->> 'progress_id', 'a re-save keeps the row (same note id)';
  ASSERT (SELECT answer FROM public.elemental_lesson_progress WHERE id = (r ->> 'progress_id')::uuid) = 'listen more', 're-save replaces';
  -- An empty answer (a video-only stop) is saved as NULL.
  r2 := pg_temp.answer(1, 'interviews', 1, '   ');
  ASSERT (SELECT answer FROM public.elemental_lesson_progress WHERE id = (r2 ->> 'progress_id')::uuid) IS NULL, 'blank is NULL';
  ASSERT (SELECT count(*) FROM public.elemental_lesson_progress) = 2, 'two parts saved';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_badges), 'no badge before the final part';
END $$;

-- Finishing twice gives one badge, whoever on the team finishes it.
DO $$
DECLARE
  fire uuid := (SELECT id FROM t WHERE name = 'fire');
  r1 jsonb;
  r2 jsonb;
  r3 jsonb;
  first_at timestamptz;
BEGIN
  r1 := pg_temp.answer(1, 'interviews', 2, 'done', true);
  ASSERT (r1 ->> 'final')::boolean AND (r1 ->> 'first_finish')::boolean AND (r1 ->> 'badge_awarded')::boolean
     AND r1 ->> 'finished_at' IS NOT NULL, 'first finish: ' || r1::text;
  first_at := (r1 ->> 'finished_at')::timestamptz;

  r2 := pg_temp.answer(1, 'interviews', 2, 'done again', true);
  ASSERT NOT (r2 ->> 'first_finish')::boolean AND NOT (r2 ->> 'badge_awarded')::boolean, 'second finish: ' || r2::text;
  ASSERT (r2 ->> 'finished_at')::timestamptz = first_at, 'finished_at kept on a re-finish';
  -- A non-final re-save of the last part does not un-finish it.
  r2 := pg_temp.answer(1, 'interviews', 2, 'edited', false);
  ASSERT (r2 ->> 'final')::boolean AND (r2 ->> 'finished_at')::timestamptz = first_at, 'stays finished: ' || r2::text;

  r3 := pg_temp.answer(2, 'interviews', 2, 'teammate done', true);
  ASSERT (r3 ->> 'first_finish')::boolean AND NOT (r3 ->> 'badge_awarded')::boolean, 'teammate finish: ' || r3::text;

  ASSERT (SELECT count(*) FROM public.elemental_badges WHERE team_id = fire AND kind = 'lesson' AND ref = 'interviews') = 1,
    'one lesson badge per team and lesson';
  ASSERT (SELECT count(*) FROM public.elemental_audit WHERE action = 'lesson_finish') = 2, 'one audit row per member finish';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_audit WHERE action = 'lesson_finish' AND detail::text ~ 'done|edited'),
    'audit holds typed text';

  -- Another lesson is another badge row; the island still shows the kind once.
  PERFORM pg_temp.answer(1, 'prototyping', 0, NULL, true);
  ASSERT (SELECT count(*) FROM public.elemental_badges WHERE team_id = fire AND kind = 'lesson') = 2, 'a badge per lesson';
END $$;

-- The badge shows in elemental_island_public (and the bot's island state).
DO $$
BEGIN
  ASSERT (SELECT badges FROM public.elemental_island_public('elemental-2026') WHERE slot = 10) = ARRAY['lesson'],
    'public island badges: ' || (SELECT badges FROM public.elemental_island_public('elemental-2026') WHERE slot = 10)::text;
  ASSERT (SELECT badges FROM public.elemental_island_public('elemental-2026') WHERE slot = 20) = '{}'::text[], 'water has no badge';
  ASSERT (SELECT badges FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 10) = ARRAY['lesson'], 'bot island';
END $$;

-- A finished lesson checks the team in for that Bangkok day in _totals (water has no other activity).
DO $$
DECLARE
  water uuid := (SELECT id FROM t WHERE name = 'water');
  today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  before integer := (public.elemental_bot_totals('elemental-2026', today) ->> 'checked_in')::integer;
  r jsonb;
BEGIN
  ASSERT before = 1, 'only fire checked in so far: ' || before;
  -- A non-final part is not a check-in.
  PERFORM pg_temp.answer(3, 'interviews', 0, 'first part');
  ASSERT (public.elemental_bot_totals('elemental-2026', today) ->> 'checked_in')::integer = 1, 'a started lesson checked in';
  r := pg_temp.answer(3, 'interviews', 2, 'finished', true);
  ASSERT (public.elemental_bot_totals('elemental-2026', today) ->> 'checked_in')::integer = 2, 'a finished lesson should check in';
  -- Not the day before, and finishing never counts as a helped person.
  ASSERT (public.elemental_bot_totals('elemental-2026', today - 1) ->> 'checked_in')::integer = 0, 'yesterday';
  ASSERT (public.elemental_bot_totals('elemental-2026', today) ->> 'helped')::integer = 0, 'lessons are not tester entries';

  -- On the Bangkok day it was first finished: 23:59 +07 on 4 Dec is 4 Dec, and a re-finish keeps it there.
  UPDATE public.elemental_lesson_progress SET finished_at = '2026-12-04 23:59:00+07' WHERE id = (r ->> 'progress_id')::uuid;
  PERFORM pg_temp.answer(3, 'interviews', 2, 'finished again', true);
  ASSERT (SELECT finished_at FROM public.elemental_lesson_progress WHERE id = (r ->> 'progress_id')::uuid) = '2026-12-04 23:59:00+07',
    're-finish moved finished_at';
  ASSERT (public.elemental_bot_totals('elemental-2026', DATE '2026-12-04') ->> 'checked_in')::integer = 1, '4 Dec check-in';
  ASSERT (public.elemental_bot_totals('elemental-2026', DATE '2026-12-05') ->> 'checked_in')::integer = 0, 'not 5 Dec';
  ASSERT EXISTS (SELECT 1 FROM public.elemental_badges WHERE team_id = water AND kind = 'lesson'), 'water badge';
END $$;

-- Archived team: watch only. The rows stay but stop counting.
DO $$
BEGIN
  PERFORM public.elemental_bot_team_archive(pg_temp.g_real(), pg_temp.staff(), 20);
  PERFORM pg_temp.expect_error($q$SELECT pg_temp.answer(3, 'interviews', 0, 'after archive')$q$, 'no_team');
  ASSERT (public.elemental_bot_totals('elemental-2026', DATE '2026-12-04') ->> 'checked_in')::integer = 0, 'archived team checked in';
END $$;

-- Rehearsal answers stay in the rehearsal edition.
DO $$
DECLARE
  r jsonb;
BEGIN
  PERFORM pg_temp.team('Dry Lessons', 'air', 101, 102, '{30}', pg_temp.g_dry());
  r := pg_temp.answer(101, 'interviews', 2, 'dry run', true, 'elemental-dryrun');
  ASSERT (r ->> 'badge_awarded')::boolean, 'rehearsal badge';
  ASSERT (SELECT edition FROM public.elemental_lesson_progress WHERE id = (r ->> 'progress_id')::uuid) = 'elemental-dryrun', 'edition';
  ASSERT (SELECT badges FROM public.elemental_island_public('elemental-dryrun') WHERE slot = 30) = ARRAY['lesson'], 'dry island';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_island_public('elemental-2026') WHERE slot = 30), 'leaked into the real island';
END $$;

-- The canvas target: the team's linked project canvas, with the board owner for updatedBy.
-- elemental_canvas_links comes from 20261123100100 (E11); a stand-in with its
-- documented columns is made only where that file has not run.
DO $$
BEGIN
  IF to_regclass('public.elemental_canvas_links') IS NULL THEN
    CREATE TABLE public.elemental_canvas_links (
      team_id uuid PRIMARY KEY REFERENCES public.elemental_teams (id) ON DELETE CASCADE,
      board_id uuid NOT NULL REFERENCES public.whiteboards (id) ON DELETE CASCADE,
      frame_id text NOT NULL UNIQUE);
  END IF;
END $$;
INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-0000000000e1');
INSERT INTO public.whiteboards (id, owner_id, title)
VALUES ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000e1', 'Fire board');
INSERT INTO public.elemental_canvas_links (team_id, board_id, frame_id)
SELECT id, '00000000-0000-4000-8000-0000000000b1', 'frame-fire-1' FROM t WHERE name = 'fire';
DO $$
DECLARE
  r jsonb := pg_temp.answer(1, 'interviews', 1, 'try it on a friend');
BEGIN
  ASSERT r -> 'canvas' = jsonb_build_object(
    'board_id', '00000000-0000-4000-8000-0000000000b1',
    'frame_id', 'frame-fire-1',
    'owner_id', '00000000-0000-4000-8000-0000000000e1'), 'canvas target: ' || r::text;
END $$;

-- Grants: service_role only. Not the bot, anon or authenticated.
DO $$
DECLARE
  f regprocedure := 'public.elemental_web_lesson_answer(text,text,text,integer,text,boolean)'::regprocedure;
BEGIN
  ASSERT has_function_privilege('service_role', f, 'EXECUTE'), 'service_role cannot execute';
  ASSERT NOT has_function_privilege('elemental_bot', f, 'EXECUTE'), 'elemental_bot can execute';
  ASSERT NOT has_function_privilege('anon', f, 'EXECUTE'), 'anon can execute';
  ASSERT NOT has_function_privilege('authenticated', f, 'EXECUTE'), 'authenticated can execute';
  ASSERT (SELECT prosecdef FROM pg_proc WHERE oid = f), 'not SECURITY DEFINER';
  -- E16's expected count is unchanged: this file adds no elemental_bot_* function.
  ASSERT NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE 'elemental\_bot\_%'
                     AND prosrc LIKE '%elemental_lesson_progress%' AND proname <> 'elemental_bot_totals'), 'a bot lesson function';
END $$;

SET ROLE service_role;
DO $$
BEGIN
  ASSERT (public.elemental_web_lesson_answer('elemental-2026', '900000000000000002', 'interviews', 0, 'as service role', false)
          ->> 'part')::integer = 0, 'service_role call failed';
END $$;
RESET ROLE;

SET ROLE elemental_bot;
DO $$
BEGIN
  PERFORM public.elemental_web_lesson_answer('elemental-2026', '900000000000000001', 'interviews', 0, 'x', false);
  RAISE EXCEPTION 'elemental_bot ran elemental_web_lesson_answer';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;
