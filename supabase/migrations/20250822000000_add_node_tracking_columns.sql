-- Add version and last_modified_by columns to map_nodes table if they don't exist

-- Add version column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'map_nodes' AND column_name = 'version') THEN
        ALTER TABLE public.map_nodes ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END$$;

-- Add last_modified_by column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'map_nodes' AND column_name = 'last_modified_by') THEN
        ALTER TABLE public.map_nodes ADD COLUMN last_modified_by UUID;
    END IF;
END$$;

-- Add foreign key constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'map_nodes_last_modified_by_fkey' 
                   AND table_name = 'map_nodes') THEN
        ALTER TABLE public.map_nodes
        ADD CONSTRAINT map_nodes_last_modified_by_fkey 
        FOREIGN KEY (last_modified_by) REFERENCES auth.users(id);
    END IF;
END$$;

-- Update existing rows to have default version values where null
UPDATE public.map_nodes SET version = 1 WHERE version IS NULL;

-- Add comments for documentation (idempotent - will update if exists)
COMMENT ON COLUMN public.map_nodes.version IS 'Version number for node content tracking';
COMMENT ON COLUMN public.map_nodes.last_modified_by IS 'User ID of the last person who modified this node';

-- Create indexes only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_map_nodes_last_modified_by') THEN
        CREATE INDEX idx_map_nodes_last_modified_by ON public.map_nodes(last_modified_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_map_nodes_version') THEN
        CREATE INDEX idx_map_nodes_version ON public.map_nodes(version);
    END IF;
END$$;