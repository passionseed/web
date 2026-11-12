-- SHIFT High Island RSVPs: one row per PassionSeed account that pressed the
-- invite's wax seal ("I'm coming") on /shift/island. SHIFT alumni only; the
-- route checks that before it writes (app/api/shift/island/rsvp/route.ts).
-- Staff give each RSVP the Discord role "SHIFT high" by hand for now
-- (docs/runbooks/shift-high-island-rollout.md, step G).
--
-- Students are minors: admin-only read, apart from a student reading their
-- own row. Writes go through the service role (lib/supabase/shift-island-rsvps.ts).
--
-- Renumbered from 20261111120000_shift_island_rsvps (PR #271): that version
-- is already taken by 20261111120000_whiteboard_quest_reviewers on main.
-- Additive and idempotent: safe to apply straight to production.

CREATE TABLE IF NOT EXISTS public.shift_island_rsvps (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  season text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_island_rsvps IS
  'SHIFT High Island invite RSVPs, one per account (minors: admin-only read, writes via the service role)';

CREATE INDEX IF NOT EXISTS idx_shift_island_rsvps_created
  ON public.shift_island_rsvps (created_at DESC);

ALTER TABLE public.shift_island_rsvps ENABLE ROW LEVEL SECURITY;

-- The Data API never writes here; reads are limited by the policies below.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.shift_island_rsvps FROM anon, authenticated;
REVOKE ALL ON public.shift_island_rsvps FROM anon;

DROP POLICY IF EXISTS "Admins can read shift island rsvps" ON public.shift_island_rsvps;
CREATE POLICY "Admins can read shift island rsvps"
  ON public.shift_island_rsvps
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Students can read their own island rsvp" ON public.shift_island_rsvps;
CREATE POLICY "Students can read their own island rsvp"
  ON public.shift_island_rsvps
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
