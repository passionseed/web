\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(15);

select shift_test.clock('2026-11-20 10:00+07');
create temp table f on commit drop as select shift_test.round(9901, '2026-11-10 00:00+07') as r, shift_test.user() as u, shift_test.user() as staff;
select shift_test.grant_role(staff, r, 'staff') from f;
create temp table g on commit drop as select shift_test.entry(r, u) as e from f;
grant select on f, g to authenticated;

create function pg_temp.sub(t text, u text default null) returns jsonb language sql as $$
  select public.shift_round_submit_summary((select e from g), t, 'A canteen pre-order form for my school', u,
    '{"people_talked_to":true,"testers":false,"missions":true}') $$;

select shift_test.login((select u from f));
set local role authenticated;
select is(shift_test.code(pg_temp.sub('My project', 'http://example.com')), 'link_not_https', 'non-https demo rejected (E9)');
select is(shift_test.code(public.shift_round_submit_summary((select e from g), 'T', 'D', null, '{"score":true}')), 'invalid_field',
  'unknown public_counts key rejected');
create temp table s1 on commit drop as select pg_temp.sub('Pre-order v1', 'https://example.com/demo') as res;
select is((select res->'data'->>'revision' from s1), '1', 'first revision');
create temp table s2 on commit drop as select pg_temp.sub('Pre-order v2') as res;
select is((select res->'data'->>'revision' from s2), '2', 'second revision');
reset role;
select is((select array_agg(status order by revision) from public.shift_round_summary_revisions where entry_id = (select e from g)),
  array['superseded','pending'], 'a new pending revision supersedes the previous pending one (one pending)');

-- approve a specific revision (A35)
select shift_test.login((select staff from f));
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_decide_summary((select (res->'data'->>'revision_id')::uuid from s1), 'approve', null)),
  'invalid_transition', 'superseded revision cannot be approved');
select is(shift_test.code(public.shift_round_admin_decide_summary((select (res->'data'->>'revision_id')::uuid from s2), 'reject', '')),
  'invalid_field', 'rejecting needs a reason');
select is(public.shift_round_admin_decide_summary((select (res->'data'->>'revision_id')::uuid from s2), 'approve', null)->'data'->>'status',
  'approved', 'approve revision 2');

-- editing keeps the previous public revision until the new one is approved
select shift_test.login((select u from f));
create temp table s3 on commit drop as select pg_temp.sub('Pre-order v3') as res;
reset role;
select is((select array_agg(status order by revision) from public.shift_round_summary_revisions where entry_id = (select e from g)),
  array['superseded','approved','pending'], 'edit keeps the approved revision public');
select shift_test.login((select staff from f));
set local role authenticated;
select is(public.shift_round_admin_decide_summary((select (res->'data'->>'revision_id')::uuid from s3), 'reject', 'Remove the phone number')->'data'->>'status',
  'rejected', 'reject with reason');
reset role;
select is((select title from public.shift_round_summary_revisions where entry_id = (select e from g) and status = 'approved'), 'Pre-order v2',
  'rejected edit leaves revision 2 public');
select is((select user_id from public.shift_round_events where name = 'summary_rejected'), (select u from f), 'summary decision event for push');

-- take down
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_take_down_summary((select e from g), 'Complaint')), 'ok', 'take down');
select is(shift_test.code(public.shift_round_admin_take_down_summary((select e from g), 'Complaint')), 'invalid_transition',
  'nothing left to take down');
select shift_test.login((select u from f));
select is(public.shift_round_set_summary_public((select e from g), true)->'data'->>'summary_public', 'true', 'student opts in');

select * from finish();
rollback;
