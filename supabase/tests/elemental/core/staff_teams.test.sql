-- Elemental core: staff are never on a team (AGENTS.md safeguarding: no
-- private adult-student channels; judges see no team chats). Every path that
-- puts a person on a team refuses a staff member row (is_staff, from /el link
-- with no registration) and anyone the bot flags as holding a staff role.
\ir helpers.psql
SELECT pg_temp.setup();
-- Students 1..12 (and 51, 53 who later turn out to be staff) claim real seats.
SELECT count(pg_temp.claimed(k)) FROM generate_series(1, 12) AS k;
SELECT pg_temp.claimed(51);
SELECT pg_temp.claimed(53);
-- 50: a Mentor recorded as a staff account (no code, no registration).
SELECT public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(50), NULL, NULL);

CREATE TEMP TABLE t (name text PRIMARY KEY, id uuid);

-- /team create: a staff creator or invitee is refused, naming who; nothing is written.
DO $$
BEGIN
  -- Staff member row as the creator.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(50),
    'Mentor Team', 'fire', ARRAY[pg_temp.uid(1)]), 'staff_member');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(50),
    'Mentor Team', 'fire', ARRAY[pg_temp.uid(1)])) = pg_temp.uid(50), 'staff_member should name the staff account';
  -- A claimed account the bot saw holding a staff role, as the creator.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(51),
    'Judge Team', 'fire', ARRAY[pg_temp.uid(1)], ARRAY[pg_temp.uid(51)]), 'staff_member');
  -- Staff member row as an invitee.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1),
    'With Mentor', 'fire', ARRAY[pg_temp.uid(2), pg_temp.uid(50)]), 'staff_member');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1),
    'With Mentor', 'fire', ARRAY[pg_temp.uid(2), pg_temp.uid(50)])) = pg_temp.uid(50), 'staff_member should name the invitee';
  -- A flagged invitee (claimed, but holds a staff role).
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1),
    'With Judge', 'fire', ARRAY[pg_temp.uid(2), pg_temp.uid(51)], ARRAY[pg_temp.uid(51)]), 'staff_member');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1),
    'With Judge', 'fire', ARRAY[pg_temp.uid(2), pg_temp.uid(51)], ARRAY[pg_temp.uid(51)])) = pg_temp.uid(51), 'names the flagged invitee';
  -- A flagged person who never claimed is refused as staff, not as unclaimed.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1),
    'With Host', 'fire', ARRAY[pg_temp.uid(2), pg_temp.uid(52)], ARRAY[pg_temp.uid(52)]), 'staff_member');
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_teams WHERE edition = 'elemental-2026'), 'a refused create wrote a team';
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_team_invites), 'a refused create wrote an invite';
END $$;

-- Accept: a staff invitee can never take a team live or join a live one.
DO $$
DECLARE
  r jsonb;
  team uuid;
BEGIN
  -- 51 was invited before anyone knew (no role yet); at Accept the bot sees the role.
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(1), 'Smoke Alarm Map', 'fire', ARRAY[pg_temp.uid(2), pg_temp.uid(51)]);
  team := (r ->> 'team_id')::uuid;
  INSERT INTO t VALUES ('a', team);
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L, %L, true)',
    pg_temp.g_real(), team, pg_temp.uid(51), '{12,40}'), 'staff_member');
  ASSERT (SELECT status FROM public.elemental_teams WHERE id = team) = 'pending', 'a staff accept took the team live';
  ASSERT (SELECT state FROM public.elemental_team_invites WHERE team_id = team AND discord_user_id = pg_temp.uid(51)) = 'pending',
    'the staff invite changed';
  ASSERT (SELECT team_id FROM public.elemental_members WHERE discord_user_id = pg_temp.uid(51)) IS NULL, 'staff got a team';

  -- The team goes live with a student; a staff accept then cannot join it.
  r := public.elemental_bot_team_accept(pg_temp.g_real(), team, pg_temp.uid(2), '{12,40}');
  ASSERT (r ->> 'activated')::boolean, 'student accept activates: ' || r::text;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L, %L, true)',
    pg_temp.g_real(), team, pg_temp.uid(51), '{12,40}'), 'staff_member');
  ASSERT (SELECT jsonb_array_length(public.elemental__team_json(team) -> 'member_ids')) = 2, 'staff joined the live team';

  -- 53 is invited, then a Host records them as staff: the invite is cancelled and Accept refused.
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(3), 'Rain Gauge', 'water', ARRAY[pg_temp.uid(4), pg_temp.uid(53)]);
  team := (r ->> 'team_id')::uuid;
  PERFORM public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(53), NULL, NULL);
  ASSERT (SELECT state FROM public.elemental_team_invites WHERE team_id = team AND discord_user_id = pg_temp.uid(53)) = 'cancelled',
    'staff link should cancel open invites';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L, %L)',
    pg_temp.g_real(), team, pg_temp.uid(53), '{4,11}'), 'staff_member');

  -- A creator linked as staff after creating: their accepted invite is cancelled, so the
  -- first student accept does not take the team live with them on it.
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(5), 'Bus Stop Shade', 'earth', ARRAY[pg_temp.uid(6), pg_temp.uid(7)]);
  team := (r ->> 'team_id')::uuid;
  PERFORM public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(5), NULL, NULL);
  r := public.elemental_bot_team_accept(pg_temp.g_real(), team, pg_temp.uid(6), NULL);
  ASSERT NOT (r ->> 'activated')::boolean AND r ->> 'status' = 'pending', 'one student is not a team: ' || r::text;
  r := public.elemental_bot_team_accept(pg_temp.g_real(), team, pg_temp.uid(7), NULL);
  ASSERT (r ->> 'activated')::boolean AND NOT (r -> 'member_ids') ? pg_temp.uid(5), 'the staff creator is not on the team: ' || r::text;
END $$;

-- Activation backstop: an accepted invite whose member row became staff some other way
-- (a staff script) stops the team going live.
DO $$
DECLARE
  r jsonb;
  team uuid;
BEGIN
  r := public.elemental_bot_team_create(pg_temp.g_real(), pg_temp.uid(8), 'Canteen Queue', 'air', ARRAY[pg_temp.uid(9)]);
  team := (r ->> 'team_id')::uuid;
  UPDATE public.elemental_members SET is_staff = true WHERE edition = 'elemental-2026' AND discord_user_id = pg_temp.uid(8);
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_accept(%L, %L, %L, NULL)',
    pg_temp.g_real(), team, pg_temp.uid(9)), 'staff_member');
  ASSERT (SELECT status FROM public.elemental_teams WHERE id = team) = 'pending', 'the team went live with staff on it';
  UPDATE public.elemental_members SET is_staff = false WHERE edition = 'elemental-2026' AND discord_user_id = pg_temp.uid(8);
END $$;

-- /el team-create: staff among the members are refused; nothing is written.
DO $$
DECLARE
  before integer := (SELECT count(*) FROM public.elemental_teams);
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create_staff(%L, %L, %L, %L, %L)', pg_temp.g_real(), pg_temp.staff(),
    'Mentor Inside', 'fire', ARRAY[pg_temp.uid(10), pg_temp.uid(50)]), 'staff_member');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create_staff(%L, %L, %L, %L, %L, NULL, %L)', pg_temp.g_real(), pg_temp.staff(),
    'Judge Inside', 'fire', ARRAY[pg_temp.uid(10), pg_temp.uid(51)], ARRAY[pg_temp.uid(51)]), 'staff_member');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_team_create_staff(%L, %L, %L, %L, %L, NULL, %L)', pg_temp.g_real(), pg_temp.staff(),
    'Judge Inside', 'fire', ARRAY[pg_temp.uid(10), pg_temp.uid(51)], ARRAY[pg_temp.uid(51)])) = pg_temp.uid(51), 'names the staff member';
  ASSERT (SELECT count(*) FROM public.elemental_teams) = before, 'a refused staff create wrote a team';
END $$;

-- /el team-move-member: staff cannot be moved onto a team.
DO $$
DECLARE
  slot integer := (SELECT slot FROM public.elemental_teams WHERE id = (SELECT id FROM t WHERE name = 'a'));
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_member_move(%L, %L, %L, %s)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(50), slot), 'staff_member');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_member_move(%L, %L, %L, %s, true)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(51), slot), 'staff_member');
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_member_move(%L, %L, %L, %s, true)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(51), slot)) = pg_temp.uid(51), 'names the staff member';
  ASSERT (SELECT count(*) FROM public.elemental_members WHERE discord_user_id IN (pg_temp.uid(50), pg_temp.uid(51)) AND team_id IS NOT NULL) = 0,
    'staff were moved onto a team';
  -- A flagged person who never claimed is refused as staff.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_member_move(%L, %L, %L, %s, true)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(52), slot), 'staff_member');
END $$;

-- /el link as staff: refused for someone on a live team (move or archive first).
DO $$
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_staff_link(%L, %L, %L, NULL, NULL)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(1)), 'staff_teamed');
  ASSERT NOT (SELECT is_staff FROM public.elemental_members WHERE discord_user_id = pg_temp.uid(1)), 'a teamed student became staff';
END $$;

-- The table itself: no write puts a staff row on a live team, whoever makes it.
DO $$
DECLARE
  a uuid := (SELECT id FROM t WHERE name = 'a');
  r jsonb;
BEGIN
  PERFORM pg_temp.expect_error(format('UPDATE public.elemental_members SET team_id = %L WHERE discord_user_id = %L', a, pg_temp.uid(50)), 'staff_member');
  PERFORM pg_temp.expect_error(format('UPDATE public.elemental_members SET is_staff = true WHERE discord_user_id = %L', pg_temp.uid(1)), 'staff_member');
  PERFORM pg_temp.expect_error(format('INSERT INTO public.elemental_members (edition, discord_user_id, is_staff, team_id) VALUES (%L, %L, true, %L)',
    'elemental-2026', pg_temp.uid(54), a), 'staff_member');
  -- An archived team is not a team chat any more: its old members may become staff.
  r := pg_temp.team('Old Team', 'aether', 11, 12);
  PERFORM public.elemental_bot_team_archive(pg_temp.g_real(), pg_temp.staff(), (r ->> 'slot')::integer);
  r := public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(11), NULL, NULL);
  ASSERT (r ->> 'is_staff')::boolean AND r -> 'team' = 'null'::jsonb, 'staff link after archive: ' || r::text;
END $$;

-- The rehearsal edition follows the same rule.
DO $$
BEGIN
  PERFORM pg_temp.claimed(601, pg_temp.g_dry());
  PERFORM pg_temp.claimed(602, pg_temp.g_dry());
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create_staff(%L, %L, %L, %L, %L, NULL, %L)', pg_temp.g_dry(), pg_temp.staff(),
    'Dry Mentor', 'fire', ARRAY[pg_temp.uid(601), pg_temp.uid(602)], ARRAY[pg_temp.uid(602)]), 'staff_member');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_team_create(%L, %L, %L, %L, %L, %L)', pg_temp.g_dry(), pg_temp.uid(601),
    'Dry Judge', 'fire', ARRAY[pg_temp.uid(602)], ARRAY[pg_temp.uid(601)]), 'staff_member');
END $$;
