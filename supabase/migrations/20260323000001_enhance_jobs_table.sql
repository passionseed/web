-- Migration: Enhance jobs table with career data fields
-- Created: 2026-03-23

-- Add career data columns to jobs table
ALTER TABLE public.jobs
    -- Career viability and market data
    ADD COLUMN IF NOT EXISTS viability_score INTEGER CHECK (viability_score >= 0 AND viability_score <= 100),
    ADD COLUMN IF NOT EXISTS demand_trend TEXT CHECK (demand_trend IN ('growing', 'stable', 'declining')),
    ADD COLUMN IF NOT EXISTS automation_risk INTEGER CHECK (automation_risk >= 0 AND automation_risk <= 100),
    
    -- Salary information (in THB)
    ADD COLUMN IF NOT EXISTS salary_range_thb JSONB DEFAULT '{}',
    -- Expected format: {"entry": 25000, "mid": 50000, "senior": 100000}
    
    -- Categorization
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS subcategory TEXT,
    
    -- Skills and requirements
    ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS top_companies TEXT[] DEFAULT '{}',
    
    -- Descriptions
    ADD COLUMN IF NOT EXISTS description_th TEXT,
    ADD COLUMN IF NOT EXISTS description_en TEXT,
    ADD COLUMN IF NOT EXISTS day_in_life_th TEXT,
    ADD COLUMN IF NOT EXISTS day_in_life_en TEXT,
    
    -- Additional metadata
    ADD COLUMN IF NOT EXISTS education_requirements TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS work_environment TEXT,
    ADD COLUMN IF NOT EXISTS stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    ADD COLUMN IF NOT EXISTS work_life_balance INTEGER CHECK (work_life_balance >= 1 AND work_life_balance <= 10),
    
    -- Source and tracking
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now(),
    
    -- Search vector for full-text search
    ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_viability_score ON public.jobs(viability_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_demand_trend ON public.jobs(demand_trend);
CREATE INDEX IF NOT EXISTS idx_jobs_automation_risk ON public.jobs(automation_risk);
CREATE INDEX IF NOT EXISTS idx_jobs_subcategory ON public.jobs(subcategory);

-- GIN index for JSONB salary range queries
CREATE INDEX IF NOT EXISTS idx_jobs_salary_range ON public.jobs USING GIN(salary_range_thb);

-- GIN index for array fields
CREATE INDEX IF NOT EXISTS idx_jobs_required_skills ON public.jobs USING GIN(required_skills);
CREATE INDEX IF NOT EXISTS idx_jobs_top_companies ON public.jobs USING GIN(top_companies);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_jobs_search ON public.jobs USING GIN(search_vector);

-- Update RLS policies to allow public read and authenticated write
-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can read jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON public.jobs;

-- Create comprehensive RLS policies
CREATE POLICY "Allow public read access to jobs"
    ON public.jobs
    FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow authenticated users to insert jobs"
    ON public.jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update jobs"
    ON public.jobs
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete jobs"
    ON public.jobs
    FOR DELETE
    TO authenticated
    USING (true);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_jobs_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.subcategory, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_th, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description_en, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.required_skills, ' '), '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS jobs_search_vector_update ON public.jobs;
CREATE TRIGGER jobs_search_vector_update
    BEFORE INSERT OR UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_search_vector();

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_jobs_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_updated
DROP TRIGGER IF EXISTS jobs_last_updated_update ON public.jobs;
CREATE TRIGGER jobs_last_updated_update
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_jobs_last_updated();

-- Add table and column comments for documentation
COMMENT ON TABLE public.jobs IS 'Career/job data with viability scores, salary ranges, and market trends';
COMMENT ON COLUMN public.jobs.viability_score IS 'Overall career viability score (0-100)';
COMMENT ON COLUMN public.jobs.demand_trend IS 'Market demand trend: growing, stable, or declining';
COMMENT ON COLUMN public.jobs.automation_risk IS 'Risk of automation replacing this job (0-100)';
COMMENT ON COLUMN public.jobs.salary_range_thb IS 'Salary ranges in THB: {"entry": number, "mid": number, "senior": number}';
COMMENT ON COLUMN public.jobs.required_skills IS 'Array of required skills for this job';
COMMENT ON COLUMN public.jobs.top_companies IS 'Top companies hiring for this role in Thailand';
COMMENT ON COLUMN public.jobs.day_in_life_th IS 'Day in the life description in Thai';
COMMENT ON COLUMN public.jobs.day_in_life_en IS 'Day in the life description in English';
