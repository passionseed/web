-- hackathon_team_finder: stores participants who opted into the self-service find-team flow
-- and their ranked preferences (up to 5 participant IDs in priority order)

CREATE TABLE hackathon_team_finder (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  preferences    text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id)
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_hackathon_team_finder_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hackathon_team_finder_updated_at
  BEFORE UPDATE ON hackathon_team_finder
  FOR EACH ROW EXECUTE FUNCTION set_hackathon_team_finder_updated_at();

-- RLS: participants use custom session auth (not Supabase auth), so anon role reads
ALTER TABLE hackathon_team_finder ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.hackathon_team_finder TO anon;
CREATE POLICY "anon_read_hackathon_team_finder"
  ON public.hackathon_team_finder FOR SELECT TO anon USING (true);
