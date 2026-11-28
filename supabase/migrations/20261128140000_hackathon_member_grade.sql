-- School year on the Elemental sign-up form (Big, 2026-11-28: "let them put
-- their ม 3/4/5/6"). The event is for M.3 to M.6; "other" covers anyone else.
-- Nullable: sign-ups made before the question have none.
-- Additive and idempotent: safe to apply straight to production. The app
-- saves sign-ups without the column until it exists.

alter table public.hackathon_event_registration_members
  add column if not exists grade text;

alter table public.hackathon_event_registration_members
  drop constraint if exists hackathon_event_member_grade;

alter table public.hackathon_event_registration_members
  add constraint hackathon_event_member_grade
  check (grade is null or grade in ('m3', 'm4', 'm5', 'm6', 'other'));
