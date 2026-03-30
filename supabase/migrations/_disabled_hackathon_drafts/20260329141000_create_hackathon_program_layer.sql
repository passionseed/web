CREATE TABLE IF NOT EXISTS public.hackathon_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hackathon_program_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.hackathon_programs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  phase_number INT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, slug),
  UNIQUE (program_id, phase_number)
);

CREATE TABLE IF NOT EXISTS public.hackathon_phase_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.hackathon_program_phases(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phase_id, slug),
  UNIQUE (phase_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.hackathon_phase_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.hackathon_phase_playlists(id) ON DELETE CASCADE,
  seed_id UUID REFERENCES public.seeds(id) ON DELETE SET NULL,
  path_id UUID REFERENCES public.paths(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  display_order INT NOT NULL DEFAULT 0,
  workflow_scope TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (workflow_scope IN ('individual', 'team', 'hybrid')),
  gate_rule TEXT NOT NULL DEFAULT 'complete'
    CHECK (gate_rule IN ('complete', 'all_members_complete', 'min_members_complete', 'mentor_pass', 'team_submission_pass')),
  review_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (review_mode IN ('auto', 'mentor', 'auto_then_mentor')),
  required_member_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, slug),
  UNIQUE (playlist_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.hackathon_team_program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.hackathon_programs(id) ON DELETE CASCADE,
  current_phase_id UUID REFERENCES public.hackathon_program_phases(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_program_phases_program
  ON public.hackathon_program_phases(program_id, phase_number);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_playlists_phase
  ON public.hackathon_phase_playlists(phase_id, display_order);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_modules_playlist
  ON public.hackathon_phase_modules(playlist_id, display_order);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_program_enrollments_team
  ON public.hackathon_team_program_enrollments(team_id);

CREATE OR REPLACE FUNCTION public.update_hackathon_program_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hackathon_programs_updated_at ON public.hackathon_programs;
CREATE TRIGGER hackathon_programs_updated_at
  BEFORE UPDATE ON public.hackathon_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hackathon_program_updated_at();

DROP TRIGGER IF EXISTS hackathon_program_phases_updated_at ON public.hackathon_program_phases;
CREATE TRIGGER hackathon_program_phases_updated_at
  BEFORE UPDATE ON public.hackathon_program_phases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hackathon_program_updated_at();

DROP TRIGGER IF EXISTS hackathon_phase_playlists_updated_at ON public.hackathon_phase_playlists;
CREATE TRIGGER hackathon_phase_playlists_updated_at
  BEFORE UPDATE ON public.hackathon_phase_playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hackathon_program_updated_at();

DROP TRIGGER IF EXISTS hackathon_phase_modules_updated_at ON public.hackathon_phase_modules;
CREATE TRIGGER hackathon_phase_modules_updated_at
  BEFORE UPDATE ON public.hackathon_phase_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hackathon_program_updated_at();

DROP TRIGGER IF EXISTS hackathon_team_program_enrollments_updated_at ON public.hackathon_team_program_enrollments;
CREATE TRIGGER hackathon_team_program_enrollments_updated_at
  BEFORE UPDATE ON public.hackathon_team_program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hackathon_program_updated_at();
