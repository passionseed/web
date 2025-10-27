-- Migration: Add Batch Position Sync RPC Functions
-- Created: 2025-10-27
-- Description: Creates RPC functions for batching position updates for journey_projects
--              and project_milestones tables. This enables efficient bulk updates instead
--              of individual writes on every drag event, improving performance and reducing
--              database load.

-- ========================================
-- BATCH UPDATE FUNCTION FOR JOURNEY PROJECTS
-- ========================================

-- Drop function if it exists (for idempotent migrations)
DROP FUNCTION IF EXISTS public.update_journey_projects_positions(jsonb);

-- Create function to batch update journey project positions
CREATE OR REPLACE FUNCTION public.update_journey_projects_positions(items jsonb)
RETURNS void AS $$
BEGIN
  -- Update all journey_projects positions in a single query
  -- The updated_at column will be automatically updated by the existing trigger
  UPDATE public.journey_projects AS jp
  SET
    position_x = (elem->>'x')::double precision,
    position_y = (elem->>'y')::double precision
  FROM jsonb_array_elements(items) AS elem
  WHERE jp.id = (elem->>'id')::uuid
    AND jp.user_id = auth.uid(); -- Ensure RLS: only update user's own projects
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_journey_projects_positions(jsonb) IS
'Batch updates position_x and position_y for multiple journey projects.
Input format: [{"id": "uuid", "x": number, "y": number}, ...]
Automatically respects RLS by only updating projects owned by the authenticated user.';

-- ========================================
-- BATCH UPDATE FUNCTION FOR PROJECT MILESTONES
-- ========================================

-- Drop function if it exists (for idempotent migrations)
DROP FUNCTION IF EXISTS public.update_project_milestones_positions(jsonb);

-- Create function to batch update milestone positions
CREATE OR REPLACE FUNCTION public.update_project_milestones_positions(items jsonb)
RETURNS void AS $$
BEGIN
  -- Update all project_milestones positions in a single query
  -- The updated_at column will be automatically updated by the existing trigger
  UPDATE public.project_milestones AS pm
  SET
    position_x = (elem->>'x')::double precision,
    position_y = (elem->>'y')::double precision
  FROM jsonb_array_elements(items) AS elem
  WHERE pm.id = (elem->>'id')::uuid
    AND pm.project_id IN (
      -- Ensure RLS: only update milestones in user's own projects
      SELECT id FROM public.journey_projects
      WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_project_milestones_positions(jsonb) IS
'Batch updates position_x and position_y for multiple project milestones.
Input format: [{"id": "uuid", "x": number, "y": number}, ...]
Automatically respects RLS by only updating milestones in projects owned by the authenticated user.';

-- ========================================
-- GRANTS AND PERMISSIONS
-- ========================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.update_journey_projects_positions(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_project_milestones_positions(jsonb) TO authenticated;

-- ========================================
-- VALIDATION
-- ========================================

-- Verify functions were created successfully
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'update_journey_projects_positions',
        'update_project_milestones_positions'
    );

    IF function_count != 2 THEN
        RAISE EXCEPTION 'Not all batch position sync functions were created successfully. Expected 2, got %', function_count;
    END IF;

    RAISE NOTICE 'Batch position sync migration completed successfully. Created % RPC functions.', function_count;
END$$;
