-- Track raw hackathon journey alien-button clicks per participant.
-- Hackathon uses custom auth, so anon/authenticated clients are allowed to insert.

create table if not exists public.hackathon_journey_alien_clicks (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.hackathon_participants(id) on delete cascade,
  participant_name text,
  team_id uuid references public.hackathon_teams(id) on delete set null,
  source text not null default 'journey_header_alien_button',
  target_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hackathon_journey_alien_clicks_participant_created
  on public.hackathon_journey_alien_clicks(participant_id, created_at desc);

create index if not exists idx_hackathon_journey_alien_clicks_team_created
  on public.hackathon_journey_alien_clicks(team_id, created_at desc);

alter table public.hackathon_journey_alien_clicks enable row level security;

drop policy if exists "hackathon_journey_alien_clicks_anon_insert" on public.hackathon_journey_alien_clicks;
create policy "hackathon_journey_alien_clicks_anon_insert"
  on public.hackathon_journey_alien_clicks
  for insert
  to anon
  with check (true);

drop policy if exists "hackathon_journey_alien_clicks_authenticated_insert" on public.hackathon_journey_alien_clicks;
create policy "hackathon_journey_alien_clicks_authenticated_insert"
  on public.hackathon_journey_alien_clicks
  for insert
  to authenticated
  with check (true);

drop policy if exists "hackathon_journey_alien_clicks_anon_select" on public.hackathon_journey_alien_clicks;
create policy "hackathon_journey_alien_clicks_anon_select"
  on public.hackathon_journey_alien_clicks
  for select
  to anon
  using (true);

drop policy if exists "hackathon_journey_alien_clicks_authenticated_select" on public.hackathon_journey_alien_clicks;
create policy "hackathon_journey_alien_clicks_authenticated_select"
  on public.hackathon_journey_alien_clicks
  for select
  to authenticated
  using (true);

comment on table public.hackathon_journey_alien_clicks is 'Raw click events for the alien easter-egg button on the hackathon journey screen.';
comment on column public.hackathon_journey_alien_clicks.source is 'UI surface that triggered the click.';
