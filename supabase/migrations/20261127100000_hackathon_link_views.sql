-- Elemental share links (Dec 2026): count the real devices that open each
-- student's or teacher's tracked link (?src=share-<code> or ?src=t-<code>).
-- One row per device per link. A "device" is a keyed hash of a first-party
-- browser cookie id; ip_hash caps how many devices one network can add and
-- netua_hash (network + browser) stops private tabs counting again. Only keyed
-- hashes are stored, never a raw address or id.
-- Nobody reads this from the browser: service-role API routes only.
-- Additive and idempotent: safe to apply straight to production.

create table if not exists public.hackathon_link_views (
  id bigint generated always as identity primary key,
  event_slug text not null,
  source text not null check (source ~ '^(share|t)-[a-z0-9_-]{1,40}$'),
  device_hash text not null check (device_hash ~ '^[0-9a-f]{32}$'),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{32}$'),
  -- network + browser string: private tabs on one phone (a new cookie each time) still count once
  netua_hash text check (netua_hash ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now()
);

create unique index if not exists hackathon_link_views_device_key
  on public.hackathon_link_views (event_slug, source, device_hash);

create index if not exists hackathon_link_views_source_idx
  on public.hackathon_link_views (event_slug, source);

create index if not exists hackathon_link_views_netua_idx
  on public.hackathon_link_views (event_slug, source, netua_hash);

alter table public.hackathon_link_views enable row level security;

drop policy if exists "admins read hackathon link views"
  on public.hackathon_link_views;
create policy "admins read hackathon link views"
  on public.hackathon_link_views for select to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Free seats given for sharing are marked here, so links, seats and the team
-- board count only sign-ups that paid real money.
alter table public.hackathon_event_registrations
  add column if not exists free_seat boolean not null default false;
