\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(14);

create temp table rpc on commit drop as
  select p.oid, p.proname, p.oid::regprocedure::text as sig, p.prosecdef, p.proconfig, p.proargtypes
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname like 'shift\_round\_%';

select ok((select count(*) from rpc) >= 60, 'shift_round RPCs present');

select is(
  (select coalesce(array_agg(sig order by sig), '{}') from rpc where not prosecdef),
  '{}'::text[], 'every public.shift_round_* function is SECURITY DEFINER');

select is(
  (select coalesce(array_agg(sig order by sig), '{}') from rpc
    where proconfig is null or not ('search_path=""' = any (proconfig))),
  '{}'::text[], 'every public.shift_round_* function pins search_path to empty');

select is(
  (select coalesce(array_agg(proname::text order by proname), '{}') from rpc where has_function_privilege('anon', oid, 'EXECUTE')),
  array['shift_round_certificate_public','shift_round_log_certificate_visit'],
  'anon may execute only the two public RPCs');

select is(
  (select coalesce(array_agg(sig order by sig), '{}') from rpc
    where proname like 'shift\_round\_job\_%'
      and (has_function_privilege('authenticated', oid, 'EXECUTE') or has_function_privilege('anon', oid, 'EXECUTE'))),
  '{}'::text[], 'job RPCs are not executable by clients');

select is(
  (select coalesce(array_agg(sig order by sig), '{}') from rpc
    where proname like 'shift\_round\_job\_%' and not has_function_privilege('service_role', oid, 'EXECUTE')),
  '{}'::text[], 'job RPCs are executable by service_role');

select is(
  (select coalesce(array_agg(sig order by sig), '{}') from rpc
    where proname not like 'shift\_round\_job\_%' and not has_function_privilege('authenticated', oid, 'EXECUTE')),
  '{}'::text[], 'student/admin/public RPCs are executable by authenticated');

select is(
  (select coalesce(array_agg(c.relname::text || ':' || priv order by c.relname, priv), '{}')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
     cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE']) priv
    where n.nspname = 'public' and c.relkind = 'r'
      and (c.relname like 'shift\_round%' or c.relname = 'app_config')
      and (has_table_privilege('authenticated', c.oid, priv) or has_table_privilege('anon', c.oid, priv))),
  '{}'::text[], 'clients have no insert/update/delete/truncate on new tables');

select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'shift\_round%'
      and has_table_privilege('anon', c.oid, 'SELECT')),
  '{}'::text[], 'anon cannot select any shift_round table');

select ok(has_table_privilege('anon', 'public.app_config', 'SELECT'), 'anon can read public app_config rows');

select is(
  (select coalesce(array_agg(c.relname::text order by c.relname), '{}')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname in ('shift_round_allowlist','shift_round_squads','shift_round_squad_members','shift_round_cheers',
                        'shift_round_events','shift_round_waitlist','shift_round_nudge_ledger',
                        'shift_round_deletion_requests','shift_round_job_runs','shift_round_attendance')
      and has_table_privilege('authenticated', c.oid, 'SELECT')),
  '{}'::text[], 'tables without client policies are not selectable by authenticated');

-- E13/A1: no RPC accepts a timestamptz "now"-like argument
select is(
  (select coalesce(array_agg(sig order by sig), '{}') from rpc p
    where exists (select 1 from unnest(coalesce((select proargnames from pg_proc where oid = p.oid), '{}')) a
                   where a ~* 'now|_at$|time')
      and sig <> 'shift_round_submit_evidence(uuid,uuid,text,jsonb,jsonb,timestamp with time zone,uuid)'),
  '{}'::text[], 'no RPC takes a time argument (client_created_at on submit is clamped, never trusted)');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'shift_round_private'
      and (has_function_privilege('anon', p.oid, 'EXECUTE'))),
  0, 'anon executes nothing in shift_round_private');

select is(
  (select coalesce(array_agg(p.proname::text order by p.proname), '{}') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'shift_round_private' and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  array['can_delete_media','can_read_entry','can_read_media','can_review','can_upload','is_global_staff','is_staff'],
  'authenticated executes only the policy helpers in shift_round_private');

select * from finish();
rollback;
