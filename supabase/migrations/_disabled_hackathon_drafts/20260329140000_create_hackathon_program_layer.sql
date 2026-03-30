CREATE TABLE IF NOT EXISTS hackathon_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE TABLE IF NOT EXISTS hackathon_program_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES hackathon_programs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  phase_number INT NOT NULL CHECK (phase_number >= 1),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_id, slug),
  UNIQUE(program_id, phase_number)
);

CREATE TABLE IF NOT EXISTS hackathon_phase_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES hackathon_program_phases(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(phase_id, slug),
  UNIQUE(phase_id, display_order)
);

CREATE TABLE IF NOT EXISTS hackathon_phase_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES hackathon_phase_playlists(id) ON DELETE CASCADE,
  seed_id UUID REFERENCES seeds(id) ON DELETE SET NULL,
  path_id UUID REFERENCES paths(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  display_order INT NOT NULL DEFAULT 1,
  workflow_scope TEXT NOT NULL DEFAULT 'hybrid',
  gate_rule TEXT NOT NULL DEFAULT 'min_members_complete',
  review_mode TEXT NOT NULL DEFAULT 'auto',
  required_member_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playlist_id, slug),
  UNIQUE(playlist_id, display_order),
  CHECK (workflow_scope IN ('individual', 'team', 'hybrid')),
  CHECK (gate_rule IN ('complete', 'all_members_complete', 'min_members_complete', 'mentor_pass', 'team_submission_pass')),
  CHECK (review_mode IN ('auto', 'mentor', 'auto_then_mentor')),
  CHECK (required_member_count IS NULL OR required_member_count > 0)
);

CREATE TABLE IF NOT EXISTS hackathon_team_program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES hackathon_programs(id) ON DELETE CASCADE,
  current_phase_id UUID REFERENCES hackathon_program_phases(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, program_id),
  CHECK (status IN ('active', 'paused', 'completed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_hackathon_program_phases_program
  ON hackathon_program_phases(program_id, phase_number);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_playlists_phase
  ON hackathon_phase_playlists(phase_id, display_order);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_modules_playlist
  ON hackathon_phase_modules(playlist_id, display_order);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_program_enrollments_team
  ON hackathon_team_program_enrollments(team_id);

ALTER TABLE hackathon_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_program_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_phase_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_phase_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_team_program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hackathon_programs_readable"
  ON hackathon_programs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_team_program_enrollments hte
      JOIN hackathon_team_members htm ON htm.team_id = hte.team_id
      WHERE hte.program_id = hackathon_programs.id
        AND htm.user_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_program_phases_readable"
  ON hackathon_program_phases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_team_program_enrollments hte
      JOIN hackathon_team_members htm ON htm.team_id = hte.team_id
      WHERE hte.program_id = hackathon_program_phases.program_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_phase_playlists_readable"
  ON hackathon_phase_playlists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_program_phases hpp
      JOIN hackathon_team_program_enrollments hte ON hte.program_id = hpp.program_id
      JOIN hackathon_team_members htm ON htm.team_id = hte.team_id
      WHERE hpp.id = hackathon_phase_playlists.phase_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_phase_modules_readable"
  ON hackathon_phase_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_phase_playlists hpp
      JOIN hackathon_program_phases hph ON hph.id = hpp.phase_id
      JOIN hackathon_team_program_enrollments hte ON hte.program_id = hph.program_id
      JOIN hackathon_team_members htm ON htm.team_id = hte.team_id
      WHERE hpp.id = hackathon_phase_modules.playlist_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_team_program_enrollments_readable"
  ON hackathon_team_program_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_team_members htm
      WHERE htm.team_id = hackathon_team_program_enrollments.team_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.hackathon_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hackathon_programs_updated_at
  BEFORE UPDATE ON hackathon_programs
  FOR EACH ROW EXECUTE FUNCTION public.hackathon_update_updated_at_column();

CREATE TRIGGER hackathon_program_phases_updated_at
  BEFORE UPDATE ON hackathon_program_phases
  FOR EACH ROW EXECUTE FUNCTION public.hackathon_update_updated_at_column();

CREATE TRIGGER hackathon_phase_playlists_updated_at
  BEFORE UPDATE ON hackathon_phase_playlists
  FOR EACH ROW EXECUTE FUNCTION public.hackathon_update_updated_at_column();

CREATE TRIGGER hackathon_phase_modules_updated_at
  BEFORE UPDATE ON hackathon_phase_modules
  FOR EACH ROW EXECUTE FUNCTION public.hackathon_update_updated_at_column();

CREATE TRIGGER hackathon_team_program_enrollments_updated_at
  BEFORE UPDATE ON hackathon_team_program_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.hackathon_update_updated_at_column();
