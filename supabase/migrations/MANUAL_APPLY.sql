-- ============================================
-- MANUAL MIGRATION SCRIPT
-- Apply this in your Supabase Dashboard > SQL Editor
-- ============================================

-- Step 1: Extend existing map_type enum
ALTER TYPE public.map_type ADD VALUE IF NOT EXISTS 'seed';

-- Step 2: Add parent_seed_id column
ALTER TABLE public.learning_maps
ADD COLUMN IF NOT EXISTS parent_seed_id UUID REFERENCES public.seeds(id) ON DELETE CASCADE;

-- Step 3: Add constraint for seed maps
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'learning_maps_seed_check'
    ) THEN
        ALTER TABLE public.learning_maps
        ADD CONSTRAINT learning_maps_seed_check
        CHECK (
          (map_type = 'seed' AND parent_seed_id IS NOT NULL) OR
          (map_type != 'seed' AND parent_seed_id IS NULL)
        );
    END IF;
END $$;

-- Step 4: Add index
CREATE INDEX IF NOT EXISTS learning_maps_parent_seed_idx 
ON public.learning_maps(parent_seed_id) WHERE parent_seed_id IS NOT NULL;

-- Step 5: Update RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "view_maps_policy" ON public.learning_maps;
DROP POLICY IF EXISTS "update_maps_policy" ON public.learning_maps;
DROP POLICY IF EXISTS "delete_maps_policy" ON public.learning_maps;

-- Recreate view policy with seed support
CREATE POLICY "view_maps_policy" ON public.learning_maps
    FOR SELECT
    USING (
        (map_type = 'public') OR
        (map_type = 'private' AND creator_id = auth.uid()) OR
        (map_type = 'classroom_exclusive' AND
            parent_classroom_id IN (
            SELECT classroom_id
            FROM public.classroom_memberships
            WHERE user_id = auth.uid()
            )) OR
        (map_type = 'seed') OR
        (creator_id = auth.uid())
    );

-- Recreate update policy with seed support
CREATE POLICY "update_maps_policy" ON public.learning_maps
    FOR UPDATE
    USING (
        creator_id = auth.uid() OR
        (map_type = 'classroom_exclusive' AND
            parent_classroom_id IN (
            SELECT classroom_id
            FROM public.classroom_memberships
            WHERE user_id = auth.uid() AND role IN ('instructor', 'ta')
            )) OR
        (map_type = 'seed' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        ))
    );

-- Recreate delete policy with seed support
CREATE POLICY "delete_maps_policy" ON public.learning_maps
    FOR DELETE
    USING (
        creator_id = auth.uid() OR
        (map_type = 'classroom_exclusive' AND
            parent_classroom_id IN (
            SELECT classroom_id
            FROM public.classroom_memberships
            WHERE user_id = auth.uid() AND role IN ('instructor', 'ta')
            )) OR
        (map_type = 'seed' AND (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        ))
    );

-- ============================================
-- VERIFICATION QUERY
-- Run this after applying the migration to verify
-- ============================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'learning_maps' 
-- AND column_name = 'parent_seed_id';
