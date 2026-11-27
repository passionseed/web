-- Elemental share links and one free seat per school (Big, 2026-11-27).
--
-- Any signed-up student (paid or not) and any teacher can make a share link
-- for their school. A link qualifies at 50 real devices (hackathon_link_views)
-- and 3 paid seats from sign-ups that came through it. Each school has ONE
-- free seat: the first link there to qualify gets it, and staff confirm it
-- before it is given. A teacher's link at 50 devices earns a Demo Day invite.
--
-- hackathon_share_links: one row per link.
--   student: registration_id set; code = first 8 hex of the sign-up's id;
--            its QR code tags ?src=share-<code>.
--   teacher: no sign-up; code = 8 random hex; ?src=t-<code>; the private
--            page is /hackathon/elemental/teacher/<token>. Teachers are
--            adults: their name and contact are stored for staff and never
--            shown on a public page.
-- hackathon_school_seats: at most one live seat per school.
--   qualified -> confirmed (staff: the sign-up becomes free)
--   qualified -> rejected  (staff: fraud; the link is rejected too, and the
--                           next link to qualify at that school can get it)
--
-- Nobody reads these from the browser: service-role API routes only, keyed by
-- a pay token or a teacher token, and the admin page after requireAdmin().
-- Additive and idempotent: safe to apply straight to production.

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
  invited_at timestamptz,
  invited_by text,
  -- rejected: staff turned the link down; it can no longer win a seat.
  status text not null default 'live' check (status in ('live', 'rejected')),
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
  where kind = 'teacher' and status = 'live';
create index if not exists hackathon_share_links_school_idx
  on public.hackathon_share_links (event_slug, school_key);

create table if not exists public.hackathon_school_seats (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  school_key text not null,
  link_id uuid not null
    references public.hackathon_share_links(id) on delete cascade,
  status text not null default 'qualified'
    check (status in ('qualified', 'confirmed', 'rejected')),
  -- When the link met both goals, and its numbers then.
  qualified_at timestamptz not null,
  devices integer not null default 0,
  paid integer not null default 0,
  -- The sign-up that gets the seat: named on the page (a paid student's
  -- friend, a teacher's student), or set on confirm.
  recipient_registration_id uuid
    references public.hackathon_event_registrations(id) on delete set null,
  recipient_named_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live seat per school.
create unique index if not exists hackathon_school_seats_school_key
  on public.hackathon_school_seats (event_slug, school_key)
  where status <> 'rejected';
-- One free seat per sign-up.
create unique index if not exists hackathon_school_seats_recipient_key
  on public.hackathon_school_seats (recipient_registration_id)
  where status <> 'rejected' and recipient_registration_id is not null;
create index if not exists hackathon_school_seats_link_idx
  on public.hackathon_school_seats (link_id);

alter table public.hackathon_share_links enable row level security;
alter table public.hackathon_school_seats enable row level security;

drop policy if exists "admins manage hackathon share links"
  on public.hackathon_share_links;
create policy "admins manage hackathon share links"
  on public.hackathon_share_links for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "admins manage hackathon school seats"
  on public.hackathon_school_seats;
create policy "admins manage hackathon school seats"
  on public.hackathon_school_seats for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
