-- Sponsor, partner and speaker pipeline for public hackathons (first:
-- Elemental, Dec 2026). The team tracks who they contact and where each
-- conversation stands on /admin/hackathon/elemental.
-- Admin-only: the admin page reaches it through service-role API routes
-- that call requireAdmin() first, and RLS allows admins only.
-- reach holds a public page or channel, never a personal phone number.
-- updated_by holds a short owner name (Big, Angpao, Kirt), never an email.
-- in_kind marks merchandise sponsorship, which never counts as cash.
-- Additive and idempotent: safe to apply straight to production, and the
-- ALTER TABLE lines below bring a partly applied earlier version up to date.

create table if not exists public.hackathon_pipeline (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null default 'elemental-2026',
  kind text not null check (kind in ('sponsor', 'partner', 'speaker')),
  name text not null,
  organisation text,
  element text check (element in ('water', 'earth', 'air', 'fire', 'aether')),
  stage text not null default 'to_contact'
    check (stage in ('to_contact', 'contacted', 'talking', 'yes', 'signed', 'no')),
  owner text,
  amount_thb integer check (amount_thb >= 0),
  why_fit text,
  reach text,
  next_step text,
  next_step_due date,
  notes text,
  position integer,
  in_kind boolean not null default false,
  stage_changed_at timestamptz,
  last_touched_at timestamptz,
  updated_by text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hackathon_pipeline add column if not exists in_kind boolean not null default false;
alter table public.hackathon_pipeline add column if not exists stage_changed_at timestamptz;
alter table public.hackathon_pipeline add column if not exists last_touched_at timestamptz;
alter table public.hackathon_pipeline add column if not exists updated_by text;

create index if not exists hackathon_pipeline_event_kind_stage_idx
  on public.hackathon_pipeline (event_slug, kind, stage);

alter table public.hackathon_pipeline enable row level security;

-- Admins read and manage everything. There are no anon or student policies.
drop policy if exists "admins manage hackathon pipeline"
  on public.hackathon_pipeline;
create policy "admins manage hackathon pipeline"
  on public.hackathon_pipeline for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
