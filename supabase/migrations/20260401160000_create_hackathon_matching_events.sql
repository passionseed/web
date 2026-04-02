create table if not exists public.hackathon_matching_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'ranking_locked', 'matched', 'failed')),
  min_team_size integer not null default 3 check (min_team_size between 2 and 5),
  max_team_size integer not null default 5 check (max_team_size between 3 and 5),
  ranking_deadline timestamptz,
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_team_size <= max_team_size)
);

create table if not exists public.hackathon_matching_met_connections (
  event_id uuid not null references public.hackathon_matching_events(id) on delete cascade,
  participant_id uuid not null references public.hackathon_participants(id) on delete cascade,
  met_participant_id uuid not null references public.hackathon_participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, participant_id, met_participant_id),
  check (participant_id <> met_participant_id)
);

create table if not exists public.hackathon_matching_rankings (
  event_id uuid not null references public.hackathon_matching_events(id) on delete cascade,
  participant_id uuid not null references public.hackathon_participants(id) on delete cascade,
  ranked_participant_id uuid not null references public.hackathon_participants(id) on delete cascade,
  rank_order integer not null check (rank_order > 0),
  created_at timestamptz not null default now(),
  primary key (event_id, participant_id, ranked_participant_id),
  unique (event_id, participant_id, rank_order),
  check (participant_id <> ranked_participant_id)
);

create table if not exists public.hackathon_matching_runs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.hackathon_matching_events(id) on delete cascade,
  status text not null check (status in ('running', 'matched', 'failed')),
  input_snapshot jsonb,
  result_snapshot jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_hackathon_matching_events_status
  on public.hackathon_matching_events(status, created_at desc);

create index if not exists idx_hackathon_matching_met_connections_participant
  on public.hackathon_matching_met_connections(event_id, participant_id);

create index if not exists idx_hackathon_matching_rankings_participant
  on public.hackathon_matching_rankings(event_id, participant_id, rank_order);

create index if not exists idx_hackathon_matching_runs_event
  on public.hackathon_matching_runs(event_id, created_at desc);
