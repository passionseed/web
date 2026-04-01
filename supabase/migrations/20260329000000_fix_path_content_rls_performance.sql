-- Fix statement timeout on path_content SELECT caused by expensive RLS policy.
-- The old single policy ran a 3-way join for every row, including an enrollment
-- check redundant for public pathlab content.
-- Split into two focused policies so Postgres short-circuits on the cheap pathlab
-- check before running the enrollment join.

DROP POLICY IF EXISTS "users_can_view_path_content" ON public.path_content;

-- Anyone can read content that belongs to a pathlab seed (no auth required)
CREATE POLICY "pathlab_content_is_public" ON public.path_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM path_activities pa
      JOIN path_days pd ON pd.id = pa.path_day_id
      JOIN paths p ON p.id = pd.path_id
      JOIN seeds s ON s.id = p.seed_id
      WHERE pa.id = path_content.activity_id
        AND s.seed_type = 'pathlab'
    )
  );

-- Enrolled users can read content from any path they're enrolled in
CREATE POLICY "enrolled_users_can_view_path_content" ON public.path_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM path_activities pa
      JOIN path_days pd ON pd.id = pa.path_day_id
      JOIN paths p ON p.id = pd.path_id
      JOIN path_enrollments pe ON pe.path_id = p.id
      WHERE pa.id = path_content.activity_id
        AND pe.user_id = auth.uid()
    )
  );
