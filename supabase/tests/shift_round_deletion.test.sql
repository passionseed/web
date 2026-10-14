\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(34);

select shift_test.clock('2026-11-28 00:05+07');
create temp table f on commit drop as select
  shift_test.round(9701, '2026-11-10 00:00+07') as r, shift_test.user() as u, shift_test.user() as v, shift_test.user() as w;
create temp table g on commit drop as select shift_test.entry(r, u) as e, shift_test.entry(r, v) as ev2, shift_test.entry(r, w) as ew from f;
select shift_test.complete_all(e, '2026-11-15 10:00+07') from g;
select shift_test.complete_all(ew, '2026-11-15 10:00+07') from g;
insert into public.shift_round_checkins (entry_id, checkpoint, answers, submitted_at) select e, 'join', '{"ownership":4}', now() from g;
insert into public.shift_round_summary_revisions (entry_id, revision, title, description, status) select e, 1, 'T', 'D', 'approved' from g;
insert into public.shift_round_squads (id, round_id, name) select 'b0000000-0000-4000-8000-000000000001', r, 'Squad A' from f;
insert into public.shift_round_squad_members (squad_id, entry_id, round_id, icebreaker_question)
  select 'b0000000-0000-4000-8000-000000000001', e, (select r from f), 1 from g;
select shift_test.obj((select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000001/photo.jpg' from f), (select u from f));
insert into public.shift_round_evidence_media (evidence_id, entry_id, round_id, user_id, kind, path, bytes, consent_confirmed)
  select (select id from public.shift_round_evidence where entry_id = (select e from g) and type = 'mvp'), (select e from g), r, u,
         'photo', r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000001/photo.jpg', 1234, true from f;
select shift_round_private.emit('evidence_logged', (select r from f), (select e from g), (select u from f), (select u from f), '{}');
insert into public.shift_round_waitlist (user_id) select u from f;
insert into public.shift_round_attendance (entry_id, round_id, day, status)
  select x.e, (select r from f), 1, 'present' from g, lateral (values (g.e), (g.ew)) x(e);
grant select on f, g to authenticated, service_role;
set local role service_role;
select public.shift_round_job_issue_entry(e) from g;
select public.shift_round_job_issue_entry(ew) from g;
reset role;
create temp table cert on commit drop as select id from public.shift_round_certificates where entry_id = (select e from g);

-- holder deletion
select shift_test.login((select u from f));
set local role authenticated;
select is(shift_test.code(public.shift_round_delete_my_data(null, 'delete')), 'invalid_field', 'confirmation must be exactly DELETE');
create temp table d1 on commit drop as select public.shift_round_delete_my_data(null, 'DELETE') as res;
select is(shift_test.code((select res from d1)), 'ok', 'delete my data');
select is((select res->'data'->>'deleted_entries' from d1), '1', 'one entry deleted');
select is((select res->'data'->>'certificates_revoked' from d1), '1', 'one certificate tombstoned');
select ok((select res->'data'->>'deletion_request_id' is not null from d1), 'storage deletion queued');
select is(public.shift_round_delete_my_data(null, 'DELETE')->'data'->>'deleted_entries', '0', 'repeat returns zeros');
reset role;
select is((select count(*)::int from public.shift_round_entries where id = (select e from g)), 0, 'entry gone');
select is((select count(*)::int from public.shift_round_evidence where entry_id = (select e from g)), 0, 'evidence gone');
select is((select count(*)::int from public.shift_round_evidence_media where entry_id = (select e from g)), 0, 'media rows gone');
select is((select count(*)::int from public.shift_round_checkins where entry_id = (select e from g)), 0, 'check-ins gone');
select is((select count(*)::int from public.shift_round_summary_revisions where entry_id = (select e from g)), 0, 'summaries gone');
select is((select count(*)::int from public.shift_round_squad_members where entry_id = (select e from g)), 0, 'squad membership gone');
select is((select count(*)::int from public.shift_round_waitlist where user_id = (select u from f)), 0, 'waitlist row gone');
select is((select count(*)::int from public.shift_round_attendance where entry_id = (select e from g)), 0, 'attendance rows gone (v2 2.4)');
select is((select (status, tombstoned_at is not null, snapshot is null, user_id is null, revoke_reason)::text
             from public.shift_round_certificates where id = (select id from cert)),
  '(revoked,t,t,t,holder_deleted)', 'certificate tombstoned (E10)');
select is((select count(*)::int from public.shift_round_events where user_id = (select u from f)), 0, 'events anonymized');
select is((select storage_prefixes from public.shift_round_deletion_requests where id = (select (res->'data'->>'deletion_request_id')::uuid from d1)),
  array[(select r::text || '/' || u::text || '/' from f)], 'prefix queued for storage removal');
select is((select storage_paths from public.shift_round_deletion_requests where id = (select (res->'data'->>'deletion_request_id')::uuid from d1)),
  array[(select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000001/photo.jpg' from f)], 'exact object paths queued');
select is((select count(*)::int from auth.users where id = (select u from f)), 1, 'auth user untouched (A21)');
select is((select count(*)::int from public.profiles where id = (select u from f)), 1, 'profile untouched');

-- job_delete_user (account deletion path)
set local role service_role;
select is(public.shift_round_job_delete_user((select v from f))->'data'->>'deleted_entries', '1', 'job_delete_user removes entries');
reset role;
select is((select reason from public.shift_round_deletion_requests where user_id = (select v from f)), 'account_deleted', 'reason account_deleted');

-- audio retention: 30 days after review end (5.6)
insert into public.shift_round_summary_revisions (entry_id, revision, title, description, status) select ew, 1, 'T', 'D', 'approved' from g;
insert into public.shift_round_summary_revisions (entry_id, revision, title, description, status) select ew, 2, 'T2', 'D2', 'pending' from g;
insert into public.shift_round_evidence_media (evidence_id, entry_id, round_id, user_id, kind, path, bytes, duration_ms, consent_confirmed)
  select (select id from public.shift_round_evidence where entry_id = (select ew from g) and type = 'interview' limit 1), (select ew from g), r, w,
         'audio', r::text || '/' || w::text || '/aaaaaaaa-0000-4000-8000-0000000000aa/audio.m4a', 999, 60000, true from f;
select shift_test.clock('2026-12-20 00:00+07');
set local role service_role;
select is(public.shift_round_job_enqueue_retention()->'data'->>'audio_purged', '0', 'audio kept within 30 days');
reset role;
select shift_test.clock('2026-12-27 00:00+07');
set local role service_role;
select is(public.shift_round_job_enqueue_retention()->'data'->>'audio_purged', '1', 'audio purged after 30 days');
reset role;
select is((select storage_paths from public.shift_round_deletion_requests where reason = 'audio_retention'),
  array[(select r::text || '/' || w::text || '/aaaaaaaa-0000-4000-8000-0000000000aa/audio.m4a' from f)], 'exact audio path queued');
select ok((select count(*) from public.shift_round_evidence where entry_id = (select ew from g)) > 0, 'evidence (with transcript) kept');

-- retention purge (A21, E21): 12 months after close
select shift_test.clock('2027-12-01 00:00+07');
set local role service_role;
create temp table rp on commit drop as select public.shift_round_job_enqueue_retention() as res;
reset role;
select is((select res->'data'->>'entries_purged' from rp), '1', 'one remaining entry purged');
select is((select count(*)::int from public.shift_round_evidence where entry_id = (select ew from g)), 0, 'evidence removed by retention');
select is((select count(*)::int from public.shift_round_attendance where entry_id = (select ew from g)), 0, 'attendance removed by retention');
select is((select (birth_month, birth_year, guardian_consent_at)::text from public.shift_round_entries where id = (select ew from g)),
  '(,,)', 'birth data cleared');
select is((select snapshot is not null and status = 'issued' from public.shift_round_certificates where entry_id = (select ew from g)),
  true, 'valid certificate snapshot kept (A30)');
select is((select count(*)::int from public.shift_round_deletion_requests where reason = 'retention'), 1, 'retention prefix queued');
select is((select array_agg(status order by revision) from public.shift_round_summary_revisions where entry_id = (select ew from g)),
  array['approved'], 'approved summary kept, others removed');
-- running again is a no-op
set local role service_role;
select is(public.shift_round_job_enqueue_retention()->'data'->>'entries_purged', '0', 'retention is idempotent');
reset role;

select * from finish();
rollback;
