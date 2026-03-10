-- Migration: Add RLS policy to allow authenticated users to insert jobs
-- Created: 2026-03-09

-- Allow authenticated users to insert jobs (for career research edge function)
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs;
CREATE POLICY "Authenticated users can insert jobs"
    ON public.jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Also allow authenticated users to insert job_listings
DROP POLICY IF EXISTS "Authenticated users can insert job listings" ON public.job_listings;
CREATE POLICY "Authenticated users can insert job listings"
    ON public.job_listings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
