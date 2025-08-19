-- Add visibility column to learning_maps table
ALTER TABLE public.learning_maps 
ADD COLUMN visibility text DEFAULT 'public' 
CHECK (visibility IN ('public', 'private', 'team'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS learning_maps_visibility_idx 
ON public.learning_maps USING btree (visibility);

-- Comment on the column
COMMENT ON COLUMN public.learning_maps.visibility IS 'Controls map visibility: public (visible to all), private (visible to creator only), team (visible to assigned teams)';