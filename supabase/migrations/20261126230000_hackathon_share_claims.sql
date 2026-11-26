-- Elemental: share the poster in your school's LINE group, get a free seat
-- (company-brain decisions/log.md, 2026-11-26). One free seat per school,
-- the first 30 only. A sign-up picks its school on the share page; that
-- holds the school for 24 hours while they post. Status flow:
--   held -> sent (they say the screenshot is sent) -> won (admin: free seat)
--   held -> released (24 hours passed, they changed school, or admin said no)
--   sent -> released (admin said no)
-- Nobody reads this table from the browser: the share page reaches it through
-- service-role API routes keyed by the pay token, like the sign-ups.
-- Additive and idempotent: safe to apply straight to production.

create table if not exists public.hackathon_share_claims (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  registration_id uuid not null
    references public.hackathon_event_registrations(id) on delete cascade,
  -- First 8 characters of the sign-up's id: printed on the poster, and its QR code tags ?src=share-<code>.
  code text not null check (code ~ '^[0-9a-f]{8}$'),
  -- obec:<moe code>, bma:<id>, opec:<id>, satit:<hash>, dla:<hash> from the open-data list,
  -- or custom:<folded name> when the school isn't on it.
  school_key text not null,
  school_name text not null,
  province text,
  status text not null default 'held'
    check (status in ('held', 'sent', 'won', 'released')),
  held_until timestamptz not null,
  sent_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One school, one live claim.
create unique index if not exists hackathon_share_claims_school_live_key
  on public.hackathon_share_claims (event_slug, school_key)
  where status <> 'released';
-- One live claim per sign-up.
create unique index if not exists hackathon_share_claims_registration_live_key
  on public.hackathon_share_claims (registration_id)
  where status <> 'released';
create index if not exists hackathon_share_claims_event_status_idx
  on public.hackathon_share_claims (event_slug, status);
create index if not exists hackathon_share_claims_code_idx
  on public.hackathon_share_claims (code);

alter table public.hackathon_share_claims enable row level security;

drop policy if exists "admins manage hackathon share claims"
  on public.hackathon_share_claims;
create policy "admins manage hackathon share claims"
  on public.hackathon_share_claims for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));
