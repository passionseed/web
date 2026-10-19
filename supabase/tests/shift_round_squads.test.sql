\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(26);

select shift_test.clock('2026-11-12 10:00+07');
create temp table f on commit drop as select
  shift_test.round(9921, '2026-11-10 00:00+07') as r, shift_test.round(9922, '2026-11-10 00:00+07') as r2,
  shift_test.user() as staff, shift_test.user() as mentor, shift_test.user() as notmentor,
  shift_test.user() as a, shift_test.user() as b, shift_test.user() as c, shift_test.user() as d, shift_test.user() as x;
select shift_test.grant_role(staff, r, 'staff') from f;
select shift_test.grant_role(mentor, r, 'mentor') from f;
create temp table g on commit drop as select shift_test.entry(r, a, 'Aye') as ea, shift_test.entry(r, b, 'Bee') as eb,
  shift_test.entry(r, c, 'Cee') as ec, shift_test.entry(r, d, 'Dee') as ed, shift_test.entry(r2, x, 'Ex') as ex from f;
grant select on f, g to authenticated;

select shift_test.login((select staff from f));
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_upsert_squad((select r from f), null, 'Mango', (select notmentor from f), null)),
  'mentor_not_in_round', 'mentor must hold a role in the round');
select is(shift_test.code(public.shift_round_admin_upsert_squad((select r from f), null, 'Mango', (select mentor from f), 'https://evil.example/x')),
  'invalid_field', 'discord url validated');
create temp table s on commit drop as select
  (public.shift_round_admin_upsert_squad((select r from f), null, 'Mango', (select mentor from f), 'https://discord.gg/mango')->'data'->>'squad_id')::uuid as s1,
  (public.shift_round_admin_upsert_squad((select r from f), null, 'Durian', null, null)->'data'->>'squad_id')::uuid as s2;
grant select on s to authenticated;
select is(shift_test.code(public.shift_round_admin_upsert_squad((select r from f), null, 'Mango', null, null)), 'invalid_field', 'squad name unique per round');

select is(shift_test.code(public.shift_round_admin_assign_squad((select ea from g), (select s1 from s))), 'ok', 'assign a');
select is(shift_test.code(public.shift_round_admin_assign_squad((select eb from g), (select s1 from s))), 'ok', 'assign b');
select is(shift_test.code(public.shift_round_admin_assign_squad((select ec from g), (select s1 from s))), 'ok', 'assign c');
select is(shift_test.code(public.shift_round_admin_assign_squad((select ed from g), (select s1 from s))), 'squad_full', 'fourth member refused');
select is(shift_test.code(public.shift_round_admin_assign_squad((select ex from g), (select s1 from s))), 'forbidden', 'staff of another round cannot assign');
reset role;
select is((select count(distinct icebreaker_question)::int from public.shift_round_squad_members where squad_id = (select s1 from s)), 3,
  'distinct ice-break questions');
set local role authenticated;
-- one squad per entry: moving keeps a single membership
select is(shift_test.code(public.shift_round_admin_assign_squad((select ed from g), (select s2 from s))), 'ok', 'assign d to second squad');
select is(shift_test.code(public.shift_round_admin_assign_squad((select ed from g), (select s1 from s))), 'squad_full', 'still full');
reset role;
select is((select count(*)::int from public.shift_round_squad_members where entry_id = (select ed from g)), 1, 'one squad per entry');
select is((select count(*)::int from public.shift_round_events where name = 'squad_assigned'), 4, 'squad_assigned events');

-- admin entries lists squads incl. empty ones
insert into public.shift_round_squads (round_id, name) select r, 'Empty' from f;
set local role authenticated;
select is(jsonb_array_length(public.shift_round_admin_entries((select r from f))->'data'->'squads'), 3, 'admin_entries lists empty squads too');

-- feed: generated items only, own squad only
reset role;
create temp table evs on commit drop as select shift_test.ev((select eb from g), 'interview', 'Secret Person Name') as good,
  shift_test.ev((select eb from g), 'contact', 'Rejected Person') as bad;
grant select on evs to authenticated;
select shift_round_private.emit('evidence_logged', (select r from f), (select eb from g), (select b from f), (select b from f),
  jsonb_build_object('evidence_id', good, 'type', 'interview')) from evs;
select shift_round_private.emit('evidence_logged', (select r from f), (select eb from g), (select b from f), (select b from f),
  jsonb_build_object('evidence_id', bad, 'type', 'contact')) from evs;
update public.shift_round_evidence set status = 'rejected', status_reason_code = 'other' where id = (select bad from evs);

select shift_test.login((select a from f));
set local role authenticated;
create temp table sq on commit drop as select public.shift_round_squad((select ea from g)) as res;
select is((select res->'data'->>'state' from sq), 'assigned', 'assigned state');
select is((select jsonb_array_length(res->'data'->'members') from sq), 3, 'three members');
select is((select res->'data'->'squad'->'mentor'->>'display_name' is not null from sq), true, 'mentor display name');
select is((select jsonb_array_length(res->'data'->'feed') from sq), 1, 'feed excludes rejected evidence');
select ok((select (res->'data'->'feed')::text !~ 'Secret Person' from sq), 'feed carries no labels or free text');
reset role;
create temp table evs2 on commit drop as select shift_test.ev((select eb from g), 'ideas') as idea, shift_test.ev((select eb from g), 'daily') as daily;
grant select on evs2 to authenticated;
select shift_round_private.emit('evidence_logged', (select r from f), (select eb from g), (select b from f), (select b from f),
  jsonb_build_object('evidence_id', idea, 'type', 'ideas')) from evs2;
select shift_round_private.emit('mission_completed', (select r from f), (select eb from g), (select b from f), (select b from f),
  jsonb_build_object('evidence_id', idea, 'mission', 'ideas')) from evs2;
select shift_round_private.emit('evidence_logged', (select r from f), (select eb from g), (select b from f), (select b from f),
  jsonb_build_object('evidence_id', daily, 'type', 'daily')) from evs2;
set local role authenticated;
create temp table sq2 on commit drop as select public.shift_round_squad((select ea from g)) as res;
select is((select jsonb_agg(jsonb_build_object('kind', x->>'kind', 'type', x->>'type', 'n', x->'n', 'mission', x->'mission') order by x->>'kind', x->>'type')
             from sq2, jsonb_array_elements(res->'data'->'feed') x where x->>'type' in ('ideas','daily')),
  '[{"kind":"evidence_logged","type":"daily","n":1,"mission":null},{"kind":"evidence_logged","type":"ideas","n":1,"mission":"ideas"},{"kind":"mission_completed","type":"ideas","n":1,"mission":"ideas"}]'::jsonb,
  'feed items for ideas and daily logs; mission_completed n = position in the config');
select ok((select (res->'data'->'feed')::text !~ 'Canteen|a first screen' from sq2), 'ideas and daily text never reach the feed');
select is((select (res->'data'->'members') @> '[{"handle":"Bee","missions_complete":1}]'::jsonb from sq2), true,
  'members show missions completed under the round config');
select is(public.shift_round_squad((select ed from g))->'error'->>'code', 'entry_not_found', 'cannot read another entry''s squad');

-- cheers: same squad, unique per evidence, daily limit
select is(shift_test.code(public.shift_round_send_cheer((select ea from g), (select ed from g), null)), 'not_same_squad', 'not same squad');
create temp table ch on commit drop as select public.shift_round_send_cheer((select ea from g), (select eb from g), (select good from evs)) as res;
select is(public.shift_round_send_cheer((select ea from g), (select eb from g), (select good from evs))->'data'->>'cheer_id',
  (select res->'data'->>'cheer_id' from ch), 'duplicate cheer returns the existing one');
select public.shift_round_send_cheer((select ea from g), (select ec from g), null) from generate_series(1, 19);
select is(shift_test.code(public.shift_round_send_cheer((select ea from g), (select ec from g), null)), 'cheer_limit', '21st cheer in a day refused');

select * from finish();
rollback;
