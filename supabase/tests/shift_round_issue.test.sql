\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(35);

select shift_test.clock('2026-11-20 10:00+07');
create temp table f on commit drop as select
  shift_test.round(9601, '2026-11-10 00:00+07') as r, shift_test.round(9602, '2026-11-10 00:00+07') as r2,
  shift_test.user() as a, shift_test.user() as b, shift_test.user() as c, shift_test.user() as staff, shift_test.user() as d;
select shift_test.grant_role(staff, null, 'staff') from f;
create temp table g on commit drop as select
  shift_test.entry(r, a, 'ต้น') as ea, shift_test.entry(r, b, 'Beam') as eb, shift_test.entry(r, c, 'Cee') as ec,
  shift_test.entry(r2, d, 'Dee') as ed from f;
select shift_test.complete_all(ea) from g;
select shift_test.complete_all(ec) from g;
select shift_test.ev(eb, 'contact', 'Only One') from g;
select shift_test.complete_all(ed) from g;
update public.shift_round_entries set legal_name = 'Ton Kla', name_display = 'legal' where id = (select ec from g);
grant select on f, g to authenticated, service_role;

-- nothing is due before review end (A18)
set local role service_role;
select is(jsonb_array_length(public.shift_round_job_due_entries(200)->'data'->'entry_ids'), 0, 'nothing due during the round');
select is(public.shift_round_job_issue_entry((select ea from g))->'data'->>'result', 'skipped', 'issue before review end skipped');
reset role;

-- extend before issue moves close + review end (X9)
select shift_test.login((select staff from f));
set local role authenticated;
create temp table x1 on commit drop as select public.shift_round_admin_extend_round((select r from f), 2, 'Holiday') as res;
select is(shift_test.code((select res from x1)), 'ok', 'extend ok');
select is(((select res->'data'->>'closes_at' from x1))::timestamptz, '2026-11-26 00:00+07'::timestamptz, 'closes_at moved by 2 days');
select is(((select res->'data'->>'review_ends_at' from x1))::timestamptz, '2026-11-28 00:00+07'::timestamptz, 'review end follows');
select is(shift_test.code(public.shift_round_admin_extend_round((select r from f), 9, 'x')), 'invalid_field', 'extend limited to 1-7 days');
reset role;

-- after review end: due, issue
select shift_test.clock('2026-11-28 00:05+07');
set local role service_role;
select is(jsonb_array_length(public.shift_round_job_due_entries(200)->'data'->'entry_ids'), 4, 'all in-progress entries are due');
create temp table i1 on commit drop as select public.shift_round_job_issue_entry((select ea from g)) as res;
select is((select res->'data'->>'result' from i1), 'issued', 'eligible entry issued');
select is((select res->'data'->>'public_id' ~ '^[0-9A-HJKMNP-TV-Z]{16}$' from i1), true, 'public id is 16-char Crockford base32');
select is(public.shift_round_job_issue_entry((select eb from g))->'data'->>'result', 'not_eligible', 'ineligible entry not issued');
select is(public.shift_round_job_issue_entry((select ec from g))->'data'->>'result', 'issued', 'second eligible entry issued');
-- an unknown/broken entry does not stop the others (E4)
select is(public.shift_round_job_issue_entry(gen_random_uuid())->'data'->>'result', 'skipped', 'missing entry is skipped, not raised');
select is(public.shift_round_job_issue_entry((select ed from g))->'data'->>'result', 'issued', 'other round still issues');
-- run twice: nothing new (A31)
select is(public.shift_round_job_issue_entry((select ea from g))->'data'->>'result', 'skipped', 'second run skips');
select is(jsonb_array_length(public.shift_round_job_due_entries(200)->'data'->'entry_ids'), 0, 'nothing left due');
reset role;
select is((select count(*)::int from public.shift_round_certificates where round_id = (select r from f)), 2, 'two certificates, no duplicates');
select is((select outcome from public.shift_round_entries where id = (select eb from g)), 'not_eligible', 'outcome not_eligible');
select is((select outcome from public.shift_round_entries where id = (select ea from g)), 'certified', 'outcome certified');

-- snapshot v1 (A30, A38)
create temp table snap on commit drop as select snapshot as s from public.shift_round_certificates where entry_id = (select ea from g);
select is((select s->>'v' from snap), '1', 'snapshot v1');
select is((select s->'holder' from snap), '{"handle":"ต้น","legal_name":null,"display":"handle"}'::jsonb, 'holder by handle');
select is((select s->'round'->>'closes_on' from snap), '2026-11-25', 'closes_on is the last day (with extension)');
select is((select s->'counts' from snap), '{"people_talked_to":7,"interviews":3,"testers":3,"changes":1}'::jsonb, 'counts captured');
select is((select jsonb_agg(m->>'key') from snap, jsonb_array_elements(s->'missions') m),
  '["ideas","interviews","problem","prototype","testers","change","demo"]'::jsonb, 'snapshot lists the round''s missions in config order');
select is((select s->'missions'->0 from snap), '{"key":"ideas","title_th":null,"title_en":null}'::jsonb,
  'each snapshot mission carries its config titles (null = use the known-key copy)');
select is((select s->>'issued_at' from snap), '2026-11-28T00:05:00+07:00', 'issued_at in ICT');
select is((select snapshot->'holder'->>'display' from public.shift_round_certificates where entry_id = (select ec from g)), 'legal',
  'legal name used when chosen (A38)');

-- after issue: extend refused, review closed, withdraw refused (E4)
select shift_test.login((select staff from f));
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_extend_round((select r from f), 1, 'late')), 'extend_after_issue', 'extend refused after issue');
select is(shift_test.code(public.shift_round_admin_reject_evidence(
  (select id from public.shift_round_evidence where entry_id = (select ea from g) limit 1), 'other', null, 1)), 'review_closed',
  'review refused once certified');

-- revoke / reinstate restores snapshot
create temp table cert on commit drop as select id, snapshot from public.shift_round_certificates where entry_id = (select ea from g);
select is(public.shift_round_admin_revoke_certificate((select id from cert), 'Fabricated logs')->'data'->>'status', 'revoked', 'revoke');
select is(public.shift_round_admin_reinstate_certificate((select id from cert), 'Appeal accepted')->'data'->>'render_version', '3',
  'reinstate bumps render_version again');
reset role;
select is((select snapshot from public.shift_round_certificates where id = (select id from cert)), (select snapshot from cert),
  'reinstated certificate keeps its snapshot');

-- tombstone cannot be reinstated
delete from public.shift_round_entries where id = (select ea from g);
set local role authenticated;
select is(shift_test.code(public.shift_round_admin_reinstate_certificate((select id from cert), 'x')), 'certificate_tombstoned',
  'tombstoned certificate cannot be reinstated');

-- extend before any certificate in the round resets not_eligible (X9)
reset role;
create temp table r3 on commit drop as select shift_test.round(9603, '2026-11-10 00:00+07') as r, shift_test.user() as u;
create temp table e3 on commit drop as select shift_test.entry(r, u) as e from r3;
grant select on r3, e3 to authenticated, service_role;
set local role service_role;
select is(public.shift_round_job_issue_entry((select e from e3))->'data'->>'result', 'not_eligible', 'r3 entry not eligible');
reset role;
select shift_test.login((select staff from f));
set local role authenticated;
select is(public.shift_round_admin_extend_round((select r from r3), 3, 'Exam week')->'data'->>'reset_not_eligible', '1',
  'extend resets not_eligible outcomes');
reset role;
select is((select outcome from public.shift_round_entries where id = (select e from e3)), 'in_progress', 'entry back in progress');

select * from finish();
rollback;
