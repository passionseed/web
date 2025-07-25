-- Add metadata fields to learning_maps table
ALTER TABLE public.learning_maps 
ADD COLUMN difficulty integer DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
ADD COLUMN category text CHECK (category = ANY (ARRAY['ai'::text, '3d'::text, 'unity'::text, 'hacking'::text, 'custom'::text])),
ADD COLUMN total_students integer DEFAULT 0,
ADD COLUMN finished_students integer DEFAULT 0,
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS learning_maps_category_idx ON public.learning_maps(category);
CREATE INDEX IF NOT EXISTS learning_maps_difficulty_idx ON public.learning_maps(difficulty);

-- Add comments for documentation
COMMENT ON COLUMN public.learning_maps.difficulty IS 'Overall difficulty of the learning map (1-10)';
COMMENT ON COLUMN public.learning_maps.category IS 'Category of the learning map (ai, 3d, unity, hacking, custom)';
COMMENT ON COLUMN public.learning_maps.total_students IS 'Cached count of total students enrolled in this map';
COMMENT ON COLUMN public.learning_maps.finished_students IS 'Cached count of students who completed this map';
COMMENT ON COLUMN public.learning_maps.metadata IS 'Additional metadata in JSON format for extensibility';