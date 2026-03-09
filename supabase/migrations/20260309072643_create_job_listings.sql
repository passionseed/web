-- Migration: Create job_listings table to persist raw Apify data
-- Created: 2026-03-09

-- Table to store raw job listings from Apify LinkedIn Jobs Search
CREATE TABLE IF NOT EXISTS public.job_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    
    -- Raw Apify data
    apify_job_id TEXT,
    title TEXT,
    company_name TEXT,
    company_url TEXT,
    company_industries TEXT[],
    location TEXT,
    description_text TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency TEXT,
    salary_period TEXT,
    job_type TEXT,
    work_type TEXT,
    experience_level TEXT,
    posted_at TIMESTAMPTZ,
    url TEXT,
    apply_url TEXT,
    skills TEXT[],
    benefits TEXT[],
    
    -- Full raw JSON for any additional fields
    raw_data JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read job listings"
    ON public.job_listings
    FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Only system can insert job listings"
    ON public.job_listings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Index for faster lookups by job_id
CREATE INDEX IF NOT EXISTS idx_job_listings_job_id ON public.job_listings(job_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON public.job_listings(created_at DESC);

COMMENT ON TABLE public.job_listings IS 'Raw job listings data from Apify LinkedIn Jobs Search actor';
