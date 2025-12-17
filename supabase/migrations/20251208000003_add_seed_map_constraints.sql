-- Add constraint for seed maps
-- This must be in a separate migration from the enum addition
ALTER TABLE public.learning_maps
ADD CONSTRAINT learning_maps_seed_check
CHECK (
  (map_type = 'seed' AND parent_seed_id IS NOT NULL) OR
  (map_type != 'seed' AND parent_seed_id IS NULL)
);

-- Update RLS policies to support seed maps

-- 1. View policy: Allow viewing seed maps
DROP POLICY IF EXISTS "view_maps_policy" ON public.learning_maps;

CREATE POLICY "view_maps_policy" ON public.learning_maps
    FOR SELECT
    USING (
        -- Public maps are visible to everyone
        (map_type = 'public') OR

        -- Private maps are visible to creator
        (map_type = 'private' AND creator_id = auth.uid()) OR

        -- Classroom-exclusive maps are visible to classroom members
        (map_type = 'classroom_exclusive' AND
            parent_classroom_id IN (
            SELECT classroom_id
            FROM public.classroom_memberships
            WHERE user_id = auth.uid()
            )) OR
        
        -- Seed maps are visible to everyone (since seeds are public)
        (map_type = 'seed') OR

        -- Creators can always see their own maps
        (creator_id = auth.uid())
    );

-- 2. Update policy: Allow admins/owners to update seed maps
DROP POLICY IF EXISTS "update_maps_policy" ON public.learning_maps;

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
            -- Admin check
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        ))
    );

-- 3. Delete policy
DROP POLICY IF EXISTS "delete_maps_policy" ON public.learning_maps;

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
            -- Admin check
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        ))
    );