\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(57);

-- ---------------------------------------------------------------------------
-- Default SHIFT config (v2 2.1): steps 1-7 as missions, counted per round config (E2, 2.3).
-- ---------------------------------------------------------------------------
select shift_test.clock('2026-11-15 10:00+07');
create temp table f on commit drop as select shift_test.round(9401, '2026-11-10 00:00+07') as r, shift_test.user() as u, shift_test.user() as o;
create temp table g on commit drop as select shift_test.entry(r, u) as e, shift_test.entry(r, o) as oe from f;

create function pg_temp.m(p_key text) returns jsonb language sql as $$ select shift_test.mission((select e from g), p_key) $$;
create function pg_temp.mc() returns jsonb language sql as $$ select shift_round_private.mission_counts((select e from g)) $$;

select is(shift_test.missions_complete((select e from g)), 0, 'nothing complete at start');
select is((select array_agg(x->>'key' order by (x->>'n')::int) from jsonb_array_elements(pg_temp.mc()->'missions') x),
  array['ideas','interviews','problem','prototype','testers','change','demo'], 'seven SHIFT missions in config order');
select is((pg_temp.mc()->>'missions_total')::int, 7, 'missions_total from the config');
select is((pg_temp.m('interviews')->>'n')::int, 2, 'n is the 1-based position in the config');
select is(pg_temp.m('interviews') - 'complete' - 'parts', '{"key":"interviews","n":2,"title_th":null,"title_en":null}'::jsonb,
  'mission object carries key, n and config titles (null by default)');
select is(pg_temp.m('interviews')->'parts', '[{"type":"interview","have":0,"need":3}]'::jsonb, 'parts carry type, have and need only');

-- any order (DS3): testers first; distinct who_key (E19)
select shift_test.ev((select e from g), 'tester', w) from unnest(array['T One','T Two']) w;
select is((pg_temp.m('testers')->>'complete')::boolean, false, 'two testers is not enough');
select shift_test.ev((select e from g), 'tester', '  t   one ');
select is(shift_test.have((select e from g), 'testers'), 2, 'who_key is case/space-insensitive (E19)');
select shift_test.ev((select e from g), 'tester', 'T Three');
select is((pg_temp.m('testers')->>'complete')::boolean, true, 'three distinct testers complete step 5 before step 1');

-- contact is a free log (D4)
select shift_test.ev((select e from g), 'contact', 'Aunt May');
select is(shift_test.missions_complete((select e from g)), 1, 'a contact completes no mission');
select shift_test.ev((select e from g), 'ideas');
select is((pg_temp.m('ideas')->>'complete')::boolean, true, 'an ideas log completes step 1');

-- interviews and the problem statement are separate missions now
create temp table iv on commit drop as select shift_test.ev((select e from g), 'interview', 'Ploy') as src;
select shift_test.ev((select e from g), 'interview', w) from unnest(array['Nok','Beam']) w;
select is((pg_temp.m('interviews')->>'complete')::boolean, true, 'three distinct interviews complete step 2');
select is((pg_temp.m('problem')->>'complete')::boolean, false, 'problem statement still missing');
select shift_test.ev((select e from g), 'problem_statement');
select is((pg_temp.m('problem')->>'complete')::boolean, true, 'problem statement completes step 3');

select shift_test.ev((select e from g), 'mvp');
select is((pg_temp.m('prototype')->>'complete')::boolean, true, 'mvp completes step 4 (prototype)');

-- reviewer-only demo completes the demo mission (DS15)
select shift_test.ev((select e from g), 'demo_post', null, 'submitted', null, null, 'reviewer_only');
select is((pg_temp.m('demo')->>'complete')::boolean, true, 'reviewer-only demo completes step 7');

-- change validity (E8)
create temp table ch on commit drop as select shift_test.ev((select e from g), 'change', null, 'submitted', null, (select src from iv)) as id;
select is((pg_temp.m('change')->>'complete')::boolean, true, 'change linked to counted interview counts');
select is((pg_temp.mc()->>'eligible')::boolean, true, 'all seven complete -> eligible');
select is((pg_temp.mc()->>'missions_complete')::int, 7, 'missions_complete = 7');

update public.shift_round_evidence set status = 'rejected', status_reason_code = 'other' where id = (select src from iv);
select is((pg_temp.m('change')->>'complete')::boolean, false, 'rejecting the source drops the change');
select is((pg_temp.m('interviews')->>'complete')::boolean, false, 'and drops step 2 (2 interviews left)');
select is((pg_temp.mc()->>'eligible')::boolean, false, 'no longer eligible');
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

-- people_talked_to: distinct who_key across contact/interview/tester (DS8); ideas never count
-- testers: T One, T Two, T Three; contact: Aunt May; interviews: Ploy, Nok, Beam
select is((pg_temp.mc()->>'people_talked_to')::int, 7, 'people_talked_to counts distinct people (withdrawn excluded)');
select shift_test.ev((select e from g), 'interview', 'Aunt May');
select is((pg_temp.mc()->>'people_talked_to')::int, 7, 'same person in two types counted once');

-- after close without grace is not counted (A7)
select shift_test.ev((select e from g), 'tester', 'Very Late', 'submitted', '2026-11-24 01:00+07');
select is(shift_test.have((select e from g), 'testers'), 3, 'after-close log not counted');

select is(shift_round_private.mission_counts(gen_random_uuid()), null, 'unknown entry -> null');

-- ---------------------------------------------------------------------------
-- A custom per-round config: titles, a two-part mission, a row-counted part.
-- ---------------------------------------------------------------------------
create temp table cf on commit drop as select shift_test.round(9402, '2026-11-10 00:00+07', p_missions =>
  '[{"key":"talk","title_th":"คุยกับคน","title_en":"Talk to people","parts":[{"type":"interview","need":2,"distinct":true},{"type":"problem_statement","need":1}]},
    {"key":"build","parts":[{"type":"mvp","need":2}]}]') as r, shift_test.user() as u;
create temp table cg on commit drop as select shift_test.entry(r, u) as e from cf;
select is((select jsonb_agg(x - 'parts') from jsonb_array_elements(shift_round_private.mission_counts((select e from cg))->'missions') x),
  '[{"key":"talk","n":1,"complete":false,"title_th":"คุยกับคน","title_en":"Talk to people"},
    {"key":"build","n":2,"complete":false,"title_th":null,"title_en":null}]'::jsonb, 'custom config: two missions with their titles');
select shift_test.ev((select e from cg), 'interview', w) from unnest(array['A One','a one','B Two']) w;
select is(shift_test.mission((select e from cg), 'talk')->'parts',
  '[{"type":"interview","have":2,"need":2},{"type":"problem_statement","have":0,"need":1}]'::jsonb, 'two-part mission reports both parts');
select is((shift_test.mission((select e from cg), 'talk')->>'complete')::boolean, false, 'a mission needs every part');
select shift_test.ev((select e from cg), 'problem_statement');
select is((shift_test.mission((select e from cg), 'talk')->>'complete')::boolean, true, 'both parts met -> complete');
select shift_test.ev((select e from cg), 'mvp') from generate_series(1, 2);
select is(shift_test.have((select e from cg), 'build'), 2, 'parts without distinct count rows');
select is((shift_round_private.mission_counts((select e from cg)) - 'missions' - 'daily' - 'sessions'),
  '{"missions_complete":2,"missions_total":2,"people_talked_to":2,"eligible":true}'::jsonb, 'eligible = every configured mission');
select shift_test.ev((select e from cg), 'tester', 'Outside Config');
select is((shift_round_private.mission_counts((select e from cg))->>'people_talked_to')::int, 3,
  'types outside the config still count as people talked to');

-- ---------------------------------------------------------------------------
-- valid_missions (v2 2.1)
-- ---------------------------------------------------------------------------
create function pg_temp.vm(j text) returns boolean language sql as $$ select shift_round_private.valid_missions(j::jsonb) $$;
select ok(pg_temp.vm(shift_round_private.default_missions()::text), 'the SHIFT default is valid');
select ok(pg_temp.vm('[{"key":"ab","title_th":"' || repeat('ก', 80) || '","title_en":null,"parts":[{"type":"interview","need":20,"distinct":false},{"type":"tester","need":1,"distinct":true},{"type":"mvp","need":1}]}]'),
  '80-char title, three parts, need 20, distinct on interview/tester');
select is(array[pg_temp.vm('[]'), pg_temp.vm('{}'), pg_temp.vm('null'),
                pg_temp.vm('[' || (select string_agg(format('{"key":"m%s","parts":[{"type":"%s","need":1}]}', chr(96 + i), t), ',')
                                     from generate_series(1, 7) i, lateral (select (array['ideas','interview','problem_statement','mvp','tester','change','demo_post'])[i] as t) x)
                       || ',{"key":"mh","parts":[{"type":"ideas","need":1}]},{"key":"mi","parts":[{"type":"mvp","need":1}]},{"key":"mj","parts":[{"type":"tester","need":1}]},{"key":"mk","parts":[{"type":"change","need":1}]}]')],
  array[false, false, false, false], 'needs a 1-10 mission array');
select is(array[
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":1}]},{"key":"aa","parts":[{"type":"tester","need":1}]}]'),
    pg_temp.vm('[{"key":"Bad","parts":[{"type":"mvp","need":1}]}]'),
    pg_temp.vm('[{"key":"a","parts":[{"type":"mvp","need":1}]}]'),
    pg_temp.vm('[{"key":"aa-b","parts":[{"type":"mvp","need":1}]}]'),
    pg_temp.vm('[{"parts":[{"type":"mvp","need":1}]}]')],
  array[false, false, false, false, false], 'keys are unique and match ^[a-z_]{2,32}$');
select is(array[
    pg_temp.vm('[{"key":"aa","parts":[{"type":"contact","need":1}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"daily","need":1}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"selfie","need":1}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":1}]},{"key":"bb","parts":[{"type":"mvp","need":1}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":1},{"type":"mvp","need":2}]}]')],
  array[false, false, false, false, false], 'types: not contact/daily, known, at most one mission each');
select is(array[
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":0}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":21}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":1.5}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":3.0}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":"1"}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":1,"distinct":true}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"tester","need":1,"distinct":"yes"}]}]')],
  array[false, false, false, false, false, false, false],
  'need is a plain integer 1..20 (3.0 refused: jsonb keeps it as text 3.0, which ::int cannot read); distinct is a boolean on interview/tester only');
select is(array[
    pg_temp.vm('[{"key":"aa","parts":[]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"ideas","need":1},{"type":"mvp","need":1},{"type":"change","need":1},{"type":"tester","need":1}]}]'),
    pg_temp.vm('[{"key":"aa","icon":"x","parts":[{"type":"mvp","need":1}]}]'),
    pg_temp.vm('[{"key":"aa","parts":[{"type":"mvp","need":1,"weight":2}]}]'),
    pg_temp.vm('[{"key":"aa","title_en":"' || repeat('x', 81) || '","parts":[{"type":"mvp","need":1}]}]'),
    pg_temp.vm('[{"key":"aa","title_th":"","parts":[{"type":"mvp","need":1}]}]')],
  array[false, false, false, false, false, false], '1-3 parts, no unknown keys, titles 1..80 chars');
select throws_ok($$update public.shift_rounds set missions = '[{"key":"aa","parts":[{"type":"contact","need":1}]}]' where number = 9402$$,
  '23514', null, 'the shift_rounds CHECK rejects an invalid config');

-- ---------------------------------------------------------------------------
-- Daily habit (step 8): distinct round days in ICT with a counted log (v2 2.3).
-- 7-day round 2026-11-10 .. 2026-11-16 ICT, closes 2026-11-17 00:00 ICT.
-- ---------------------------------------------------------------------------
create temp table df on commit drop as select shift_test.round(9403, '2026-11-10 00:00+07', p_duration => 7) as r, shift_test.user() as u;
create temp table dg on commit drop as select shift_test.entry(r, u) as e from df;
create function pg_temp.daily() returns jsonb language sql as $$ select shift_round_private.mission_counts((select e from dg))->'daily' $$;
create function pg_temp.sessions() returns jsonb language sql as $$ select shift_round_private.mission_counts((select e from dg))->'sessions' $$;

select shift_test.clock('2026-11-12 12:00+07');   -- day 3
select is(pg_temp.daily(), '{"days":0,"need":7,"today_logged":false}'::jsonb, 'daily: nothing yet, need = round days');
select shift_test.ev((select e from dg), 'daily', null, 'submitted', '2026-11-09 23:30+07');      -- day 0
select shift_test.ev((select e from dg), 'contact', 'Night Owl', 'submitted', '2026-11-10 23:59:59+07'); -- day 1, 16:59:59 UTC
select shift_test.ev((select e from dg), 'daily', null, 'submitted', '2026-11-10 17:00:01+00');   -- day 2 (00:00:01 ICT)
select is((pg_temp.daily()->>'days')::int, 2, 'logs one second either side of Bangkok midnight fall on two days; day 0 ignored');
select shift_test.ev((select e from dg), 'ideas', null, 'submitted', '2026-11-11 20:00+07');      -- day 2 again
select is((pg_temp.daily()->>'days')::int, 2, 'a second log on the same day adds nothing');
select shift_test.ev((select e from dg), 'mvp', null, 'rejected', '2026-11-12 09:00+07');         -- today, rejected
select is(pg_temp.daily()->'today_logged', 'false'::jsonb, 'a rejected log does not count for today');
select shift_test.ev((select e from dg), 'daily', null, 'submitted', '2026-11-12 11:00+07');
select is(pg_temp.daily(), '{"days":3,"need":7,"today_logged":true}'::jsonb, 'today logged -> day 3 counted');
-- a grace item (created before close, sent within 30 min after) lands on the last day
insert into public.shift_round_evidence (entry_id, round_id, user_id, submission_id, type, payload, payload_hash, who_key,
  client_created_at, submitted_at, local_date)
select e.id, e.round_id, e.user_id, gen_random_uuid(), 'tester',
       '{"who_label":"Late Tester","occurred_on":"2026-11-16","key_point":"x"}', 'x', 'late tester',
       '2026-11-16 23:50+07', '2026-11-17 00:10+07', '2026-11-17'
  from public.shift_round_entries e where e.id = (select e from dg);
select shift_test.clock('2026-11-17 00:20+07');
select is((pg_temp.daily()->>'days')::int, 4, 'grace item counts for the last round day');

-- ---------------------------------------------------------------------------
-- Sessions (step 9): held = session_end (ICT) passed; attended = present/makeup on session days.
-- ---------------------------------------------------------------------------
select shift_test.clock('2026-11-10 20:59:59+07');
select is(pg_temp.sessions(), '{"attended":0,"held":0,"total":5}'::jsonb, 'day 1 before 21:00: no session held yet');
select shift_test.clock('2026-11-10 21:00+07');
select is((pg_temp.sessions()->>'held')::int, 1, 'day 1 session held at 21:00 ICT');
select shift_test.clock('2026-11-12 12:00+07');
select is((pg_temp.sessions()->>'held')::int, 2, 'day 3 has no session: days 1 and 2 held');
insert into public.shift_round_attendance (entry_id, round_id, day, status)
select (select e from dg), (select r from df), d, s from (values (1, 'present'), (2, 'makeup'), (3, 'present'), (4, 'absent')) v(d, s);
select is((pg_temp.sessions()->>'attended')::int, 2, 'present and makeup count; absent and non-session days do not');
update public.shift_rounds set session_days = '{1,4,6,7}' where id = (select r from df);
select is(pg_temp.sessions(), '{"attended":1,"held":1,"total":4}'::jsonb, 'attendance follows the round''s current session days');
select shift_test.clock('2026-11-20 12:00+07');
select is((pg_temp.sessions()->>'held')::int, 4, 'every session held after the round');
update public.shift_rounds set session_days = '{}' where id = (select r from df);
select is(pg_temp.sessions(), '{"attended":0,"held":0,"total":0}'::jsonb, 'a round without live sessions');

select * from finish();
rollback;
