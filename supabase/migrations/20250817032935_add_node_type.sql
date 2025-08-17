-- Migration: Add Node Type to Map Nodes
-- Created: 2025-08-17 03:30:00
-- Description: Adds a 'node_type' column to the map_nodes table to differentiate
--              between standard learning nodes and simple text/annotation nodes.

-- Add the node_type column to the map_nodes table
ALTER TABLE public.map_nodes
ADD COLUMN IF NOT EXISTS node_type TEXT CHECK (node_type IN ('learning', 'text')) DEFAULT 'learning';

-- Update any existing rows where node_type might be NULL to the default value
UPDATE public.map_nodes
SET node_type = 'learning'
WHERE node_type IS NULL;

-- Add a comment for clear documentation in the database
COMMENT ON COLUMN public.map_nodes.node_type IS 'Type of node: ''learning'' for interactive nodes, ''text'' for annotation/label nodes.';

-- ========================================
-- MIGRATION COMPLETE
-- ========================================