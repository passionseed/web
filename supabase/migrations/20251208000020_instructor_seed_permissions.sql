-- ============================================
-- INSTRUCTOR SEED PERMISSIONS & MENTOR FEATURE
-- ============================================

-- 1. Add mentor_id to seed_rooms for mentor assignment
ALTER TABLE public.seed_rooms
ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES auth.users(id);

-- Add index for mentor queries
CREATE INDEX IF NOT EXISTS seed_rooms_mentor_idx 
ON public.seed_rooms(mentor_id) WHERE mentor_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN public.seed_rooms.mentor_id IS 'Admin or instructor assigned as mentor for this seed room';

-- 2. Add discord_uid to profiles for admin/instructor contact info
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discord_uid TEXT;

-- Comment
COMMENT ON COLUMN public.profiles.discord_uid IS 'Discord User ID (UID) for admin/instructor contact (optional)';

-- 3. Update seed_rooms UPDATE policy to include instructors
-- Drop existing policies and recreate with instructor support
DROP POLICY IF EXISTS "Seed rooms are updateable by host or admin" ON public.seed_rooms;
DROP POLICY IF EXISTS "Seed rooms are updateable by host, admin, or instructor" ON public.seed_rooms;

CREATE POLICY "Seed rooms are updateable by host, admin, or instructor"
  ON public.seed_rooms FOR UPDATE
  USING (
    auth.uid() = host_id OR
    auth.uid() = mentor_id OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- 4. Add comment explaining the permission structure
COMMENT ON POLICY "Seed rooms are updateable by host, admin, or instructor" ON public.seed_rooms IS 
'Host can update their own room. Admins and instructors can update any room (for starting lobby, assigning mentor). Mentors can update rooms they are mentoring.';
