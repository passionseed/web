-- Migration: Add End Node Type
-- Created: 2025-12-11
-- Description: Adds 'end' node type to mark completion points in learning maps,
--              particularly for seed rooms where students should see a completion popup.

-- Drop the existing constraint
ALTER TABLE public.map_nodes
DROP CONSTRAINT IF EXISTS map_nodes_node_type_check;

-- Add updated constraint with 'end' node type
ALTER TABLE public.map_nodes
ADD CONSTRAINT map_nodes_node_type_check
CHECK (node_type IN ('learning', 'text', 'comment', 'end'));

-- Update the comment for clear documentation
COMMENT ON COLUMN public.map_nodes.node_type IS 'Type of node: ''learning'' for interactive nodes, ''text'' for annotation/label nodes, ''comment'' for comments, ''end'' for completion nodes that trigger finish popup in seeds.';

-- Create a table to track seed completion for individual students
CREATE TABLE IF NOT EXISTS public.seed_room_completions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now(),
  completed_node_id uuid, -- The end node that was completed
  PRIMARY KEY (id),
  CONSTRAINT seed_room_completions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.seed_rooms(id) ON DELETE CASCADE,
  CONSTRAINT seed_room_completions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT seed_room_completions_node_id_fkey FOREIGN KEY (completed_node_id) REFERENCES public.map_nodes(id) ON DELETE SET NULL,
  UNIQUE (room_id, user_id) -- Each user can only complete a room once
);

-- Add comment for table
COMMENT ON TABLE public.seed_room_completions IS 'Tracks when students complete a seed room by finishing an end node.';

-- Enable RLS
ALTER TABLE public.seed_room_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for seed_room_completions

-- Users can view their own completions
CREATE POLICY "Users can view their own seed completions" ON public.seed_room_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert their own seed completions" ON public.seed_room_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Mentors, admins, and instructors can view all completions for rooms they have access to
CREATE POLICY "Mentors and admins can view all seed completions" ON public.seed_room_completions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.seed_rooms sr
    WHERE sr.id = seed_room_completions.room_id
    AND (
      sr.mentor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'instructor')
      )
    )
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT ON table public.seed_room_completions TO authenticated;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS seed_room_completions_room_user_idx ON public.seed_room_completions (room_id, user_id);
CREATE INDEX IF NOT EXISTS seed_room_completions_user_idx ON public.seed_room_completions (user_id);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
