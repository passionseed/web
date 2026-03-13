-- supabase/migrations/20260313000000_tcas1_portfolio.sql

-- ─────────────────────────────────────────────────────────────
-- 1. program_requirements
--    Enriched TCAS1 admission criteria per round.
--    Populated by scripts/enrich-tcas1-requirements.ts
-- ─────────────────────────────────────────────────────────────
create table if not exists public.program_requirements (
  id                  uuid primary key default gen_random_uuid(),
  round_id            uuid not null references public.tcas_admission_rounds(id) on delete cascade,
  program_id          text not null references public.tcas_programs(program_id) on delete cascade,
  what_they_seek      text,           -- free-text: type of student/project they want
  portfolio_criteria  jsonb,          -- ["project portfolio", "essay", "interview"]
  program_vision      text,           -- faculty mission / culture from uni site
  sample_keywords     text[],         -- signal words from admission materials
  source_urls         text[],         -- where data was crawled from (audit trail)
  enrichment_version  int not null default 1,
  enriched_at         timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (round_id)
);

create index idx_program_requirements_program on public.program_requirements(program_id);

create trigger set_updated_at before update on public.program_requirements
  for each row execute function public.handle_updated_at();

alter table public.program_requirements enable row level security;
create policy "public_read" on public.program_requirements
  for select to authenticated, anon using (true);
create policy "service_write" on public.program_requirements
  for all to service_role using (true) with check (true);

-- ─────────────────────────────────────────────────────────────
-- 2. student_portfolio_items
--    Portfolio items manually added by the student.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.student_portfolio_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  item_type           text not null check (item_type in ('project','award','activity','course','other')),
  title               text not null,
  description         text,
  date_from           date,
  date_to             date,
  tags                text[] not null default '{}',
  embedding           vector(1024),   -- bge-m3 embedding, computed async after insert
  source              text not null default 'manual' check (source in ('manual','pathlab_auto')),
  pathlab_journey_id  uuid,           -- FK if auto-pulled from PathLab
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint date_order check (date_from is null or date_to is null or date_from <= date_to),
  constraint title_length check (char_length(title) <= 200),
  constraint description_length check (char_length(description) <= 2000)
);

create index idx_portfolio_items_user on public.student_portfolio_items(user_id);
create index idx_portfolio_items_user_type on public.student_portfolio_items(user_id, item_type);

create trigger set_updated_at before update on public.student_portfolio_items
  for each row execute function public.handle_updated_at();

alter table public.student_portfolio_items enable row level security;
create policy "own_select" on public.student_portfolio_items
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.student_portfolio_items
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.student_portfolio_items
  for update using (auth.uid() = user_id);
create policy "own_delete" on public.student_portfolio_items
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. program_fit_scores
--    Cached fit scores per student per TCAS1 round.
--    Invalidated when student adds/removes portfolio items.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.program_fit_scores (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  round_id            uuid not null references public.tcas_admission_rounds(id) on delete cascade,
  program_id          text not null references public.tcas_programs(program_id),
  eligibility_pass    boolean not null,
  fit_score           int check (fit_score >= 0 and fit_score <= 100),
  confidence          text not null default 'low' check (confidence in ('low','medium','high')),
  narrative           text,           -- AI-generated explanation (may be null)
  gaps                jsonb,          -- [{gap: "community impact", suggestion: "..."}]
  portfolio_snapshot  jsonb,          -- snapshot of portfolio at scoring time (for debug)
  scored_at           timestamptz not null default now(),
  score_version       int not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, round_id)
);

create index idx_fit_scores_user on public.program_fit_scores(user_id, scored_at desc);
create index idx_fit_scores_user_score on public.program_fit_scores(user_id, fit_score desc);

create trigger set_updated_at before update on public.program_fit_scores
  for each row execute function public.handle_updated_at();

alter table public.program_fit_scores enable row level security;
create policy "own_select" on public.program_fit_scores
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.program_fit_scores
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.program_fit_scores
  for update using (auth.uid() = user_id);
create policy "service_write" on public.program_fit_scores
  for all to service_role using (true) with check (true);
