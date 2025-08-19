-- Enable RLS for learning_maps table
ALTER TABLE public.learning_maps ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view learning maps (for public access)
CREATE POLICY "learning_maps_select_public" ON public.learning_maps
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can create learning maps
CREATE POLICY "learning_maps_insert_authenticated" ON public.learning_maps
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update maps they created OR instructors can update any map
CREATE POLICY "learning_maps_update_creator_or_instructor" ON public.learning_maps
    FOR UPDATE
    USING (
        creator_id = auth.uid()
        OR 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'instructor'
        )
    );

-- Policy: Users can delete maps they created OR instructors can delete any map
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
