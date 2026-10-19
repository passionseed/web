\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(13);

select shift_test.clock('2026-11-12 10:00+07');
create temp table f on commit drop as select
  shift_test.round(9801, '2026-11-10 00:00+07') as r, shift_test.round(9802, '2026-11-10 00:00+07') as r_no_entry,
  shift_test.user() as u, shift_test.user() as o, shift_test.user() as mentor;
select shift_test.grant_role(mentor, r, 'mentor') from f;
create temp table g on commit drop as select shift_test.entry(r, u) as e, shift_test.entry(r, o) as oe from f;
create temp table p on commit drop as select
  r::text || '/' || u::text || '/cccccccc-0000-4000-8000-000000000001/photo.jpg' as ok_path,
  r::text || '/' || u::text || '/cccccccc-0000-4000-8000-000000000002/photo.jpg' as bound_path,
  r::text || '/' || u::text || '/cccccccc-0000-4000-8000-000000000003/audio.m4a' as paused_path,
  r::text || '/' || o::text || '/cccccccc-0000-4000-8000-000000000001/photo.jpg' as other_folder,
  r_no_entry::text || '/' || u::text || '/cccccccc-0000-4000-8000-000000000001/photo.jpg' as no_entry,
  r::text || '/' || u::text || '/cccccccc-0000-4000-8000-000000000001/selfie.png' as bad_name
  from f;
grant select on f, g, p to authenticated, anon;

create function pg_temp.up(p_name text) returns void language sql as $$
  insert into storage.objects (bucket_id, name, owner, owner_id, metadata)
  values ('shift-round-media', p_name, auth.uid(), auth.uid()::text, '{"size":10}') $$;

create function pg_temp.upd() returns int language sql as $$
  with x as (update storage.objects set metadata = '{}' where bucket_id = 'shift-round-media' returning 1) select count(*)::int from x $$;
create function pg_temp.del(p_name text) returns int language sql as $$
  with x as (delete from storage.objects where bucket_id = 'shift-round-media' and (p_name is null or name = p_name) returning 1)
  select count(*)::int from x $$;

select shift_test.login((select u from f));
set local role authenticated;
select lives_ok($$select pg_temp.up((select ok_path from p))$$, 'owner uploads into own round/user folder');
select lives_ok($$select pg_temp.up((select bound_path from p))$$, 'second upload');
select throws_ok($$select pg_temp.up((select other_folder from p))$$, '42501', null, 'cannot upload into another user folder');
select throws_ok($$select pg_temp.up((select no_entry from p))$$, '42501', null, 'cannot upload to a round without an entry');
select throws_ok($$select pg_temp.up((select bad_name from p))$$, '42501', null, 'object name must match the path rule');

-- bind one object to evidence
reset role;
insert into public.shift_round_evidence_media (evidence_id, entry_id, round_id, user_id, kind, path, bytes, consent_confirmed)
  select shift_test.ev((select e from g), 'mvp'), (select e from g), (select r from f), (select u from f), 'photo', (select bound_path from p), 10, true;

-- kill switch blocks uploads (X18)
update public.app_config set value = 'false' where key = 'shift_round.submissions_enabled';
set local role authenticated;
select throws_ok($$select pg_temp.up((select paused_path from p))$$, '42501', null, 'kill switch blocks uploads');
reset role;
update public.app_config set value = 'true' where key = 'shift_round.submissions_enabled';

-- read rules (legacy broad read policies are neutralised by the restrictive guard)
select shift_test.login((select o from f));
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id = 'shift-round-media'), 0, 'other student cannot see the objects');
select shift_test.login((select mentor from f));
select is((select count(*)::int from storage.objects where bucket_id = 'shift-round-media'), 2, 'round mentor can see them');
select shift_test.login(null);
set local role anon;
select is((select count(*)::int from storage.objects where bucket_id = 'shift-round-media'), 0, 'anon sees nothing');

-- update never; delete only unbound by owner.
-- Supabase blocks direct SQL deletes on storage.objects (the Storage API is the real path);
-- allow them in this transaction so the DELETE RLS policy itself can be exercised.
set local storage.allow_delete_query = 'true';
select shift_test.login((select u from f));
set local role authenticated;
select is(pg_temp.upd(),
  0, 'no updates through the API');
select is(pg_temp.del((select bound_path from p)),
  0, 'bound object cannot be deleted by the student');
select is(pg_temp.del((select ok_path from p)),
  1, 'unbound draft object can be discarded');
select shift_test.login((select o from f));
select is(pg_temp.del(null),
  0, 'others cannot delete');

select * from finish();
rollback;
