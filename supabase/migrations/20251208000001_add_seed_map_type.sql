-- Extend existing map_type enum
ALTER TYPE public.map_type ADD VALUE IF NOT EXISTS 'seed';

-- Add parent_seed_id column
ALTER TABLE public.learning_maps
ADD COLUMN IF NOT EXISTS parent_seed_id UUID REFERENCES public.seeds(id) ON DELETE CASCADE;

-- Note: Constraint for seed maps will be added in a separate migration
-- because PostgreSQL doesn't allow using newly added enum values in the same transaction

-- Add index
CREATE INDEX IF NOT EXISTS learning_maps_parent_seed_idx 
ON public.learning_maps(parent_seed_id) WHERE parent_seed_id IS NOT NULL;

-- Note: RLS policies for seed maps will be updated in a separate migration
-- because PostgreSQL doesn't allow using newly added enum values in the same transaction
