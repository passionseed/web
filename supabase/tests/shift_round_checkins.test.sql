\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(12);

select shift_test.clock('2026-11-11 10:00+07');   -- day 2
create temp table f on commit drop as select shift_test.round(9931, '2026-11-10 00:00+07') as r, shift_test.user() as u, shift_test.user() as late;
create temp table g on commit drop as select shift_test.entry(r, u, 'Early', 1) as e, shift_test.entry(r, late, 'Late', 6) as el from f;
grant select on f, g to authenticated;

select shift_test.login((select u from f));
set local role authenticated;
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'join', '{"ownership":4}')), 'checkin_not_due',
  'join check-in appears only after the first log');
reset role;
select shift_test.ev((select e from g), 'contact', 'Aunt May');
set local role authenticated;
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'join', '{}')), 'invalid_field', 'at least one answer');
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'join', '{"ownership":9}')), 'invalid_field', 'scale 1-5');
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'join', '{"satisfied":3}')), 'invalid_field',
  'key not asked at this checkpoint');
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'join', '{"ownership":4,"why":"wanted_to","confidence":3}')),
  'ok', 'join check-in');
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'join', '{"ownership":5}')), 'checkin_already_submitted',
  'once per checkpoint');
select is(public.shift_round_home((select e from g))->'data'->'checkins_done', '["join"]'::jsonb, 'home shows it done');

-- midpoint: day 7..14, only if joined_day <= 5
reset role;
select shift_test.clock('2026-11-16 10:00+07');   -- day 7
set local role authenticated;
select is(public.shift_round_home((select e from g))->'data'->'checkins_due', '["midpoint"]'::jsonb, 'midpoint due on day 7');
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'midpoint', '{"ownership":4,"squad":3,"decided_myself":"I picked the topic"}')),
  'ok', 'midpoint check-in');
select shift_test.login((select late from f));
select is(shift_test.code(public.shift_round_submit_checkin((select el from g), 'midpoint', '{"ownership":4}')), 'checkin_not_due',
  'midpoint skipped for joined_day >= 6');

-- close: from the last day until review end
select shift_test.login((select u from f));
reset role;
select shift_test.clock('2026-11-23 20:00+07');   -- day 14
set local role authenticated;
select is(shift_test.code(public.shift_round_submit_checkin((select e from g), 'close',
  '{"ownership":5,"why":"care_people","confidence":4,"squad":4,"satisfied":5,"can_do_now":"Interview strangers"}')), 'ok', 'close check-in');
reset role;
select shift_test.clock('2026-11-26 00:00+07');
set local role authenticated;
select shift_test.login((select late from f));
select is(shift_test.code(public.shift_round_submit_checkin((select el from g), 'close', '{"ownership":3}')), 'checkin_not_due',
  'close check-in ends at review end');

select * from finish();
rollback;
