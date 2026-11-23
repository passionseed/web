-- Every bank transfer slip a checker (RDCW or SlipOK) has read, keyed by the
-- bank's transaction reference. One slip pays for one registration only: a
-- second registration that uploads the same slip is rejected as a duplicate,
-- even when the first one went to an admin for review and was never
-- auto-confirmed. RDCW, unlike SlipOK, has no memory of slips it has seen, so
-- this table is that memory. `source` names the payment flow, so other flows
-- on the same PromptPay (SHIFT) can share it later.
-- Nobody reads this from the browser: only service-role API routes write it.
-- Additive and idempotent: safe to apply straight to production.

create table if not exists public.payment_slip_refs (
  trans_ref text primary key check (char_length(trans_ref) between 1 and 100),
  source text not null,
  registration_id uuid
    references public.hackathon_event_registrations(id) on delete set null,
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists payment_slip_refs_registration_idx
  on public.payment_slip_refs (registration_id)
  where registration_id is not null;

-- Slips already confirmed before this table existed.
insert into public.payment_slip_refs (trans_ref, source, registration_id, provider)
select slip_trans_ref, 'hackathon:' || event_slug, id, paid_by
from public.hackathon_event_registrations
where slip_trans_ref is not null
on conflict (trans_ref) do nothing;

alter table public.payment_slip_refs enable row level security;

drop policy if exists "admins read payment slip refs" on public.payment_slip_refs;
create policy "admins read payment slip refs"
  on public.payment_slip_refs for select to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
