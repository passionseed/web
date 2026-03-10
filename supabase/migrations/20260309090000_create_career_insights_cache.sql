-- Migration: Cache table for Exa career insights (people, companies, news)
-- Created: 2026-03-09

CREATE TABLE IF NOT EXISTS public.career_insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_name TEXT NOT NULL UNIQUE,
    people JSONB NOT NULL DEFAULT '[]',
    companies JSONB NOT NULL DEFAULT '[]',
    news JSONB NOT NULL DEFAULT '[]',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_insights_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached insights
DROP POLICY IF EXISTS "Anyone can read career insights cache" ON public.career_insights_cache;
CREATE POLICY "Anyone can read career insights cache"
    ON public.career_insights_cache
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Only service role can write (edge function uses service key)
DROP POLICY IF EXISTS "Service role can upsert career insights cache" ON public.career_insights_cache;
CREATE POLICY "Service role can upsert career insights cache"
    ON public.career_insights_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_career_insights_cache_name
    ON public.career_insights_cache(career_name);

COMMENT ON TABLE public.career_insights_cache IS
    'Cached Exa API results for career insights (people, companies, news). TTL enforced in edge function.';
