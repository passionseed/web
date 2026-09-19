-- SHIFT Cohort Application & Triage Capture
-- Funnel: /shift -> In-App Triage Modal -> this table -> LINE/Discord 1-on-1 interview closing

create table if not exists public.shift_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cohort text not null default 'shift-0',
  name text not null,
  contact text not null,                -- LINE ID or phone number
  school text,
  grade text,                          -- e.g. ม.4, ม.5, ม.6, อื่นๆ
  target_faculty text not null,         -- e.g. Chula CEDT, ISE, BBA, Thammasat, KMUTT FIBO
  project_idea text not null,           -- raw hypothesis or problem statement
  user_reach_confirmed boolean not null default false, -- Can you reach 15-20 real users in 48h?
  user_reach_group text,                -- Who are your 15 users? (e.g. classmates, badminton club)
  status text not null default 'pending', -- pending, triaged, accepted, waitlisted, rejected
  source text default 'shift_page'      -- utm or location tag (hero, final_cta, sticky_bar, techseed_bridge)
);

comment on table public.shift_applications is 'Applications for the 7-day SHIFT Crucible. Enforces the 3-point intake triage filter (15 real users reach, raw hypothesis, target faculty).';

-- Indexes for admin sorting and triage
create index if not exists idx_shift_applications_created_at on public.shift_applications(created_at desc);
create index if not exists idx_shift_applications_status on public.shift_applications(status);
create index if not exists idx_shift_applications_cohort on public.shift_applications(cohort);

alter table public.shift_applications enable row level security;

-- Anonymous public insert only. Reads go through service role (admin/API).
drop policy if exists "anyone can apply for shift" on public.shift_applications;
create policy "anyone can apply for shift"
  on public.shift_applications for insert
  to anon, authenticated
  with check (true);
