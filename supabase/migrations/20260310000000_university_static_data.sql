-- Migration: Initialize university_static_data table for scraping ground truth

create table if not exists public.university_static_data (
  id               uuid primary key default gen_random_uuid(),
  university_name  text not null,
  faculty_name     text not null,
  gpax_cutoff      text,          -- e.g. "3.50 (2567 รอบ 1)"
  acceptance_rate  text,          -- e.g. "120 ที่นั่ง"
  tuition_per_year integer,       -- THB
  tuition_note     text,
  duration         text,          -- e.g. "6 ปี"
  curriculum_url   text,
  source_urls      text[] default '{}', -- audit: which pages/PDFs contributed
  scraped_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  
  constraint university_static_data_unique
    unique (university_name, faculty_name)
);

-- Index for lookups
create index if not exists university_static_data_name_faculty_idx 
  on public.university_static_data (university_name, faculty_name);

-- RLS
alter table public.university_static_data enable row level security;

create policy "Allow public read access to university static data"
  on public.university_static_data for select
  to authenticated
  using (true);

-- Functions for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.university_static_data
  for each row
  execute function public.handle_updated_at();
