\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(29);

-- v2 2.5: student-safe plan from shift_curriculum + home bundle round/joinable fields.
select shift_test.clock('2026-11-11 10:00+07');   -- day 2 of rounds starting 2026-11-10

-- the default row ships with the migrations (full mentor doc; students get a stripped copy)
select ok((select content ? 'days' and content->'days'->0 ? 'mentorChecks' and content->'days'->0 ? 'schedule'
             from public.shift_curriculum where round = 'default'), 'default curriculum row seeded as a full mentor doc');
select is((select jsonb_array_length(content->'days') from public.shift_curriculum where round = 'default'), 7, 'seven SHIFT days');

-- a mentor curriculum with mentor-only fields, oversized values and junk
insert into public.shift_curriculum (round, content) values ('plan-test', jsonb_build_object(
  'sessionTime', '19:00-21:00 SECRET-TIME',
  'rules', (select jsonb_agg(case when i = 2 then to_jsonb(42) else to_jsonb('rule ' || i) end) from generate_series(1, 25) i),
  'interview', jsonb_build_object('intro', repeat('ก', 2500), 'dm', 'DM text', 'questions', '["q1","q2"]'::jsonb,
                                  'dos', '["do"]'::jsonb, 'donts', '["dont"]'::jsonb, 'mentorNote', 'SECRET-NOTE'),
  'days', jsonb_build_array(
    jsonb_build_object('day', 2, 'date', '2026-11-11', 'name', 'Day two', 'mentorSession', true, 'goal', 'g2',
                       'schedule', '[["19:00","SECRET-SCHEDULE",""]]'::jsonb, 'mission', 'm2', 'refundSteps', '[2,3,8,9]'::jsonb,
                       'mentorChecks', '["SECRET-CHECK"]'::jsonb),
    jsonb_build_object('day', 1, 'date', '2026-11-10', 'name', 'Day one', 'mentorSession', true, 'goal', 'g1',
                       'mission', 'm1', 'refundSteps', '[1,8,9,"x",99]'::jsonb, 'mentorChecks', '["SECRET-CHECK"]'::jsonb),
    jsonb_build_object('day', 1, 'name', 'Duplicate day one', 'goal', 'dup', 'mission', 'dup', 'refundSteps', '[]'::jsonb),
    jsonb_build_object('day', 9, 'name', 'Beyond the round', 'goal', 'g9', 'mission', 'm9', 'refundSteps', '[7]'::jsonb),
    jsonb_build_object('day', 0, 'name', 'Day zero', 'goal', 'g0', 'mission', 'm0', 'refundSteps', '[1]'::jsonb),
    jsonb_build_object('day', 3, 'name', 42, 'mission', 'm3'),
    '"not a day"'::jsonb)));

create temp table f on commit drop as select
  shift_test.round(9961, '2026-11-10 00:00+07', 'published', 'invite', p_duration => 7, p_join_cutoff => 2,
                   p_curriculum_key => 'plan-test', p_application_cohort => 'SHIFT[9961]') as r_cur,
  shift_test.round(9962, '2026-11-10 00:00+07', 'published', 'open', p_duration => 7, p_curriculum_key => 'no-such-row') as r_missing,
  shift_test.round(9963, '2026-11-10 00:00+07', 'published', 'open', p_duration => 7) as r_none,
  shift_test.user() as u, shift_test.user() as v;
create temp table g on commit drop as select shift_test.entry(r_cur, u) as e from f;
grant select on f, g to authenticated;

create temp table p on commit drop as
  select shift_round_private.student_plan(r) as plan from public.shift_rounds r where r.id = (select r_cur from f);
select is((select plan->>'source' from p), 'curriculum', 'plan from the round''s curriculum_key row');
select is((select array_agg(k order by k) from p, jsonb_object_keys(plan) k), array['days','interview','rules','source'],
  'plan has source, rules, interview and days only');
select ok((select plan::text !~ 'SECRET' from p), 'no schedule, mentorChecks, sessionTime or unknown mentor fields leak');
select is((select array_agg(k order by k) from p, jsonb_array_elements(plan->'days') d, jsonb_object_keys(d) k where (d->>'day')::int = 1),
  array['day','goal','mission','name','steps'], 'a day carries day, name, goal, mission, steps only (no date, mentorSession)');
select is((select jsonb_array_length(plan->'rules') from p), 20, 'lists clamped to 20 items');
select is((select plan->'rules'->1 from p), '"rule 3"'::jsonb, 'non-string list items dropped');
select is((select char_length(plan->'interview'->>'intro') from p), 2000, 'strings clamped to 2000 chars');
select is((select array_agg(k order by k) from p, jsonb_object_keys(plan->'interview') k), array['dm','donts','dos','intro','questions'],
  'interview carries intro, dm, questions, dos, donts');
select is((select jsonb_agg(d->'day') from p, jsonb_array_elements(plan->'days') d), '[1,2,3]'::jsonb,
  'days sorted, first copy of a day kept, days outside 1..duration dropped');
select is((select d from p, jsonb_array_elements(plan->'days') d where (d->>'day')::int = 1),
  '{"day":1,"name":"Day one","goal":"g1","mission":"m1","steps":[1,8,9]}'::jsonb, 'refundSteps -> steps, junk steps dropped');
select is((select d from p, jsonb_array_elements(plan->'days') d where (d->>'day')::int = 3),
  '{"day":3,"name":"","goal":"","mission":"m3","steps":[]}'::jsonb, 'missing or non-string fields become empty strings');

select is((select shift_round_private.student_plan(r)->>'source' from public.shift_rounds r where r.id = (select r_missing from f)), 'default',
  'curriculum_key without a row falls back to default');
create temp table pd on commit drop as
  select shift_round_private.student_plan(r) as plan from public.shift_rounds r where r.id = (select r_none from f);
select is((select plan->>'source' from pd), 'default', 'no curriculum_key -> default');
select is((select jsonb_array_length(plan->'days') from pd), 7, 'default plan has the seven SHIFT days');
select is((select plan->'days'->0->'steps' from pd), '[1,8,9]'::jsonb, 'default day 1 steps');
select ok((select plan::text !~ 'mentorChecks|schedule|sessionTime|mentorSession|"date"' from pd), 'default plan is stripped too');

-- duration drops days: a 5-day round never shows days 6 and 7
update public.shift_rounds set duration_days = 5, session_days = '{1,2,4}', join_cutoff_day = 2,
       closes_at = starts_at + interval '5 days' where id = (select r_none from f);
select is((select jsonb_array_length(shift_round_private.student_plan(r)->'days') from public.shift_rounds r where r.id = (select r_none from f)),
  5, 'days beyond duration_days are dropped');

-- home bundle (2.5): plan + round session fields
select shift_test.login((select u from f));
set local role authenticated;
create temp table h on commit drop as select public.shift_round_home() as res;
select is((select res->'data'->'plan'->>'source' from h), 'curriculum', 'home carries the plan of the current round');
select is((select (res->'data'->'round') - array['id','number','title_th','title_en','brief_th','brief_en','starts_at','closes_at',
             'review_ends_at','duration_days','join_cutoff_day','day','phase','discord_url','join_mode','mentor_led','grace_minutes'] from h),
  '{"session_days":[1,2,4,6,7],"session_start":"19:00","session_end":"21:00","application_cohort":"SHIFT[9961]"}'::jsonb,
  'round gains session_days, session_start, session_end, application_cohort');
select is((select res->'data'->'plan'->'days'->0 from h),
  '{"day":1,"name":"Day one","goal":"g1","mission":"m1","steps":[1,8,9]}'::jsonb, 'student sees the sanitized day');
select is((select count(*)::int from public.shift_curriculum), 0, 'students cannot read shift_curriculum directly (RLS)');

-- joinable rows describe the next shift before join (2.5)
select shift_test.login((select v from f));
create temp table hv on commit drop as select public.shift_round_home() as res;
select is((select array_agg(k order by k) from hv, jsonb_object_keys(res->'data'->'joinable'->0) k),
  array['can_join','closes_at','duration_days','join_by','join_mode','number','reason','round_id','session_days','session_end',
        'session_start','starts_at','title_en','title_th'], 'joinable rows carry session fields and duration_days');
select is((select x - array['round_id','title_th','title_en','starts_at','closes_at','join_by'] from hv, jsonb_array_elements(res->'data'->'joinable') x
            where (x->>'number')::int = 9961),
  '{"number":9961,"join_mode":"invite","can_join":false,"reason":"invite_only","session_days":[1,2,4,6,7],"session_start":"19:00","session_end":"21:00","duration_days":7}'::jsonb,
  'joinable round 9961 for a non-invited user');
select is((select res->'data'->'round'->>'number' from hv), '9961', 'no entry: round = nearest joinable round');
select is((select res->'data'->'plan'->>'source' from hv), 'curriculum', 'and its plan (landing preview)');

-- neither row -> plan null (no curriculum at all)
reset role;
delete from public.shift_curriculum;
select is((select shift_round_private.student_plan(r) from public.shift_rounds r where r.id = (select r_none from f)), null,
  'no curriculum row and no default -> plan null');
select shift_test.login((select u from f));
set local role authenticated;
select is(public.shift_round_home()->'data'->'plan', 'null'::jsonb, 'home plan is null then');

select * from finish();
rollback;
