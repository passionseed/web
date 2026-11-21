-- Elemental /tester entries: add (cap, lantern, repeats), contacts refused in
-- every field, edit (logger, 10 minutes), remove, review, sample, the staff
-- add, and the hand-in link (allowlisted hosts, late after 23:00 Bangkok).
-- Two concurrent firsts lighting the lantern once: canvas.int.test.ts.
\ir helpers.psql
SELECT pg_temp.world();

-- ---------------------------------------------------------------------------
-- Add: the first counted entry lights the lantern, once.
DO $$
DECLARE
  g text := pg_temp.g_real();
  r jsonb;
  v_lit timestamptz;
BEGIN
  ASSERT (SELECT lit_at FROM public.elemental_teams WHERE slot = 12 AND edition = 'elemental-2026') IS NULL, 'lit before any entry';
  r := pg_temp.tester(1, 1, 'a parent at the market', 'the map on a phone');
  ASSERT (r ->> 'counted')::boolean AND (r ->> 'first_counted')::boolean AND (r ->> 'team_total')::integer = 1
     AND (r ->> 'edition_total')::integer = 1 AND (r ->> 'cap')::integer = 10 AND (r ->> 'slot')::integer = 12
     AND NOT (r ->> 'repeated')::boolean AND r ->> 'canvas_status' = 'none' AND NOT (r ->> 'canvas_linked')::boolean,
    'first entry: ' || r::text;
  ASSERT NOT r ? 'logger_discord_id' AND position(pg_temp.uid(1) IN r::text) = 0, 'the reply names the logger';
  v_lit := (SELECT lit_at FROM public.elemental_teams WHERE slot = 12 AND edition = 'elemental-2026');
  ASSERT v_lit IS NOT NULL, 'not lit';
  ASSERT (SELECT lit FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 12), 'island not lit';

  r := pg_temp.tester(2, 1, 'a shop owner', 'the paper map');
  ASSERT (r ->> 'counted')::boolean AND NOT (r ->> 'first_counted')::boolean AND (r ->> 'team_total')::integer = 2, 'second: ' || r::text;
  ASSERT (SELECT lit_at FROM public.elemental_teams WHERE slot = 12 AND edition = 'elemental-2026') = v_lit, 'lit_at moved';

  -- The same entry again within 2 minutes (a retried call) is the first one.
  r := pg_temp.tester(2, 1, '  a shop   owner ', 'the paper map');
  ASSERT (r ->> 'repeated')::boolean AND (r ->> 'team_total')::integer = 2, 'repeat: ' || r::text;
  ASSERT (SELECT count(*) FROM public.elemental_tester_entries WHERE logger_discord_id = pg_temp.uid(2)) = 1, 'repeat stored twice';
  -- Another team's entry counts for the edition, not for this team.
  r := pg_temp.tester(3, 2, 'a teacher', 'the quiz');
  ASSERT (r ->> 'first_counted')::boolean AND (r ->> 'team_total')::integer = 1 AND (r ->> 'edition_total')::integer = 3, 'other team: ' || r::text;
  ASSERT (public.elemental_bot_totals('elemental-2026') ->> 'helped')::integer = 3, 'totals helped';
END $$;

-- ---------------------------------------------------------------------------
-- Who may log, and what a field may hold.
DO $$
DECLARE
  g text := pg_temp.g_real();
  f text;
  bad jsonb;
BEGIN
  -- Person 3 is on Spark Line, not on Ember Watch; person 40 never joined; channel 99 is no team's.
  PERFORM pg_temp.expect_error('SELECT pg_temp.tester(3, 1)', 'not_team_member');
  PERFORM pg_temp.expect_error('SELECT pg_temp.tester(40, 1)', 'not_team_member');
  PERFORM pg_temp.expect_error('SELECT pg_temp.tester(1, 99)', 'not_team_channel');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_add(%L, %L, %L, %L, %L)', g, pg_temp.chan(1), '12', 'a', 'b'), 'bad_user');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_add(%L, %L, %L, %L, %L)', '800000000000000077', pg_temp.chan(1), pg_temp.uid(1), 'a', 'b'), 'unknown_guild');
  -- The rehearsal guild cannot log into a real team's channel.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_add(%L, %L, %L, %L, %L)', pg_temp.g_dry(), pg_temp.chan(1), pg_temp.uid(1), 'a', 'b'), 'not_team_channel');

  -- Required fields and lengths, each naming its field.
  PERFORM pg_temp.expect_error('SELECT pg_temp.tester(1, 1, ''   '', ''x'')', 'missing_field');
  ASSERT pg_temp.error_detail('SELECT pg_temp.tester(1, 1, ''   '', ''x'')') = 'who', 'missing who';
  ASSERT pg_temp.error_detail('SELECT pg_temp.tester(1, 1, ''x'', NULL)') = 'tried', 'missing tried';
  ASSERT pg_temp.error_detail(format('SELECT pg_temp.tester(1, 1, %L, ''x'')', repeat('a', 81))) = 'who', 'who too long';
  PERFORM pg_temp.expect_error(format('SELECT pg_temp.tester(1, 1, %L, ''x'')', repeat('a', 81)), 'too_long');
  ASSERT pg_temp.error_detail(format('SELECT pg_temp.tester(1, 1, ''x'', %L)', repeat('a', 201))) = 'tried', 'tried too long';
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_tester_add(%L, %L, %L, ''x'', ''y'', %L, NULL)',
    g, pg_temp.chan(1), pg_temp.uid(1), repeat('a', 201))) = 'quote', 'quote too long';
  -- 80 and 200 characters are fine (a run of spaces counts as one).
  PERFORM public.elemental_bot_tester_add(g, pg_temp.chan(1), pg_temp.uid(1), repeat('w', 80), repeat('t', 198) || '    t',
    repeat('q', 200), repeat('c', 200));

  -- A phone number (or any contact) in any field is refused in SQL, naming the field, never echoing it.
  FOREACH f IN ARRAY ARRAY['who', 'tried', 'quote', 'changed'] LOOP
    FOREACH bad IN ARRAY ARRAY['"081-234-5678"', '"เบอร์ ๐๘๑ ๒๓๔ ๕๖๗๘"', '"a@b.co"', '"line: abc"']::jsonb[] LOOP
      DECLARE
        v_args text[] := ARRAY['a cousin', 'the night version', NULL, NULL];
        v_msg text;
        v_detail text;
        v_hint text;
      BEGIN
        v_args[array_position(ARRAY['who', 'tried', 'quote', 'changed'], f)] := bad #>> '{}';
        BEGIN
          PERFORM public.elemental_bot_tester_add(g, pg_temp.chan(1), pg_temp.uid(1), v_args[1], v_args[2], v_args[3], v_args[4]);
          RAISE EXCEPTION 'contact in % was accepted', f;
        EXCEPTION WHEN raise_exception THEN
          GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT, v_detail = PG_EXCEPTION_DETAIL, v_hint = PG_EXCEPTION_HINT;
          ASSERT v_msg = 'el:pii' AND v_detail = f AND v_hint IS NOT NULL, format('%s in %s: %s / %s / %s', bad, f, v_msg, v_detail, v_hint);
          ASSERT position(bad #>> '{}' IN v_msg || coalesce(v_detail, '') || coalesce(v_hint, '')) = 0, 'error echoes the text';
        END;
      END;
    END LOOP;
  END LOOP;
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_tester_entries
                     WHERE coalesce(who, '') || coalesce(tried, '') || coalesce(quote, '') || coalesce(changed, '') ~ '081|@b\.co|line:'),
    'a contact was stored';
END $$;

-- ---------------------------------------------------------------------------
-- Cap: 10 counted per team; the 11th is kept but not counted; a removal lets the next one count.
CREATE TEMP TABLE cap (pos integer PRIMARY KEY, res jsonb);
DO $$
DECLARE
  k integer;
  team uuid := pg_temp.team_id(12);
BEGIN
  -- Ember Watch has 3 counted (two from the first block, one 80/200 entry). Seven more reach the cap.
  ASSERT (SELECT count(*) FROM public.elemental_tester_entries WHERE team_id = team AND counted) = 3, 'start';
  FOR k IN 4 .. 11 LOOP
    INSERT INTO cap VALUES (k, pg_temp.tester(1 + k % 2, 1, 'a neighbour', 'try number ' || k));
  END LOOP;
  ASSERT (SELECT bool_and((res ->> 'counted')::boolean) FROM cap WHERE pos <= 10), 'entries 4-10 count';
  ASSERT NOT ((SELECT res FROM cap WHERE pos = 11) ->> 'counted')::boolean, '11th counted: ' || (SELECT res FROM cap WHERE pos = 11)::text;
  ASSERT ((SELECT res FROM cap WHERE pos = 11) ->> 'team_total')::integer = 10, '11th total';
  ASSERT (SELECT counted FROM public.elemental_bot_island_state('elemental-2026') WHERE slot = 12) = 10, 'island counts 10';
  ASSERT (SELECT count(*) FROM public.elemental_tester_entries WHERE team_id = team) = 11, 'the 11th is kept';
  INSERT INTO cap VALUES (12, pg_temp.tester(1, 1, 'a neighbour', 'try number 12'));
  ASSERT NOT ((SELECT res FROM cap WHERE pos = 12) ->> 'counted')::boolean, '12th counted';
END $$;

DO $$
DECLARE
  g text := pg_temp.g_real();
  five uuid := ((SELECT res FROM cap WHERE pos = 5) ->> 'id')::uuid;
  r jsonb;
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_remove(%L, %L, %L, %L)', g, five, pg_temp.staff(), repeat('r', 201)), 'too_long');
  r := public.elemental_bot_tester_remove(g, five, pg_temp.staff(), 'not a real test');
  ASSERT NOT (r ->> 'already')::boolean AND (r ->> 'was_counted')::boolean AND (r ->> 'team_total')::integer = 9
     AND (r ->> 'removed')::boolean AND NOT (r ->> 'counted')::boolean AND (r ->> 'lit')::boolean, 'remove: ' || r::text;
  ASSERT (SELECT removed_by = pg_temp.staff() AND removed_reason = 'not a real test' FROM public.elemental_tester_entries WHERE id = five), 'removal stored';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_audit WHERE detail::text LIKE '%not a real test%'), 'reason in the audit log';
  r := public.elemental_bot_tester_remove(g, five, pg_temp.staff());
  ASSERT (r ->> 'already')::boolean AND (r ->> 'team_total')::integer = 9, 'second removal: ' || r::text;
  -- The next entry counts again, then the cap holds.
  r := pg_temp.tester(2, 1, 'a neighbour', 'try number 13');
  ASSERT (r ->> 'counted')::boolean AND (r ->> 'team_total')::integer = 10 AND NOT (r ->> 'first_counted')::boolean, 'after removal: ' || r::text;
  r := pg_temp.tester(1, 1, 'a neighbour', 'try number 14');
  ASSERT NOT (r ->> 'counted')::boolean, 'cap after refill';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_remove(%L, %L, %L)', g, gen_random_uuid(), pg_temp.staff()), 'entry_not_found');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_remove(%L, %L, %L)', pg_temp.g_dry(), five, pg_temp.staff()), 'entry_not_found');
END $$;

-- A team whose only counted entry is removed goes dark; its next entry is a first again.
DO $$
DECLARE
  g text := pg_temp.g_real();
  only_one uuid := (SELECT id FROM public.elemental_tester_entries WHERE team_id = pg_temp.team_id(40));
  r jsonb;
BEGIN
  r := public.elemental_bot_tester_remove(g, only_one, pg_temp.staff());
  ASSERT NOT (r ->> 'lit')::boolean AND (r ->> 'team_total')::integer = 0, 'dark: ' || r::text;
  ASSERT (SELECT lit_at FROM public.elemental_teams WHERE id = pg_temp.team_id(40)) IS NULL, 'lit_at kept';
  r := pg_temp.tester(4, 2, 'a teacher', 'the second quiz');
  ASSERT (r ->> 'first_counted')::boolean, 'relit: ' || r::text;
END $$;

-- ---------------------------------------------------------------------------
-- Edit: the logger, within 10 minutes, same rules; the note is marked for a rewrite.
DO $$
DECLARE
  g text := pg_temp.g_real();
  e uuid := ((SELECT res FROM cap WHERE pos = 6) ->> 'id')::uuid;  -- logged by person 1
  r jsonb;
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_edit(%L, %L, %L, ''a'', ''b'')', g, e, pg_temp.uid(2)), 'not_logger');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_edit(%L, %L, %L, ''a'', ''b'')', g, gen_random_uuid(), pg_temp.uid(1)), 'entry_not_found');
  -- A contact in an edit is refused too, and nothing changes.
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_tester_edit(%L, %L, %L, ''a'', ''b'', NULL, ''0812345678'')', g, e, pg_temp.uid(1))) = 'changed', 'pii in edit';
  ASSERT (SELECT tried FROM public.elemental_tester_entries WHERE id = e) = 'try number 6', 'refused edit changed the entry';

  -- No canvas yet: edit stores, no rewrite.
  r := public.elemental_bot_tester_edit(g, e, pg_temp.uid(1), 'a neighbour', 'try number 6, again', 'it was quick', 'bigger buttons');
  ASSERT r ->> 'tried' = 'try number 6, again' AND r ->> 'quote' = 'it was quick' AND NOT (r ->> 'rewrite')::boolean, 'edit: ' || r::text;
  ASSERT (SELECT edited_at IS NOT NULL AND canvas_status = 'none' FROM public.elemental_tester_entries WHERE id = e), 'edited';
  -- A written note is marked for a rewrite.
  UPDATE public.elemental_tester_entries SET canvas_status = 'written' WHERE id = e;
  r := public.elemental_bot_tester_edit(g, e, pg_temp.uid(1), 'a neighbour', 'try number 6, third');
  ASSERT (r ->> 'rewrite')::boolean AND r ->> 'canvas_status' = 'pending' AND r -> 'quote' = 'null'::jsonb, 'rewrite: ' || r::text;

  -- After 10 minutes: refused.
  UPDATE public.elemental_tester_entries SET created_at = now() - interval '10 minutes 1 second' WHERE id = e;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_edit(%L, %L, %L, ''a'', ''b'')', g, e, pg_temp.uid(1)), 'edit_closed');
  UPDATE public.elemental_tester_entries SET created_at = now() - interval '9 minutes 50 seconds' WHERE id = e;
  PERFORM public.elemental_bot_tester_edit(g, e, pg_temp.uid(1), 'a neighbour', 'just in time');
  -- A removed entry cannot be edited.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_edit(%L, %L, %L, ''a'', ''b'')',
    g, (SELECT res ->> 'id' FROM cap WHERE pos = 5), pg_temp.uid(2)), 'entry_removed');
END $$;

-- ---------------------------------------------------------------------------
-- Review and sample.
DO $$
DECLARE
  g text := pg_temp.g_real();
  e uuid := ((SELECT res FROM cap WHERE pos = 7) ->> 'id')::uuid;
  r jsonb;
  n integer;
BEGIN
  r := public.elemental_bot_tester_review(g, e, pg_temp.staff());
  ASSERT NOT (r ->> 'already')::boolean AND (r ->> 'reviewed')::boolean, 'review: ' || r::text;
  ASSERT (public.elemental_bot_tester_review(g, e, pg_temp.staff()) ->> 'already')::boolean, 'second review';
  ASSERT (SELECT reviewed_by FROM public.elemental_tester_entries WHERE id = e) = pg_temp.staff(), 'reviewer stored';

  PERFORM pg_temp.expect_error(format('SELECT * FROM public.elemental_bot_tester_sample(%L, %L, 0)', g, pg_temp.staff()), 'bad_n');
  PERFORM pg_temp.expect_error(format('SELECT * FROM public.elemental_bot_tester_sample(%L, %L, 26)', g, pg_temp.staff()), 'bad_n');
  PERFORM pg_temp.expect_error(format('SELECT * FROM public.elemental_bot_tester_sample(%L, %L, 5, %L)', g, pg_temp.staff(), 'lava'), 'bad_element');
  SELECT count(*) INTO n FROM public.elemental_bot_tester_sample(g, pg_temp.staff(), 25);
  ASSERT n = (SELECT count(*) FROM public.elemental_tester_entries WHERE edition = 'elemental-2026' AND removed_at IS NULL AND reviewed_at IS NULL), 'sample size ' || n;
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_bot_tester_sample(g, pg_temp.staff(), 25) s WHERE s.entry_id = e), 'reviewed entry sampled';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_bot_tester_sample(g, pg_temp.staff(), 25) s
                     WHERE s.entry_id = ((SELECT res FROM cap WHERE pos = 5) ->> 'id')::uuid), 'removed entry sampled';
  ASSERT (SELECT count(*) FROM public.elemental_bot_tester_sample(g, pg_temp.staff(), 3)) = 3, 'limit';
  ASSERT (SELECT count(*) FROM public.elemental_bot_tester_sample(g, pg_temp.staff(), 25, ' WATER ')) = 0, 'element filter';
  ASSERT (SELECT bool_and(element = 'fire') FROM public.elemental_bot_tester_sample(g, pg_temp.staff(), 25, 'fire')), 'fire filter';
  ASSERT (SELECT count(*) FROM public.elemental_bot_tester_sample(pg_temp.g_dry(), pg_temp.staff(), 25)) = 0, 'editions apart';
  -- No Discord ids in what sample returns.
  ASSERT NOT EXISTS (
    SELECT 1 FROM unnest((SELECT proargnames FROM pg_proc WHERE proname = 'elemental_bot_tester_sample')) a
    WHERE a ~ 'discord|logger|_by$'), 'sample returns people';
END $$;

-- ---------------------------------------------------------------------------
-- Staff add by slot (the form fallback).
DO $$
DECLARE
  g text := pg_temp.g_real();
  r jsonb;
BEGIN
  r := public.elemental_bot_tester_add_staff(g, pg_temp.staff(), 40, 'a grandparent', 'the big-text version');
  ASSERT r ->> 'source' = 'staff' AND (r ->> 'counted')::boolean AND (r ->> 'slot')::integer = 40, 'staff add: ' || r::text;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_tester_add_staff(%L, %L, 199, ''a'', ''b'')', g, pg_temp.staff()), 'team_not_found');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_tester_add_staff(%L, %L, 40, ''call 0812345678'', ''b'')', g, pg_temp.staff())) = 'who', 'staff pii';
END $$;

-- An archived team's channel takes no entries; archiving un-counts and un-lights (core file).
DO $$
DECLARE
  g text := pg_temp.g_real();
BEGIN
  PERFORM public.elemental_bot_team_archive(g, pg_temp.staff(), 41);
  PERFORM pg_temp.expect_error('SELECT pg_temp.tester(5, 3)', 'not_team_channel');
END $$;

-- ---------------------------------------------------------------------------
-- Hand-in: allowlisted hosts; on time up to 23:00 Bangkok on Mon 7 Dec, late after.
DO $$
DECLARE
  g text := pg_temp.g_real();
  r jsonb;
  u text;
BEGIN
  ASSERT (SELECT handin_due_at FROM public.elemental_editions WHERE key = 'elemental-2026') = '2026-12-07 16:00:00+00', 'due time';
  ASSERT (SELECT handin_due_at FROM public.elemental_editions WHERE key = 'elemental-dryrun') IS NULL, 'rehearsal due time';

  r := public.elemental_bot_handin(g, pg_temp.chan(1), 'https://www.youtube.com/watch?v=abc123', '2026-12-07 22:59:59+07', pg_temp.uid(1));
  ASSERT NOT (r ->> 'late')::boolean AND NOT (r ->> 'resubmitted')::boolean AND (r ->> 'slot')::integer = 12
     AND (r ->> 'note_id')::uuid = pg_temp.team_id(12), '22:59:59: ' || r::text;
  r := public.elemental_bot_handin(g, pg_temp.chan(1), 'https://drive.google.com/file/d/abc/view', '2026-12-07 23:00:01+07', pg_temp.uid(2));
  ASSERT (r ->> 'late')::boolean AND (r ->> 'resubmitted')::boolean, '23:00:01: ' || r::text;
  ASSERT (SELECT handin_url = 'https://drive.google.com/file/d/abc/view' AND handin_at = '2026-12-07 23:00:01+07'
          FROM public.elemental_teams WHERE id = pg_temp.team_id(12)), 'stored';
  -- 23:00:00 sharp is still on time; the same instant written in UTC agrees.
  ASSERT NOT (public.elemental_bot_handin(g, pg_temp.chan(1), 'https://youtu.be/x', '2026-12-07 16:00:00+00', pg_temp.uid(1)) ->> 'late')::boolean, '23:00:00';
  ASSERT (public.elemental_bot_handin(g, pg_temp.chan(1), 'https://vt.tiktok.com/x/', '2026-12-07 16:00:01+00', pg_temp.uid(1)) ->> 'late')::boolean, 'UTC late';
  -- No time given: now.
  ASSERT (public.elemental_bot_handin(g, pg_temp.chan(1), 'https://m.youtube.com/shorts/x', NULL, pg_temp.uid(1)) ->> 'at')::timestamptz
         BETWEEN now() - interval '1 minute' AND now() + interval '1 minute', 'default time';

  FOREACH u IN ARRAY ARRAY[
    'https://example.com/video', 'https://youtube.com.example.net/x', 'https://notyoutube.com/x',
    'https://drive.google.com.example.org/x', 'https://youtube.com:8443/x'] LOOP
    PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_handin(%L, %L, %L, NULL, %L)', g, pg_temp.chan(1), u, pg_temp.uid(1)), 'bad_url');
    ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_handin(%L, %L, %L, NULL, %L)', g, pg_temp.chan(1), u, pg_temp.uid(1))) = 'host', 'host: ' || u;
  END LOOP;
  FOREACH u IN ARRAY ARRAY[
    'http://youtu.be/x', 'youtu.be/x', 'https://someone@youtube.com/x', 'https://you tube.com', '', 'https://youtu.be/' || repeat('x', 500)] LOOP
    ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_handin(%L, %L, %L, NULL, %L)', g, pg_temp.chan(1), u, pg_temp.uid(1))) = 'format', 'format: ' || u;
  END LOOP;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_handin(%L, %L, %L, NULL, %L)', g, pg_temp.chan(1), 'https://youtu.be/x', pg_temp.uid(3)), 'not_team_member');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_handin(%L, %L, %L, NULL, %L)', g, pg_temp.chan(99), 'https://youtu.be/x', pg_temp.uid(1)), 'not_team_channel');
  -- The last good link stays.
  ASSERT (SELECT handin_url FROM public.elemental_teams WHERE id = pg_temp.team_id(12)) = 'https://m.youtube.com/shorts/x', 'refused link stored';
END $$;
