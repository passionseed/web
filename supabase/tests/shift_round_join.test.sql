\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(34);

-- Round starts 2026-11-10 00:00 ICT, cutoff day 7. Clock on day 3.
select shift_test.clock('2026-11-12 10:00+07');
create temp table f on commit drop as select
  shift_test.round(9201, '2026-11-10 00:00+07', 'published', 'open') as open_r,
  shift_test.round(9202, '2026-11-10 00:00+07', 'published', 'invite') as invite_r,
  shift_test.round(9203, '2026-11-10 00:00+07', 'draft', 'open') as draft_r,
  shift_test.round(9204, '2026-11-24 00:00+07', 'published', 'open') as later_r,
  shift_test.user('student.a@example.test') as a,
  shift_test.user('Student.B@Example.test') as b,
  shift_test.user('student.c@example.test') as c,
  shift_test.user('student.d@example.test') as d;
grant select on f to authenticated;
insert into public.shift_round_allowlist (round_id, email) select invite_r, 'student.b@example.test' from f;
insert into public.shift_round_allowlist (round_id, user_id) select invite_r, c from f;

create function pg_temp.j(p_round uuid, p_track text default 'high_school', p_m int default 5,
  p_y int default 2009, p_consent boolean default true, p_handle text default 'ต้นกล้า')
returns jsonb language sql as $$ select public.shift_round_join(p_round, p_track, p_m, p_y, p_consent, p_handle) $$;

select shift_test.login((select a from f));
set local role authenticated;

select is(shift_test.code(public.shift_round_join(null, 'high_school', 5, 2009, true, 'ต้น')), 'round_not_found', 'unknown round');
select is(shift_test.code(pg_temp.j((select draft_r from f))), 'round_not_found', 'draft round is not joinable');
select is(shift_test.code(pg_temp.j((select invite_r from f))), 'invite_only', 'invite round without allowlist (A33)');
select is(shift_test.code(pg_temp.j((select open_r from f), 'university')), 'track_not_open', 'university track closed in beta (R16)');
select is(shift_test.code(pg_temp.j((select open_r from f), p_handle => 'x')), 'invalid_field', 'handle too short');
select is(pg_temp.j((select open_r from f), p_handle => '@toncool')->'error'->>'field', 'handle', '@handle rejected');
select is(pg_temp.j((select open_r from f), p_handle => '0812345678')->'error'->'details'->>'rule', 'personal_data', 'phone number handle rejected');
select is(pg_temp.j((select open_r from f), p_handle => 'www.ton.com')->'error'->>'field', 'handle', 'url handle rejected');
select is(pg_temp.j((select open_r from f), p_m => 13)->'error'->>'field', 'birth', 'bad birth month');
select is(shift_test.code(pg_temp.j((select open_r from f), p_consent => false)), 'guardian_consent_required', 'minor needs guardian consent (DS6)');

create temp table r1 on commit drop as select pg_temp.j((select open_r from f)) as res;
select is(shift_test.code((select res from r1)), 'ok', 'join succeeds');
select is((select res->'data'->>'guardian_required' from r1), 'true', 'guardian_required reported');
select is((select (res->'data'->>'already')::boolean from r1), false, 'first join is not a replay');
select is(shift_test.code(pg_temp.j((select open_r from f))), 'ok', 'rejoin is idempotent');
select is((pg_temp.j((select open_r from f))->'data'->>'entry_id'), (select res->'data'->>'entry_id' from r1), 'rejoin returns same entry');
select is(shift_test.code(pg_temp.j((select later_r from f))), 'already_in_active_round', 'one unfinished entry at a time (R4)');

-- allowlist by email (case-insensitive) and by user id
select shift_test.login((select b from f));
select is(shift_test.code(pg_temp.j((select invite_r from f))), 'ok', 'allowlisted by email (E14)');
select shift_test.login((select c from f));
select is(shift_test.code(pg_temp.j((select invite_r from f))), 'ok', 'allowlisted by user id (A33)');

-- guardian rule is month based; conservative in the birthday month (clock: Nov 2026)
select shift_test.login((select d from f));
select is((pg_temp.j((select open_r from f), p_m => 11, p_y => 2006, p_consent => true)->'data'->>'guardian_required'), 'true',
  'exactly 20 years in the birthday month still requires a guardian');
reset role;
delete from public.shift_round_entries where user_id = (select d from f);
set local role authenticated;
select is((pg_temp.j((select open_r from f), p_m => 10, p_y => 2006, p_consent => false)->'data'->>'guardian_required'), 'false',
  'over 20 years (241 months) needs no guardian');

-- enrollment flag
reset role;
update public.app_config set value = 'false' where key = 'shift_round.enrollment_enabled';
select shift_test.login(shift_test.user());
set local role authenticated;
select is(shift_test.code(pg_temp.j((select open_r from f))), 'enrollment_paused', 'enrollment kill switch (A54)');
reset role;
update public.app_config set value = 'true' where key = 'shift_round.enrollment_enabled';

-- cutoff: day 8 is closed (A12)
select shift_test.clock('2026-11-17 00:00+07');
create temp table late on commit drop as select shift_test.user() as u;
grant select on late to authenticated;
select shift_test.login((select u from late));
set local role authenticated;
select is(shift_test.code(pg_temp.j((select open_r from f))), 'join_closed', 'join closed on day 8');
reset role;
select shift_test.clock('2026-11-16 23:59+07');
set local role authenticated;
select is(shift_test.code(pg_temp.j((select open_r from f))), 'ok', 'join allowed on day 7');
select is((select joined_day from public.shift_round_entries where user_id = (select u from late)), 7, 'joined_day recorded');

-- unauthenticated
select shift_test.login(null);
select is(shift_test.code(pg_temp.j((select open_r from f))), 'unauthenticated', 'no session');

-- v2 2.6 (D6): an accepted, linked application for the round's cohort admits to an invite round
reset role;
select shift_test.clock('2026-11-12 10:00+07');
create temp table d6 on commit drop as select
  shift_test.round(9205, '2026-11-10 00:00+07', 'published', 'invite', p_application_cohort => 'SHIFT[9205]') as cohort_r,
  shift_test.round(9206, '2026-11-10 00:00+07', 'published', 'invite') as no_cohort_r,
  shift_test.user() as accepted, shift_test.user() as pending, shift_test.user() as other_cohort, shift_test.user() as accepted2;
insert into public.shift_applications (cohort, full_name, nickname, grade, problem, availability, ig_handle, parent_contact, status, user_id)
select c, 'Test Applicant', 'nick', 'm5', 'a problem', 'all_days', '@ig', 'parent', st, u
  from d6, lateral (values ('SHIFT[9205]', 'accepted', accepted), ('SHIFT[9205]', 'new', pending),
                           ('SHIFT[9999]', 'accepted', other_cohort), ('SHIFT[9205]', 'accepted', accepted2)) v(c, st, u);
grant select on d6 to authenticated;
create function pg_temp.joinable(p_round uuid) returns jsonb language sql as $$
  select x from jsonb_array_elements(public.shift_round_home()->'data'->'joinable') x where (x->>'round_id')::uuid = p_round $$;
select shift_test.login((select accepted from d6));
set local role authenticated;
select is(pg_temp.joinable((select cohort_r from d6))->'reason', 'null'::jsonb, 'accepted applicant: joinable reason null');
select is(pg_temp.joinable((select cohort_r from d6))->>'can_join', 'true', 'accepted applicant: can_join');
select is(pg_temp.joinable((select no_cohort_r from d6))->>'reason', 'invite_only', 'a round without application_cohort still needs the allowlist');
select is(shift_test.code(pg_temp.j((select cohort_r from d6))), 'ok', 'accepted applicant joins without an allowlist row');
select shift_test.login((select pending from d6));
select is(shift_test.code(pg_temp.j((select cohort_r from d6))), 'invite_only', 'an application that is not accepted does not admit');
select shift_test.login((select other_cohort from d6));
select is(pg_temp.joinable((select cohort_r from d6))->>'reason', 'invite_only', 'an accepted application for another cohort does not admit');
reset role;
update public.shift_rounds set application_cohort = null where id = (select cohort_r from d6);
select shift_test.login((select accepted2 from d6));
set local role authenticated;
select is(shift_test.code(pg_temp.j((select cohort_r from d6))), 'invite_only', 'clearing application_cohort closes that door');
reset role;
update public.shift_rounds set application_cohort = 'SHIFT[9205]' where id = (select cohort_r from d6);
update public.shift_applications set user_id = null where user_id = (select accepted2 from d6);
set local role authenticated;
select is(shift_test.code(pg_temp.j((select cohort_r from d6))), 'invite_only', 'an application not linked to the account does not admit');

-- A2: an identity that is not an auth user (hackathon-only) cannot own an entry
reset role;
select throws_ok(
  $$insert into public.shift_round_entries (round_id, user_id, track, handle, guardian_required, joined_at, joined_day)
    select open_r, gen_random_uuid(), 'high_school', 'hack', false, now(), 1 from f$$,
  '23503', null, 'entries require an auth.users identity (A2)');

select * from finish();
rollback;
