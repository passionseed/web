-- Migration: Add Classroom-Map Linking System
-- Created: 2025-08-12 12:00:00
-- Description: Creates a many-to-many relationship between classrooms and maps,
--              allowing instructors to link specific maps to classrooms and
--              create assignments based on nodes from those linked maps.

-- ========================================
-- CLASSROOM MAP LINKING TABLE
-- ========================================

-- Create table to link classrooms with maps (many-to-many relationship)
CREATE TABLE public.classroom_maps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES public.learning_maps(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 1,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT classroom_maps_unique_link UNIQUE(classroom_id, map_id),
    CONSTRAINT classroom_maps_display_order_positive CHECK (display_order > 0),
    CONSTRAINT classroom_maps_notes_length CHECK (char_length(notes) <= 1000)
);

-- ========================================
-- ASSIGNMENT MAP CONTEXT TABLE
-- ========================================

-- Add context to assignments to track which map they're based on
ALTER TABLE public.classroom_assignments 
ADD COLUMN source_map_id UUID REFERENCES public.learning_maps(id) ON DELETE SET NULL,
ADD COLUMN map_context TEXT;

-- Add constraint for map context length
ALTER TABLE public.classroom_assignments 
ADD CONSTRAINT assignments_map_context_length CHECK (char_length(map_context) <= 2000);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Classroom maps indexes
CREATE INDEX idx_classroom_maps_classroom ON public.classroom_maps(classroom_id);
CREATE INDEX idx_classroom_maps_map ON public.classroom_maps(map_id);
CREATE INDEX idx_classroom_maps_active ON public.classroom_maps(is_active) WHERE is_active = true;
CREATE INDEX idx_classroom_maps_display_order ON public.classroom_maps(classroom_id, display_order);
CREATE INDEX idx_classroom_maps_added_by ON public.classroom_maps(added_by);

-- Assignment source map index
CREATE INDEX idx_classroom_assignments_source_map ON public.classroom_assignments(source_map_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on classroom_maps table
ALTER TABLE public.classroom_maps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classroom_maps
-- Instructors can manage map links in their classrooms
CREATE POLICY "instructors_manage_classroom_maps" ON public.classroom_maps
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    );

-- Students can view map links for classrooms they're members of
CREATE POLICY "students_view_classroom_maps" ON public.classroom_maps
    FOR SELECT 
    USING (
        is_active = true AND
        public.is_classroom_member(classroom_id, auth.uid())
    );

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get linked maps for a classroom
CREATE OR REPLACE FUNCTION public.get_classroom_maps(classroom_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this classroom
    IF NOT (
        EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_uuid AND instructor_id = auth.uid()) OR
        public.is_classroom_member(classroom_uuid, auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to classroom maps';
    END IF;

    SELECT json_agg(
        json_build_object(
            'link_id', cm.id,
            'map_id', m.id,
            'map_title', m.title,
            'map_description', m.description,
            'node_count', (
                SELECT COUNT(*) FROM public.map_nodes 
                WHERE map_id = m.id
            ),
            'added_at', cm.added_at,
            'added_by', cm.added_by,
            'display_order', cm.display_order,
            'notes', cm.notes,
            'is_active', cm.is_active
        ) ORDER BY cm.display_order, cm.added_at
    ) INTO result
    FROM public.classroom_maps cm
    JOIN public.learning_maps m ON cm.map_id = m.id
    WHERE cm.classroom_id = classroom_uuid
    AND cm.is_active = true;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link a map to a classroom
CREATE OR REPLACE FUNCTION public.link_map_to_classroom(
    classroom_uuid UUID,
    map_uuid UUID,
    notes_text TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    link_id UUID;
    max_order INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can link maps';
    END IF;
    
    -- Check if map exists
    IF NOT EXISTS (SELECT 1 FROM public.learning_maps WHERE id = map_uuid) THEN
        RAISE EXCEPTION 'Map not found';
    END IF;
    
    -- Check if link already exists
    IF EXISTS (
        SELECT 1 FROM public.classroom_maps 
        WHERE classroom_id = classroom_uuid AND map_id = map_uuid
    ) THEN
        RAISE EXCEPTION 'Map is already linked to this classroom';
    END IF;
    
    -- Get next display order
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO max_order
    FROM public.classroom_maps 
    WHERE classroom_id = classroom_uuid;
    
    -- Insert the link
    INSERT INTO public.classroom_maps (
        classroom_id, 
        map_id, 
        added_by, 
        display_order, 
        notes
    ) VALUES (
        classroom_uuid, 
        map_uuid, 
        auth.uid(), 
        max_order, 
        notes_text
    ) RETURNING id INTO link_id;
    
    RETURN json_build_object(
        'link_id', link_id,
        'classroom_id', classroom_uuid,
        'map_id', map_uuid,
        'display_order', max_order,
        'added_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlink a map from a classroom
CREATE OR REPLACE FUNCTION public.unlink_map_from_classroom(
    classroom_uuid UUID,
    map_uuid UUID
)
RETURNS JSON AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can unlink maps';
    END IF;
    
    -- Delete the link
    DELETE FROM public.classroom_maps 
    WHERE classroom_id = classroom_uuid 
    AND map_id = map_uuid;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count = 0 THEN
        RAISE EXCEPTION 'Map link not found or already removed';
    END IF;
    
    RETURN json_build_object(
        'classroom_id', classroom_uuid,
        'map_id', map_uuid,
        'unlinked_at', now(),
        'deleted_count', deleted_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available nodes for assignment creation (from linked maps)
CREATE OR REPLACE FUNCTION public.get_classroom_available_nodes(classroom_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can view available nodes';
    END IF;

    SELECT json_agg(
        json_build_object(
            'map_id', m.id,
            'map_title', m.title,
            'nodes', (
                SELECT json_agg(
                    json_build_object(
                        'node_id', mn.id,
                        'node_title', mn.title,
                        'node_description', mn.description,
                        'has_content', EXISTS (
                            SELECT 1 FROM public.node_content 
                            WHERE node_id = mn.id
                        ),
                        'has_assessment', EXISTS (
                            SELECT 1 FROM public.node_assessments 
                            WHERE node_id = mn.id
                        )
                    ) ORDER BY mn.created_at
                )
                FROM public.map_nodes mn 
                WHERE mn.map_id = m.id
            )
        ) ORDER BY cm.display_order, cm.added_at
    ) INTO result
    FROM public.classroom_maps cm
    JOIN public.learning_maps m ON cm.map_id = m.id
    WHERE cm.classroom_id = classroom_uuid
    AND cm.is_active = true;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reorder classroom map links
CREATE OR REPLACE FUNCTION public.reorder_classroom_maps(
    classroom_uuid UUID,
    link_orders JSON
)
RETURNS JSON AS $$
DECLARE
    link_item JSON;
    updated_count INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can reorder maps';
    END IF;
    
    -- Update display orders
    FOR link_item IN SELECT * FROM json_array_elements(link_orders)
    LOOP
        UPDATE public.classroom_maps 
        SET display_order = (link_item->>'order')::INTEGER
        WHERE id = (link_item->>'link_id')::UUID
        AND classroom_id = classroom_uuid;
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'classroom_id', classroom_uuid,
        'updated_count', updated_count,
        'reordered_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ENHANCED ASSIGNMENT CREATION
-- ========================================

-- Function to create assignment from map template
CREATE OR REPLACE FUNCTION public.create_assignment_from_map(
    classroom_uuid UUID,
    map_uuid UUID,
    assignment_title TEXT,
    assignment_description TEXT DEFAULT NULL,
    selected_node_ids UUID[] DEFAULT NULL,
    auto_enroll BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    assignment_id UUID;
    node_id UUID;
    sequence_num INTEGER := 1;
    enrolled_count INTEGER := 0;
BEGIN
    -- Check if user is instructor of this classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid AND instructor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: only classroom instructors can create assignments';
    END IF;
    
    -- Check if map is linked to classroom
    IF NOT EXISTS (
        SELECT 1 FROM public.classroom_maps 
        WHERE classroom_id = classroom_uuid 
        AND map_id = map_uuid 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Map is not linked to this classroom';
    END IF;
    
    -- Create the assignment
    INSERT INTO public.classroom_assignments (
        classroom_id,
        title,
        description,
        created_by,
        source_map_id,
        map_context
    ) VALUES (
        classroom_uuid,
        assignment_title,
        assignment_description,
        auth.uid(),
        map_uuid,
        'Created from linked map: ' || (SELECT title FROM public.learning_maps WHERE id = map_uuid)
    ) RETURNING id INTO assignment_id;
    
    -- Add nodes to assignment
    IF selected_node_ids IS NOT NULL THEN
        -- Use selected nodes
        FOREACH node_id IN ARRAY selected_node_ids
        LOOP
            -- Verify node belongs to the map
            IF EXISTS (
                SELECT 1 FROM public.map_nodes 
                WHERE id = node_id AND map_id = map_uuid
            ) THEN
                INSERT INTO public.assignment_nodes (
                    assignment_id,
                    node_id,
                    sequence_order
                ) VALUES (
                    assignment_id,
                    node_id,
                    sequence_num
                );
                sequence_num := sequence_num + 1;
            END IF;
        END LOOP;
    ELSE
        -- Use all nodes from the map
        INSERT INTO public.assignment_nodes (assignment_id, node_id, sequence_order)
        SELECT assignment_id, mn.id, ROW_NUMBER() OVER (ORDER BY mn.created_at)
        FROM public.map_nodes mn
        WHERE mn.map_id = map_uuid;
    END IF;
    
    -- Auto-enroll students if requested
    IF auto_enroll THEN
        INSERT INTO public.assignment_enrollments (assignment_id, user_id)
        SELECT assignment_id, cm.user_id
        FROM public.classroom_memberships cm
        WHERE cm.classroom_id = classroom_uuid
        AND cm.role = 'student';
        
        GET DIAGNOSTICS enrolled_count = ROW_COUNT;
    END IF;
    
    RETURN json_build_object(
        'assignment_id', assignment_id,
        'classroom_id', classroom_uuid,
        'source_map_id', map_uuid,
        'nodes_added', sequence_num - 1,
        'students_enrolled', enrolled_count,
        'created_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION public.get_classroom_maps(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_map_to_classroom(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_map_from_classroom(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_classroom_available_nodes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_classroom_maps(UUID, JSON) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_assignment_from_map(UUID, UUID, TEXT, TEXT, UUID[], BOOLEAN) TO authenticated;

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.classroom_maps IS 'Many-to-many relationship linking classrooms with learning maps for assignment creation';
COMMENT ON COLUMN public.classroom_maps.display_order IS 'Order in which maps appear in classroom interface';
COMMENT ON COLUMN public.classroom_maps.notes IS 'Instructor notes about why this map was linked to the classroom';

COMMENT ON COLUMN public.classroom_assignments.source_map_id IS 'Reference to the map this assignment was created from';
COMMENT ON COLUMN public.classroom_assignments.map_context IS 'Context about how this assignment relates to the source map';

COMMENT ON FUNCTION public.get_classroom_maps(UUID) IS 'Returns all maps linked to a classroom with metadata';
COMMENT ON FUNCTION public.link_map_to_classroom(UUID, UUID, TEXT) IS 'Links a map to a classroom for assignment creation';
COMMENT ON FUNCTION public.unlink_map_from_classroom(UUID, UUID) IS 'Removes a map link from a classroom';
COMMENT ON FUNCTION public.get_classroom_available_nodes(UUID) IS 'Returns all nodes from linked maps available for assignment creation';
COMMENT ON FUNCTION public.reorder_classroom_maps(UUID, JSON) IS 'Updates the display order of linked maps in a classroom';
COMMENT ON FUNCTION public.create_assignment_from_map(UUID, UUID, TEXT, TEXT, UUID[], BOOLEAN) IS 'Creates an assignment based on nodes from a linked map';

-- ========================================
-- VALIDATION AND VERIFICATION
-- ========================================

-- Verify the new table and columns were created
DO $$
BEGIN
    -- Check if classroom_maps table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classroom_maps') THEN
        RAISE EXCEPTION 'classroom_maps table was not created successfully';
    END IF;
    
    -- Check if new columns were added to classroom_assignments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classroom_assignments' 
        AND column_name = 'source_map_id'
    ) THEN
        RAISE EXCEPTION 'source_map_id column was not added to classroom_assignments';
    END IF;
    
    RAISE NOTICE 'Classroom-Map linking system migration completed successfully. Added classroom_maps table and enhanced assignment creation.';
END$$;
