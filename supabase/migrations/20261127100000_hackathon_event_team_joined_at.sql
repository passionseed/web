-- Joining and leaving a team after signing up (Elemental, Dec 2026).
-- Until now a sign-up's team was fixed when it was created, so the order of
-- a team was the order its sign-ups were made. A person who signed up alone
-- can now join a team later from their own page, with the team's code.
--
-- team_joined_at: when a sign-up joined (or started) its team from its own
-- page. Null for a sign-up made on a team's link: it joined when it was
-- created, so created_at is its join time. The app orders a team by
-- coalesce(team_joined_at, created_at), which keeps the person who started
-- the team first even when an older solo sign-up joins it later.
-- Additive and idempotent: safe to apply straight to production. The app
-- reads without this column until it exists.

alter table public.hackathon_event_registrations
  add column if not exists team_joined_at timestamptz;
