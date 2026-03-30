-- Team and participant submissions for hackathon program modules

create table if not exists public.hackathon_activity_individual_submissions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.hackathon_phase_modules(id) on delete cascade,
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  participant_id uuid not null references public.hackathon_participants(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'draft', 'submitted', 'pending_review', 'passed', 'revision_required')),
  payload jsonb,
  file_urls text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, participant_id)
);

create table if not exists public.hackathon_activity_team_submissions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.hackathon_phase_modules(id) on delete cascade,
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'pending_review', 'passed', 'revision_required')),
  payload jsonb,
  file_urls text[],
  submitted_by_participant_id uuid references public.hackathon_participants(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, team_id)
);

create table if not exists public.hackathon_activity_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  team_submission_id uuid not null references public.hackathon_activity_team_submissions(id) on delete cascade,
  model text,
  status text not null default 'completed' check (status in ('queued', 'completed', 'failed')),
  feedback jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hackathon_activity_mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.hackathon_phase_modules(id) on delete cascade,
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  individual_submission_id uuid references public.hackathon_activity_individual_submissions(id) on delete cascade,
  team_submission_id uuid references public.hackathon_activity_team_submissions(id) on delete cascade,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'passed', 'revision_required')),
  comments text,
  reviewed_by_participant_id uuid references public.hackathon_participants(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_hackathon_individual_submissions_team_module
  on public.hackathon_activity_individual_submissions(team_id, module_id);

create index if not exists idx_hackathon_individual_submissions_participant_module
  on public.hackathon_activity_individual_submissions(participant_id, module_id);

create index if not exists idx_hackathon_team_submissions_team_module
  on public.hackathon_activity_team_submissions(team_id, module_id);

create index if not exists idx_hackathon_mentor_reviews_team_module
  on public.hackathon_activity_mentor_reviews(team_id, module_id);

drop trigger if exists hackathon_activity_individual_submissions_handle_updated_at on public.hackathon_activity_individual_submissions;
create trigger hackathon_activity_individual_submissions_handle_updated_at
before update on public.hackathon_activity_individual_submissions
for each row execute function public.handle_updated_at();

drop trigger if exists hackathon_activity_team_submissions_handle_updated_at on public.hackathon_activity_team_submissions;
create trigger hackathon_activity_team_submissions_handle_updated_at
before update on public.hackathon_activity_team_submissions
for each row execute function public.handle_updated_at();
