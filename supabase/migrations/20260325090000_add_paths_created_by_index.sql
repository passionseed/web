-- Add index on paths.created_by to speed up RLS policy checks.
-- The path_content, path_activities, and path_assessments RLS policies all do:
--   JOIN paths p ON p.id = ... WHERE p.created_by = auth.uid()
-- Without this index, every INSERT/UPDATE/DELETE does a full table scan on paths,
-- causing statement timeouts on production.
CREATE INDEX IF NOT EXISTS idx_paths_created_by ON public.paths (created_by);
