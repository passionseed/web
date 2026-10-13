\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(33);

select shift_test.clock('2026-11-20 10:00+07');
create temp table f on commit drop as select
  shift_test.round(9501, '2026-11-10 00:00+07') as r, shift_test.round(9502, '2026-11-10 00:00+07') as r2,
  shift_test.user() as u, shift_test.user() as mentor, shift_test.user() as other_mentor, shift_test.user() as staff;
select shift_test.grant_role(mentor, r, 'mentor') from f;
select shift_test.grant_role(other_mentor, r2, 'mentor') from f;
select shift_test.grant_role(staff, null, 'staff') from f;
create temp table g on commit drop as select shift_test.entry(r, u) as e from f;
create temp table ev on commit drop as select
  shift_test.ev((select e from g), 'tester', 'T1') as t1,
  shift_test.ev((select e from g), 'tester', 'T2') as t2,
  shift_test.ev((select e from g), 'tester', 'T3') as t3,
  shift_test.ev((select e from g), 'contact', 'C1') as c1;
create temp table ch on commit drop as select shift_test.ev((select e from g), 'change', null, 'submitted', null, (select t1 from ev)) as id;
grant select on f, g, ev, ch to authenticated;

-- mentor scoped to assigned round (A23)
select shift_test.login((select other_mentor from f));
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_reject_evidence((select t1 from ev), 'other', null, 1000)), 'forbidden',
  'mentor of another round cannot review');
select is((select count(*)::int from public.shift_round_evidence where entry_id = (select e from g)), 0, 'and cannot read its logs (RLS)');

select shift_test.login((select mentor from f));
select ok((select count(*) from public.shift_round_evidence where entry_id = (select e from g)) > 0, 'round mentor can read logs (RLS)');
select is(shift_test.code(public.shift_round_admin_reject_evidence((select t1 from ev), 'bogus', null, 1000)), 'invalid_field', 'reason code validated');
select is(shift_test.code(public.shift_round_admin_accept_evidence((select t1 from ev), null, 1000)), 'invalid_transition',
  'accept only from rejected (E3)');

-- reject cascade: testers mission drops, change invalidated (A9, E8)
create temp table rj on commit drop as select public.shift_round_admin_reject_evidence((select t1 from ev), 'not_real_person', 'Looks invented', 4200) as res;
select is(shift_test.code((select res from rj)), 'ok', 'reject ok');
select ok((select res->'data'->'dropped' ? 'testers' from rj), 'testers mission reported as dropped');
select ok((select res->'data'->'dropped' ? 'change' from rj), 'change mission reported as dropped');
select is((select res->'data'->'invalidated_changes' from rj), jsonb_build_array((select id from ch)), 'linked change invalidated');
select is(shift_test.code(public.shift_round_admin_reject_evidence((select t1 from ev), 'other', null, 10)), 'invalid_transition',
  'cannot reject twice');
create temp table ac on commit drop as select public.shift_round_admin_accept_evidence((select t1 from ev), 'Verified on call', 900) as res;
select is(shift_test.code((select res from ac)), 'ok', 'accept a rejected log');
select is((select (x->>'complete')::boolean from ac, jsonb_array_elements(res->'data'->'missions'->'missions') x where x->>'key' = 'testers'),
  true, 'accept restores the testers mission');
select is(shift_test.code(public.shift_round_admin_reject_evidence((select t1 from ev), 'other', null, 10)), 'invalid_transition',
  'accepted is final (A24)');

-- mark reviewed (T4)
select is(shift_test.code(public.shift_round_admin_mark_reviewed((select c1 from ev), 300)), 'ok', 'mark reviewed');
reset role;
select is((select status from public.shift_round_evidence where id = (select c1 from ev)), 'submitted', 'spot-check keeps status');
select is((select actor_id from public.shift_round_events where name = 'evidence_rejected' and props->>'evidence_id' = (select t1::text from ev)),
  (select mentor from f), 'reject event records actor (X9)');
select is((select user_id from public.shift_round_events where name = 'evidence_rejected' and props->>'evidence_id' = (select t1::text from ev)),
  (select u from f), 'reject event addressed to the student (push)');

-- student withdraw cascade (A24): dry run then apply
select shift_test.login((select u from f));
set local role authenticated;
create temp table wd on commit drop as select public.shift_round_withdraw_evidence((select t2 from ev), true) as res;
select is((select res->'data'->>'applied' from wd), 'false', 'dry run does not apply');
select is((select res->'data'->'affected'->0->>'mission' from wd), 'testers', 'dry run shows testers dropping');
select is((select status from public.shift_round_evidence where id = (select t2 from ev)), 'submitted', 'nothing changed by dry run');
select is(public.shift_round_withdraw_evidence((select t2 from ev), false)->'data'->>'applied', 'true', 'withdraw applied');
select is(public.shift_round_withdraw_evidence((select t2 from ev), false)->'data'->>'already', 'true', 'repeat apply is idempotent');
select is(shift_test.code(public.shift_round_withdraw_evidence((select t1 from ev), false)), 'withdraw_not_allowed',
  'accepted logs cannot be withdrawn');

-- review closed after review_ends_at even without a certificate (E4)
reset role;
select shift_test.clock('2026-11-26 00:00+07');
select shift_test.login((select staff from f));
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_reject_evidence((select t3 from ev), 'other', null, 10)), 'review_closed',
  'reject refused after review end');
select shift_test.login((select u from f));
select is(shift_test.code(public.shift_round_withdraw_evidence((select t3 from ev), false)), 'review_closed',
  'withdraw refused after review end');

-- round admin (3.4): create, midnight rule, policy lock after start
reset role;
select shift_test.clock('2026-11-20 10:00+07');
select shift_test.login((select staff from f));
set local role authenticated;
create temp table cr on commit drop as select public.shift_round_admin_create_round(
  '{"number":9599,"title_th":"รอบ","title_en":"Round","brief_th":"โจทย์","brief_en":"Brief","starts_at":"2026-12-01T00:00:00+07:00","status":"published"}') as res;
select is(shift_test.code((select res from cr)), 'ok', 'global staff creates a round');
select is(shift_test.code(public.shift_round_admin_create_round(
  '{"number":9599,"title_th":"x","title_en":"x","brief_th":"x","brief_en":"x","starts_at":"2026-12-01T00:00:00+07:00"}')), 'round_number_taken', 'number unique');
select is(public.shift_round_admin_create_round(
  '{"number":9598,"title_th":"x","title_en":"x","brief_th":"x","brief_en":"x","starts_at":"2026-12-01T05:00:00+07:00"}')->'error'->'details'->>'rule',
  'midnight_ict', 'starts_at must be 00:00 ICT');
reset role;
select is((select (tracks_open, duration_days, closes_at)::text from public.shift_rounds where number = 9599),
  (select (array['high_school'], 14, '2026-12-15 00:00+07'::timestamptz)::text), '14-day high_school default, closes_at derived');
select is((select count(*)::int from public.shift_round_events where name = 'round_published' and props->>'number' = '9599'), 1, 'round_published event');
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_update_round((select r from f), '{"duration_days":10}')), 'policy_locked', 'policy locked after start');
select is(shift_test.code(public.shift_round_admin_update_round((select r from f), '{"title_en":"Renamed"}')), 'ok', 'titles stay editable');
select shift_test.login((select mentor from f));
select is(shift_test.code(public.shift_round_admin_update_round((select r from f), '{"title_en":"x"}')), 'forbidden', 'mentors cannot edit rounds');

select * from finish();
rollback;
