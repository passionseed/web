-- Elemental share links (Dec 2026). Sharing earns looks only: team-name
-- styles and the team board, never a free seat (Big, 2026-11-27).
--
-- Any signed-up student (paid or not) and any teacher can make a share link
-- for their school. The link counts the real devices that open it
-- (hackathon_link_views, 20261127100000) and the paid sign-ups that come
-- through it, both only up to sign-up close.
--
-- hackathon_share_links: one row per link.
--   student: registration_id set; code = first 8 hex of the sign-up's id;
--            its QR code tags ?src=share-<code>.
--   teacher: no sign-up; code = 8 random hex; ?src=t-<code>; the private
--            page is /hackathon/elemental/teacher/<token>. Teachers are
--            adults: their name and contact are stored for staff and never
--            shown on a public page.
--
-- Nobody reads this from the browser: service-role API routes only, keyed by
-- a pay token or a teacher token, and the admin page after requireAdmin().
-- Additive and idempotent: safe to apply straight to production. Never
-- applied before this version, so nothing older needs dropping.

create table if not exists public.hackathon_share_links (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  kind text not null check (kind in ('student', 'teacher')),
  code text not null check (code ~ '^[0-9a-f]{8}$'),
  registration_id uuid
    references public.hackathon_event_registrations(id) on delete cascade,
  -- obec:<moe code>, bma:<id>, opec:<id>, satit:<hash>, dla:<hash> from the
  -- open-data list, or custom:<folded name> when the school isn't on it.
  school_key text not null,
  school_name text not null,
  province text,
  -- Teachers only.
  token text check (token ~ '^[0-9a-f]{32}$'),
  teacher_name text,
  teacher_contact text,
  -- email:<lowercase> or line:<lowercase id>: one live link per contact.
  teacher_contact_key text,
  teacher_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hackathon_share_links_kind_fields check (
    (kind = 'student' and registration_id is not null and token is null)
    or (kind = 'teacher' and registration_id is null and token is not null
        and teacher_name is not null and teacher_contact_key is not null)
  )
);

create unique index if not exists hackathon_share_links_code_key
  on public.hackathon_share_links (event_slug, code);
create unique index if not exists hackathon_share_links_registration_key
  on public.hackathon_share_links (registration_id)
  where registration_id is not null;
create unique index if not exists hackathon_share_links_token_key
  on public.hackathon_share_links (token)
  where token is not null;
create unique index if not exists hackathon_share_links_teacher_contact_key
  on public.hackathon_share_links (event_slug, teacher_contact_key)
  where kind = 'teacher';
create index if not exists hackathon_share_links_school_idx
  on public.hackathon_share_links (event_slug, school_key);

alter table public.hackathon_share_links enable row level security;

drop policy if exists "admins manage hackathon share links"
  on public.hackathon_share_links;
create policy "admins manage hackathon share links"
  on public.hackathon_share_links for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
