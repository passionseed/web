-- Hackathon program shell above PathLab

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
  phase_number int not null check (phase_number >= 1),
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
  display_order int not null default 1 check (display_order >= 1),
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
  display_order int not null default 1 check (display_order >= 1),
  workflow_scope text not null default 'hybrid' check (workflow_scope in ('individual', 'team', 'hybrid')),
  gate_rule text not null default 'min_members_complete' check (gate_rule in ('complete', 'all_members_complete', 'min_members_complete', 'mentor_pass', 'team_submission_pass')),
  review_mode text not null default 'auto' check (review_mode in ('auto', 'mentor', 'auto_then_mentor')),
  required_member_count int,
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
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, program_id)
);

create index if not exists idx_hackathon_program_phases_program
  on public.hackathon_program_phases(program_id, phase_number);

create index if not exists idx_hackathon_phase_playlists_phase
  on public.hackathon_phase_playlists(phase_id, display_order);

create index if not exists idx_hackathon_phase_modules_playlist
  on public.hackathon_phase_modules(playlist_id, display_order);

create index if not exists idx_hackathon_team_program_enrollments_team
  on public.hackathon_team_program_enrollments(team_id, program_id);

drop trigger if exists hackathon_programs_handle_updated_at on public.hackathon_programs;
create trigger hackathon_programs_handle_updated_at
before update on public.hackathon_programs
for each row execute function public.handle_updated_at();

drop trigger if exists hackathon_program_phases_handle_updated_at on public.hackathon_program_phases;
create trigger hackathon_program_phases_handle_updated_at
before update on public.hackathon_program_phases
for each row execute function public.handle_updated_at();

drop trigger if exists hackathon_phase_playlists_handle_updated_at on public.hackathon_phase_playlists;
create trigger hackathon_phase_playlists_handle_updated_at
before update on public.hackathon_phase_playlists
for each row execute function public.handle_updated_at();

drop trigger if exists hackathon_phase_modules_handle_updated_at on public.hackathon_phase_modules;
create trigger hackathon_phase_modules_handle_updated_at
before update on public.hackathon_phase_modules
for each row execute function public.handle_updated_at();

drop trigger if exists hackathon_team_program_enrollments_handle_updated_at on public.hackathon_team_program_enrollments;
create trigger hackathon_team_program_enrollments_handle_updated_at
before update on public.hackathon_team_program_enrollments
for each row execute function public.handle_updated_at();
