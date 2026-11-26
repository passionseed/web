-- Elemental sign-ups become PassionSeed accounts through Discord.
-- A paid participant signs in with Discord from their own sign-up page; that
-- links the sign-up to their account and the bot adds them to the hackathon
-- Discord server with the event role. Additive and idempotent.

ALTER TABLE public.hackathon_event_registrations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discord_user_id text,
  ADD COLUMN IF NOT EXISTS discord_username text,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS discord_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS discord_error text;

CREATE INDEX IF NOT EXISTS hackathon_event_registrations_user_id_idx
  ON public.hackathon_event_registrations (user_id)
  WHERE user_id IS NOT NULL;

-- Whether the signed-in user holds a live hackathon sign-up. Such accounts
-- skip the PassionSeed onboard: the sign-up form already collected their
-- name, school and parent consent. A boolean only, so the row itself (admin
-- notes, slip checks) stays admin-only under the table's existing RLS.
CREATE OR REPLACE FUNCTION public.has_hackathon_registration()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hackathon_event_registrations
    WHERE user_id = auth.uid()
      AND status <> 'cancelled'
  );
$$;

REVOKE ALL ON FUNCTION public.has_hackathon_registration() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_hackathon_registration() TO authenticated;
