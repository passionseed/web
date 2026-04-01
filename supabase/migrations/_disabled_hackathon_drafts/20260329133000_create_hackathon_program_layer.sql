-- HAC-8 backbone: multi-phase hackathon orchestration above PathLab.
-- This migration is intentionally additive and avoids modifying existing PathLab tables.

create table if not exists public.hackathon_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hackathon_program_phases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.hackathon_programs(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  phase_number integer not null check (phase_number > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, slug),
  unique (program_id, phase_number)
);

create table if not exists public.hackathon_phase_playlists (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.hackathon_program_phases(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  display_order integer not null check (display_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phase_id, slug),
  unique (phase_id, display_order)
);

create table if not exists public.hackathon_phase_modules (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.hackathon_phase_playlists(id) on delete cascade,
  seed_id uuid references public.seeds(id) on delete set null,
  path_id uuid references public.paths(id) on delete set null,
  slug text not null,
  title text not null,
  summary text,
  display_order integer not null check (display_order > 0),
  workflow_scope text not null default 'individual' check (workflow_scope in ('individual', 'team', 'hybrid')),
  gate_rule text not null default 'complete' check (gate_rule in ('complete', 'all_members_complete', 'min_members_complete', 'mentor_pass', 'team_submission_pass')),
  review_mode text not null default 'auto' check (review_mode in ('auto', 'mentor', 'auto_then_mentor')),
  required_member_count integer check (required_member_count is null or required_member_count > 0),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playlist_id, slug),
  unique (playlist_id, display_order)
);

create table if not exists public.hackathon_team_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  program_id uuid not null references public.hackathon_programs(id) on delete cascade,
  current_phase_id uuid references public.hackathon_program_phases(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, program_id)
);

create index if not exists hackathon_program_phases_program_idx
  on public.hackathon_program_phases(program_id, phase_number);

create index if not exists hackathon_phase_playlists_phase_idx
  on public.hackathon_phase_playlists(phase_id, display_order);

create index if not exists hackathon_phase_modules_playlist_idx
  on public.hackathon_phase_modules(playlist_id, display_order);

create index if not exists hackathon_team_program_enrollments_team_idx
  on public.hackathon_team_program_enrollments(team_id, created_at desc);

alter table public.hackathon_programs enable row level security;
alter table public.hackathon_program_phases enable row level security;
alter table public.hackathon_phase_playlists enable row level security;
alter table public.hackathon_phase_modules enable row level security;
alter table public.hackathon_team_program_enrollments enable row level security;

drop policy if exists "hackathon_programs_readable" on public.hackathon_programs;
create policy "hackathon_programs_readable" on public.hackathon_programs
  for select using (auth.role() = 'authenticated');

drop policy if exists "hackathon_program_phases_readable" on public.hackathon_program_phases;
create policy "hackathon_program_phases_readable" on public.hackathon_program_phases
  for select using (auth.role() = 'authenticated');

drop policy if exists "hackathon_phase_playlists_readable" on public.hackathon_phase_playlists;
create policy "hackathon_phase_playlists_readable" on public.hackathon_phase_playlists
  for select using (auth.role() = 'authenticated');

drop policy if exists "hackathon_phase_modules_readable" on public.hackathon_phase_modules;
create policy "hackathon_phase_modules_readable" on public.hackathon_phase_modules
  for select using (auth.role() = 'authenticated');

drop policy if exists "hackathon_team_program_enrollments_readable" on public.hackathon_team_program_enrollments;
create policy "hackathon_team_program_enrollments_readable" on public.hackathon_team_program_enrollments
  for select using (auth.role() = 'authenticated');
