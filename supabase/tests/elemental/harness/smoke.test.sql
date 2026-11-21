-- Smoke test for the Elemental SQL harness (scripts/elemental/harness.ts).
-- Runs under `pnpm test:db:elemental` in a fresh copy of the `elemental`
-- database, with ON_ERROR_STOP: any error or failed ASSERT fails the check.
--
-- How to write an Elemental SQL test (supabase/tests/elemental/<area>/*.test.sql):
--   * plain SQL plus DO blocks; check with ASSERT <condition>, '<what went wrong>';
--   * expect an error with a DO block that catches it and ASSERTs on SQLERRM;
--   * each file gets its own copy of the database, so it may COMMIT freely;
--   * act as another role with SET ROLE (anon, authenticated, service_role,
--     elemental_bot once E09 creates it) and RESET ROLE afterwards;
--   * test_harness.applied lists every migration applied and in which pass.

-- The registration migration and every elemental migration were applied twice.
DO $$
DECLARE missing TEXT;
BEGIN
  SELECT string_agg(file, ', ') INTO missing
  FROM (SELECT file FROM test_harness.applied
        WHERE file = '20261120100519_hackathon_event_registrations.sql' OR file LIKE '%elemental%'
        GROUP BY file HAVING count(*) FILTER (WHERE pass = 1) <> 1 OR count(*) FILTER (WHERE pass = 2) <> 1) wrong;
  ASSERT missing IS NULL, 'not applied exactly once per pass: ' || missing;
  ASSERT EXISTS (SELECT 1 FROM test_harness.applied WHERE file = '20261120100519_hackathon_event_registrations.sql' AND pass = 2),
    'the registration migration was not applied a second time';
  ASSERT EXISTS (SELECT 1 FROM test_harness.applied WHERE file LIKE '%whiteboard_canvas_trust%'),
    'the whiteboard migrations were not applied';
END $$;

-- The second pass left one slip bucket and the registration tables in place.
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM storage.buckets WHERE id = 'hackathon-slips' AND public = false) = 1,
    'expected exactly one private hackathon-slips bucket';
  ASSERT to_regclass('public.hackathon_event_registrations') IS NOT NULL, 'registrations table missing';
  ASSERT to_regclass('public.hackathon_event_registration_members') IS NOT NULL, 'registration members table missing';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.hackathon_event_registration_members'::regclass),
    'registration members table lost row level security';
  ASSERT to_regprocedure('public.whiteboard_merge_elements(text,jsonb)') IS NOT NULL
      OR EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'whiteboard_merge_elements'),
    'whiteboard_merge_elements missing';
END $$;

-- A paid registration with one member under 20 (made-up data) can be stored and read back.
DO $$
DECLARE reg UUID;
BEGIN
  INSERT INTO public.hackathon_event_registrations (event_slug, status, team_name, member_count, amount_baht, contact_email, contact_phone)
  VALUES ('elemental-2026', 'paid', 'Test Team', 1, 0, 'test@example.invalid', '0')
  RETURNING id INTO reg;
  INSERT INTO public.hackathon_event_registration_members (registration_id, position, full_name, age, school, parent_name, parent_phone, parent_consent)
  VALUES (reg, 1, 'Tester One', 16, 'Test School', 'Parent', '0', true);
  ASSERT (SELECT count(*) FROM public.hackathon_event_registration_members WHERE registration_id = reg) = 1,
    'member row not stored';
END $$;

-- Supabase stubs the Elemental migrations rely on.
DO $$
DECLARE uid UUID := gen_random_uuid();
BEGIN
  ASSERT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'), 'service_role must bypass row security';
  ASSERT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'),
    'anon and authenticated roles missing';
  INSERT INTO auth.users (id) VALUES (uid);
  INSERT INTO auth.identities (provider, provider_id, user_id) VALUES ('discord', 'test-discord-1', uid);
  ASSERT (SELECT user_id FROM auth.identities WHERE provider = 'discord' AND provider_id = 'test-discord-1') = uid,
    'auth.identities lookup by provider failed';
  ASSERT length(extensions.gen_random_bytes(8)) = 8, 'pgcrypto missing from the extensions schema';
  ASSERT current_setting('search_path') LIKE '%extensions%', 'search_path lacks extensions: ' || current_setting('search_path');
END $$;

-- Bangkok days: 23:59 and 00:01 +07 fall on different dates.
DO $$
BEGIN
  ASSERT ('2026-12-04 23:59:00+07'::timestamptz AT TIME ZONE 'Asia/Bangkok')::date = DATE '2026-12-04', '23:59 +07 is not 4 Dec';
  ASSERT ('2026-12-05 00:01:00+07'::timestamptz AT TIME ZONE 'Asia/Bangkok')::date = DATE '2026-12-05', '00:01 +07 is not 5 Dec';
END $$;

-- Supabase's default grants are stubbed: a new public table is open to anon until revoked.
CREATE TABLE public.harness_grant_probe (id INT);
DO $$
BEGIN
  ASSERT has_table_privilege('anon', 'public.harness_grant_probe', 'SELECT'), 'Supabase default grants are not stubbed';
END $$;
DROP TABLE public.harness_grant_probe;
