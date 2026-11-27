-- Elemental share links and their free seats (Big, 2026-11-27: "go with
-- 50 devices + 1 paid, max 2 each").
--
-- Any signed-up student (paid or not) and any teacher can make a share link
-- for their school. Every 50 real devices (hackathon_link_views) plus 1 paid
-- sign-up through a link earns it 1 free seat, up to 2 per link: seat 1 at
-- 50 devices + 1 paid, seat 2 at 100 + 2. There is no limit per school; the
-- school stays on the link for the staff fraud check. A teacher's link at 50
-- devices earns a Demo Day invite once staff verify the teacher.
--
-- hackathon_share_links: one row per link.
--   student: registration_id set; code = first 8 hex of the sign-up's id;
--            its QR code tags ?src=share-<code>.
--   teacher: no sign-up; code = 8 random hex; ?src=t-<code>; the private
--            page is /hackathon/elemental/teacher/<token>. Teachers are
--            adults: their name and contact are stored for staff and never
--            shown on a public page. verified_at (staff checked with the
--            school) comes before invited_at (Demo Day invite sent).
-- hackathon_share_seats: one row per earned seat (seat_index 1 or 2).
--   needs_recipient -> qualified   (someone named: a friend's or student's code;
--                                   an unpaid student's first seat starts here,
--                                   with their own sign-up)
--   qualified -> confirmed          (staff: that sign-up becomes free, free_seat
--                                   = true on hackathon_event_registrations,
--                                   see 20261127100000)
--   any open seat -> rejected       (staff: fraud; the seat stays used up)
--   A link can be shut (rejected_at): no more seats, open ones rejected.
--   ELEMENTAL_SEATS_OPEN=0 or a cap on seats (SEAT_RULE.maxSeatsTotal, in
--   code) stops new seats; earned ones can still be named and confirmed.
--
-- Nobody reads these from the browser: service-role API routes only, keyed by
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
  -- Staff checked with the school that this is a real teacher there; the
  -- Demo Day invite can only be marked sent after this.
  verified_at timestamptz,
  verified_by text,
  invited_at timestamptz,
  invited_by text,
  -- Staff shut the link (fraud): it earns no more seats, and its open seats
  -- were turned down.
  rejected_at timestamptz,
  rejected_by text,
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

create table if not exists public.hackathon_share_seats (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  link_id uuid not null
    references public.hackathon_share_links(id) on delete cascade,
  seat_index smallint not null check (seat_index between 1 and 2),
  status text not null default 'needs_recipient'
    check (status in ('qualified', 'needs_recipient', 'confirmed', 'rejected')),
  -- When the link earned this seat, and its numbers then.
  earned_at timestamptz not null,
  devices integer not null default 0,
  paid integer not null default 0,
  -- The sign-up that gets the seat: the owner's own (an unpaid student's
  -- first seat) or the code they named.
  recipient_registration_id uuid
    references public.hackathon_event_registrations(id) on delete set null,
  recipient_named_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each link earns seat 1 and seat 2 once.
create unique index if not exists hackathon_share_seats_link_index_key
  on public.hackathon_share_seats (link_id, seat_index);
-- One free seat per sign-up.
create unique index if not exists hackathon_share_seats_recipient_key
  on public.hackathon_share_seats (recipient_registration_id)
  where status <> 'rejected' and recipient_registration_id is not null;
create index if not exists hackathon_share_seats_event_status_idx
  on public.hackathon_share_seats (event_slug, status);

alter table public.hackathon_share_links enable row level security;
alter table public.hackathon_share_seats enable row level security;

drop policy if exists "admins manage hackathon share links"
  on public.hackathon_share_links;
create policy "admins manage hackathon share links"
  on public.hackathon_share_links for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

drop policy if exists "admins manage hackathon share seats"
  on public.hackathon_share_seats;
create policy "admins manage hackathon share seats"
  on public.hackathon_share_seats for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
