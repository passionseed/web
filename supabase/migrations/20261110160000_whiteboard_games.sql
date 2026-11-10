-- Board games (Spyfall icebreaker): at most one live round per board. Deals are
-- private: the API returns each player only their own card, so these tables are
-- admin-only under RLS and the routes check the board role with guardBoard and
-- then use the service role. The game is played in the visible board space; it
-- adds no private messaging. Additive and idempotent: safe to run twice.

CREATE TABLE IF NOT EXISTS public.whiteboard_game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  game TEXT NOT NULL DEFAULT 'spyfall' CHECK (game IN ('spyfall')),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'playing' CHECK (phase IN ('playing', 'voting', 'revealed', 'ended')),
  -- The host's full deck: [{ name, roles: [..] }]. Only names are ever shown.
  locations JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(locations) = 'array'),
  -- The dealt location; secret until the round is revealed.
  location TEXT NOT NULL CHECK (char_length(location) BETWEEN 1 AND 80),
  spy_count INT NOT NULL DEFAULT 1 CHECK (spy_count BETWEEN 1 AND 3),
  round_seconds INT NULL CHECK (round_seconds IS NULL OR round_seconds BETWEEN 60 AND 3600),
  round_ends_at TIMESTAMPTZ NULL,
  version INT NOT NULL DEFAULT 1,
  -- A spy's single guess at the location; a guess reveals the round.
  spy_guess_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  spy_guess TEXT NULL CHECK (spy_guess IS NULL OR char_length(spy_guess) BETWEEN 1 AND 80),
  spy_guess_correct BOOLEAN NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_game_rounds_board
  ON public.whiteboard_game_rounds (whiteboard_id, created_at DESC);
-- At most one round that has not ended per board.
CREATE UNIQUE INDEX IF NOT EXISTS uq_whiteboard_game_rounds_live
  ON public.whiteboard_game_rounds (whiteboard_id) WHERE phase <> 'ended';

CREATE TABLE IF NOT EXISTS public.whiteboard_game_players (
  round_id UUID NOT NULL REFERENCES public.whiteboard_game_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat INT NOT NULL CHECK (seat BETWEEN 0 AND 63),
  is_spy BOOLEAN NOT NULL DEFAULT false,
  role TEXT NULL CHECK (role IS NULL OR char_length(role) BETWEEN 1 AND 80),
  vote_for UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  voted_at TIMESTAMPTZ NULL,
  PRIMARY KEY (round_id, user_id),
  UNIQUE (round_id, seat)
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_game_players_user ON public.whiteboard_game_players (user_id);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['whiteboard_game_rounds', 'whiteboard_game_players'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))
         WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;
