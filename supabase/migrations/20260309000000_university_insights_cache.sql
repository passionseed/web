create table if not exists university_insights_cache (
  id uuid primary key default gen_random_uuid(),
  university_name text not null,
  faculty_name    text not null,
  career_goal     text not null default '',
  data            jsonb not null,
  source          text not null default 'ai', -- 'seeded' | 'ai'
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  constraint university_insights_cache_unique
    unique (university_name, faculty_name, career_goal)
);

create index university_insights_cache_lookup
  on university_insights_cache (university_name, faculty_name, career_goal);

alter table university_insights_cache enable row level security;

create policy "University cache readable by authenticated"
  on university_insights_cache for select
  to authenticated using (true);
