-- Elemental core: totals on Bangkok days, island state, archive, public island, purge, reset, dry-run cleanup.
\ir helpers.psql
SELECT pg_temp.setup();

CREATE TEMP TABLE t (name text PRIMARY KEY, id uuid);
INSERT INTO t VALUES
  ('fire1', (pg_temp.team('Fire One', 'fire', 1, 2, '{10}') ->> 'team_id')::uuid),
  ('fire2', (pg_temp.team('Fire Two', 'fire', 3, 4, '{11}') ->> 'team_id')::uuid),
  ('water1', (pg_temp.team('Water One', 'water', 5, 6, '{20}') ->> 'team_id')::uuid),
  ('air1', (pg_temp.team('Air One', 'air', 7, 8, '{30}') ->> 'team_id')::uuid),
  ('dry1', (pg_temp.team('Dry One', 'fire', 101, 102, '{10}', pg_temp.g_dry()) ->> 'team_id')::uuid);

-- Tester entries written as E11's functions will write them (counted, created_at), at chosen instants.
CREATE FUNCTION pg_temp.entry(p_team text, p_at timestamptz, p_counted boolean DEFAULT true) RETURNS uuid LANGUAGE sql AS $$
  INSERT INTO public.elemental_tester_entries (edition, team_id, logger_discord_id, who, tried, quote, changed, counted, created_at)
  SELECT tt.edition, tt.id, pg_temp.uid(1), 'a neighbour', 'the map', 'easy to read', 'bigger text', p_counted, p_at
  FROM public.elemental_teams tt WHERE tt.id = (SELECT id FROM t WHERE name = p_team)
  RETURNING id;
$$;

SELECT pg_temp.entry('fire1', '2026-12-04 10:00:00+07');
SELECT pg_temp.entry('fire1', '2026-12-04 23:59:00+07');   -- last minute of 4 Dec
SELECT pg_temp.entry('water1', '2026-12-04 20:00:00+07');
SELECT pg_temp.entry('water1', '2026-12-04 21:00:00+07');
SELECT pg_temp.entry('fire2', '2026-12-05 00:01:00+07');   -- first minute of 5 Dec
SELECT pg_temp.entry('air1', '2026-12-05 09:00:00+07', false); -- over the cap: checks in, does not count
SELECT pg_temp.entry('dry1', '2026-12-04 12:00:00+07');    -- another edition
UPDATE public.elemental_teams SET lit_at = '2026-12-04 10:00:00+07' WHERE id IN (SELECT id FROM t WHERE name IN ('fire1', 'water1', 'fire2'));
INSERT INTO public.elemental_checkins (edition, team_id, day, discord_user_id)
SELECT 'elemental-2026', id, DATE '2026-12-04', pg_temp.uid(7) FROM t WHERE name = 'air1';
INSERT INTO public.elemental_lesson_progress (edition, team_id, lesson_id, part, final, finished_at)
SELECT 'elemental-2026', id, 'interviews', 3, true, '2026-12-05 23:59:30+07' FROM t WHERE name = 'water1';

DO $$
DECLARE
  d4 jsonb := public.elemental_bot_totals('elemental-2026', DATE '2026-12-04');
  d5 jsonb := public.elemental_bot_totals('elemental-2026', DATE '2026-12-05');
  d3 jsonb := public.elemental_bot_totals('elemental-2026', DATE '2026-12-03');
BEGIN
  -- 4 Dec (+07): fire1 x2 (incl. 23:59), water1 x2; fire2's 00:01 belongs to 5 Dec.
  ASSERT (d4 ->> 'helped')::integer = 4 AND (d4 ->> 'helped_today')::integer = 4, 'helped on 4 Dec: ' || d4::text;
  ASSERT d4 -> 'levels' = '{"water": 2, "earth": 0, "air": 0, "fire": 2, "aether": 0}'::jsonb, 'levels 4 Dec: ' || (d4 -> 'levels')::text;
  ASSERT d4 -> 'deltas' = '{"water": 2, "earth": 0, "air": 0, "fire": 2, "aether": 0}'::jsonb, 'deltas 4 Dec';
  -- A tie (2 and 2) goes to the first element in the fixed order: water before fire.
  ASSERT d4 ->> 'top_element' = 'water', 'tie should break by fixed order: ' || (d4 ->> 'top_element');
  -- Checked in on 4 Dec: fire1, water1 (entries) and air1 (/checkin). Not the other edition's team.
  ASSERT (d4 ->> 'checked_in')::integer = 3, 'checked in 4 Dec: ' || d4::text;
  ASSERT d4 -> 'teams' = '{"water": 1, "earth": 0, "air": 1, "fire": 2, "aether": 0}'::jsonb AND (d4 ->> 'teams_total')::integer = 4,
    'teams: ' || d4::text;

  -- 5 Dec: one more counted (fire2 at 00:01); air1's uncounted entry checks it in; water1's lesson at 23:59:30.
  ASSERT (d5 ->> 'helped')::integer = 5 AND (d5 ->> 'helped_today')::integer = 1, 'helped on 5 Dec: ' || d5::text;
  ASSERT d5 ->> 'top_element' = 'fire', 'top 5 Dec';
  ASSERT (d5 ->> 'checked_in')::integer = 3, 'checked in 5 Dec (fire2, air1, water1 lesson): ' || d5::text;

  ASSERT (d3 ->> 'helped')::integer = 0 AND d3 -> 'top_element' = 'null'::jsonb AND (d3 ->> 'checked_in')::integer = 0, 'before: ' || d3::text;
  ASSERT (public.elemental_bot_totals('elemental-dryrun', DATE '2026-12-04') ->> 'helped')::integer = 1, 'rehearsal totals are separate';
  -- No Discord ids in totals.
  ASSERT public.elemental_bot_totals('elemental-2026', DATE '2026-12-05')::text !~ '9000000000', 'totals carry a Discord id';
  PERFORM pg_temp.expect_error($q$SELECT public.elemental_bot_totals('no-such-edition', DATE '2026-12-04')$q$, 'unknown_edition');
END $$;

-- Today's Bangkok day is the default, decided in Asia/Bangkok, not UTC.
DO $$
BEGIN
  ASSERT (public.elemental_bot_totals('elemental-2026') ->> 'day')::date = (now() AT TIME ZONE 'Asia/Bangkok')::date, 'default day';
END $$;

-- Island state: live teams with counts, lit and badges; no Discord ids.
DO $$
DECLARE
  fire1 uuid := (SELECT id FROM t WHERE name = 'fire1');
BEGIN
  PERFORM public.elemental_bot_award_badge(pg_temp.g_real(), fire1, 'lesson', 'interviews');
  PERFORM public.elemental_bot_award_badge(pg_temp.g_real(), fire1, 'powerup', '1');
  ASSERT (SELECT count(*) FROM public.elemental_bot_island_state('elemental-2026')) = 4, 'four live teams';
  ASSERT (SELECT counted FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 10) = 2, 'fire1 counted';
  ASSERT (SELECT lit FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 10), 'fire1 lit';
  ASSERT (SELECT badges FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 10) = ARRAY['lesson', 'powerup'], 'badges';
  ASSERT (SELECT counted FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 30) = 0, 'air1 has no counted entry';
  ASSERT (SELECT count(*) FROM public.elemental_bot_island_state('elemental-dryrun')) = 1, 'rehearsal island';
  ASSERT (SELECT count(*) FROM public.elemental_island_public('elemental-2026')) = 4, 'public island rows';
END $$;

-- The public island's columns: nothing about people except the project name.
DO $$
DECLARE
  cols text[];
BEGIN
  SELECT array_agg(name) INTO cols
  FROM pg_proc p, unnest(p.proargnames, p.proargmodes) AS a(name, mode)
  WHERE p.oid = 'public.elemental_island_public(text)'::regprocedure AND a.mode = 't';
  ASSERT cols = ARRAY['slot', 'element', 'project_name', 'counted', 'lit', 'badges'], 'public columns: ' || cols::text;
  ASSERT NOT EXISTS (SELECT 1 FROM unnest(cols) c WHERE c ~* 'discord|registration|member|name' AND c <> 'project_name'),
    'a public column names a person';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_proc p, unnest(p.proargnames, p.proargmodes) AS a(name, mode)
                     WHERE p.proname = 'elemental_bot_island_state' AND a.mode = 't'
                       AND a.name ~* 'discord|registration|member|name' AND a.name <> 'project_name'),
    'the bot island state names a person';
END $$;

-- Archive un-counts and un-lights: totals and the island drop the team.
DO $$
DECLARE
  fire1 uuid := (SELECT id FROM t WHERE name = 'fire1');
  d4 jsonb;
BEGIN
  PERFORM public.elemental_bot_team_archive(pg_temp.g_real(), pg_temp.staff(), 10);
  ASSERT (SELECT lit_at FROM public.elemental_teams WHERE id = fire1) IS NULL, 'archive should clear lit_at';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_tester_entries WHERE team_id = fire1 AND counted), 'archive should un-count';
  d4 := public.elemental_bot_totals('elemental-2026', DATE '2026-12-04');
  ASSERT (d4 ->> 'helped')::integer = 2 AND d4 -> 'levels' ->> 'fire' = '0', 'totals after archive: ' || d4::text;
  ASSERT (d4 ->> 'checked_in')::integer = 2 AND d4 ->> 'top_element' = 'water', 'checked in after archive: ' || d4::text;
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 10), 'archived team on the island';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_award_badge(%L, %L, %L)', pg_temp.g_real(), fire1, 'lesson'), 'team_not_found');
END $$;

-- Reset refuses the real edition; dry-run cleanup refuses the real guild and leaves elemental-2026 alone.
SELECT pg_temp.expect_error($q$SELECT public.elemental_reset_edition('elemental-2026', 'reset elemental-2026')$q$, 'not_rehearsal');
SELECT pg_temp.expect_error($q$SELECT public.elemental_reset_edition('elemental-dryrun', 'yes')$q$, 'bad_confirm');
SELECT pg_temp.expect_error(format('SELECT public.elemental_bot_dryrun_cleanup(%L, %L, %L)', pg_temp.g_real(), pg_temp.staff(), 'elemental-2026'), 'not_rehearsal');
SELECT pg_temp.expect_error(format('SELECT public.elemental_bot_dryrun_cleanup(%L, %L, %L)', pg_temp.g_dry(), pg_temp.staff(), 'yes'), 'bad_confirm');
CREATE TEMP TABLE real_before AS
  SELECT (SELECT md5(string_agg(x::text, ',' ORDER BY x.id)) FROM public.elemental_teams x WHERE edition = 'elemental-2026') AS teams,
         (SELECT md5(string_agg(x::text, ',' ORDER BY x.id)) FROM public.elemental_members x WHERE edition = 'elemental-2026') AS members,
         (SELECT md5(string_agg(x::text, ',' ORDER BY x.id)) FROM public.elemental_tester_entries x WHERE edition = 'elemental-2026') AS entries;
DO $$
DECLARE
  r jsonb;
BEGIN
  PERFORM pg_temp.entry('dry1', now());
  r := public.elemental_bot_dryrun_cleanup(pg_temp.g_dry(), pg_temp.staff(), 'elemental-dryrun');
  ASSERT jsonb_array_length(r -> 'teams') = 1 AND (r -> 'teams' -> 0 ->> 'slot')::integer = 10, 'cleanup: ' || r::text;
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_teams WHERE edition = 'elemental-dryrun' AND status <> 'archived'), 'dry teams left';
  ASSERT (SELECT count(*) FROM public.elemental_bot_island_state('elemental-dryrun')) = 0, 'dry island not empty';
  -- Slots are free for the next rehearsal round.
  r := pg_temp.team('Dry Two', 'fire', 101, 102, '{10}', pg_temp.g_dry());
  ASSERT (r ->> 'slot')::integer = 10, 'rehearsal slot not freed: ' || r::text;
  ASSERT (SELECT teams FROM real_before) = (SELECT md5(string_agg(x::text, ',' ORDER BY x.id)) FROM public.elemental_teams x WHERE edition = 'elemental-2026')
     AND (SELECT members FROM real_before) = (SELECT md5(string_agg(x::text, ',' ORDER BY x.id)) FROM public.elemental_members x WHERE edition = 'elemental-2026')
     AND (SELECT entries FROM real_before) = (SELECT md5(string_agg(x::text, ',' ORDER BY x.id)) FROM public.elemental_tester_entries x WHERE edition = 'elemental-2026'),
    'dry-run cleanup touched the real edition';

  r := public.elemental_reset_edition('elemental-dryrun', 'reset elemental-dryrun');
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_members WHERE edition = 'elemental-dryrun'), 'reset left members';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_teams WHERE edition = 'elemental-dryrun'), 'reset left teams';
  ASSERT EXISTS (SELECT 1 FROM public.elemental_settings WHERE edition = 'elemental-dryrun'), 'reset removed settings';
  ASSERT (SELECT teams FROM real_before) = (SELECT md5(string_agg(x::text, ',' ORDER BY x.id)) FROM public.elemental_teams x WHERE edition = 'elemental-2026'),
    'reset touched the real edition';
END $$;

-- Purge: refused before the retention date; afterwards no Discord id or free text is left, totals stay.
DO $$
BEGIN
  PERFORM public.elemental_bot_report_add(pg_temp.g_real(), pg_temp.uid(9), 'someone was unkind in voice', 'campfire');
  PERFORM public.elemental_bot_team_set_channel(pg_temp.g_real(), (SELECT id FROM t WHERE name = 'water1'), pg_temp.chan(20));
  UPDATE public.elemental_lesson_progress SET answer = 'we asked three shop owners';
  PERFORM pg_temp.expect_error($q$SELECT public.elemental_purge_edition('elemental-2026', 'purge elemental-2026')$q$, 'retention_not_reached');
  UPDATE public.elemental_settings SET retention_until = now() + interval '1 day' WHERE edition = 'elemental-2026';
  PERFORM pg_temp.expect_error($q$SELECT public.elemental_purge_edition('elemental-2026', 'purge elemental-2026')$q$, 'retention_not_reached');
  UPDATE public.elemental_settings SET retention_until = now() - interval '1 day' WHERE edition = 'elemental-2026';
  PERFORM pg_temp.expect_error($q$SELECT public.elemental_purge_edition('elemental-2026', 'elemental-2026')$q$, 'bad_confirm');
END $$;

CREATE TEMP TABLE totals_before AS
  SELECT public.elemental_bot_totals('elemental-2026', DATE '2026-12-04') AS d4,
         public.elemental_bot_totals('elemental-2026', DATE '2026-12-05') AS d5,
         (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.slot) FROM public.elemental_island_public('elemental-2026') i) AS island;
SELECT public.elemental_purge_edition('elemental-2026', 'purge elemental-2026');

DO $$
DECLARE
  leftover text;
BEGIN
  ASSERT (SELECT d4 FROM totals_before) = public.elemental_bot_totals('elemental-2026', DATE '2026-12-04'), 'purge changed 4 Dec totals';
  ASSERT (SELECT d5 FROM totals_before) = public.elemental_bot_totals('elemental-2026', DATE '2026-12-05'), 'purge changed 5 Dec totals';
  ASSERT (SELECT island FROM totals_before) = (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.slot) FROM public.elemental_island_public('elemental-2026') i),
    'purge changed the public island';
  ASSERT (SELECT count(*) FROM public.elemental_members WHERE edition = 'elemental-2026') = 8, 'purge should keep member rows (counts)';
  -- Any value shaped like a Discord id, anywhere in the edition's rows, is gone.
  SELECT string_agg(src, ', ') INTO leftover FROM (
    SELECT 'members' AS src FROM public.elemental_members WHERE edition = 'elemental-2026' AND to_jsonb(elemental_members)::text ~ '"[0-9]{17,20}"'
    UNION ALL SELECT 'teams' FROM public.elemental_teams WHERE edition = 'elemental-2026' AND to_jsonb(elemental_teams)::text ~ '"[0-9]{17,20}"'
    UNION ALL SELECT 'invites' FROM public.elemental_team_invites i JOIN public.elemental_teams x ON x.id = i.team_id
      WHERE x.edition = 'elemental-2026' AND i.discord_user_id IS NOT NULL
    UNION ALL SELECT 'entries' FROM public.elemental_tester_entries WHERE edition = 'elemental-2026' AND to_jsonb(elemental_tester_entries)::text ~ '"[0-9]{17,20}"'
    UNION ALL SELECT 'checkins' FROM public.elemental_checkins WHERE edition = 'elemental-2026' AND discord_user_id IS NOT NULL
    UNION ALL SELECT 'audit' FROM public.elemental_audit WHERE edition = 'elemental-2026' AND to_jsonb(elemental_audit)::text ~ '"[0-9]{17,20}"'
    UNION ALL SELECT 'badges' FROM public.elemental_badges WHERE edition = 'elemental-2026' AND awarded_by IS NOT NULL
  ) x;
  ASSERT leftover IS NULL, 'Discord ids left after purge in: ' || leftover;
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_tester_entries WHERE edition = 'elemental-2026'
                     AND (who IS NOT NULL OR tried IS NOT NULL OR quote IS NOT NULL OR changed IS NOT NULL OR removed_reason IS NOT NULL)),
    'tester free text left';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_lesson_progress WHERE edition = 'elemental-2026' AND answer IS NOT NULL), 'lesson answers left';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_reports WHERE edition = 'elemental-2026'), 'reports left';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_claims WHERE edition = 'elemental-2026'), 'codes left';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_members WHERE edition = 'elemental-2026' AND registration_member_id IS NOT NULL), 'member links left';
  ASSERT (SELECT purged_at FROM public.elemental_editions WHERE key = 'elemental-2026') IS NOT NULL, 'purged_at';
  ASSERT (SELECT count(*) FROM public.elemental_teams WHERE edition = 'elemental-2026' AND project_name IS NOT NULL) = 4, 'projects kept';
END $$;
