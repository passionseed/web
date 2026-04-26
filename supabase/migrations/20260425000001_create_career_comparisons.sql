-- Migration: Create career_comparisons table
-- Stores user career comparison sessions with ratings and notes
-- Created: 2026-04-25

-- Create the career comparisons table
CREATE TABLE IF NOT EXISTS public.career_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    career_a_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    career_b_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    scores JSONB NOT NULL DEFAULT '{}',
    winner_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Prevent duplicate comparisons of the same pair (order-agnostic)
    UNIQUE(user_id, career_a_id, career_b_id)
);

-- Add comments for documentation
COMMENT ON TABLE public.career_comparisons IS 'Stores user career comparison sessions with ratings and winner selection';
COMMENT ON COLUMN public.career_comparisons.user_id IS 'Reference to the user who created this comparison';
COMMENT ON COLUMN public.career_comparisons.career_a_id IS 'First career being compared (reference to jobs table)';
COMMENT ON COLUMN public.career_comparisons.career_b_id IS 'Second career being compared (reference to jobs table)';
COMMENT ON COLUMN public.career_comparisons.scores IS 'User ratings per criteria: {salary: {a: 8, b: 6}, work_life: {a: 7, b: 9}, ...}';
COMMENT ON COLUMN public.career_comparisons.winner_id IS 'The career the user selected as overall winner';
COMMENT ON COLUMN public.career_comparisons.notes IS 'Free-form notes about this comparison';

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_career_comparisons_user 
    ON public.career_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_career_comparisons_career_a 
    ON public.career_comparisons(career_a_id);
CREATE INDEX IF NOT EXISTS idx_career_comparisons_career_b 
    ON public.career_comparisons(career_b_id);
CREATE INDEX IF NOT EXISTS idx_career_comparisons_winner 
    ON public.career_comparisons(winner_id);

-- Composite index for fetching all comparisons by a user
CREATE INDEX IF NOT EXISTS idx_career_comparisons_user_created 
    ON public.career_comparisons(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.career_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own comparisons
DROP POLICY IF EXISTS "Allow users to read own comparisons" ON public.career_comparisons;
CREATE POLICY "Allow users to read own comparisons"
    ON public.career_comparisons
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow users to insert own comparisons" ON public.career_comparisons;
CREATE POLICY "Allow users to insert own comparisons"
    ON public.career_comparisons
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow users to update own comparisons" ON public.career_comparisons;
CREATE POLICY "Allow users to update own comparisons"
    ON public.career_comparisons
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Allow users to delete own comparisons" ON public.career_comparisons;
CREATE POLICY "Allow users to delete own comparisons"
    ON public.career_comparisons
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_career_comparisons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS career_comparisons_updated_at_update 
    ON public.career_comparisons;
CREATE TRIGGER career_comparisons_updated_at_update
    BEFORE UPDATE ON public.career_comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_career_comparisons_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_comparisons TO authenticated;
