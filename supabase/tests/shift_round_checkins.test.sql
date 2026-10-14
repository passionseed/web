\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(16);

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

-- v2: windows scale with the round (7 days: join until day 3, midpoint from day 4)
reset role;
select shift_test.clock('2026-12-03 10:00+07');   -- day 3 of a 7-day round
create temp table s7 on commit drop as select shift_test.round(9932, '2026-12-01 00:00+07', p_duration => 7, p_join_cutoff => 2) as r,
  shift_test.user() as u;
create temp table e7 on commit drop as select shift_test.entry(r, u, 'Seven', 0) as e from s7;
select shift_test.ev((select e from e7), 'ideas', null, 'submitted', '2026-12-01 20:00+07');
grant select on s7, e7 to authenticated;
select shift_test.login((select u from s7));
set local role authenticated;
select is(public.shift_round_home((select e from e7))->'data'->'checkins_due', '["join"]'::jsonb, '7-day round: join check-in due on day 3');
reset role;
select shift_test.clock('2026-12-04 10:00+07');   -- day 4
set local role authenticated;
select is(public.shift_round_home((select e from e7))->'data'->'checkins_due', '["midpoint"]'::jsonb,
  '7-day round: join window closed, midpoint due from day 4');
reset role;
select shift_test.clock('2026-12-07 20:00+07');   -- day 7
set local role authenticated;
select is(shift_test.code(public.shift_round_submit_checkin((select e from e7), 'midpoint', '{"ownership":4}')), 'ok', 'midpoint answered');
select is(public.shift_round_home((select e from e7))->'data'->'checkins_due', '["close"]'::jsonb, 'last day: close check-in due');

select * from finish();
rollback;
