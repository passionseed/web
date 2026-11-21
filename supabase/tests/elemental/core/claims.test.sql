-- Elemental core: claim codes, /join, staff link, whois, editions apart.
\ir helpers.psql
SELECT pg_temp.setup();

-- Codes: one per member position of PAID elemental-2026 registrations, at most 5, idempotent.
CREATE TEMP TABLE regs (name text PRIMARY KEY, id uuid);
INSERT INTO regs VALUES
  ('paid6', pg_temp.reg('elemental-2026', 'paid', 6)),
  ('paid2', pg_temp.reg('elemental-2026', 'paid', 2)),
  ('pending', pg_temp.reg('elemental-2026', 'pending', 2)),
  ('review', pg_temp.reg('elemental-2026', 'review', 1)),
  ('cancelled', pg_temp.reg('elemental-2026', 'cancelled', 1)),
  ('other', pg_temp.reg('another-event', 'paid', 1));

CREATE TEMP TABLE run1 AS SELECT * FROM public.elemental_issue_claims('elemental-2026');
CREATE TEMP TABLE run2 AS SELECT * FROM public.elemental_issue_claims('elemental-2026');

DO $$
DECLARE
  paid6 uuid := (SELECT id FROM regs WHERE name = 'paid6');
BEGIN
  ASSERT (SELECT count(*) FROM run1 WHERE registration_id = paid6 AND state = 'new' AND code IS NOT NULL) = 5,
    'paid registration of 6 should get 5 codes';
  ASSERT (SELECT count(*) FROM run1 WHERE registration_id = paid6 AND state = 'over_cap' AND code IS NULL AND "position" = 6) = 1,
    'position 6 should be flagged over_cap with no code';
  ASSERT (SELECT count(*) FROM run1 WHERE registration_id = (SELECT id FROM regs WHERE name = 'paid2')) = 2,
    'paid registration of 2 should get 2 codes';
  ASSERT NOT EXISTS (SELECT 1 FROM run1 WHERE registration_id IN
    (SELECT id FROM regs WHERE name IN ('pending', 'review', 'cancelled', 'other'))),
    'unpaid or other-event registrations got codes';
  ASSERT (SELECT count(DISTINCT code) FROM run1 WHERE code IS NOT NULL) = 7, 'codes are not distinct';
  ASSERT (SELECT bool_and(code ~ '^[A-HJ-NP-Z2-9]{8}$') FROM run1 WHERE code IS NOT NULL), 'code format';
  ASSERT (SELECT count(*) FROM run2 WHERE state = 'new') = 0, 'second run made new codes';
  ASSERT (SELECT count(*) FROM run2 r2 JOIN run1 r1 USING (registration_id, "position") WHERE r1.code IS NOT DISTINCT FROM r2.code) = 8,
    'second run did not return the same codes';
  ASSERT (SELECT count(*) FROM public.elemental_claims WHERE edition = 'elemental-2026') = 7, 'claims rows';
  -- No column about people other than ids and positions.
  ASSERT (SELECT team_name FROM run1 WHERE registration_id = paid6 LIMIT 1) = 'Test Group', 'team name for the paste message';
END $$;

-- One code per member position: a second code for the same member row is refused.
SELECT pg_temp.expect_error(format(
  $q$INSERT INTO public.elemental_claims (edition, code, kind, registration_member_id) VALUES ('elemental-2026', 'ZZZZZZZZ', 'member', %L)$q$,
  pg_temp.member_row((SELECT id FROM regs WHERE name = 'paid2'), 1)), '23505');

-- The guard: member codes need a member row of the edition's event; rehearsal codes need a rehearsal edition.
SELECT pg_temp.expect_error(
  $q$INSERT INTO public.elemental_claims (edition, code, kind) VALUES ('elemental-2026', 'ZZZZZZZ2', 'member')$q$,
  'claim_needs_member');
SELECT pg_temp.expect_error(format(
  $q$INSERT INTO public.elemental_claims (edition, code, kind, registration_member_id) VALUES ('elemental-2026', 'ZZZZZZZ3', 'member', %L)$q$,
  pg_temp.member_row((SELECT id FROM regs WHERE name = 'other'), 1)), 'wrong_event');
SELECT pg_temp.expect_error(
  $q$INSERT INTO public.elemental_claims (edition, code, kind) VALUES ('elemental-2026', 'ZZZZZZZ4', 'rehearsal')$q$,
  'not_rehearsal');
SELECT pg_temp.expect_error(format(
  $q$INSERT INTO public.elemental_claims (edition, code, kind, registration_member_id) VALUES ('elemental-dryrun', 'ZZZZZZZ5', 'member', %L)$q$,
  pg_temp.member_row((SELECT id FROM regs WHERE name = 'pending'), 1)), 'wrong_edition');
SELECT pg_temp.expect_error($q$SELECT * FROM public.elemental_issue_rehearsal_claims('elemental-2026', 3)$q$, 'not_rehearsal');
SELECT pg_temp.expect_error($q$SELECT * FROM public.elemental_issue_claims('elemental-dryrun')$q$, 'edition_not_event');
-- The real edition can never become a rehearsal: refused once in use, and by a CHECK regardless.
SELECT pg_temp.expect_error($q$UPDATE public.elemental_editions SET kind = 'rehearsal', event_slug = NULL WHERE key = 'elemental-2026'$q$, 'edition_in_use');
ALTER TABLE public.elemental_editions DISABLE TRIGGER elemental_editions_guard;
SELECT pg_temp.expect_error($q$UPDATE public.elemental_editions SET kind = 'rehearsal', event_slug = NULL WHERE key = 'elemental-2026'$q$, '23514');
ALTER TABLE public.elemental_editions ENABLE TRIGGER elemental_editions_guard;

-- /join: a valid code, a repeat, a second user, a second code for the same user.
DO $$
DECLARE
  paid2 uuid := (SELECT id FROM regs WHERE name = 'paid2');
  c1 text := (SELECT code FROM run1 WHERE registration_id = paid2 AND "position" = 1);
  c2 text := (SELECT code FROM run1 WHERE registration_id = paid2 AND "position" = 2);
  r jsonb;
BEGIN
  r := public.elemental_bot_claim(pg_temp.g_real(), lower(substr(c1, 1, 4)) || '-' || substr(c1, 5), pg_temp.uid(1));
  ASSERT r ->> 'edition' = 'elemental-2026' AND (r ->> 'already')::boolean = false, 'first claim: ' || r::text;
  ASSERT (SELECT used_by FROM public.elemental_claims WHERE code = c1) = pg_temp.uid(1), 'claim not marked used';
  ASSERT (SELECT registration_member_id FROM public.elemental_members WHERE discord_user_id = pg_temp.uid(1))
         = pg_temp.member_row(paid2, 1), 'member not linked to its registration row';
  r := public.elemental_bot_claim(pg_temp.g_real(), c1, pg_temp.uid(1));
  ASSERT (r ->> 'already')::boolean, 'repeat /join should be idempotent';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), c1, pg_temp.uid(2)), 'code_used');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), c2, pg_temp.uid(1)), 'already_claimed');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), 'ABCDEFGH', pg_temp.uid(2)), 'unknown_code');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), 'nonsense', pg_temp.uid(2)), 'unknown_code');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), c2, 'not-a-snowflake'), 'bad_user');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', '800000000000000099', c2, pg_temp.uid(2)), 'unknown_guild');
  r := public.elemental_bot_claim(pg_temp.g_real(), c2, pg_temp.uid(2));
  ASSERT (r ->> 'already')::boolean = false, 'second member claims its own code';
END $$;

-- A code whose registration is no longer paid, or never was, fails at claim time.
DO $$
DECLARE
  pend_code text := (public.elemental__insert_claim('elemental-2026', 'member',
    pg_temp.member_row((SELECT id FROM regs WHERE name = 'pending'), 1))).code;
  review_code text := (public.elemental__insert_claim('elemental-2026', 'member',
    pg_temp.member_row((SELECT id FROM regs WHERE name = 'review'), 1))).code;
  paid6 uuid := (SELECT id FROM regs WHERE name = 'paid6');
  later_cancelled text := (SELECT code FROM run1 WHERE registration_id = paid6 AND "position" = 1);
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), pend_code, pg_temp.uid(10)), 'not_paid');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), review_code, pg_temp.uid(10)), 'not_paid');
  UPDATE public.hackathon_event_registrations SET status = 'cancelled' WHERE id = paid6;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), later_cancelled, pg_temp.uid(10)), 'not_paid');
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_members WHERE discord_user_id = pg_temp.uid(10)), 'a refused claim left a member';
  ASSERT (SELECT used_by FROM public.elemental_claims WHERE code = later_cancelled) IS NULL, 'a refused claim used the code';
  UPDATE public.hackathon_event_registrations SET status = 'paid' WHERE id = paid6;
END $$;

-- Rehearsal codes: refused in the real guild, fine in the rehearsal guild (and land there).
DO $$
DECLARE
  dry_code text := (SELECT code FROM public.elemental_issue_rehearsal_claims('elemental-dryrun', 2) LIMIT 1);
  real_code text := (SELECT code FROM run1 WHERE registration_id = (SELECT id FROM regs WHERE name = 'paid6') AND "position" = 2);
  r jsonb;
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), dry_code, pg_temp.uid(20)), 'wrong_edition');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_dry(), real_code, pg_temp.uid(20)), 'wrong_edition');
  r := public.elemental_bot_claim(pg_temp.g_dry(), dry_code, pg_temp.uid(20));
  ASSERT r ->> 'edition' = 'elemental-dryrun' AND r ->> 'edition_kind' = 'rehearsal', 'rehearsal claim: ' || r::text;
  ASSERT public.elemental_bot_member_get(pg_temp.g_real(), pg_temp.uid(20)) IS NULL, 'dry-run member visible in the real guild';
  -- The same person may hold a seat in both editions, each on its own.
  r := public.elemental_bot_claim(pg_temp.g_real(), real_code, pg_temp.uid(20));
  ASSERT r ->> 'edition' = 'elemental-2026', 'real claim of a rehearsal tester: ' || r::text;
  ASSERT (SELECT count(*) FROM public.elemental_members WHERE discord_user_id = pg_temp.uid(20)) = 2, 'one row per edition';
  PERFORM pg_temp.expect_error(format('SELECT * FROM public.elemental_bot_test_codes(%L, %L, 2)', pg_temp.g_real(), pg_temp.staff()), 'not_rehearsal');
  ASSERT (SELECT count(*) FROM public.elemental_bot_test_codes(pg_temp.g_dry(), pg_temp.staff(), 3)) = 3, 'test codes in the rehearsal guild';
END $$;

-- Whatever else exists (another event edition on the same slug, with its own guild and codes),
-- a member code from the real guild lands in elemental-2026, and the other edition's code does not work there.
INSERT INTO public.elemental_editions (key, kind, event_slug) VALUES ('elemental-extra', 'event', 'elemental-2026');
INSERT INTO public.elemental_settings (guild_id, edition) VALUES ('800000000000000003', 'elemental-extra');
DO $$
DECLARE
  extra_reg uuid := pg_temp.reg('elemental-2026', 'paid', 2);
  real_code text;
  extra_code text;
  r jsonb;
BEGIN
  SELECT code INTO extra_code FROM public.elemental_issue_claims('elemental-extra') WHERE registration_id = extra_reg AND "position" = 1;
  SELECT code INTO real_code FROM public.elemental_issue_claims('elemental-2026') WHERE registration_id = extra_reg AND "position" = 1;
  ASSERT extra_code <> real_code, 'editions share a code';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), extra_code, pg_temp.uid(30)), 'wrong_edition');
  r := public.elemental_bot_claim(pg_temp.g_real(), real_code, pg_temp.uid(30));
  ASSERT r ->> 'edition' = 'elemental-2026', 'member claim landed in ' || (r ->> 'edition');
  ASSERT (SELECT edition FROM public.elemental_members WHERE discord_user_id = pg_temp.uid(30)) = 'elemental-2026', 'member row edition';
END $$;
-- The edition's kind is fixed once codes exist.
SELECT pg_temp.expect_error($q$UPDATE public.elemental_editions SET kind = 'rehearsal', event_slug = NULL WHERE key = 'elemental-extra'$q$, 'edition_in_use');

-- /el link: staff link a person by registration and position; the seat's code is then used up.
DO $$
DECLARE
  reg uuid := pg_temp.reg('elemental-2026', 'paid', 2);
  code2 text;
  r jsonb;
  w jsonb;
BEGIN
  r := public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(40), reg, 1);
  ASSERT (r ->> 'already')::boolean = false AND r ->> 'edition' = 'elemental-2026', 'staff link: ' || r::text;
  ASSERT (SELECT used_by FROM public.elemental_claims WHERE registration_member_id = pg_temp.member_row(reg, 1)) = pg_temp.uid(40),
    'staff link should use up the seat code';
  r := public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(40), reg, 1);
  ASSERT (r ->> 'already')::boolean, 'repeat link is idempotent';
  ASSERT pg_temp.error_detail(format('SELECT public.elemental_bot_staff_link(%L, %L, %L, %L, 1)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(41), reg)) = pg_temp.uid(40), 'member_linked should name the holder';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_staff_link(%L, %L, %L, %L, 9)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(41), reg), 'registration_not_found');
  -- The code issued later for position 2 cannot be used by someone else once staff linked that seat.
  SELECT code INTO code2 FROM public.elemental_issue_claims('elemental-2026') WHERE registration_id = reg AND "position" = 2;
  PERFORM public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(42), reg, 2);
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_claim(%L, %L, %L)', pg_temp.g_real(), code2, pg_temp.uid(43)), 'code_used');
  -- Unpaid registrations cannot be linked either.
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_staff_link(%L, %L, %L, %L, 1)',
    pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(44), (SELECT id FROM regs WHERE name = 'cancelled')), 'not_paid');
  -- A staff account (no registration).
  r := public.elemental_bot_staff_link(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(45), NULL, NULL);
  ASSERT (r ->> 'is_staff')::boolean, 'staff account';

  -- whois: registration id and position only.
  w := public.elemental_bot_whois(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(40));
  ASSERT (w ->> 'registration_id')::uuid = reg AND (w ->> 'position')::integer = 1, 'whois: ' || w::text;
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_object_keys(w) k WHERE k ~* 'name|school|phone|parent|email|line|age'), 'whois leaks: ' || w::text;
  ASSERT w::text !~* 'Member|Test School|Parent|example', 'whois leaks registration text';
  w := public.elemental_bot_whois(pg_temp.g_real(), pg_temp.staff(), pg_temp.uid(999));
  ASSERT (w ->> 'claimed')::boolean = false, 'whois of a stranger';
  ASSERT (SELECT count(*) FROM public.elemental_audit WHERE action = 'whois' AND actor = pg_temp.staff()) = 2, 'whois is audited';
END $$;

-- Element picker: claimed only; any element until on a live team.
DO $$
DECLARE
  r jsonb;
BEGIN
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_set_element(%L, %L, %L)', pg_temp.g_real(), pg_temp.uid(998), 'fire'), 'not_claimed');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_set_element(%L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1), 'lava'), 'bad_element');
  r := public.elemental_bot_set_element(pg_temp.g_real(), pg_temp.uid(1), 'fire');
  r := public.elemental_bot_set_element(pg_temp.g_real(), pg_temp.uid(1), 'Water');
  ASSERT r ->> 'element' = 'water' AND r ->> 'previous' = 'fire', 'picker: ' || r::text;
  PERFORM public.elemental_bot_team_create_staff(pg_temp.g_real(), pg_temp.staff(), 'Rain Catcher', 'water',
    ARRAY[pg_temp.uid(1), pg_temp.uid(2)]);
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_set_element(%L, %L, %L)', pg_temp.g_real(), pg_temp.uid(1), 'fire'), 'on_team');
END $$;

-- The audit log never holds a code.
DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_audit a JOIN public.elemental_claims c
                     ON a.detail::text LIKE '%' || c.code || '%' OR a.target = c.code), 'a code reached the audit log';
END $$;
