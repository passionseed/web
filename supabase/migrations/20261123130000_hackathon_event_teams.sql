-- Teams for hackathon sign-ups (Elemental, Dec 2026): register now, pay later,
-- each person pays for themselves. One person creates a team and shares its
-- invite link; each friend signs up on their own registration (own parent
-- consent, own slip) with team_id pointing here.
-- Like the registrations, nobody reads this from the browser: public pages go
-- through service-role API routes keyed by the unguessable invite_code.
-- Additive and idempotent: safe to apply straight to production.

create table if not exists public.hackathon_event_teams (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);

create index if not exists hackathon_event_teams_event_idx
  on public.hackathon_event_teams (event_slug, created_at desc);

alter table public.hackathon_event_registrations
  add column if not exists team_id uuid
    references public.hackathon_event_teams(id) on delete set null;

create index if not exists hackathon_event_registrations_team_idx
  on public.hackathon_event_registrations (team_id)
  where team_id is not null;

alter table public.hackathon_event_teams enable row level security;

drop policy if exists "admins manage hackathon event teams"
  on public.hackathon_event_teams;
create policy "admins manage hackathon event teams"
  on public.hackathon_event_teams for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
