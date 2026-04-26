-- Team Direction Embeddings Revamp — Job Queue + Snapshots + Search Cache
-- Created: 2026-04-26

-- ============================================
-- Step 1: Job Queue for Team Direction Embedding
-- ============================================

CREATE TABLE IF NOT EXISTS public.team_direction_embed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  trigger_source TEXT NOT NULL DEFAULT 'submission' CHECK (trigger_source IN ('submission', 'review', 'backfill', 'manual')),

  -- Retry tracking
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_by TEXT, -- processor ID for claim lock
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_direction_embed_jobs_status_idx
  ON public.team_direction_embed_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS team_direction_embed_jobs_team_idx
  ON public.team_direction_embed_jobs(team_id);

-- ============================================
-- Step 2: Temporal Snapshots for Team Direction Evolution
-- ============================================

CREATE TABLE IF NOT EXISTS public.hackathon_team_direction_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.hackathon_program_phases(id) ON DELETE SET NULL,

  -- Structured profile (extracted by AI)
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Multi-aspect embeddings
  mission_embedding VECTOR(1024),
  tech_embedding VECTOR(1024),
  market_embedding VECTOR(1024),
  composite_embedding VECTOR(1024) NOT NULL,

  -- Metadata
  source_text TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'BAAI/bge-m3',

  -- Temporal tracking
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_direction_snapshots_team_idx
  ON public.hackathon_team_direction_snapshots(team_id);
CREATE INDEX IF NOT EXISTS team_direction_snapshots_latest_idx
  ON public.hackathon_team_direction_snapshots(team_id) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS team_direction_snapshots_phase_idx
  ON public.hackathon_team_direction_snapshots(phase_id);

-- Trigger: Retain only last 3 snapshots per team to prevent storage explosion
CREATE OR REPLACE FUNCTION prune_old_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.hackathon_team_direction_snapshots
  WHERE team_id = NEW.team_id
    AND id NOT IN (
      SELECT id FROM public.hackathon_team_direction_snapshots
      WHERE team_id = NEW.team_id
      ORDER BY snapshot_at DESC
      LIMIT 3
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prune_snapshots ON public.hackathon_team_direction_snapshots;
CREATE TRIGGER trigger_prune_snapshots
  AFTER INSERT ON public.hackathon_team_direction_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION prune_old_snapshots();

-- ============================================
-- Step 3: Search Cache (denormalized for fast search)
-- ============================================

CREATE TABLE IF NOT EXISTS public.team_direction_search_cache (
  team_id UUID PRIMARY KEY REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,

  -- Denormalized profile fields
  mission TEXT,
  target_market TEXT,
  tech_stack TEXT[],
  business_model TEXT,
  stage TEXT,

  -- Latest snapshot reference
  latest_snapshot_id UUID REFERENCES public.hackathon_team_direction_snapshots(id),
  latest_embedding_id UUID REFERENCES public.hackathon_team_direction_embeddings(id),

  -- Cluster info (denormalized)
  cluster_id UUID,
  cluster_label TEXT,
  cluster_color TEXT,

  -- Search metadata
  search_text TSVECTOR,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_direction_search_cache_cluster_idx
  ON public.team_direction_search_cache(cluster_id);
CREATE INDEX IF NOT EXISTS team_direction_search_cache_text_idx
  ON public.team_direction_search_cache USING GIN(search_text);

-- ============================================
-- Step 4: RLS Policies
-- ============================================

ALTER TABLE public.team_direction_embed_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_team_direction_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_direction_search_cache ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.team_direction_embed_jobs TO service_role;
GRANT ALL ON public.hackathon_team_direction_snapshots TO service_role;
GRANT ALL ON public.team_direction_search_cache TO service_role;

-- Admin read policies
CREATE POLICY "Admins read embed jobs" ON public.team_direction_embed_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins read snapshots" ON public.hackathon_team_direction_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins read search cache" ON public.team_direction_search_cache FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
