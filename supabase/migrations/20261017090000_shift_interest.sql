-- SHIFT pre-order: people mark the date ranges they are free for the next
-- round. Nobody pays here. Staff open a round on the first 7-day window
-- enough people share (see lib/shift/interest.ts windowDemand).
-- Additive and idempotent: production is the first database to run this.
-- Written only by /api/shift/interest with the service role; read only by
-- /api/admin/shift/interest. RLS on with no policies keeps anon/authenticated out.

create table if not exists public.shift_interest (
  id uuid primary key default gen_random_uuid(),
  -- One row per person: a second submission with the same IG only adds free dates.
  ig_handle text not null check (ig_handle ~ '^[a-z0-9._]{1,40}$'),
  nickname text not null check (char_length(nickname) between 1 and 30),
  stage text not null check (stage in ('m4','m5','m6','university','working','other')),
  email text check (email is null or char_length(email) <= 120),
  problem text check (problem is null or char_length(problem) <= 500),
  -- [{ "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }], merged and sorted.
  free_ranges jsonb not null check (jsonb_typeof(free_ranges) = 'array' and jsonb_array_length(free_ranges) between 1 and 6),
  committed boolean not null check (committed),
  consent boolean not null check (consent),
  source text check (source is null or char_length(source) <= 80),
  -- Set by staff once a round is picked for this person.
  status text not null default 'waiting' check (status in ('waiting','invited','confirmed','declined')),
  round_number int check (round_number is null or round_number > 0),
  submissions int not null default 1 check (submissions > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shift_interest_ig_handle_uidx on public.shift_interest (ig_handle);
create index if not exists shift_interest_status_idx on public.shift_interest (status, created_at desc);

alter table public.shift_interest enable row level security;
revoke all on table public.shift_interest from anon, authenticated;

comment on table public.shift_interest is
  'SHIFT pre-order sign-ups (free date ranges). Service role only; contains contact details of possible minors.';
