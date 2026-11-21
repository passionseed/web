-- Elemental core: settings, scheduled posts, reports, check-ins, badges, the SQL PII check.
\ir helpers.psql
SELECT pg_temp.setup();

-- Settings: the jsonb shape bot/src/elemental/context.ts normalizeSettings reads.
UPDATE public.elemental_settings SET
  role_ids = '{"host": "810000000000000001", "paid": "810000000000000002", "fire": "810000000000000003"}',
  channel_ids = '{"start_here": "820000000000000001", "reports": "820000000000000002"}',
  element_category_ids = '{"fire": ["830000000000000001", "830000000000000002"]}',
  schedule = '{"2026-12-04": {"opening_at": "19:00", "call_at": "19:55", "card_at": "20:30"}, "2026-12-05": {"call_at": "19:55", "card_at": "20:30"}}'
WHERE guild_id = pg_temp.g_real();

DO $$
DECLARE
  s jsonb := public.elemental_bot_settings_get(pg_temp.g_real());
BEGIN
  ASSERT s ->> 'edition' = 'elemental-2026' AND s ->> 'edition_kind' = 'event', 'edition: ' || s::text;
  ASSERT public.elemental_bot_settings_get(pg_temp.g_dry()) ->> 'edition_kind' = 'rehearsal', 'rehearsal kind';
  ASSERT s -> 'role_ids' ->> 'host' = '810000000000000001' AND s -> 'channel_ids' ->> 'reports' = '820000000000000002', 'ids';
  ASSERT s -> 'element_category_ids' -> 'fire' = '["830000000000000001", "830000000000000002"]'::jsonb, 'categories';
  ASSERT s -> 'schedule' -> '2026-12-04' ->> 'card_at' = '20:30', 'schedule';
  ASSERT (s ->> 'tester_cap')::integer = 10 AND (s ->> 'team_cap')::integer = 175 AND (s ->> 'heal_steps')::integer = 5
     AND (s ->> 'heal_per_team')::integer = 3 AND (s ->> 'healing_enabled')::boolean = false, 'defaults: ' || s::text;
  ASSERT s ? 'card_override' AND s ? 'retention_until' AND s ? 'team_create_opens_at' AND s ? 'team_create_closes_at', 'keys';
  ASSERT public.elemental_bot_settings_get('800000000000000077') IS NULL, 'unknown guild';
END $$;

-- Bad schedules and overrides never reach the table.
SELECT pg_temp.expect_error(format($q$UPDATE public.elemental_settings SET schedule = '{"2026-12-04": {"card_at": "20:30"}}' WHERE guild_id = %L$q$, pg_temp.g_real()), '23514');
SELECT pg_temp.expect_error(format($q$UPDATE public.elemental_settings SET schedule = '{"2026-12-04": {"call_at": "19:55", "card_at": "24:00"}}' WHERE guild_id = %L$q$, pg_temp.g_real()), '23514');
SELECT pg_temp.expect_error(format($q$UPDATE public.elemental_settings SET schedule = '{"2026-13-04": {"call_at": "19:55", "card_at": "20:30"}}' WHERE guild_id = %L$q$, pg_temp.g_real()), '23514');
SELECT pg_temp.expect_error(format($q$UPDATE public.elemental_settings SET card_override = '{"day": "2026-12-04", "url": "http://x"}' WHERE guild_id = %L$q$, pg_temp.g_real()), '23514');
-- One guild per edition.
SELECT pg_temp.expect_error($q$INSERT INTO public.elemental_settings (guild_id, edition) VALUES ('800000000000000005', 'elemental-2026')$q$, '23505');

DO $$
DECLARE
  s jsonb;
BEGIN
  s := public.elemental_bot_settings_set(pg_temp.g_real(), pg_temp.staff(),
    '{"card_override": {"day": "2026-12-04", "url": "https://cdn.example.com/card.png"}, "healing_enabled": true, "tester_cap": "12"}');
  ASSERT s -> 'card_override' ->> 'day' = '2026-12-04' AND (s ->> 'healing_enabled')::boolean AND (s ->> 'tester_cap')::integer = 12, 'set: ' || s::text;
  s := public.elemental_bot_settings_set(pg_temp.g_real(), pg_temp.staff(), '{"card_override": null, "team_create_opens_at": "2026-11-29T12:00:00Z"}');
  ASSERT s -> 'card_override' = 'null'::jsonb AND (s ->> 'team_create_opens_at')::timestamptz = '2026-11-29 12:00:00+00', 'clear: ' || s::text;
  PERFORM pg_temp.expect_error(format($q$SELECT public.elemental_bot_settings_set(%L, %L, '{"edition": "elemental-dryrun"}')$q$, pg_temp.g_real(), pg_temp.staff()), 'bad_patch');
  ASSERT pg_temp.error_detail(format($q$SELECT public.elemental_bot_settings_set(%L, %L, '{"role_ids": {}}')$q$, pg_temp.g_real(), pg_temp.staff())) = 'role_ids',
    'bad_patch names the key';
  PERFORM pg_temp.expect_error(format($q$SELECT public.elemental_bot_settings_set(%L, %L, '{"tester_cap": 0}')$q$, pg_temp.g_real(), pg_temp.staff()), 'bad_patch');
  PERFORM pg_temp.expect_error(format($q$SELECT public.elemental_bot_settings_set(%L, %L, '{"tester_cap": "ten"}')$q$, pg_temp.g_real(), pg_temp.staff()), 'bad_patch');
  PERFORM pg_temp.expect_error(format($q$SELECT public.elemental_bot_settings_set(%L, %L, '{"healing_enabled": "yes"}')$q$, pg_temp.g_real(), pg_temp.staff()), 'bad_patch');
  PERFORM pg_temp.expect_error(format($q$SELECT public.elemental_bot_settings_set(%L, %L, '{"schedule": {"x": 1}}')$q$, pg_temp.g_real(), pg_temp.staff()), 'bad_patch');
  PERFORM pg_temp.expect_error(format($q$SELECT public.elemental_bot_settings_set(%L, %L, '{"card_override": {"day": "2026-12-04"}}')$q$, pg_temp.g_real(), pg_temp.staff()), 'bad_patch');
  ASSERT (SELECT edition FROM public.elemental_settings WHERE guild_id = pg_temp.g_real()) = 'elemental-2026', 'edition moved';
END $$;

-- Posts: claimed once across pollers; sent never again; failed can be retried; leases are opt-in.
DO $$
BEGIN
  ASSERT public.elemental_bot_post_claim(pg_temp.g_real(), 'card', '2026-12-04'), 'first claim';
  ASSERT NOT public.elemental_bot_post_claim(pg_temp.g_real(), 'card', '2026-12-04'), 'second poller claimed too';
  ASSERT public.elemental_bot_post_claim(pg_temp.g_dry(), 'card', '2026-12-04'), 'the rehearsal guild has its own posts';
  ASSERT NOT public.elemental_bot_post_claim(pg_temp.g_real(), 'card', '2026-12-04', 600), 'a fresh claim is not stale';
  ASSERT public.elemental_bot_post_mark(pg_temp.g_real(), 'card', '2026-12-04', 'sent', '840000000000000001'), 'mark sent';
  ASSERT NOT public.elemental_bot_post_mark(pg_temp.g_real(), 'card', '2026-12-04', 'sent', '840000000000000001'), 'mark twice';
  ASSERT NOT public.elemental_bot_post_claim(pg_temp.g_real(), 'card', '2026-12-04', 0), 'a sent post was claimed again';
  ASSERT (SELECT message_id FROM public.elemental_posts WHERE edition = 'elemental-2026' AND kind = 'card') = '840000000000000001', 'message id';

  ASSERT public.elemental_bot_post_claim(pg_temp.g_real(), 'call', '2026-12-04'), 'claim call';
  ASSERT public.elemental_bot_post_mark(pg_temp.g_real(), 'call', '2026-12-04', 'failed'), 'mark failed';
  ASSERT public.elemental_bot_post_claim(pg_temp.g_real(), 'call', '2026-12-04'), 'a failed post can be claimed again';
  ASSERT (SELECT attempts FROM public.elemental_posts WHERE edition = 'elemental-2026' AND kind = 'call') = 2, 'attempts';

  ASSERT public.elemental_bot_post_claim(pg_temp.g_real(), 'opening', '2026-12-04'), 'claim opening';
  UPDATE public.elemental_posts SET claimed_at = now() - interval '20 minutes' WHERE kind = 'opening';
  ASSERT NOT public.elemental_bot_post_claim(pg_temp.g_real(), 'opening', '2026-12-04'), 'no lease: a stale claim stays';
  ASSERT public.elemental_bot_post_claim(pg_temp.g_real(), 'opening', '2026-12-04', 600), 'with a lease a stale claim is taken over';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_post_claim(%L, %L, %L)', pg_temp.g_real(), 'Bad Kind', 'x'), 'bad_kind');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_post_mark(%L, %L, %L, %L)', pg_temp.g_real(), 'call', '2026-12-04', 'done'), 'bad_status');
END $$;

-- Reports: anyone (claimed or not); retries return the first; rate limited; Handled once.
DO $$
DECLARE
  r jsonb;
  r2 jsonb;
  h jsonb;
  k integer;
BEGIN
  r := public.elemental_bot_report_add(pg_temp.g_real(), pg_temp.uid(50), '  someone keeps posting mean things  ', 'start-here');
  ASSERT (r ->> 'repeated')::boolean = false, 'report: ' || r::text;
  ASSERT (SELECT text FROM public.elemental_reports WHERE id = (r ->> 'report_id')::uuid) = 'someone keeps posting mean things', 'report text trimmed';
  r2 := public.elemental_bot_report_add(pg_temp.g_real(), pg_temp.uid(50), 'someone keeps posting mean things', 'start-here');
  ASSERT (r2 ->> 'report_id') = (r ->> 'report_id') AND (r2 ->> 'repeated')::boolean, 'retry should return the first report';
  ASSERT (SELECT edition FROM public.elemental_reports WHERE id = (r ->> 'report_id')::uuid) = 'elemental-2026', 'edition';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_report_add(%L, %L, %L)', pg_temp.g_real(), pg_temp.uid(50), '   '), 'bad_text');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_report_add(%L, %L, %L)', pg_temp.g_real(), pg_temp.uid(50), repeat('a', 1001)), 'bad_text');
  FOR k IN 2 .. 10 LOOP
    PERFORM public.elemental_bot_report_add(pg_temp.g_real(), pg_temp.uid(50), 'report number ' || k);
  END LOOP;
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_report_add(%L, %L, %L)', pg_temp.g_real(), pg_temp.uid(50), 'one more'), 'rate_limited');
  h := public.elemental_bot_report_handled(pg_temp.g_real(), (r ->> 'report_id')::uuid, pg_temp.staff());
  ASSERT (h ->> 'already')::boolean = false, 'handled';
  h := public.elemental_bot_report_handled(pg_temp.g_real(), (r ->> 'report_id')::uuid, pg_temp.staff());
  ASSERT (h ->> 'already')::boolean, 'handled twice';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_report_handled(%L, %L, %L)', pg_temp.g_dry(), r ->> 'report_id', pg_temp.staff()), 'report_not_found');
  -- The audit log names the report, never its text.
  ASSERT NOT EXISTS (SELECT 1 FROM public.elemental_audit WHERE detail::text LIKE '%mean things%'), 'report text in the audit log';
END $$;

-- Check-ins: in the team channel, by a member, once per Bangkok day.
DO $$
DECLARE
  team jsonb := pg_temp.team('Check Team', 'earth', 1, 2);
  r jsonb;
BEGIN
  PERFORM pg_temp.claimed(3);
  PERFORM public.elemental_bot_team_set_channel(pg_temp.g_real(), (team ->> 'team_id')::uuid, pg_temp.chan(5));
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_checkin(%L, %L, %L)', pg_temp.g_real(), pg_temp.chan(6), pg_temp.uid(1)), 'not_team_channel');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_checkin(%L, %L, %L)', pg_temp.g_real(), pg_temp.chan(5), pg_temp.uid(3)), 'not_team_member');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_checkin(%L, %L, %L)', pg_temp.g_dry(), pg_temp.chan(5), pg_temp.uid(1)), 'not_team_channel');
  r := public.elemental_bot_checkin(pg_temp.g_real(), pg_temp.chan(5), pg_temp.uid(1));
  ASSERT (r ->> 'already')::boolean = false AND (r ->> 'day')::date = (now() AT TIME ZONE 'Asia/Bangkok')::date, 'checkin: ' || r::text;
  r := public.elemental_bot_checkin(pg_temp.g_real(), pg_temp.chan(5), pg_temp.uid(2));
  ASSERT (r ->> 'already')::boolean, 'second checkin should be a no-op';
  ASSERT (SELECT count(*) FROM public.elemental_checkins) = 1, 'one checkin row';
  ASSERT (public.elemental_bot_totals('elemental-2026') ->> 'checked_in')::integer = 1, 'checked in today';

  -- Badges: once per (team, kind, ref).
  r := public.elemental_bot_award_badge(pg_temp.g_real(), (team ->> 'team_id')::uuid, 'powerup', 'day1', pg_temp.staff());
  ASSERT (r ->> 'awarded')::boolean, 'badge';
  r := public.elemental_bot_award_badge(pg_temp.g_real(), (team ->> 'team_id')::uuid, 'powerup', 'day1', pg_temp.staff());
  ASSERT NOT (r ->> 'awarded')::boolean, 'badge twice';
  r := public.elemental_bot_award_badge(pg_temp.g_real(), (team ->> 'team_id')::uuid, 'powerup', 'day2');
  ASSERT (SELECT count(*) FROM public.elemental_badges) = 2, 'two refs, two badges';
  ASSERT (SELECT badges FROM public.elemental_island_public('elemental-2026')) = ARRAY['powerup'], 'island shows the badge kind once';
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_award_badge(%L, %L, %L)', pg_temp.g_real(), team ->> 'team_id', 'Power Up'), 'bad_kind');
  PERFORM pg_temp.expect_error(format('SELECT public.elemental_bot_award_badge(%L, %L, %L)', pg_temp.g_dry(), team ->> 'team_id', 'powerup'), 'team_not_found');
END $$;

-- The SQL PII check on a few cases (the full parity run is pii_parity.int.test.ts).
DO $$
BEGIN
  ASSERT public.elemental__pii_kind('081-234-5678') = 'phone', 'phone';
  ASSERT public.elemental__pii_kind('๐๘๑๒๓๔๕๖๗๘') = 'phone', 'thai digits';
  ASSERT public.elemental__pii_kind('０８１２３４５６７８') = 'phone', 'full-width digits';
  ASSERT public.elemental__pii_kind(E'081​234​5678') = 'phone', 'zero-width spaces';
  ASSERT public.elemental__pii_kind('someone＠example.com') = 'email', 'full-width at';
  ASSERT public.elemental__pii_kind('ig: x') = 'social', 'ig';
  ASSERT public.elemental__pii_kind('LINE: a') = 'line', 'line, upper case';
  ASSERT public.elemental__pii_kind('@a') = 'handle', 'handle';
  ASSERT public.elemental__pii_kind('the line was long so he left') IS NULL, 'line as a word';
  ASSERT public.elemental__pii_kind('แม่ของเพื่อนที่เชียงราย') IS NULL, 'thai sentence';
  ASSERT public.elemental__pii_kind('x = 5') IS NULL, 'a sum';
  ASSERT public.elemental__pii_kind('') IS NULL AND public.elemental__pii_kind(NULL) IS NULL, 'empty';
  PERFORM pg_temp.expect_error($q$SELECT public.elemental__refuse_pii('who', 'line: abc')$q$, 'pii');
  PERFORM public.elemental__refuse_pii('who', 'a parent in Chiang Rai');
END $$;
