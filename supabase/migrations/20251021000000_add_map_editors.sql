-- Create map_editors table to grant edit access to specific users
CREATE TABLE public.map_editors (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  map_id uuid NOT NULL,
  user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT map_editors_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id) ON DELETE CASCADE,
  CONSTRAINT map_editors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT map_editors_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id),
  UNIQUE (map_id, user_id)
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS map_editors_map_id_idx
ON public.map_editors USING btree (map_id);

CREATE INDEX IF NOT EXISTS map_editors_user_id_idx
ON public.map_editors USING btree (user_id);

-- Enable RLS for map_editors table
ALTER TABLE public.map_editors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view editors for maps they own or can edit
CREATE POLICY "map_editors_select_if_owner_or_editor" ON public.map_editors
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_maps
            WHERE id = map_id
            AND creator_id = auth.uid()
        )
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

-- Policy: Map creators can grant editor access
CREATE POLICY "map_editors_insert_if_creator" ON public.map_editors
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.learning_maps
            WHERE id = map_id
            AND creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

-- Policy: Map creators can revoke editor access
CREATE POLICY "map_editors_delete_if_creator" ON public.map_editors
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_maps
            WHERE id = map_id
            AND creator_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

-- Update the learning_maps update policy to include editors
DROP POLICY IF EXISTS "learning_maps_update_creator_or_instructor" ON public.learning_maps;

CREATE POLICY "learning_maps_update_creator_editor_or_instructor" ON public.learning_maps
    FOR UPDATE
    USING (
        creator_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.map_editors
            WHERE map_id = learning_maps.id
            AND user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

-- Update the learning_maps delete policy to only allow creators and instructors (not editors)
DROP POLICY IF EXISTS "learning_maps_delete_creator_or_instructor" ON public.learning_maps;

CREATE POLICY "learning_maps_delete_creator_or_instructor" ON public.learning_maps
    FOR DELETE
    USING (
        creator_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

-- Update map_nodes policies to allow editors
DROP POLICY IF EXISTS "map_nodes_update_creator_or_instructor" ON public.map_nodes;

CREATE POLICY "map_nodes_update_creator_editor_or_instructor" ON public.map_nodes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_maps
            WHERE id = map_nodes.map_id
            AND creator_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.map_editors
            JOIN public.learning_maps ON map_editors.map_id = learning_maps.id
            WHERE learning_maps.id = map_nodes.map_id
            AND map_editors.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

DROP POLICY IF EXISTS "map_nodes_insert_creator_or_instructor" ON public.map_nodes;

CREATE POLICY "map_nodes_insert_creator_editor_or_instructor" ON public.map_nodes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.learning_maps
            WHERE id = map_nodes.map_id
            AND creator_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.map_editors
            JOIN public.learning_maps ON map_editors.map_id = learning_maps.id
            WHERE learning_maps.id = map_nodes.map_id
            AND map_editors.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

DROP POLICY IF EXISTS "map_nodes_delete_creator_or_instructor" ON public.map_nodes;

CREATE POLICY "map_nodes_delete_creator_editor_or_instructor" ON public.map_nodes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.learning_maps
            WHERE id = map_nodes.map_id
            AND creator_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.map_editors
            JOIN public.learning_maps ON map_editors.map_id = learning_maps.id
            WHERE learning_maps.id = map_nodes.map_id
            AND map_editors.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'instructor'
        )
    );

-- Comment on the table
COMMENT ON TABLE public.map_editors IS 'Grants edit access to learning maps for specific users';
