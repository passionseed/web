-- ============================================
-- COMBINED MIGRATION FOR SEED MAP & GROUP WORK
-- Apply this in your Supabase Dashboard > SQL Editor
-- ============================================

-- PART 1: Seed Map Support (if not already applied)
-- ============================================

-- Extend existing map_type enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'map_type' AND e.enumlabel = 'seed') THEN
        ALTER TYPE public.map_type ADD VALUE 'seed';
    END IF;
END $$;

-- Add parent_seed_id column
ALTER TABLE public.learning_maps
ADD COLUMN IF NOT EXISTS parent_seed_id UUID REFERENCES public.seeds(id) ON DELETE CASCADE;

-- Add constraint for seed maps
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

-- Add index
CREATE INDEX IF NOT EXISTS learning_maps_parent_seed_idx 
ON public.learning_maps(parent_seed_id) WHERE parent_seed_id IS NOT NULL;

-- Update RLS policies for seed maps
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

-- PART 2: Seed Room Group Work
-- ============================================

-- Add seed_room_id to assessment_groups for tracking
ALTER TABLE public.assessment_groups
ADD COLUMN IF NOT EXISTS seed_room_id UUID REFERENCES public.seed_rooms(id) ON DELETE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS assessment_groups_seed_room_idx 
ON public.assessment_groups(seed_room_id) WHERE seed_room_id IS NOT NULL;

-- Function to auto-create assessment group for seed room
CREATE OR REPLACE FUNCTION public.get_or_create_seed_room_assessment_group(
    p_assessment_id UUID,
    p_seed_room_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_group_id UUID;
    v_room_name TEXT;
BEGIN
    -- Check if group already exists for this room + assessment
    SELECT id INTO v_group_id
    FROM public.assessment_groups
    WHERE assessment_id = p_assessment_id
    AND seed_room_id = p_seed_room_id;
    
    IF v_group_id IS NOT NULL THEN
        RETURN v_group_id;
    END IF;
    
    -- Get room join code for naming
    SELECT 'Room ' || join_code INTO v_room_name
    FROM public.seed_rooms
    WHERE id = p_seed_room_id;
    
    -- Create new group
    INSERT INTO public.assessment_groups (
        assessment_id,
        seed_room_id,
        group_name,
        group_number,
        created_by
    ) VALUES (
        p_assessment_id,
        p_seed_room_id,
        v_room_name,
        (SELECT COALESCE(MAX(group_number), 0) + 1 
         FROM public.assessment_groups 
         WHERE assessment_id = p_assessment_id),
        auth.uid()
    )
    RETURNING id INTO v_group_id;
    
    -- Add all room members to the group
    INSERT INTO public.assessment_group_members (group_id, user_id, assigned_by)
    SELECT v_group_id, user_id, auth.uid()
    FROM public.seed_room_members
    WHERE room_id = p_seed_room_id
    ON CONFLICT (group_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.get_or_create_seed_room_assessment_group(UUID, UUID) IS 
'Auto-creates an assessment group for a seed room. All members of the seed room are added to the group. Returns the group ID.';

-- ============================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to verify
-- ============================================

-- Check if seed map type exists
-- SELECT unnest(enum_range(NULL::map_type)) AS map_types;

-- Check if parent_seed_id column exists
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'learning_maps' 
-- AND column_name = 'parent_seed_id';

-- Check if seed_room_id column exists
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'assessment_groups' 
-- AND column_name = 'seed_room_id';

-- Check if function exists
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_name = 'get_or_create_seed_room_assessment_group';
