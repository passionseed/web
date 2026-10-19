\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(36);

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
select is((select j->'candidates'->0->'params'->>'n' from n1), '7', 'missions remaining in params (of the 7 configured)');
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

-- A log rejected again (after a reinstate) pushes again: dedupe is per rejection event.
reset role;
create temp table rj2 on commit drop as select gen_random_uuid() as evid;
grant select on rj2 to service_role;
select shift_round_private.emit('evidence_rejected', (select r from f), (select eb from g), (select b from f), null,
  jsonb_build_object('evidence_id', (select evid from rj2), 'type', 'interview'));
select shift_round_private.emit('evidence_rejected', (select r from f), (select eb from g), (select b from f), null,
  jsonb_build_object('evidence_id', (select evid from rj2), 'type', 'interview'));
set local role service_role;
select is((select count(*)::int from jsonb_array_elements(pg_temp.cands('pushes')->'candidates') x
            where x->>'kind' = 'evidence_rejected' and x->'params'->>'url' like '%' || (select evid from rj2)::text),
  2, 'second rejection of the same log is pushed too');

-- A row claimed as pending by a run that died is treated as failed after 10 minutes and retried.
reset role;
update public.shift_round_nudge_ledger set updated_at = now() - interval '11 minutes'
 where status = 'pending' and kind = 'round_published';
set local role service_role;
create temp table p3 on commit drop as select pg_temp.cands('pushes') as j;
select is((select array_agg(x->>'kind') from p3, jsonb_array_elements(j->'candidates') x), array['round_published'],
  'stale pending push is retried (fresh pending rows are left alone)');
reset role;
select is((select attempts::int from public.shift_round_nudge_ledger where kind = 'round_published'), 1,
  'the lost attempt is counted');

-- ---------------------------------------------------------------------------
-- v2 2.7 session reminders: session_start - 30 min (ICT) on session days, one per entry per day.
-- 7-day round from 2026-12-01, sessions 1,2,4,6,7 at 19:00, nudge at the new 21:15 default.
-- ---------------------------------------------------------------------------
reset role;
create temp table sf on commit drop as select
  shift_test.round(9942, '2026-12-01 00:00+07', p_duration => 7, p_nudge => '21:15') as r,
  shift_test.user() as s1, shift_test.user() as s2, shift_test.user() as s3, shift_test.user() as s4;
update public.profiles set expo_push_token = 'ExponentPushToken[' || id || ']', mobile_settings = '{"push_enabled":true}'
 where id in (select unnest(array[s1, s2, s3]) from sf);
update public.profiles set shift_round_nudges = false where id = (select s2 from sf);
update public.profiles set mobile_settings = '{"push_enabled":false}' where id = (select s3 from sf);
create temp table sg on commit drop as select shift_test.entry(r, s1) as e1, shift_test.entry(r, s2) as e2,
  shift_test.entry(r, s3) as e3, shift_test.entry(r, s4) as e4 from sf;
grant select on sf, sg to service_role;
create function pg_temp.sessions(p_at timestamptz) returns jsonb language plpgsql as $$
begin
  perform shift_test.clock(p_at);
  return coalesce((select jsonb_agg(x) from jsonb_array_elements(public.shift_round_job_push_candidates('nudges', 500)->'data'->'candidates') x
                    where x->>'kind' = 'session'), '[]'::jsonb);
end $$;
grant execute on function pg_temp.sessions(timestamptz) to service_role;

set local role service_role;
select is(jsonb_array_length(pg_temp.sessions('2026-12-01 18:29+07')), 0, 'nothing before session_start - 30 min');
create temp table sr1 on commit drop as select pg_temp.sessions('2026-12-01 18:30+07') as j;
select is((select array_agg((x->>'user_id')::uuid) from sr1, jsonb_array_elements(j) x), array[(select s1 from sf)],
  'reminder at 18:30 to the entry with push on (opted-out, push-disabled and token-less skipped)');
select is((select (j->0->'params') - 'session_starts_at' from sr1),
  '{"copy_key":"push.session","day":1,"time":"19:00","round_number":9942,"url":"passion-seed://round"}'::jsonb,
  'session push params: copy key, day, time, deep link');
select is((select (j->0->'params'->>'session_starts_at')::timestamptz from sr1), '2026-12-01 19:00+07'::timestamptz, 'session start carried for retries');
select is(jsonb_array_length(pg_temp.sessions('2026-12-01 18:40+07')), 0, 'rerun in the window sends nothing (idempotent)');
reset role;
select is((select dedupe_key from public.shift_round_nudge_ledger where kind = 'session'), (select e1::text || ':1' from sg),
  'ledger dedupe key is entry:day');
set local role service_role;
select is(jsonb_array_length(pg_temp.sessions('2026-12-01 19:00+07')), 0, 'nothing once the session has started');
select is(jsonb_array_length(pg_temp.sessions('2026-12-03 18:35+07')), 0, 'day 3 has no session');
select is(jsonb_array_length(pg_temp.sessions('2026-12-02 18:45+07')), 1, 'day 2: a new reminder (one per entry per day)');

-- retry a failed reminder until the session starts, then abandon it
reset role;
update public.shift_round_nudge_ledger set status = 'failed', attempts = 1
 where kind = 'session' and dedupe_key = (select e1::text || ':2' from sg);
set local role service_role;
select is(jsonb_array_length(pg_temp.sessions('2026-12-02 18:50+07')), 1, 'a failed reminder is retried before the start');
reset role;
update public.shift_round_nudge_ledger set status = 'failed', attempts = 2
 where kind = 'session' and dedupe_key = (select e1::text || ':2' from sg);
set local role service_role;
select is(jsonb_array_length(pg_temp.sessions('2026-12-02 19:01+07')), 0, 'no retry after the session started');
reset role;
select is((select status from public.shift_round_nudge_ledger where kind = 'session' and dedupe_key = (select e1::text || ':2' from sg)),
  'abandoned', 'and the late reminder is abandoned');
select is((select count(*)::int from public.shift_round_nudge_ledger where kind = 'session'), 2, 'two session reminders in the ledger');

-- no-log nudge at the round's nudge_local_time (21:15 default) for one hour, once per day
set local role service_role;
select shift_test.clock('2026-12-02 21:10+07');
select is((select count(*)::int from jsonb_array_elements(public.shift_round_job_push_candidates('nudges', 500)->'data'->'candidates') x
            where x->>'kind' = 'no_evidence'), 0, 'no-log nudge not before 21:15');
select shift_test.clock('2026-12-02 21:20+07');
select is((select array_agg((x->>'user_id')::uuid) from jsonb_array_elements(public.shift_round_job_push_candidates('nudges', 500)->'data'->'candidates') x
            where x->>'kind' = 'no_evidence'), array[(select s1 from sf)], 'no-log nudge from 21:15');

select * from finish();
rollback;
