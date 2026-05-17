create table if not exists public.wrapped_reflections (
  enrollment_id uuid not null,
  participant_id uuid not null,
  archetype text not null,
  archetype_secondary text not null,
  axes jsonb not null default '{}'::jsonb,
  surprise_evidence text not null default '',
  phase1_title text not null default '',
  archetype_fit text not null default 'nailed',
  phase2_cycles_run integer,
  phase2_primary_method text,
  phase2_ideas_killed integer,
  phase2_surprise text,
  created_at timestamptz not null default now(),

  primary key (enrollment_id, participant_id)
);

-- Index for participant-only lookups (when enrollment_id is unknown)
create index if not exists idx_wrapped_reflections_participant
  on public.wrapped_reflections(participant_id, created_at desc);

-- Enable RLS
alter table public.wrapped_reflections enable row level security;

-- Policy: participants can read their own reflection
create policy "Participants can read own wrapped reflection"
  on public.wrapped_reflections
  for select
  to authenticated, anon
  using (participant_id = coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    (select auth.uid()::text)
  )::uuid);

-- Policy: participants can insert/update their own reflection
create policy "Participants can upsert own wrapped reflection"
  on public.wrapped_reflections
  for all
  to authenticated, anon
  using (participant_id = coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    (select auth.uid()::text)
  )::uuid)
  with check (participant_id = coalesce(
    nullif(current_setting('request.jwt.claims', true)::json->>'sub', ''),
    (select auth.uid()::text)
  )::uuid);
