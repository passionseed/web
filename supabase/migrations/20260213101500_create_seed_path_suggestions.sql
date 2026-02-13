CREATE TABLE IF NOT EXISTS public.seed_path_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_id UUID NOT NULL REFERENCES public.seeds(id) ON DELETE CASCADE,
  suggested_path TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seed_path_suggestions_seed_id
  ON public.seed_path_suggestions(seed_id);

CREATE INDEX IF NOT EXISTS idx_seed_path_suggestions_user_id
  ON public.seed_path_suggestions(user_id);

ALTER TABLE public.seed_path_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own seed path suggestions"
  ON public.seed_path_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own seed path suggestions"
  ON public.seed_path_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all seed path suggestions"
  ON public.seed_path_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

GRANT SELECT, INSERT ON TABLE public.seed_path_suggestions TO authenticated;
