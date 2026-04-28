-- Fix: Remove FK constraints that may reference tables in different databases
-- The hackathon_teams table may be in a separate database (HACKATHON_SUPABASE_URL)

ALTER TABLE public.team_direction_embed_jobs
  DROP CONSTRAINT IF EXISTS team_direction_embed_jobs_team_id_fkey;

ALTER TABLE public.hackathon_team_direction_snapshots
  DROP CONSTRAINT IF EXISTS hackathon_team_direction_snapshots_team_id_fkey;

ALTER TABLE public.team_direction_search_cache
  DROP CONSTRAINT IF EXISTS team_direction_search_cache_team_id_fkey;

ALTER TABLE public.team_direction_search_cache
  DROP CONSTRAINT IF EXISTS team_direction_search_cache_latest_embedding_id_fkey;
