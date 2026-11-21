-- Elemental core: /team create, Accept, slots, cap, staff team ops, unteamed.
\ir helpers.psql
SELECT pg_temp.setup();
SELECT count(pg_temp.claimed(k, NULL, k % 2 = 0)) FROM generate_series(1, 20) AS k;

-- A pending team has no slot; the first accept takes it live in its candidate slot.
CREATE TEMP TABLE t (name text PRIMARY KEY, id uuid);
DO $$
DECLARE
  r jsonb;
  team uuid;
BEGIN
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(1), '  Smoke   Alarm Map ', 'fire', ARRAY[pg_temp.uid(2), pg_temp.uid(3)]);
  team := (r ->> 'team_id')::uuid;
  INSERT INTO t VALUES ('a', team);
  ASSERT r ->> 'status' = 'pending' AND r -> 'slot' = 'null'::jsonb, 'pending team: ' || r::text;
  ASSERT r ->> 'project_name' = 'Smoke Alarm Map', 'project name spaces not collapsed';
  ASSERT jsonb_array_length(r -> 'invites') = 3 AND jsonb_array_length(r -> 'member_ids') = 0, 'invites: ' || r::text;
  ASSERT (SELECT slot FROM public.elemental_teams WHERE id = team) IS NULL, 'pending team has a slot';
  ASSERT (SELECT count(*) FROM public.elemental_team_invites WHERE team_id = team AND state = 'accepted') = 1,
    'only the creator has accepted';
  ASSERT (SELECT expires_at FROM public.elemental_team_invites WHERE team_id = team AND discord_user_id = pg_temp.uid(2))
         BETWEEN now() + interval '23 hours 59 minutes' AND now() + interval '24 hours 1 minute', 'invite expiry';

  -- The same request again (a retry) returns the same team.
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(1), 'Smoke Alarm Map', 'fire', ARRAY[pg_temp.uid(3), pg_temp.uid(2)]);
  ASSERT (r ->> 'team_id')::uuid = team AND (r ->> 'repeated')::boolean, 'retry made a new team';

  -- Only an invitee can accept.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L, %L)',
    pg_temp.g_real(), team, pg_temp.uid(9), '{12,40}'), 'invite_not_found');

  r := public.elemental_bot_team_accept(pg_temp.g_real(), team, pg_temp.uid(2), '{12,40}');
  ASSERT (r ->> 'activated')::boolean AND r ->> 'status' = 'channel_pending' AND (r ->> 'slot')::integer = 12,
    'first accept should activate in slot 12: ' || r::text;
  ASSERT r -> 'member_ids' = jsonb_build_array(pg_temp.uid(1), pg_temp.uid(2)), 'members: ' || (r -> 'member_ids')::text;
  r := public.elemental_bot_team_accept(pg_temp.g_real(), team, pg_temp.uid(2), '{12,40}');
  ASSERT (r ->> 'repeated')::boolean AND NOT (r ->> 'activated')::boolean, 'repeat accept';
  -- A later accept joins the live team.
  r := public.elemental_bot_team_accept(pg_temp.g_real(), team, pg_temp.uid(3), '{12,40}');
  ASSERT (r ->> 'joined')::boolean AND jsonb_array_length(r -> 'member_ids') = 3, 'third member joins: ' || r::text;
END $$;

-- Team size and who may be on a team.
DO $$
BEGIN
  -- 6 people (creator plus 5) refused; creator alone refused.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'Six People', 'air', ARRAY[pg_temp.uid(5), pg_temp.uid(6), pg_temp.uid(7), pg_temp.uid(8), pg_temp.uid(10)]), 'team_size');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'Just Me', 'air', ARRAY[pg_temp.uid(4)]), 'team_size');
  -- Unclaimed and already-teamed people refused, naming who.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'Ghost Friend', 'air', ARRAY[pg_temp.uid(500)]), 'invitee_not_claimed');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'Ghost Friend', 'air', ARRAY[pg_temp.uid(500)])) = pg_temp.uid(500), 'the refusal should name the invitee';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'Poach Team', 'air', ARRAY[pg_temp.uid(2)]), 'invitee_teamed');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1),
    'Second Team', 'air', ARRAY[pg_temp.uid(4)]), 'already_teamed');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(500),
    'Not Joined', 'air', ARRAY[pg_temp.uid(4)]), 'not_claimed');
  -- Name rules: length and contacts (named field, never the text).
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'ab', 'air', ARRAY[pg_temp.uid(5)]), 'bad_project_name');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    repeat('x', 61), 'air', ARRAY[pg_temp.uid(5)]), 'bad_project_name');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'call 081-234-5678', 'air', ARRAY[pg_temp.uid(5)]), 'pii');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'ig: someone', 'air', ARRAY[pg_temp.uid(5)])) = 'project_name', 'pii DETAIL should be the field';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'Good Name', 'lava', ARRAY[pg_temp.uid(5)]), 'bad_element');
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_teams WHERE created_by = pg_temp.uid(4)), 'a refused create wrote a team';
  -- A person from the rehearsal guild is not claimed in the real one.
  PERFORM pg_temp.claimed(600, pg_temp.g_dry());
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(4),
    'Cross Guild', 'air', ARRAY[pg_temp.uid(600)]), 'invitee_not_claimed');
END $$;

-- Slots: candidates {12,40} give 12 (taken above), then 40, then the first free; out-of-range candidates are ignored.
DO $$
DECLARE
  r jsonb;
BEGIN
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(4), 'Ash Sorter', 'fire', ARRAY[pg_temp.uid(5), pg_temp.uid(6), pg_temp.uid(7), pg_temp.uid(8)]);
  INSERT INTO t VALUES ('b', (r ->> 'team_id')::uuid);
  r := public.elemental_bot_team_accept(pg_temp.g_real(), (r ->> 'team_id')::uuid, pg_temp.uid(5), '{12,40}');
  ASSERT (r ->> 'slot')::integer = 40, 'second team should get 40: ' || r::text;
  PERFORM public.elemental_bot_team_accept(pg_temp.g_real(), (r ->> 'team_id')::uuid, pg_temp.uid(k), '{12,40}') FROM generate_series(6, 8) AS k;
  ASSERT public.elemental__team_size((r ->> 'team_id')::uuid) = 5, 'team of 5';

  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(9), 'Cinder Path', 'fire', ARRAY[pg_temp.uid(10)]);
  r := public.elemental_bot_team_accept(pg_temp.g_real(), (r ->> 'team_id')::uuid, pg_temp.uid(10), '{12,40}');
  ASSERT (r ->> 'slot')::integer = 1, 'third team should get the first free slot: ' || r::text;
  INSERT INTO t VALUES ('c', (r ->> 'team_id')::uuid);

  r := pg_temp.team('Out Of Range', 'air', 11, 12, '{201,0,-4,7}');
  ASSERT (r ->> 'slot')::integer = 7, 'out-of-range candidates should be skipped: ' || r::text;
  INSERT INTO t VALUES ('d', (r ->> 'team_id')::uuid);
END $$;

-- A slot outside 1..200 is rejected by the table itself.
SELECT pg_temp.expect_error(format('UPDATE public.elemental_teams SET slot = 201 WHERE id = %L', (SELECT id FROM t WHERE name = 'd')), '23514');
SELECT pg_temp.expect_error(format('UPDATE public.elemental_teams SET slot = 0 WHERE id = %L', (SELECT id FROM t WHERE name = 'd')), '23514');
-- Two teams can never share a slot in one edition.
SELECT pg_temp.expect_error(format('UPDATE public.elemental_teams SET slot = 12 WHERE id = %L', (SELECT id FROM t WHERE name = 'd')), '23505');

-- Invites: decline, expiry, closed after decline, accept after joining elsewhere.
DO $$
DECLARE
  r jsonb;
  team uuid;
BEGIN
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(13), 'Leaf Counter', 'earth', ARRAY[pg_temp.uid(14), pg_temp.uid(15)]);
  team := (r ->> 'team_id')::uuid;
  r := public.elemental_bot_team_decline(pg_temp.g_real(), team, pg_temp.uid(14));
  ASSERT (SELECT state FROM public.elemental_team_invites WHERE team_id = team AND discord_user_id = pg_temp.uid(14)) = 'declined', 'decline';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L)', pg_temp.g_real(), team, pg_temp.uid(14)), 'invite_closed');
  UPDATE public.elemental_team_invites SET expires_at = now() - interval '1 second' WHERE team_id = team AND discord_user_id = pg_temp.uid(15);
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L)', pg_temp.g_real(), team, pg_temp.uid(15)), 'invite_expired');
  ASSERT (SELECT status FROM public.elemental_teams WHERE id = team) = 'pending', 'expired team should stay pending';

  -- A new create by the same creator withdraws the old pending team.
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(13), 'Leaf Counter Two', 'earth', ARRAY[pg_temp.uid(16)]);
  ASSERT (SELECT status FROM public.elemental_teams WHERE id = team) = 'archived', 'old pending team should be withdrawn';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L)', pg_temp.g_real(), team, pg_temp.uid(15)), 'team_archived');

  -- Someone invited to two teams: joining one cancels the other invite.
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(17), 'Dew Net', 'water', ARRAY[pg_temp.uid(16)]);
  PERFORM public.elemental_bot_team_accept(pg_temp.g_real(), (SELECT id FROM public.elemental_teams WHERE project_name = 'Leaf Counter Two'), pg_temp.uid(16), NULL);
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L)', pg_temp.g_real(), (r ->> 'team_id')::uuid, pg_temp.uid(16)), 'invite_closed');

  -- The create window.
  UPDATE public.elemental_settings SET team_create_opens_at = NULL WHERE guild_id = pg_temp.g_real();
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(18),
    'Too Early', 'air', ARRAY[pg_temp.uid(19)]), 'team_create_closed');
  UPDATE public.elemental_settings SET team_create_opens_at = now() + interval '1 hour' WHERE guild_id = pg_temp.g_real();
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(18),
    'Too Early', 'air', ARRAY[pg_temp.uid(19)]), 'team_create_closed');
  UPDATE public.elemental_settings SET team_create_opens_at = now() - interval '2 hours', team_create_closes_at = now() - interval '1 hour'
  WHERE guild_id = pg_temp.g_real();
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(18),
    'Too Late', 'air', ARRAY[pg_temp.uid(19)]), 'team_create_closed');
  -- Staff ignore the window.
  r := pg_temp.team('Staff Made', 'aether', 18, 19);
  ASSERT r ->> 'status' = 'channel_pending', 'staff team should be live';
  UPDATE public.elemental_settings SET team_create_opens_at = now() - interval '1 hour', team_create_closes_at = NULL
  WHERE guild_id = pg_temp.g_real();
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create_staff(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.staff(),
    'Solo Staff', 'air', ARRAY[pg_temp.uid(20)]), 'team_size');
END $$;

-- Channel: channel_pending -> active; a channel belongs to one team; pending list for restarts.
DO $$
DECLARE
  a uuid := (SELECT id FROM t WHERE name = 'a');
  r jsonb;
BEGIN
  ASSERT (SELECT count(*) FROM public.elemental_bot_teams_channel_pending(pg_temp.g_real())) >= 4, 'channel_pending teams';
  ASSERT (SELECT member_ids FROM public.elemental_bot_teams_channel_pending(pg_temp.g_real()) WHERE team_id = a)
         = ARRAY[pg_temp.uid(1), pg_temp.uid(2), pg_temp.uid(3)], 'pending list members';
  r := public.elemental_bot_team_set_channel(pg_temp.g_real(), a, pg_temp.chan(1));
  ASSERT r ->> 'status' = 'active' AND r ->> 'channel_id' = pg_temp.chan(1), 'set channel: ' || r::text;
  r := public.elemental_bot_team_set_channel(pg_temp.g_real(), a, pg_temp.chan(1));
  ASSERT r ->> 'status' = 'active', 'repeat set channel';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_set_channel(%L, %L, %L)', pg_temp.g_real(),
    (SELECT id FROM t WHERE name = 'b'), pg_temp.chan(1)), 'channel_in_use');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_set_channel(%L, %L, %L)', pg_temp.g_dry(), a, pg_temp.chan(2)), 'team_not_found');
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_bot_teams_channel_pending(pg_temp.g_real()) WHERE team_id = a), 'active team still pending';
  ASSERT public.elemental_bot_team_get(pg_temp.g_real(), p_channel_id => pg_temp.chan(1)) ->> 'team_id' = a::text, 'team by channel';
  ASSERT public.elemental_bot_team_get(pg_temp.g_real(), p_slot => 12) ->> 'team_id' = a::text, 'team by slot';
  ASSERT public.elemental_bot_team_get(pg_temp.g_dry(), p_slot => 12) IS NULL, 'the rehearsal guild sees the real team';
END $$;

-- Staff ops: rename, move, set element (re-slot, canvas link cleared), unteamed.
-- The real table comes from 20261123100100_elemental_testers_canvas.sql; a stand-in only without it.
DO $$
BEGIN
  IF to_regclass('public.elemental_canvas_links') IS NULL THEN
    CREATE TABLE public.elemental_canvas_links (team_id uuid PRIMARY KEY, board_id uuid, frame_id text);
  END IF;
END $$;
INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-0000000000b1');
INSERT INTO public.whiteboards (id, owner_id) VALUES ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000b1');
DO $$
DECLARE
  a uuid := (SELECT id FROM t WHERE name = 'a');
  b uuid := (SELECT id FROM t WHERE name = 'b');
  r jsonb;
  n integer;
BEGIN
  r := public.elemental_bot_team_rename(pg_temp.g_real(), pg_temp.staff(), 12, 'Smoke Alarm Map v2');
  ASSERT r ->> 'project_name' = 'Smoke Alarm Map v2', 'rename';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_rename(%L, %L, 12, %L)', pg_temp.g_real(), pg_temp.staff(), 'www.example.com'), 'pii');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_rename(%L, %L, 199, %L)', pg_temp.g_real(), pg_temp.staff(), 'Nobody Here'), 'team_not_found');

  -- Move: into a full team refused; into a team with room works.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_member_move(%L, %L, %L, 40)', pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(3)), 'team_full');
  r := public.elemental_bot_member_move(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(3), 1);
  ASSERT (r -> 'from' ->> 'team_id')::uuid = a AND (r -> 'to' ->> 'slot')::integer = 1, 'move: ' || r::text;
  ASSERT NOT (r -> 'from' -> 'member_ids') ? pg_temp.uid(3) AND (r -> 'to' -> 'member_ids') ? pg_temp.uid(3), 'move members';

  -- Set element: a new slot from the new candidates, canvas link gone, entries marked for a rewrite.
  INSERT INTO public.elemental_canvas_links (team_id, board_id, frame_id) VALUES (a, '00000000-0000-4000-8000-0000000000b2', 'frame-1');
  INSERT INTO public.elemental_tester_entries (edition, team_id, who, counted, canvas_status) VALUES ('elemental-2026', a, 'a neighbour', true, 'written');
  r := public.elemental_bot_team_set_element(pg_temp.g_real(), pg_temp.staff(), 12, 'water', '{4,11,12}');
  ASSERT (r ->> 'slot')::integer = 4 AND (r ->> 'old_slot')::integer = 12 AND r ->> 'element' = 'water' AND r ->> 'old_element' = 'fire',
    'set element: ' || r::text;
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_canvas_links WHERE team_id = a), 'canvas link not cleared';
  ASSERT (SELECT canvas_status FROM public.elemental_tester_entries WHERE team_id = a) = 'none', 'entries not marked for rewrite';
  ASSERT (SELECT count(*) FROM public.elemental_teams WHERE slot = 12) = 0, 'old slot still held';
  r := public.elemental_bot_team_set_element(pg_temp.g_real(), pg_temp.staff(), 4, 'water', '{9}');
  ASSERT (r ->> 'changed')::boolean = false AND (r ->> 'slot')::integer = 4, 'same element is a no-op';
  -- Its own slot counts as free when it is the best candidate.
  r := public.elemental_bot_team_set_element(pg_temp.g_real(), pg_temp.staff(), 4, 'earth', '{40,4,5}');
  ASSERT (r ->> 'slot')::integer = 4, 'own slot should be kept: ' || r::text;

  -- Unteamed: claimed, not staff, not on a live team; the matching flag from the registration.
  SELECT count(*) INTO n FROM public.elemental_bot_unteamed(pg_temp.g_real());
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_bot_unteamed(pg_temp.g_real()) u
                     JOIN public.elemental_members m ON m.discord_user_id = u.discord_user_id AND m.edition = 'elemental-2026'
                     JOIN public.elemental_teams tt ON tt.id = m.team_id AND tt.status IN ('channel_pending', 'active')),
    'unteamed lists a member of a live team';
  ASSERT (SELECT wants_team_matching FROM public.elemental_bot_unteamed(pg_temp.g_real()) WHERE discord_user_id = pg_temp.uid(20)),
    'uid 20 asked for matching';
  ASSERT EXISTS (SELECT 1 FROM public.elemental_bot_unteamed(pg_temp.g_real()) WHERE discord_user_id = pg_temp.uid(14)), 'uid 14 is unteamed';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_bot_unteamed(pg_temp.g_real()) WHERE discord_user_id = pg_temp.uid(600)), 'rehearsal member listed';
  PERFORM public.elemental_bot_set_element(pg_temp.g_real(), pg_temp.uid(14), 'air');
  ASSERT (SELECT array_agg(discord_user_id) FROM public.elemental_bot_unteamed(pg_temp.g_real(), 'air')) = ARRAY[pg_temp.uid(14)], 'element filter';
END $$;

-- Archive by staff: its members count as free again; the slot stays taken.
DO $$
DECLARE
  c uuid := (SELECT id FROM t WHERE name = 'c');
  r jsonb;
BEGIN
  r := public.elemental_bot_team_archive(pg_temp.g_real(), pg_temp.staff(), 1);
  ASSERT r ->> 'status' = 'archived' AND jsonb_array_length(r -> 'member_ids') = 3, 'archive returns the old members: ' || r::text;
  ASSERT (SELECT slot FROM public.elemental_teams WHERE id = c) = 1, 'archive freed the slot';
  r := public.elemental_bot_team_archive(pg_temp.g_real(), pg_temp.staff(), 1);
  ASSERT r ->> 'status' = 'archived', 'archive twice';
  ASSERT EXISTS (SELECT 1 FROM public.elemental_bot_unteamed(pg_temp.g_real()) WHERE discord_user_id = pg_temp.uid(9)), 'archived member not free';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_member_move(%L, %L, %L, 1)', pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(9)), 'team_not_found');
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(9), 'Cinder Path Again', 'fire', ARRAY[pg_temp.uid(10)]);
  r := public.elemental_bot_team_accept(pg_temp.g_real(), (r ->> 'team_id')::uuid, pg_temp.uid(10), '{1,150}');
  ASSERT (r ->> 'slot')::integer = 150, 'the archived team still holds slot 1: ' || r::text;
END $$;

-- The cap: with team_cap live teams, the next activation raises island_full and writes nothing.
DO $$
DECLARE
  live integer := (SELECT count(*) FROM public.elemental_teams WHERE edition = 'elemental-2026' AND status IN ('channel_pending', 'active'));
  r jsonb;
  pending uuid;
BEGIN
  INSERT INTO public.elemental_teams (edition, project_name, element, status, slot)
  SELECT 'elemental-2026', 'Filler ' || s, 'fire', 'active', s
  FROM generate_series(1, 200) AS s
  WHERE NOT EXISTS (SELECT 1 FROM public.elemental_teams x WHERE x.edition = 'elemental-2026' AND x.slot = s)
  ORDER BY s
  LIMIT 175 - live;
  ASSERT (SELECT count(*) FROM public.elemental_teams WHERE edition = 'elemental-2026' AND status IN ('channel_pending', 'active')) = 175, '175 live';
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(14), 'One Too Many', 'fire', ARRAY[pg_temp.uid(15)]);
  pending := (r ->> 'team_id')::uuid;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L, %L)', pg_temp.g_real(), pending, pg_temp.uid(15), '{199,200}'), 'island_full');
  ASSERT (SELECT status FROM public.elemental_teams WHERE id = pending) = 'pending', 'the refused activation changed the team';
  ASSERT (SELECT state FROM public.elemental_team_invites WHERE team_id = pending AND discord_user_id = pg_temp.uid(15)) = 'pending', 'invite changed';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create_staff(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.staff(),
    'Staff Too Many', 'air', ARRAY[pg_temp.uid(14), pg_temp.uid(15)]), 'island_full');
  -- The rehearsal edition has its own cap and slots.
  r := pg_temp.team('Dry Team', 'fire', 601, 602, '{12}', pg_temp.g_dry());
  ASSERT (r ->> 'slot')::integer = 12 AND r ->> 'edition' = 'elemental-dryrun', 'rehearsal slots are separate: ' || r::text;
  -- Raising the cap lets it through.
  UPDATE public.elemental_settings SET team_cap = 176 WHERE guild_id = pg_temp.g_real();
  r := public.elemental_bot_team_accept(pg_temp.g_real(), pending, pg_temp.uid(15), '{199,200}');
  ASSERT (r ->> 'activated')::boolean, '176th with a cap of 176';
END $$;
