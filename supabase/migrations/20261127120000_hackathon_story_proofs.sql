-- Elemental Instagram Story proofs (Big, 2026-11-27).
-- A student posts their share poster as an Instagram Story and uploads a
-- screenshot showing 200+ views. That unlocks every team-name style for their
-- team at once, with no staff check (it's only cosmetic). Staff can
-- spot-check and revoke from the admin page.
--
-- hackathon_story_proofs: one row per sign-up. A new upload points the row at
-- the new file (and clears revoked_at); the old file is deleted.
-- The screenshot lives in the private hackathon-story-proofs bucket at
-- <event_slug>/<registration_id>/<upload ms>-<random>.<ext>. Staff see it
-- through short-lived signed URLs only; no public route returns it.
-- After Demo Day, staff run scripts/delete-story-proofs.mjs, which deletes
-- every file and row for the event.
--
-- Nobody reads this from the browser: service-role API routes only, keyed by
-- a pay token, and the admin page after requireAdmin(). RLS is on with an
-- admin-only policy. Additive and idempotent: safe to apply straight to
-- production.

create table if not exists public.hackathon_story_proofs (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  registration_id uuid not null
    references public.hackathon_event_registrations(id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 300),
  uploaded_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by text
);

-- One proof per sign-up: a new upload replaces it.
create unique index if not exists hackathon_story_proofs_registration_key
  on public.hackathon_story_proofs (registration_id);
create index if not exists hackathon_story_proofs_event_idx
  on public.hackathon_story_proofs (event_slug, uploaded_at desc);

alter table public.hackathon_story_proofs enable row level security;

drop policy if exists "admins manage hackathon story proofs"
  on public.hackathon_story_proofs;
create policy "admins manage hackathon story proofs"
  on public.hackathon_story_proofs for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

comment on table public.hackathon_story_proofs is
  'Elemental: one Instagram Story screenshot per sign-up (private bucket hackathon-story-proofs). A live row unlocks every team-name style for the team. Deleted after Demo Day.';

-- Private bucket for the screenshots, like hackathon-slips. Only the service
-- role touches it; admins see a proof through a short-lived signed URL.
insert into storage.buckets (id, name, public)
values ('hackathon-story-proofs', 'hackathon-story-proofs', false)
on conflict (id) do nothing;
