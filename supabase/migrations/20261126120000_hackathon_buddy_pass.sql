-- Buddy pass for hackathon sign-ups (Elemental, Dec 2026).
-- A person who signs up alone and pays the solo price (฿199) unlocks one pass.
-- One friend who signs up with it pays ฿99, so the pair pays what a team of
-- two does (199 + 99 = 2 x 149).
--
-- - buddy_pass_code: the pass's code, on every registration. The app only
--   shows it, and only accepts it, when its registration is a paid solo
--   sign-up at the solo price.
-- - buddy_pass_from_registration_id: on the friend's registration, the
--   registration whose pass they used.
-- - buddy_pass_owe: what the friend jokingly owes back ("boba", ...), from
--   the link. Just for fun, nothing checks or collects it.
--
-- One use per pass: the partial unique index lets only one registration that
-- isn't cancelled point at a pass. Two friends racing get one sign-up and one
-- unique violation. When an admin cancels the friend's sign-up, the pass can
-- be used again.
-- Additive and idempotent: safe to apply straight to production. The tables
-- already have RLS (admins only); no new table.

alter table public.hackathon_event_registrations
  add column if not exists buddy_pass_code text
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

-- Rows that existed before the column got a code from the default; this
-- covers any that somehow didn't.
update public.hackathon_event_registrations
  set buddy_pass_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
  where buddy_pass_code is null;

create unique index if not exists hackathon_event_registrations_buddy_pass_code_key
  on public.hackathon_event_registrations (buddy_pass_code)
  where buddy_pass_code is not null;

alter table public.hackathon_event_registrations
  add column if not exists buddy_pass_from_registration_id uuid
    references public.hackathon_event_registrations(id) on delete set null;

alter table public.hackathon_event_registrations
  add column if not exists buddy_pass_owe text;

create unique index if not exists hackathon_event_registrations_buddy_pass_once
  on public.hackathon_event_registrations (buddy_pass_from_registration_id)
  where buddy_pass_from_registration_id is not null and status <> 'cancelled';
