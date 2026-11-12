-- SHIFT applicants now link their PassionSeed account (and Discord) straight
-- from the apply page, before paying. Until now shift_applications.user_id
-- was only written by the paid-gated join link, so "accepted + account"
-- meant "paid". Both round checks that relied on that now ask for payment
-- explicitly. Bodies are otherwise unchanged from 20261014090100 and
-- 20261014090200; CREATE OR REPLACE keeps the existing grants.

create or replace function shift_round_private.join_block_reason(r public.shift_rounds, p_uid uuid) returns text
language plpgsql stable set search_path = '' as $$
declare v_email text;
begin
  if exists (select 1 from public.shift_round_entries e join public.shift_rounds x on x.id = e.round_id
              where e.user_id = p_uid and x.id <> r.id
                and shift_round_private.phase_of(x) in ('upcoming','active')) then
    return 'already_in_active_round';
  end if;
  if shift_round_private.phase_of(r) not in ('upcoming','active')
     or shift_round_private.day_of(r, shift_round_private.round_now()) > r.join_cutoff_day then
    return 'join_closed';
  end if;
  if r.join_mode = 'invite' then
    select lower(u.email) into v_email from auth.users u where u.id = p_uid;
    if not exists (select 1 from public.shift_round_allowlist a
                    where a.round_id = r.id and (a.user_id = p_uid or (v_email is not null and a.email = v_email)))
       -- v2 2.6 (D6): an accepted, paid, account-linked application for the round's cohort admits too.
       and not (r.application_cohort is not null and exists (
                  select 1 from public.shift_applications a
                   where a.user_id = p_uid and a.status = 'accepted' and a.paid_at is not null
                     and a.cohort = r.application_cohort)) then
      return 'invite_only';
    end if;
  end if;
  return null;
end $$;

create or replace function public.shift_round_admin_allowlist_import(p_round_id uuid, p_cohort text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_added int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_staff(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if not exists (select 1 from public.shift_rounds r where r.id = p_round_id) then return shift_round_private.fail('round_not_found'); end if;
  insert into public.shift_round_allowlist (round_id, user_id, source, added_by)
  select distinct p_round_id, a.user_id, 'applications', v_uid
    from public.shift_applications a
   where a.cohort = p_cohort and a.status = 'accepted' and a.paid_at is not null and a.user_id is not null
  on conflict (round_id, user_id) where user_id is not null do nothing;
  get diagnostics v_added = row_count;
  return shift_round_private.ok(jsonb_build_object('added', v_added));
end $$;
