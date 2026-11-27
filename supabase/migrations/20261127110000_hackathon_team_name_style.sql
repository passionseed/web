-- Elemental team name styles and the public team board (Dec 2026).
-- A team picks a font, a colour and an effect for its name from fixed lists
-- (lib/hackathon/elemental/team-style.ts); sharing unlocks them. The board at
-- /hackathon/elemental/leaderboard ranks teams by what their members' share
-- links brought in. A sign-up without a team is a one-person team, so its
-- style and board name live on its own registration.
-- Staff can take a team off the board with leaderboard_hidden.
-- RLS is unchanged: both tables stay admin-only, and the pages read them
-- through service-role routes. Additive and idempotent: safe to apply
-- straight to production.

alter table public.hackathon_event_teams
  add column if not exists name_style jsonb,
  add column if not exists leaderboard_hidden boolean not null default false;

alter table public.hackathon_event_registrations
  add column if not exists name_style jsonb,
  add column if not exists leaderboard_name text,
  add column if not exists leaderboard_hidden boolean not null default false;

-- A style is a small object of list ids; the server validates the ids.
do $$
begin
  alter table public.hackathon_event_teams
    add constraint hackathon_event_teams_name_style_shape
    check (name_style is null or (jsonb_typeof(name_style) = 'object' and octet_length(name_style::text) <= 400));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.hackathon_event_registrations
    add constraint hackathon_event_registrations_name_style_shape
    check (name_style is null or (jsonb_typeof(name_style) = 'object' and octet_length(name_style::text) <= 400));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.hackathon_event_registrations
    add constraint hackathon_event_registrations_leaderboard_name_length
    check (leaderboard_name is null or char_length(leaderboard_name) between 1 and 80);
exception when duplicate_object then null;
end $$;

comment on column public.hackathon_event_teams.name_style is
  'Team name style on the Elemental board: {font, color, effect, color2} ids from lib/hackathon/elemental/team-style.ts.';
comment on column public.hackathon_event_teams.leaderboard_hidden is
  'Staff took this team off the public board.';
comment on column public.hackathon_event_registrations.name_style is
  'For a sign-up without a team (a one-person team): its name style on the board.';
comment on column public.hackathon_event_registrations.leaderboard_name is
  'For a sign-up without a team: the name it shows on the board (checked for rude words).';
comment on column public.hackathon_event_registrations.leaderboard_hidden is
  'For a sign-up without a team: staff took it off the public board.';
