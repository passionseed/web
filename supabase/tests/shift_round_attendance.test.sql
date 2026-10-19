\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(45);

-- v2 2.4 attendance + 2.8 admin steps read model.
-- 7-day round 2026-11-10 .. 2026-11-16 ICT, sessions on days 1,2,4,6,7 at 19:00-21:00. Clock: day 2, 21:30.
select shift_test.clock('2026-11-11 21:30+07');
create temp table f on commit drop as select
  shift_test.round(9951, '2026-11-10 00:00+07', p_duration => 7, p_join_cutoff => 2) as r,
  shift_test.round(9952, '2026-11-10 00:00+07', p_duration => 7, p_join_cutoff => 2) as r2,
  shift_test.user() as staff, shift_test.user() as mentor, shift_test.user() as other_mentor, shift_test.user() as global_staff,
  shift_test.user() as a, shift_test.user() as b, shift_test.user() as x;
select shift_test.grant_role(staff, r, 'staff') from f;
select shift_test.grant_role(mentor, r, 'mentor') from f;
select shift_test.grant_role(other_mentor, r2, 'mentor') from f;
select shift_test.grant_role(global_staff, null, 'staff') from f;
update public.profiles set full_name = 'Somchai Real Name' where id = (select a from f);
create temp table g on commit drop as select shift_test.entry(r, a, 'Aye') as ea, shift_test.entry(r, b, 'Bee') as eb,
  shift_test.entry(r2, x, 'Ex') as ex from f;
insert into public.shift_round_squads (id, round_id, name, mentor_user_id)
  select 'c0000000-0000-4000-8000-000000000001', r, 'Mango', mentor from f;
insert into public.shift_round_squad_members (squad_id, entry_id, round_id, icebreaker_question)
  select 'c0000000-0000-4000-8000-000000000001', ea, (select r from f), 1 from g;
select shift_test.ev((select ea from g), 'ideas', null, 'submitted', '2026-11-10 20:30+07');
grant select on f, g to authenticated;

create function pg_temp.mark(p_day int, p_marks jsonb, p_round uuid default null) returns jsonb language sql as $$
  select public.shift_round_admin_mark_attendance(coalesce(p_round, (select r from f)), p_day, p_marks) $$;
create function pg_temp.one(p_entry uuid, p_status text) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('entry_id', p_entry, 'status', p_status)) $$;

-- gate: reviewers of the round only (round staff/mentors, global staff, web admins)
select shift_test.login(null);
set local role authenticated;
select is(shift_test.code(pg_temp.mark(1, pg_temp.one((select ea from g), 'present'))), 'unauthenticated', 'no session');
select shift_test.login((select a from f));
select is(shift_test.code(pg_temp.mark(1, pg_temp.one((select ea from g), 'present'))), 'forbidden', 'students cannot mark attendance');
select shift_test.login((select other_mentor from f));
select is(shift_test.code(pg_temp.mark(1, pg_temp.one((select ea from g), 'present'))), 'forbidden', 'a mentor of another round cannot mark');
select shift_test.login((select global_staff from f));
select is(shift_test.code(pg_temp.mark(1, pg_temp.one((select ea from g), 'present'), gen_random_uuid())), 'round_not_found', 'unknown round');

-- validation: session days only, batch validated before any write
select shift_test.login((select mentor from f));
select is(pg_temp.mark(3, pg_temp.one((select ea from g), 'present'))->'error'->'details'->>'rule', 'not_session_day',
  'day 3 has no session');
select is(pg_temp.mark(9, pg_temp.one((select ea from g), 'present'))->'error'->>'field', 'day', 'day outside the round');
select is(pg_temp.mark(null, pg_temp.one((select ea from g), 'present'))->'error'->>'field', 'day', 'day required');
select is(pg_temp.mark(1, '[]')->'error'->>'field', 'marks', 'empty batch refused');
select is(pg_temp.mark(1, pg_temp.one((select ea from g), 'late'))->'error'->'details'->>'rule', 'status', 'unknown status refused');
select is(pg_temp.mark(1, '[{"entry_id":"not-a-uuid","status":"present"}]')->'error'->'details'->>'rule', 'entry_id', 'bad entry id');
select is(pg_temp.mark(1, jsonb_build_array(jsonb_build_object('entry_id', (select ea from g), 'status', 'present', 'note', 'x')))->'error'->>'field',
  'marks', 'unknown keys refused');
select is(pg_temp.mark(1, jsonb_build_array(jsonb_build_object('entry_id', (select ea from g)))) ->'error'->>'field',
  'marks', 'status key required (null clears)');
select is(pg_temp.mark(1, pg_temp.one((select ea from g), 'present') || pg_temp.one((select ea from g), 'absent'))->'error'->'details'->>'rule',
  'duplicate', 'one mark per entry per call');
select is(shift_test.code(pg_temp.mark(1, pg_temp.one((select ea from g), 'present') || pg_temp.one((select ex from g), 'present'))),
  'wrong_round', 'entries of another round refused');
reset role;
select is((select count(*)::int from public.shift_round_attendance), 0, 'a refused batch writes nothing');

-- marking
select shift_test.login((select mentor from f));
set local role authenticated;
create temp table m1 on commit drop as select pg_temp.mark(1, pg_temp.one((select ea from g), 'present') || pg_temp.one((select eb from g), 'absent')) as res;
select is(shift_test.code((select res from m1)), 'ok', 'round mentor marks day 1');
select is((select (res->'data'->>'set')::int from m1), 2, 'two marks set');
select is((select jsonb_array_length(res->'data'->'attendance') from m1), 2, 'response lists the day''s attendance');
select is(pg_temp.mark(1, pg_temp.one((select ea from g), 'makeup'))->'data'->>'set', '1', 'marking again overwrites');
create temp table m3 on commit drop as select pg_temp.mark(1, pg_temp.one((select eb from g), null)) as res;
select is((select (res->'data'->>'cleared')::int from m3), 1, 'null clears a mark');
select is((select res->'data'->'attendance' from m3) #>> '{0,status}', 'makeup', 'remaining mark returned');
reset role;
select is((select array_agg((entry_id = (select ea from g))::text || ':' || day || ':' || status || ':' || (marked_by = (select mentor from f))::text)
             from public.shift_round_attendance), array['true:1:makeup:true'], 'one row left: Aye, day 1, makeup, marked by the mentor');

-- audit (X9): one event per call, ids and codes only
select is((select count(*)::int from public.shift_round_events where name = 'attendance_marked'), 3, 'one attendance_marked event per call');
select is((select actor_id from public.shift_round_events where name = 'attendance_marked' order by id limit 1), (select mentor from f),
  'event records the actor');
select is((select props - 'marks' from public.shift_round_events where name = 'attendance_marked' order by id limit 1),
  '{"day":1,"set":2,"cleared":0}'::jsonb, 'event props: day and counts');
select is((select props->'marks'->1 from public.shift_round_events where name = 'attendance_marked' order by id limit 1),
  jsonb_build_object('entry_id', (select eb from g), 'status', 'absent'), 'event props: entry ids and status codes only');

-- students see their counts through home, never the rows
select shift_test.login((select a from f));
set local role authenticated;
select is(public.shift_round_home((select ea from g))->'data'->'missions'->'sessions', '{"attended":1,"held":2,"total":5}'::jsonb,
  'home counts: makeup attended, days 1 and 2 held');
select throws_ok($$select * from public.shift_round_attendance$$, '42501', null, 'no client access to attendance rows');

-- global staff and web admins can mark too
select shift_test.login((select global_staff from f));
select is(shift_test.code(pg_temp.mark(2, pg_temp.one((select ea from g), 'present'))), 'ok', 'global staff marks day 2');

-- ---------------------------------------------------------------------------
-- shift_round_admin_steps
-- ---------------------------------------------------------------------------
select shift_test.login((select a from f));
select is(shift_test.code(public.shift_round_admin_steps((select r from f))), 'forbidden', 'students cannot read the steps model');
select shift_test.login((select other_mentor from f));
select is(shift_test.code(public.shift_round_admin_steps((select r from f))), 'forbidden', 'nor mentors of another round');

select shift_test.login((select mentor from f));
create temp table st on commit drop as select public.shift_round_admin_steps((select r from f)) as res;
select is(shift_test.code((select res from st)), 'ok', 'round mentor reads the steps model');
select is((select jsonb_array_length(res->'data'->'rows') from st), 2, 'one row per entry');
select is((select array_agg(k order by k) from st, jsonb_object_keys(res->'data'->'rows'->0) k),
  array['attendance','counts','display_name','entry_id','handle','joined_day','last_log_at','squad_id','squad_name','user_id'],
  'row fields per spec 2.8');
select is((select res->'data'->'rows'->0->>'display_name' from st), null, 'mentors do not get display names');
select is((select res->'data'->'rows'->0->'attendance' from st), '[{"day":1,"status":"makeup"},{"day":2,"status":"present"}]'::jsonb,
  'attendance per entry, by day');
select is((select (r->>'squad_name') || '/' || (r->>'handle') from st, jsonb_array_elements(res->'data'->'rows') r where r->>'handle' = 'Aye'),
  'Mango/Aye', 'squad name on the row');
select is((select (r->>'last_log_at')::timestamptz from st, jsonb_array_elements(res->'data'->'rows') r where r->>'handle' = 'Aye'),
  '2026-11-10 20:30+07'::timestamptz, 'last log time');
select is((select array_agg(k order by k) from st, jsonb_object_keys(res->'data'->'rows'->0->'counts') k),
  array['daily','eligible','missions','missions_complete','missions_total','people_talked_to','sessions'], 'counts carry the 2.3 json');
select is((select res->'data'->'round'->>'day' from st), '2', 'round summary with the current day');

select shift_test.login((select staff from f));
select is((select r->>'display_name' from jsonb_array_elements(public.shift_round_admin_steps((select r from f))->'data'->'rows') r
            where r->>'handle' = 'Aye'), 'Somchai Real Name', 'round staff see the profile display name');

-- marks open when a session starts and count only once it has ended (review fix)
select shift_test.login((select mentor from f));
set local role authenticated;
select is(pg_temp.mark(4, pg_temp.one((select eb from g), 'present'))->'error'->'details'->>'rule', 'not_started',
  'no marks before the session starts');
reset role;
select shift_test.clock('2026-11-13 19:30+07');
select shift_test.login((select mentor from f));
set local role authenticated;
select is(shift_test.code(pg_temp.mark(4, pg_temp.one((select eb from g), 'present'))), 'ok', 'marks open once the session starts');
select shift_test.login((select b from f));
select is(public.shift_round_home((select eb from g))->'data'->'missions'->'sessions', '{"attended":0,"held":2,"total":5}'::jsonb,
  'a mark on a live session does not count yet, so it cannot cover a missed one');
reset role;
select shift_test.clock('2026-11-13 21:01+07');
select shift_test.login((select b from f));
set local role authenticated;
select is(public.shift_round_home((select eb from g))->'data'->'missions'->'sessions', '{"attended":1,"held":3,"total":5}'::jsonb,
  'it counts once the session has ended');

select * from finish();
rollback;
