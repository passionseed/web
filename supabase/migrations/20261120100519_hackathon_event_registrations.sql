-- Paid sign-up for public hackathons (first: Elemental, Dec 2026).
-- One registration is one group (or one person) that pays on one PromptPay
-- slip. The slip is checked by SlipOK on the server; anything SlipOK cannot
-- decide goes to 'review' for an admin.
-- Status flow: pending -> paid (SlipOK or admin), pending -> review -> paid.
-- Nobody reads these tables from the browser: the public pages reach them
-- through service-role API routes, keyed by an unguessable pay_token.
-- Additive and idempotent: safe to apply straight to production.

create table if not exists public.hackathon_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  pay_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending'
    check (status in ('pending', 'review', 'paid', 'cancelled')),
  team_name text,
  member_count integer not null check (member_count between 1 and 10),
  amount_baht integer not null check (amount_baht >= 0),
  contact_email text not null,
  contact_phone text not null,
  contact_line_id text,
  wants_team_matching boolean not null default false,
  no_refund_ack boolean not null default false,
  contact_after_consent boolean not null default false,
  source text,
  utm jsonb,
  slip_path text,
  slip_trans_ref text,
  slip_check jsonb,
  paid_at timestamptz,
  paid_by text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hackathon_event_registrations_trans_ref_key
  on public.hackathon_event_registrations (slip_trans_ref)
  where slip_trans_ref is not null;
create index if not exists hackathon_event_registrations_event_status_idx
  on public.hackathon_event_registrations (event_slug, status, created_at desc);

create table if not exists public.hackathon_event_registration_members (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null
    references public.hackathon_event_registrations(id) on delete cascade,
  position integer not null check (position >= 1),
  full_name text not null,
  nickname text,
  age integer not null check (age between 10 and 99),
  school text not null,
  parent_name text,
  parent_phone text,
  parent_consent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (registration_id, position),
  -- Everyone under 20 needs a parent's consent and a way to reach the parent.
  constraint hackathon_event_member_parent_consent check (
    age >= 20
    or (parent_consent and parent_name is not null and parent_phone is not null)
  )
);

create index if not exists hackathon_event_registration_members_reg_idx
  on public.hackathon_event_registration_members (registration_id);

alter table public.hackathon_event_registrations enable row level security;
alter table public.hackathon_event_registration_members enable row level security;

-- Admins read and manage everything. There are no anon or student policies:
-- the public flow goes through the service role in API routes.
drop policy if exists "admins manage hackathon event registrations"
  on public.hackathon_event_registrations;
create policy "admins manage hackathon event registrations"
  on public.hackathon_event_registrations for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "admins manage hackathon event registration members"
  on public.hackathon_event_registration_members;
create policy "admins manage hackathon event registration members"
  on public.hackathon_event_registration_members for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Private bucket for payment slips. Only the service role touches it;
-- admins see slips through short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('hackathon-slips', 'hackathon-slips', false)
on conflict (id) do nothing;
