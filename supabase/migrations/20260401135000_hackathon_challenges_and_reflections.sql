create table if not exists public.hackathon_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  icon text,
  color text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hackathon_challenges (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.hackathon_tracks(id) on delete cascade,
  num text not null,
  title_en text not null,
  title_th text,
  hook_en text,
  hook_th text,
  challenge_en text not null,
  challenge_th text,
  tangible_equivalent_en text,
  tangible_equivalent_th text,
  tags text[] not null default '{}',
  severity integer,
  difficulty integer,
  impact integer,
  urgency integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, num)
);

alter table public.hackathon_team_program_enrollments
  add column if not exists selected_challenge_id uuid references public.hackathon_challenges(id) on delete set null;

create table if not exists public.hackathon_team_reflections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  phase_id uuid not null references public.hackathon_program_phases(id) on delete cascade,
  prev_hypothesis text not null,
  new_reality text not null,
  key_insight text not null,
  member_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hackathon_tracks_display_order
  on public.hackathon_tracks(display_order);

create index if not exists idx_hackathon_challenges_track
  on public.hackathon_challenges(track_id, num);

create index if not exists idx_hackathon_enrollments_selected_challenge
  on public.hackathon_team_program_enrollments(selected_challenge_id);

create index if not exists idx_hackathon_team_reflections_phase_team
  on public.hackathon_team_reflections(phase_id, team_id, created_at desc);
