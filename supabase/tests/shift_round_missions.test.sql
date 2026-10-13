\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(22);

select shift_test.clock('2026-11-15 10:00+07');
create temp table f on commit drop as select shift_test.round(9401, '2026-11-10 00:00+07') as r, shift_test.user() as u, shift_test.user() as o;
create temp table g on commit drop as select shift_test.entry(r, u) as e, shift_test.entry(r, o) as oe from f;

create function pg_temp.m(p_key text) returns jsonb language sql as $$
  select x from jsonb_array_elements(shift_round_private.mission_counts((select e from g))->'missions') x where x->>'key' = p_key $$;

select is(shift_test.missions_complete((select e from g)), 0, 'nothing complete at start');
select is(jsonb_array_length(shift_round_private.mission_counts((select e from g))->'missions'), 6, 'six missions reported');

-- any order (DS3): testers first
select shift_test.ev((select e from g), 'tester', w) from unnest(array['T One','T Two']) w;
select is((pg_temp.m('testers')->>'complete')::boolean, false, 'two testers is not enough');
select shift_test.ev((select e from g), 'tester', '  t   one ');
select is((pg_temp.m('testers')->>'n')::int, 2, 'who_key is case/space-insensitive (E19)');
select shift_test.ev((select e from g), 'tester', 'T Three');
select is((pg_temp.m('testers')->>'complete')::boolean, true, 'three distinct testers complete mission 4 before mission 1');

select shift_test.ev((select e from g), 'contact', 'Aunt May');
select is((pg_temp.m('first_contact')->>'complete')::boolean, true, 'one contact completes mission 1');

-- mission 2 needs 3 distinct interviews AND a problem statement
create temp table iv on commit drop as select shift_test.ev((select e from g), 'interview', 'Ploy') as src;
select shift_test.ev((select e from g), 'interview', w) from unnest(array['Nok','Beam']) w;
select is((pg_temp.m('interviews_problem')->>'complete')::boolean, false, 'interviews without problem statement');
select shift_test.ev((select e from g), 'problem_statement');
select is((pg_temp.m('interviews_problem')->>'complete')::boolean, true, 'interviews + problem complete mission 2');

select shift_test.ev((select e from g), 'mvp');
select is((pg_temp.m('mvp')->>'complete')::boolean, true, 'mvp completes mission 3');

-- reviewer-only demo completes mission 6 (DS15)
select shift_test.ev((select e from g), 'demo_post', null, 'submitted', null, null, 'reviewer_only');
select is((pg_temp.m('demo_post')->>'complete')::boolean, true, 'reviewer-only demo completes mission 6');

-- change validity (E8)
create temp table ch on commit drop as select shift_test.ev((select e from g), 'change', null, 'submitted', null, (select src from iv)) as id;
select is((pg_temp.m('change')->>'complete')::boolean, true, 'change linked to counted interview counts');
select is((shift_round_private.mission_counts((select e from g))->>'eligible')::boolean, true, 'all six complete -> eligible');

update public.shift_round_evidence set status = 'rejected', status_reason_code = 'other' where id = (select src from iv);
select is((pg_temp.m('change')->>'complete')::boolean, false, 'rejecting the source drops the change');
select is((pg_temp.m('interviews_problem')->>'complete')::boolean, false, 'and drops mission 2 (2 interviews left)');
update public.shift_round_evidence set status = 'accepted' where id = (select src from iv);
select is((pg_temp.m('change')->>'complete')::boolean, true, 're-accepting the source restores the change');
update public.shift_round_evidence set status = 'rejected', status_reason_code = 'other' where id = (select id from ch);
select is((pg_temp.m('change')->>'complete')::boolean, false, 'a rejected change stays out even with a valid source');

-- cross-entry source never counts
create temp table oiv on commit drop as select shift_test.ev((select oe from g), 'interview', 'Other') as src;
select shift_test.ev((select e from g), 'change', null, 'submitted', null, (select src from oiv));
select is((pg_temp.m('change')->>'complete')::boolean, false, 'change with another entry''s source does not count');

-- withdrawn does not count
create temp table w on commit drop as select shift_test.ev((select e from g), 'contact', 'Second Contact') as id;
update public.shift_round_evidence set status = 'withdrawn' where id = (select id from w);
select is((pg_temp.m('first_contact')->>'n')::int, 1, 'withdrawn contact not counted');

-- people_talked_to: distinct who_key across contact/interview/tester (DS8)
-- testers: T One, T Two, T Three; contact: Aunt May; interviews: Ploy, Nok, Beam
select is((shift_round_private.mission_counts((select e from g))->>'people_talked_to')::int, 7, 'people_talked_to counts distinct people');
select shift_test.ev((select e from g), 'interview', 'Aunt May');
select is((shift_round_private.mission_counts((select e from g))->>'people_talked_to')::int, 7, 'same person in two types counted once');

-- after close without grace is not counted (A7)
select shift_test.ev((select e from g), 'contact', 'Very Late', 'submitted', '2026-11-24 01:00+07');
select is((pg_temp.m('first_contact')->>'n')::int, 1, 'after-close log not counted');

select is(shift_round_private.mission_counts(gen_random_uuid()), null, 'unknown entry -> null');

select * from finish();
rollback;
