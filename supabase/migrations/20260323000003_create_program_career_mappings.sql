-- Migration: Create program_career_mappings table
-- Links TCAS programs to relevant careers/jobs
-- Created: 2026-03-23

-- Create the mapping table
CREATE TABLE IF NOT EXISTS public.program_career_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.tcas_programs(id) ON DELETE CASCADE,
    career_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    mapping_reason TEXT, -- Why this career maps to this program (e.g., "Computer Science graduates become Software Engineers")
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate mappings
    UNIQUE(program_id, career_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.program_career_mappings IS 'Maps TCAS programs to relevant careers with confidence scores';
COMMENT ON COLUMN public.program_career_mappings.program_id IS 'Reference to tcas_programs';
COMMENT ON COLUMN public.program_career_mappings.career_id IS 'Reference to jobs (careers)';
COMMENT ON COLUMN public.program_career_mappings.confidence IS 'Confidence level: high, medium, or low';
COMMENT ON COLUMN public.program_career_mappings.mapping_reason IS 'Explanation of why this career maps to this program';

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_program_career_mappings_program 
    ON public.program_career_mappings(program_id);
CREATE INDEX IF NOT EXISTS idx_program_career_mappings_career 
    ON public.program_career_mappings(career_id);
CREATE INDEX IF NOT EXISTS idx_program_career_mappings_confidence 
    ON public.program_career_mappings(confidence);

-- Composite index for bidirectional lookups
CREATE INDEX IF NOT EXISTS idx_program_career_mappings_program_career 
    ON public.program_career_mappings(program_id, career_id);

-- Enable RLS
ALTER TABLE public.program_career_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, authenticated write
DROP POLICY IF EXISTS "Allow public read access to program_career_mappings" ON public.program_career_mappings;
CREATE POLICY "Allow public read access to program_career_mappings"
    ON public.program_career_mappings
    FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert program_career_mappings" ON public.program_career_mappings;
CREATE POLICY "Allow authenticated users to insert program_career_mappings"
    ON public.program_career_mappings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update program_career_mappings" ON public.program_career_mappings;
CREATE POLICY "Allow authenticated users to update program_career_mappings"
    ON public.program_career_mappings
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete program_career_mappings" ON public.program_career_mappings;
CREATE POLICY "Allow authenticated users to delete program_career_mappings"
    ON public.program_career_mappings
    FOR DELETE
    TO authenticated
    USING (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_program_career_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS program_career_mappings_updated_at_update 
    ON public.program_career_mappings;
CREATE TRIGGER program_career_mappings_updated_at_update
    BEFORE UPDATE ON public.program_career_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_program_career_mappings_updated_at();

-- Grant permissions
GRANT SELECT ON public.program_career_mappings TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.program_career_mappings TO authenticated;

-- Create helper function to get careers for a program
CREATE OR REPLACE FUNCTION get_program_careers(program_uuid UUID)
RETURNS TABLE (
    career_id UUID,
    career_title TEXT,
    confidence TEXT,
    mapping_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id AS career_id,
        j.title AS career_title,
        pcm.confidence,
        pcm.mapping_reason
    FROM public.program_career_mappings pcm
    JOIN public.jobs j ON pcm.career_id = j.id
    WHERE pcm.program_id = program_uuid
    ORDER BY 
        CASE pcm.confidence 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
        END,
        j.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get programs for a career
CREATE OR REPLACE FUNCTION get_career_programs(career_uuid UUID)
RETURNS TABLE (
    program_id UUID,
    program_name TEXT,
    university_name TEXT,
    confidence TEXT,
    mapping_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.id AS program_id,
        tp.program_name,
        tu.university_name,
        pcm.confidence,
        pcm.mapping_reason
    FROM public.program_career_mappings pcm
    JOIN public.tcas_programs tp ON pcm.program_id = tp.id
    JOIN public.tcas_universities tu ON tp.university_id = tu.university_id
    WHERE pcm.career_id = career_uuid
    ORDER BY 
        CASE pcm.confidence 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
        END,
        tp.program_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for easy querying with all details
CREATE OR REPLACE VIEW program_career_mapping_details AS
SELECT 
    pcm.id AS mapping_id,
    pcm.program_id,
    tp.program_name,
    tp.program_name_en,
    tp.faculty_name,
    tu.university_name,
    pcm.career_id,
    j.title AS career_title,
    j.category AS career_category,
    pcm.confidence,
    pcm.mapping_reason,
    pcm.created_at,
    pcm.updated_at
FROM public.program_career_mappings pcm
JOIN public.tcas_programs tp ON pcm.program_id = tp.id
JOIN public.tcas_universities tu ON tp.university_id = tu.university_id
JOIN public.jobs j ON pcm.career_id = j.id;

COMMENT ON VIEW program_career_mapping_details IS 'Detailed view of program-career mappings with names and categories';
