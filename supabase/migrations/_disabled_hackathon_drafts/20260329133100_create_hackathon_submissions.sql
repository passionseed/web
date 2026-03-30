-- HAC-8 submission backbone for individual evidence, team synthesis, AI critique, and mentor review.

create table if not exists public.hackathon_activity_individual_submissions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.hackathon_phase_modules(id) on delete cascade,
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'not_started' check (status in ('not_started', 'draft', 'submitted', 'pending_review', 'passed', 'revision_required')),
  text_response text,
  payload jsonb,
  file_urls text[] not null default '{}',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, team_id, user_id)
);

create table if not exists public.hackathon_activity_team_submissions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.hackathon_phase_modules(id) on delete cascade,
  team_id uuid not null references public.hackathon_teams(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'draft', 'submitted', 'pending_review', 'passed', 'revision_required')),
  payload jsonb,
  summary text,
  submitted_by_user_id uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, team_id)
);

create table if not exists public.hackathon_activity_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.hackathon_phase_modules(id) on delete cascade,
  team_submission_id uuid references public.hackathon_activity_team_submissions(id) on delete cascade,
  individual_submission_id uuid references public.hackathon_activity_individual_submissions(id) on delete cascade,
  verdict text not null check (verdict in ('pass', 'revise')),
  score jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hackathon_activity_mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.hackathon_phase_modules(id) on delete cascade,
  team_submission_id uuid references public.hackathon_activity_team_submissions(id) on delete cascade,
  individual_submission_id uuid references public.hackathon_activity_individual_submissions(id) on delete cascade,
  mentor_user_id uuid references auth.users(id) on delete set null,
  verdict text not null check (verdict in ('pass', 'revise')),
  comments text,
  created_at timestamptz not null default now()
);

create index if not exists hackathon_individual_submissions_team_idx
  on public.hackathon_activity_individual_submissions(team_id, module_id);

create index if not exists hackathon_team_submissions_team_idx
  on public.hackathon_activity_team_submissions(team_id, module_id);

alter table public.hackathon_activity_individual_submissions enable row level security;
alter table public.hackathon_activity_team_submissions enable row level security;
alter table public.hackathon_activity_ai_reviews enable row level security;
alter table public.hackathon_activity_mentor_reviews enable row level security;

drop policy if exists "hackathon_activity_individual_submissions_readable" on public.hackathon_activity_individual_submissions;
create policy "hackathon_activity_individual_submissions_readable" on public.hackathon_activity_individual_submissions
  for select using (auth.role() = 'authenticated');

drop policy if exists "hackathon_activity_team_submissions_readable" on public.hackathon_activity_team_submissions;
create policy "hackathon_activity_team_submissions_readable" on public.hackathon_activity_team_submissions
  for select using (auth.role() = 'authenticated');

drop policy if exists "hackathon_activity_ai_reviews_readable" on public.hackathon_activity_ai_reviews;
create policy "hackathon_activity_ai_reviews_readable" on public.hackathon_activity_ai_reviews
  for select using (auth.role() = 'authenticated');

drop policy if exists "hackathon_activity_mentor_reviews_readable" on public.hackathon_activity_mentor_reviews;
create policy "hackathon_activity_mentor_reviews_readable" on public.hackathon_activity_mentor_reviews
  for select using (auth.role() = 'authenticated');
