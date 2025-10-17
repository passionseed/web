BEGIN;

-- Allow users to view all memberships in classrooms they are enrolled in
-- This enables students to see instructors and TAs in their classrooms

DROP POLICY IF EXISTS "view_own_memberships" ON "public"."classroom_memberships";

-- Users can view their own memberships AND all memberships in classrooms they belong to
CREATE POLICY "view_classroom_memberships" ON "public"."classroom_memberships"
FOR SELECT
TO authenticated
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- User can see all memberships in classrooms they are enrolled in
  EXISTS (
    SELECT 1 FROM public.classroom_memberships cm
    WHERE cm.classroom_id = classroom_memberships.classroom_id
    AND cm.user_id = auth.uid()
  )
);

COMMIT;
