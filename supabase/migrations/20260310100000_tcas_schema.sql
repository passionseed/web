-- Enable pgvector
create extension if not exists vector;

-- Drop old tables (data is superseded)
drop table if exists public.university_static_data cascade;
drop table if exists public.thailand_admission_plans cascade;

-- 1. tcas_universities
create table if not exists public.tcas_universities (
  id                 uuid primary key default gen_random_uuid(),
  university_id      text not null unique,
  university_name    text not null,
  university_name_en text,
  university_type    text,
  file_paths         jsonb not null default '{}',
  scraped_at         timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 2. tcas_programs
create table if not exists public.tcas_programs (
  id               uuid primary key default gen_random_uuid(),
  university_id    text not null references public.tcas_universities(university_id),
  program_id       text not null unique,
  campus_id        text,
  campus_name      text,
  faculty_id       text,
  faculty_name     text,
  faculty_name_en  text,
  field_name       text,
  field_name_en    text,
  program_name     text not null,
  program_name_en  text,
  program_type     text,
  program_type_name text,
  total_seats      integer,
  cost             text,
  graduate_rate    text,
  min_score        numeric,
  max_score        numeric,
  score_components jsonb,
  search_text      text generated always as (
    coalesce(program_name, '') || ' ' ||
    coalesce(program_name_en, '') || ' ' ||
    coalesce(faculty_name, '') || ' ' ||
    coalesce(faculty_name_en, '') || ' ' ||
    coalesce(field_name, '') || ' ' ||
    coalesce(field_name_en, '')
  ) stored,
  embedding        vector(1024),
  scraped_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 3. tcas_admission_rounds
create table if not exists public.tcas_admission_rounds (
  id                  uuid primary key default gen_random_uuid(),
  program_id          text not null references public.tcas_programs(program_id),
  university_id       text not null references public.tcas_universities(university_id),
  project_id          text,
  project_name        text,
  round_type          text not null,
  round_number        smallint generated always as (
    cast(split_part(round_type, '_', 1) as smallint)
  ) stored,
  academic_year       text generated always as (
    split_part(round_type, '_', 2)
  ) stored,
  receive_seats       integer,
  min_gpax            numeric,
  min_total_score     numeric,
  score_conditions    jsonb,
  score_weights       jsonb,
  only_formal         smallint,
  only_international  smallint,
  only_vocational     smallint,
  only_non_formal     smallint,
  only_ged            smallint,
  grad_current        boolean,
  interview_location  text,
  interview_date      text,
  interview_time      text,
  folio_closed_date   text,
  folio_page_limit    text,
  link                text,
  description         text,
  condition           text,
  scraped_at          timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint tcas_rounds_unique unique (program_id, round_type, project_id)
);

-- Indexes
create index idx_tcas_rounds_program     on public.tcas_admission_rounds(program_id);
create index idx_tcas_rounds_eligibility on public.tcas_admission_rounds(round_number, min_gpax);
create index idx_tcas_rounds_university  on public.tcas_admission_rounds(university_id, round_number);
create index idx_tcas_programs_university on public.tcas_programs(university_id, faculty_id);
create index idx_tcas_programs_embedding on public.tcas_programs
  using ivfflat (embedding vector_cosine_ops) with (lists = 20);
create index idx_tcas_programs_search_text on public.tcas_programs
  using gin (to_tsvector('simple', search_text));

-- Updated_at triggers
create trigger set_updated_at before update on public.tcas_universities
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.tcas_programs
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.tcas_admission_rounds
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.tcas_universities      enable row level security;
alter table public.tcas_programs          enable row level security;
alter table public.tcas_admission_rounds  enable row level security;

create policy "public_read" on public.tcas_universities
  for select to authenticated, anon using (true);
create policy "public_read" on public.tcas_programs
  for select to authenticated, anon using (true);
create policy "public_read" on public.tcas_admission_rounds
  for select to authenticated, anon using (true);

create policy "service_write" on public.tcas_universities
  for all to service_role using (true) with check (true);
create policy "service_write" on public.tcas_programs
  for all to service_role using (true) with check (true);
create policy "service_write" on public.tcas_admission_rounds
  for all to service_role using (true) with check (true);
