\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(14);

-- Override ignored without the allow flag (X3)
select set_config('shift_round.allow_clock_override', 'off', true);
select set_config('shift_round.now', '2001-01-01 00:00+00', true);
select ok(shift_round_private.round_now() > '2020-01-01'::timestamptz, 'override ignored when allow flag is off');
select set_config('shift_round.allow_clock_override', 'on', true);
select is(shift_round_private.round_now(), '2001-01-01 00:00+00'::timestamptz, 'override honoured when allow flag is on');
select set_config('shift_round.now', '', true);
select ok(shift_round_private.round_now() > '2020-01-01'::timestamptz, 'empty override falls back to now()');

create temp table rr on commit drop as select shift_test.round(9101, '2026-11-10 00:00+07') as r;

-- Day numbers in ICT, independent of UTC input
select is(shift_round_private.round_day((select r from rr), '2026-11-10 00:00+07'), 1, 'day 1 at 00:00 ICT');
select is(shift_round_private.round_day((select r from rr), '2026-11-09 17:00+00'), 1, 'UTC 17:00 the previous day is day 1 ICT');
select is(shift_round_private.round_day((select r from rr), '2026-11-09 16:59:59+00'), 0, 'one second earlier is day 0');
select is(shift_round_private.round_day((select r from rr), '2026-11-23 23:59:59+07'), 14, 'last day is 14');
select is(shift_round_private.local_date('2026-11-23 17:30+00'), '2026-11-24'::date, 'local_date converts to ICT');

-- Close boundary: 23:59:59 ICT on day 14 is active, 00:00 day 15 is review (A19/R15)
select shift_test.clock('2026-11-23 23:59:59+07');
select is(shift_round_private.round_phase((select r from rr)), 'active', '23:59:59 ICT on last day is active');
select shift_test.clock('2026-11-24 00:00:00+07');
select is(shift_round_private.round_phase((select r from rr)), 'review', '00:00 ICT day 15 is review');
select shift_test.clock('2026-11-09 23:59:59+07');
select is(shift_round_private.round_phase((select r from rr)), 'upcoming', 'before start is upcoming');
select shift_test.clock('2026-11-26 00:00:00+07');
select is(shift_round_private.round_phase((select r from rr)), 'finished', 'after 48h review window is finished');
select is((select review_ends_at from public.shift_rounds where id = (select r from rr)),
          '2026-11-26 00:00+07'::timestamptz, 'review_ends_at is trigger-maintained = closes_at + 48h');

update public.shift_rounds set review_window_hours = 24 where id = (select r from rr);
select is((select review_ends_at from public.shift_rounds where id = (select r from rr)),
          '2026-11-25 00:00+07'::timestamptz, 'review_ends_at follows review_window_hours');

select * from finish();
rollback;
