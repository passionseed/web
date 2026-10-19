\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(9);

-- E15/A51: legacy camp and companion stay readable, writes are refused.
create temp table f on commit drop as select shift_test.user() as u;
select ok(to_regprocedure('shift_private.camp_action_v1(text,uuid,jsonb)') is not null, 'original camp action kept as camp_action_v1');
select ok(to_regprocedure('shift_private.companion_action_v1(text,jsonb)') is not null, 'original companion action kept as companion_action_v1');
select is(has_function_privilege('authenticated', 'shift_private.camp_action_v1(text,uuid,jsonb)', 'EXECUTE'), false,
  'clients cannot bypass the wrapper');
select is(has_function_privilege('authenticated', 'public.shift_camp_action(text,uuid,jsonb)', 'EXECUTE'), true,
  'public camp RPC signature unchanged');
select is((select count(*)::int from public.shift_camp_cohorts where ends_on is null), 0, 'every cohort has an end date');

-- A closed cohort. The real table needs classroom/community/map rows, so create it through the
-- legacy API (as a temporary web admin); stub schemas accept a direct insert.
create temp table cohort (id uuid) on commit drop;
do $$
declare v uuid := (select u from f);
begin
  begin
    insert into public.shift_camp_cohorts (name, starts_on, ends_on) values ('closed', current_date - 30, current_date - 24);
  exception when others then
    insert into public.user_roles (user_id, role) values (v, 'admin');
    perform set_config('request.jwt.claim.sub', v::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
    perform shift_private.camp_action_v1('create_cohort', null,
      jsonb_build_object('name', 'closed', 'starts_on', current_date - 30));
  end;
  update public.shift_camp_cohorts set ends_on = current_date - 24 where name = 'closed';
  insert into cohort select id from public.shift_camp_cohorts where name = 'closed' limit 1;
end $$;
grant select on cohort to authenticated;

select shift_test.login((select u from f));
set local role authenticated;
select is(public.shift_camp_action('message', (select id from cohort), '{"body":"hi"}')->'error'->>'code', 'cohort_closed',
  'write on a closed cohort -> cohort_closed');
select isnt(public.shift_camp_action('message', (select id from cohort), '{"body":"hi"}')->>'ok', 'true', 'no write performed');
select is(public.shift_companion_action('save_daily', '{"tried":"x"}')->>'error', 'companion_retired', 'companion writes retired');
select isnt(public.shift_companion_action('status', '{}')->>'error', 'companion_retired', 'companion status read still works');

select * from finish();
rollback;
