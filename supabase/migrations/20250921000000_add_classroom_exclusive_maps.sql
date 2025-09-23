-- Migration: Add classroom-exclusive maps functionality
-- This adds support for maps that are created specifically for classrooms
-- and only visible to classroom members, with extensible special features

BEGIN;

-- ========================================
-- 1. ADD MAP TYPE SYSTEM TO LEARNING_MAPS
-- ========================================

-- Create map type enum
CREATE TYPE public.map_type AS ENUM ('public', 'private', 'classroom_exclusive');

-- Add map_type column to learning_maps (defaults to 'public' for backward compatibility)
ALTER TABLE public.learning_maps 
ADD COLUMN map_type public.map_type DEFAULT 'public' NOT NULL;

-- Add parent_classroom_id for classroom-exclusive maps
ALTER TABLE public.learning_maps 
ADD COLUMN parent_classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE;

-- Add constraint: classroom_exclusive maps must have a parent_classroom_id
ALTER TABLE public.learning_maps 
ADD CONSTRAINT learning_maps_classroom_exclusive_check 
CHECK (
  (map_type = 'classroom_exclusive' AND parent_classroom_id IS NOT NULL) OR
  (map_type != 'classroom_exclusive' AND parent_classroom_id IS NULL)
);

-- Add index for better query performance
CREATE INDEX learning_maps_map_type_idx ON public.learning_maps USING btree (map_type);
CREATE INDEX learning_maps_parent_classroom_idx ON public.learning_maps USING btree (parent_classroom_id) WHERE parent_classroom_id IS NOT NULL;

-- ========================================
-- 2. CREATE CLASSROOM MAP FEATURES TABLE
-- ========================================

-- Table to store special features available to classroom-exclusive maps
CREATE TABLE public.classroom_map_features (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    map_id UUID NOT NULL REFERENCES public.learning_maps(id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL,
    feature_config JSONB DEFAULT '{}' NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT classroom_map_features_feature_type_valid 
    CHECK (feature_type IN (
        'live_collaboration',
        'auto_assessment', 
        'peer_review',
        'progress_tracking',
        'time_boxed_access',
        'custom_branding',
        'advanced_analytics'
    )),
    
    -- Prevent duplicate features for the same map
    CONSTRAINT classroom_map_features_unique_per_map 
    UNIQUE(map_id, feature_type)
);

-- Add indexes for classroom_map_features
CREATE INDEX classroom_map_features_map_id_idx ON public.classroom_map_features(map_id);
CREATE INDEX classroom_map_features_feature_type_idx ON public.classroom_map_features(feature_type);
CREATE INDEX classroom_map_features_enabled_idx ON public.classroom_map_features(is_enabled) WHERE is_enabled = true;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_classroom_map_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_classroom_map_features_updated_at
    BEFORE UPDATE ON public.classroom_map_features
    FOR EACH ROW
    EXECUTE FUNCTION public.update_classroom_map_features_updated_at();

-- ========================================
-- 3. UPDATE RLS POLICIES FOR NEW MAP TYPES
-- ========================================

-- Drop existing learning_maps policies to recreate them
DROP POLICY IF EXISTS "Users can view public maps" ON public.learning_maps;
DROP POLICY IF EXISTS "Users can create maps" ON public.learning_maps;
DROP POLICY IF EXISTS "Users can update their own maps" ON public.learning_maps;
DROP POLICY IF EXISTS "Users can delete their own maps" ON public.learning_maps;

-- Create new comprehensive RLS policies for learning_maps
-- 1. View policy: public maps + own private maps + classroom-exclusive maps for members
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
         
        -- Creators can always see their own maps
        (creator_id = auth.uid())
    );

-- 2. Create policy: authenticated users can create maps
CREATE POLICY "create_maps_policy" ON public.learning_maps
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        creator_id = auth.uid()
    );

-- 3. Update policy: users can update their own maps OR classroom-exclusive maps in classrooms they instruct
CREATE POLICY "update_maps_policy" ON public.learning_maps
    FOR UPDATE
    USING (
        creator_id = auth.uid() OR
        (map_type = 'classroom_exclusive' AND 
         parent_classroom_id IN (
            SELECT classroom_id 
            FROM public.classroom_memberships 
            WHERE user_id = auth.uid() AND role IN ('instructor', 'ta')
         ))
    );

-- 4. Delete policy: users can delete their own maps OR classroom-exclusive maps in classrooms they instruct
CREATE POLICY "delete_maps_policy" ON public.learning_maps
    FOR DELETE
    USING (
        creator_id = auth.uid() OR
        (map_type = 'classroom_exclusive' AND 
         parent_classroom_id IN (
            SELECT classroom_id 
            FROM public.classroom_memberships 
            WHERE user_id = auth.uid() AND role IN ('instructor', 'ta')
         ))
    );

-- ========================================
-- 4. RLS POLICIES FOR CLASSROOM_MAP_FEATURES
-- ========================================

-- Enable RLS on classroom_map_features
ALTER TABLE public.classroom_map_features ENABLE ROW LEVEL SECURITY;

-- View features: classroom members can see features for classroom-exclusive maps they have access to
CREATE POLICY "view_classroom_map_features" ON public.classroom_map_features
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_maps lm
            WHERE lm.id = map_id 
            AND lm.map_type = 'classroom_exclusive'
            AND lm.parent_classroom_id IN (
                SELECT classroom_id 
                FROM public.classroom_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Manage features: instructors/TAs can manage features for their classroom maps
CREATE POLICY "manage_classroom_map_features" ON public.classroom_map_features
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_maps lm
            JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
            WHERE lm.id = map_id 
            AND lm.map_type = 'classroom_exclusive'
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('instructor', 'ta')
        )
    );

-- ========================================
-- 5. HELPER FUNCTIONS
-- ========================================

-- Function to get classroom-exclusive maps for a classroom
CREATE OR REPLACE FUNCTION public.get_classroom_exclusive_maps(classroom_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', lm.id,
            'title', lm.title,
            'description', lm.description,
            'creator_id', lm.creator_id,
            'created_at', lm.created_at,
            'updated_at', lm.updated_at,
            'node_count', COALESCE(node_counts.count, 0),
            'features', COALESCE(feature_list.features, '[]'::json)
        ) ORDER BY lm.created_at DESC
    ), '[]'::json) INTO result
    FROM public.learning_maps lm
    LEFT JOIN (
        SELECT map_id, COUNT(*) as count
        FROM public.map_nodes
        GROUP BY map_id
    ) node_counts ON lm.id = node_counts.map_id
    LEFT JOIN (
        SELECT 
            map_id,
            json_agg(
                json_build_object(
                    'type', feature_type,
                    'config', feature_config,
                    'enabled', is_enabled
                )
            ) as features
        FROM public.classroom_map_features
        WHERE is_enabled = true
        GROUP BY map_id
    ) feature_list ON lm.id = feature_list.map_id
    WHERE lm.map_type = 'classroom_exclusive'
    AND lm.parent_classroom_id = classroom_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a classroom-exclusive map
CREATE OR REPLACE FUNCTION public.create_classroom_exclusive_map(
    classroom_uuid UUID,
    map_title TEXT,
    map_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    new_map_id UUID;
    result JSON;
BEGIN
    -- Verify user has permission to create maps in this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = auth.uid() 
        AND role IN ('instructor', 'ta')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to create classroom-exclusive maps';
    END IF;
    
    -- Create the map
    INSERT INTO public.learning_maps (
        title,
        description,
        creator_id,
        map_type,
        parent_classroom_id,
        visibility
    ) VALUES (
        map_title,
        map_description,
        auth.uid(),
        'classroom_exclusive',
        classroom_uuid,
        'private'  -- Classroom-exclusive maps are always private visibility
    ) RETURNING id INTO new_map_id;
    
    -- Return the created map
    SELECT json_build_object(
        'id', new_map_id,
        'title', map_title,
        'description', map_description,
        'creator_id', auth.uid(),
        'map_type', 'classroom_exclusive',
        'parent_classroom_id', classroom_uuid,
        'created_at', now()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add/update a feature for a classroom-exclusive map
CREATE OR REPLACE FUNCTION public.update_classroom_map_feature(
    map_uuid UUID,
    feature_type_param TEXT,
    feature_config_param JSONB DEFAULT '{}',
    is_enabled_param BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Verify user has permission to manage features for this map
    IF NOT EXISTS (
        SELECT 1 FROM public.learning_maps lm
        JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
        WHERE lm.id = map_uuid 
        AND lm.map_type = 'classroom_exclusive'
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('instructor', 'ta')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to manage map features';
    END IF;
    
    -- Insert or update the feature
    INSERT INTO public.classroom_map_features (
        map_id,
        feature_type,
        feature_config,
        is_enabled,
        created_by
    ) VALUES (
        map_uuid,
        feature_type_param,
        feature_config_param,
        is_enabled_param,
        auth.uid()
    )
    ON CONFLICT (map_id, feature_type)
    DO UPDATE SET
        feature_config = feature_config_param,
        is_enabled = is_enabled_param,
        updated_at = now();
    
    -- Return the updated feature
    SELECT json_build_object(
        'map_id', map_uuid,
        'feature_type', feature_type_param,
        'feature_config', feature_config_param,
        'is_enabled', is_enabled_param,
        'updated_at', now()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON COLUMN public.learning_maps.map_type IS 'Type of map: public (visible to all), private (visible to creator only), classroom_exclusive (visible to classroom members only)';
COMMENT ON COLUMN public.learning_maps.parent_classroom_id IS 'For classroom_exclusive maps, the classroom they belong to. NULL for other map types.';
COMMENT ON TABLE public.classroom_map_features IS 'Special features available to classroom-exclusive maps, such as live collaboration, auto-assessment, etc.';
COMMENT ON COLUMN public.classroom_map_features.feature_type IS 'Type of special feature: live_collaboration, auto_assessment, peer_review, progress_tracking, time_boxed_access, custom_branding, advanced_analytics';
COMMENT ON COLUMN public.classroom_map_features.feature_config IS 'JSON configuration for the feature, structure depends on feature_type';

COMMIT;