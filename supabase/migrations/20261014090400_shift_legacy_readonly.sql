-- SHIFT rounds (beta), part 5: legacy interactive camp and companion become read-only (2.9, A51, E15).
-- Expand/contract: the original implementations are kept (renamed *_v1, no client grants) and
-- wrapped, so public.shift_camp_action / public.shift_companion_action keep their signatures and
-- installed app binaries keep working for reads. Writes degrade to {ok:false,...} envelopes.

-- Closed cohorts need an end date: default 7-day camps.
update public.shift_camp_cohorts set ends_on = starts_on + 6 where ends_on is null;

-- ---------------------------------------------------------------------------
-- Interactive camp: writes on a cohort whose ICT today > ends_on -> cohort_closed.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('shift_private.camp_action_v1(text,uuid,jsonb)') is null
     and to_regprocedure('shift_private.camp_action(text,uuid,jsonb)') is not null then
    alter function shift_private.camp_action(text, uuid, jsonb) rename to camp_action_v1;
  end if;
end $$;
revoke all on function shift_private.camp_action_v1(text, uuid, jsonb) from public, anon, authenticated;

create or replace function shift_private.camp_action(p_action text, p_cohort_id uuid, p_payload jsonb default '{}')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_ends date;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if p_action not in ('list','snapshot','create_cohort') and p_cohort_id is not null then
    select c.ends_on into v_ends from public.shift_camp_cohorts c where c.id = p_cohort_id;
    if v_ends is not null and (now() at time zone 'Asia/Bangkok')::date > v_ends then
      return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'cohort_closed'));
    end if;
  end if;
  return shift_private.camp_action_v1(p_action, p_cohort_id, p_payload);
end $$;
revoke all on function shift_private.camp_action(text, uuid, jsonb) from public, anon;
grant execute on function shift_private.camp_action(text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Companion: all write actions retired; status/today/history and staff reads stay.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('shift_private.companion_action_v1(text,jsonb)') is null
     and to_regprocedure('shift_private.companion_action(text,jsonb)') is not null then
    alter function shift_private.companion_action(text, jsonb) rename to companion_action_v1;
  end if;
end $$;
revoke all on function shift_private.companion_action_v1(text, jsonb) from public, anon, authenticated;

create or replace function shift_private.companion_action(p_action text, p_payload jsonb default '{}')
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_action in ('preview_code','claim','issue_code','reissue_code','update_contact','save_daily') then
    -- Same string-error shape the companion client already understands.
    return jsonb_build_object('ok', false, 'error', 'companion_retired');
  end if;
  return shift_private.companion_action_v1(p_action, coalesce(p_payload, '{}'::jsonb));
end $$;
revoke all on function shift_private.companion_action(text, jsonb) from public;
grant execute on function shift_private.companion_action(text, jsonb) to anon, authenticated;
