CREATE TABLE IF NOT EXISTS public.seed_recommendation_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  source_updated_at timestamptz NOT NULL DEFAULT now(),
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seed_recommendation_snapshots_expires_at_idx
  ON public.seed_recommendation_snapshots (expires_at);

ALTER TABLE public.seed_recommendation_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own seed recommendation snapshots"
  ON public.seed_recommendation_snapshots;
CREATE POLICY "Users can read their own seed recommendation snapshots"
  ON public.seed_recommendation_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can write their own seed recommendation snapshots"
  ON public.seed_recommendation_snapshots;
CREATE POLICY "Users can write their own seed recommendation snapshots"
  ON public.seed_recommendation_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
