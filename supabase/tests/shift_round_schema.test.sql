\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(47);

-- tables exist
select has_table('public', t, t || ' exists') from unnest(array[
  'app_config','shift_rounds','shift_round_roles','shift_round_allowlist','shift_round_entries',
  'shift_round_icebreaker_questions','shift_round_squads','shift_round_squad_members','shift_round_evidence',
  'shift_round_evidence_media','shift_round_cheers','shift_round_checkins','shift_round_summary_revisions',
  'shift_round_certificates','shift_round_events','shift_round_waitlist','shift_round_nudge_ledger',
  'shift_round_deletion_requests','shift_round_job_runs']) t;

-- RLS on every new table
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and (c.relname = 'app_config' or c.relname like 'shift\_round%')
      and not c.relrowsecurity),
  0, 'RLS enabled on all new tables');

-- A49 indexes
select has_index('public', 'shift_round_evidence', 'shift_round_evidence_entry_type_status_idx', 'evidence (entry, type, status) index');
select has_index('public', 'shift_round_evidence', 'shift_round_evidence_review_idx', 'review queue index');
select has_index('public', 'shift_round_events', 'shift_round_events_round_created_idx', 'events (round, created_at) index');
select has_index('public', 'shift_round_entries', 'shift_round_entries_user_idx', 'entries user index');
select has_index('public', 'shift_round_job_runs', 'shift_round_job_runs_job_started_idx', 'job runs index');
select col_is_unique('public', 'shift_round_entries', array['round_id','user_id'], 'one entry per user per round (A49)');
select col_is_unique('public', 'shift_round_evidence', array['entry_id','submission_id'], 'submission idempotency key (E5)');
select col_is_unique('public', 'shift_round_certificates', array['entry_id'], 'one certificate per entry');

-- A2: no FK to hackathon tables; no FK from new tables to hackathon_*
select is(
  (select count(*)::int from pg_constraint k
    join pg_class src on src.oid = k.conrelid
    join pg_class dst on dst.oid = k.confrelid
   where k.contype = 'f' and (src.relname like 'shift\_round%' or src.relname = 'app_config')
     and dst.relname like 'hackathon%'),
  0, 'no foreign key from SHIFT round tables to hackathon_* (A2)');
select is(
  (select count(*)::int from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
    join pg_proc p on p.oid = tg.tgfoid join pg_namespace n on n.oid = p.pronamespace
   where c.relname like 'hackathon%' and n.nspname = 'shift_round_private'),
  0, 'no shift_round trigger on hackathon tables');

-- A25: no score/leaderboard
select is(
  (select count(*)::int from information_schema.columns
    where table_schema = 'public' and table_name like 'shift\_round%' and column_name ~ '(score|rank|leaderboard)'),
  0, 'no score/rank column on SHIFT round tables (A25)');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'shift\_round%' and p.proname ~ '(score|rank|leaderboard)'),
  0, 'no score/leaderboard RPC (A25)');

-- app_config seeds
select is((select count(*)::int from public.app_config where key like 'shift\_round.%'), 8, 'eight shift_round flags seeded');
select is((select value from public.app_config where key = 'shift_round.tab_enabled'), 'false'::jsonb, 'tab hidden by default (A54)');
select is((select value from public.app_config where key = 'shift_round.enrollment_enabled'), 'true'::jsonb, 'enrollment on');
select is((select value from public.app_config where key = 'shift_round.submissions_enabled'), 'true'::jsonb, 'submissions on');
select is((select value from public.app_config where key = 'shift_round.transcription_enabled'), 'false'::jsonb, 'transcription ships OFF (2026-10-13 decision)');
select is((select value from public.app_config where key = 'shift_round.nudges_enabled'), 'false'::jsonb, 'nudges off until binary ships (A43)');
select is((select value from public.app_config where key = 'shift_round.web_base_url'), '"https://www.passionseed.org"'::jsonb, 'web base url seeded');
select is((select value from public.app_config where key = 'shift_round.emergency_message'), 'null'::jsonb, 'no emergency message');

-- profiles opt-out column, icebreakers, bucket
select has_column('public', 'profiles', 'shift_round_nudges', 'profiles.shift_round_nudges exists (X12)');
select is((select count(*)::int from public.shift_round_icebreaker_questions where active), 10, 'ten ice-break questions seeded');
select is((select public from storage.buckets where id = 'shift-round-media'), false, 'media bucket is private');
select is((select file_size_limit::bigint from storage.buckets where id = 'shift-round-media'), 10485760::bigint, 'media bucket 10 MB limit');

-- private schema is not exposed to anon
select is(has_schema_privilege('anon', 'shift_round_private', 'USAGE'), false, 'anon has no usage on shift_round_private');

-- Evidence content immutable (A24/E8)
select shift_test.clock('2026-11-11 10:00+07');
create temp table ids on commit drop as
  select shift_test.user() as u, shift_test.round(9001, '2026-11-10 00:00+07') as r;
create temp table ent on commit drop as select shift_test.entry(r, u) as e from ids;
create temp table evi on commit drop as select shift_test.ev(e, 'contact', 'Aunt May') as v from ent;
select throws_ok(
  $$update public.shift_round_evidence set payload = '{"who_label":"x"}' where id = (select v from evi)$$,
  '42501', null, 'evidence payload cannot be updated');
select lives_ok(
  $$update public.shift_round_evidence set status = 'rejected', status_reason_code = 'other' where id = (select v from evi)$$,
  'evidence status may change');

select * from finish();
rollback;
