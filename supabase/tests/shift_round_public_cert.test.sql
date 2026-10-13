\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(22);

select shift_test.clock('2026-11-28 00:05+07');
create temp table f on commit drop as select
  shift_test.round(9911, '2026-11-10 00:00+07') as r, shift_test.user() as u, shift_test.user() as v, shift_test.user() as staff;
select shift_test.grant_role(staff, null, 'staff') from f;
create temp table g on commit drop as select shift_test.entry(r, u, 'ต้น') as e, shift_test.entry(r, v, 'Vee') as ev from f;
select shift_test.complete_all(e, '2026-11-15 10:00+07') from g;
select shift_test.complete_all(ev, '2026-11-15 10:00+07') from g;
-- a reviewer-only demo link that must never leak
select shift_test.ev(e, 'demo_post', null, 'submitted', '2026-11-15 10:00+07', null, 'reviewer_only') from g;
grant select on f, g to authenticated, service_role, anon;
set local role service_role;
select public.shift_round_job_issue_entry(e) from g;
select public.shift_round_job_issue_entry(ev) from g;
reset role;
create temp table c on commit drop as select
  (select public_id from public.shift_round_certificates where entry_id = (select e from g)) as pid,
  (select id from public.shift_round_certificates where entry_id = (select e from g)) as cid,
  (select public_id from public.shift_round_certificates where entry_id = (select ev from g)) as pid2;
grant select on c to anon, authenticated;
insert into public.shift_round_summary_revisions (entry_id, revision, title, description, demo_url, public_counts, status)
  select e, 1, 'Pre-order', 'Canteen pre-orders', 'https://example.com/demo', '{"people_talked_to":true,"testers":false,"missions":true}', 'approved' from g;

-- anon access (E13)
select shift_test.login(null);
set local role anon;
create temp table v1 on commit drop as select public.shift_round_certificate_public((select pid from c)) as res;
select is((select res->'data'->>'status' from v1), 'valid', 'valid certificate');
select is((select res->'data'->>'round_number' from v1), '9911', 'round number on top level');
select is((select res->'data'->'snapshot'->'holder'->>'handle' from v1), 'ต้น', 'holder shown');
select is((select res->'data'->>'verify_url' from v1), 'https://www.passionseed.org/c/' || (select pid from c), 'verify url from app_config');
select is((select res->'data'->'summary' from v1), 'null'::jsonb, 'no summary until the holder opts in');
select is(public.shift_round_certificate_public(lower((select pid from c)))->'data'->>'status', 'valid', 'lower-case id accepted');
select ok((select res::text !~ (select u::text from f) and res::text !~ (select e::text from g) and res::text !~ 'birth'
             and res::text !~ 'drive.google|example.com/demo' from v1),
  'no user id, entry id, birth data or links leaked');
select is(shift_test.code(public.shift_round_certificate_public('NOT-A-REAL-ID')), 'certificate_not_found', 'malformed id');
select is(shift_test.code(public.shift_round_certificate_public('0000000000000000')), 'certificate_not_found', 'unknown id');

-- summary only when opted in + approved + issued
reset role;
update public.shift_round_entries set summary_public = true where id = (select e from g);
set local role anon;
create temp table v2 on commit drop as select public.shift_round_certificate_public((select pid from c)) as res;
select is((select res->'data'->'summary'->>'title' from v2), 'Pre-order', 'opted-in approved summary shown');
select is((select res->'data'->'summary'->'counts' from v2), '{"people_talked_to":7,"missions":6}'::jsonb, 'only opted-in counts');

-- config-driven base url
reset role;
update public.app_config set value = '"https://verify.example.org/"' where key = 'shift_round.web_base_url';
set local role anon;
select is(public.shift_round_certificate_public((select pid from c))->'data'->>'verify_url',
  'https://verify.example.org/c/' || (select pid from c), 'verify url follows web_base_url');

-- visits (A39)
select is(shift_test.code(public.shift_round_log_certificate_visit((select pid from c), 'SHARE')), 'ok', 'visit logged');
select public.shift_round_log_certificate_visit((select pid from c), 'weird');
reset role;
select is((select array_agg(props->>'ref' order by id) from public.shift_round_events where name = 'certificate_visit'),
  array['share','other'], 'ref normalized');
select is((select user_id from public.shift_round_events where name = 'certificate_visit' limit 1), null, 'visitor not recorded');
insert into public.shift_round_events (round_id, name, props, created_at)
  select (select r from f), 'certificate_visit', jsonb_build_object('certificate_id', (select cid from c)), '2026-11-28 00:01+07'
    from generate_series(1, 498);
set local role anon;
select public.shift_round_log_certificate_visit((select pid from c), null);
select is(shift_test.code(public.shift_round_log_certificate_visit((select pid from c), null)), 'ok', 'over cap still ok (silent drop)');
reset role;
select is((select count(*)::int from public.shift_round_events where name = 'certificate_visit'), 500, 'capped at 500 per day');

-- revoked: round facts only
update public.shift_round_certificates set status = 'revoked', revoked_at = now(), revoke_reason = 'staff' where public_id = (select pid from c);
set local role anon;
create temp table v3 on commit drop as select public.shift_round_certificate_public((select pid from c)) as res;
select is((select res->'data'->>'status' from v3), 'revoked', 'revoked status');
select is((select res->'data'->'snapshot' ?| array['holder','counts','track'] from v3), false, 'holder/counts/track hidden when revoked');
select is((select res->'data'->'summary' from v3), 'null'::jsonb, 'no summary when revoked');

-- tombstone
reset role;
delete from public.shift_round_entries where id = (select ev from g);
set local role anon;
create temp table v4 on commit drop as select public.shift_round_certificate_public((select pid2 from c)) as res;
select is((select (res->'data'->>'tombstone', res->'data'->'snapshot', res->'data'->>'round_number')::text from v4),
  '(true,null,9911)', 'tombstone: status and round number only');
select throws_ok($$select * from public.shift_round_certificates$$, '42501', null, 'anon cannot read the table');

select * from finish();
rollback;
