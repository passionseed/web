\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(18);

create temp table f on commit drop as select shift_test.round(9941, '2026-11-10 00:00+07') as r,
  shift_test.user() as a, shift_test.user() as b, shift_test.user() as c, shift_test.user() as d, shift_test.user() as e,
  shift_test.user() as w;
update public.profiles set expo_push_token = 'ExponentPushToken[' || id || ']', mobile_settings = '{"push_enabled":true}', preferred_language = 'th'
 where id in (select unnest(array[a, b, c, d, e, w]) from f);
update public.profiles set shift_round_nudges = false where id = (select b from f);
update public.profiles set mobile_settings = '{"push_enabled":false}' where id = (select c from f);
create temp table g on commit drop as select shift_test.entry(r, a) as ea, shift_test.entry(r, b) as eb, shift_test.entry(r, c) as ec,
  shift_test.entry(r, d) as ed, shift_test.entry(r, e) as ee from f;
select shift_test.complete_all(ee, '2026-11-11 10:00+07') from g;
select shift_test.ev(ed, 'contact', 'Today Person', 'submitted', '2026-11-12 09:00+07') from g;
grant select on f, g to service_role;

create function pg_temp.cands(p_job text) returns jsonb language sql as $$
  select public.shift_round_job_push_candidates(p_job, 500)->'data' $$;
create function pg_temp.users(j jsonb) returns uuid[] language sql as $$
  select coalesce(array_agg((x->>'user_id')::uuid order by x->>'user_id'), '{}') from jsonb_array_elements(j->'candidates') x $$;

select shift_test.clock('2026-11-12 19:10+07');
set local role service_role;
select is(pg_temp.cands('nudges')->>'paused', 'true', 'nudges no-op until enabled (A43)');
reset role;
update public.app_config set value = 'true' where key = 'shift_round.nudges_enabled';
select shift_test.clock('2026-11-12 18:10+07');
set local role service_role;
select is(jsonb_array_length(pg_temp.cands('nudges')->'candidates'), 0, 'nothing outside the round''s nudge hour');
reset role;
select shift_test.clock('2026-11-12 19:10+07');
set local role service_role;
create temp table n1 on commit drop as select pg_temp.cands('nudges') as j;
select is(pg_temp.users((select j from n1)), array[(select a from f)], 'only the eligible student is nudged');
select is((select j->'candidates'->0->>'kind' from n1), 'no_evidence', 'no_evidence kind');
select is((select j->'candidates'->0->'params'->>'n' from n1), '6', 'missions remaining in params');
select is((select j->'candidates'->0->>'lang' from n1), 'th', 'language from profile');
select is(jsonb_array_length(pg_temp.cands('nudges')->'candidates'), 0, 'rerun claims nothing (ledger dedupe)');

-- R17: day 13 sends closing_tomorrow instead, even to a student who logged today
reset role;
select shift_test.clock('2026-11-22 19:05+07');
select shift_test.ev(ed, 'contact', 'Another', 'submitted', '2026-11-22 09:00+07') from g;
set local role service_role;
create temp table n2 on commit drop as select pg_temp.cands('nudges') as j;
select is((select array_agg(distinct x->>'kind') from n2, jsonb_array_elements(j->'candidates') x), array['closing_tomorrow'],
  'closing_tomorrow replaces the no-log nudge on day 13');
select is(pg_temp.users((select j from n2)), (select array_agg(x order by x::text) from f, unnest(array[a, d]) x),
  'sent to students with missions left and push on');

-- result bookkeeping and receipts
create temp table led on commit drop as select (j->'candidates'->0->>'ledger_id')::uuid as id, (j->'candidates'->0->>'user_id')::uuid as u from n2;
select is(public.shift_round_job_push_result(array[(select id from led)], 'sent', array['ticket-1'], null)->'data'->>'updated', '1', 'push result stored');
reset role;
update public.shift_round_nudge_ledger set updated_at = now() - interval '20 minutes' where id = (select id from led);
set local role service_role;
select is(public.shift_round_job_receipts_pending()->'data'->'receipts'->0->>'ticket_id', 'ticket-1', 'receipt pending after 15 min');
select is(shift_test.code(public.shift_round_job_receipt_result((select id from led), 'DeviceNotRegistered', true)), 'ok', 'receipt recorded');
reset role;
select is((select expo_push_token from public.profiles where id = (select u from led)), null, 'DeviceNotRegistered clears the token');

-- event pushes ignore the nudge opt-out but need push_enabled
select shift_test.clock('2026-11-22 19:10+07');
select shift_round_private.emit('evidence_rejected', (select r from f), (select eb from g), (select b from f), null,
  jsonb_build_object('evidence_id', gen_random_uuid(), 'type', 'interview'));
select shift_round_private.emit('evidence_rejected', (select r from f), (select ec from g), (select c from f), null,
  jsonb_build_object('evidence_id', gen_random_uuid(), 'type', 'interview'));
insert into public.shift_round_waitlist (user_id) select w from f;
select shift_round_private.emit('round_published', (select r from f), null, null, null, '{"number":9941}');
set local role service_role;
create temp table p1 on commit drop as select pg_temp.cands('pushes') as j;
select is((select array_agg(x->>'kind' order by x->>'kind') from p1, jsonb_array_elements(j->'candidates') x),
  array['evidence_rejected','round_published'], 'rejection push (opt-out ignored) and waitlist push; push-disabled user skipped');
select ok((select bool_and(x->'params'->>'url' like 'passion-seed://round%') from p1, jsonb_array_elements(j->'candidates') x), 'deep links set');
select is((select x->'params'->>'copy_key' from p1, jsonb_array_elements(j->'candidates') x where x->>'kind' = 'evidence_rejected'),
  'push.rejected', 'copy key for rejection');
reset role;
select is((select count(*)::int from public.shift_round_waitlist), 0, 'waitlist cleared after round_published push');
set local role service_role;
select is(jsonb_array_length(pg_temp.cands('pushes')->'candidates'), 0, 'event pushes are not repeated');

select * from finish();
rollback;
