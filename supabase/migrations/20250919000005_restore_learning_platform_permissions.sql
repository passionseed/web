-- Restore permissions for core learning platform tables
-- This fixes the 403 Forbidden errors across the platform after the schema migration revoked all permissions

-- Grant SELECT permissions to authenticated users for core learning platform tables
GRANT SELECT ON table "public"."learning_maps" TO "authenticated";
GRANT SELECT ON table "public"."map_nodes" TO "authenticated";
GRANT SELECT ON table "public"."user_map_enrollments" TO "authenticated";
GRANT SELECT ON table "public"."classrooms" TO "authenticated";
GRANT SELECT ON table "public"."classroom_memberships" TO "authenticated";
GRANT SELECT ON table "public"."classroom_teams" TO "authenticated";
GRANT SELECT ON table "public"."classroom_maps" TO "authenticated";
GRANT SELECT ON table "public"."team_memberships" TO "authenticated";
-- Grant INSERT, UPDATE, DELETE permissions for users to manage their own data
GRANT INSERT, UPDATE, DELETE ON table "public"."user_map_enrollments" TO "authenticated";
GRANT INSERT, UPDATE, DELETE ON table "public"."classroom_memberships" TO "authenticated";
GRANT INSERT, UPDATE, DELETE ON table "public"."team_memberships" TO "authenticated";

-- Grant limited permissions for creating classrooms and teams
GRANT INSERT, UPDATE ON table "public"."classrooms" TO "authenticated";
GRANT INSERT, UPDATE ON table "public"."classroom_teams" TO "authenticated";
GRANT INSERT ON table "public"."learning_maps" TO "authenticated";
GRANT INSERT ON table "public"."map_nodes" TO "authenticated";

-- Enable RLS on all tables
ALTER TABLE "public"."learning_maps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."map_nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_map_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."classrooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."classroom_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."classroom_teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."classroom_maps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_memberships" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for learning_maps table
DROP POLICY IF EXISTS "Users can view public maps and their own maps" ON "public"."learning_maps";
CREATE POLICY "Users can view public maps and their own maps" ON "public"."learning_maps"
FOR SELECT 
TO authenticated
USING (visibility = 'public' OR creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can create and manage their own maps" ON "public"."learning_maps";
CREATE POLICY "Users can create and manage their own maps" ON "public"."learning_maps"
FOR ALL 
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Create RLS policies for map_nodes table
DROP POLICY IF EXISTS "Users can view nodes of accessible maps" ON "public"."map_nodes";
CREATE POLICY "Users can view nodes of accessible maps" ON "public"."map_nodes"
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM learning_maps 
    WHERE learning_maps.id = map_nodes.map_id 
    AND (learning_maps.visibility = 'public' OR learning_maps.creator_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can manage nodes of their own maps" ON "public"."map_nodes";
CREATE POLICY "Users can manage nodes of their own maps" ON "public"."map_nodes"
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM learning_maps 
    WHERE learning_maps.id = map_nodes.map_id 
    AND learning_maps.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM learning_maps 
    WHERE learning_maps.id = map_nodes.map_id 
    AND learning_maps.creator_id = auth.uid()
  )
);

-- Create RLS policies for user_map_enrollments table
DROP POLICY IF EXISTS "Users can manage their own map enrollments" ON "public"."user_map_enrollments";
CREATE POLICY "Users can manage their own map enrollments" ON "public"."user_map_enrollments"
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for classrooms table
DROP POLICY IF EXISTS "Users can view accessible classrooms" ON "public"."classrooms";
CREATE POLICY "Users can view accessible classrooms" ON "public"."classrooms"
FOR SELECT 
TO authenticated
USING (
  instructor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classroom_memberships 
    WHERE classroom_memberships.classroom_id = classrooms.id 
    AND classroom_memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage their own classrooms" ON "public"."classrooms";
CREATE POLICY "Users can manage their own classrooms" ON "public"."classrooms"
FOR ALL 
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Create RLS policies for classroom_memberships table
DROP POLICY IF EXISTS "Users can view relevant classroom memberships" ON "public"."classroom_memberships";
CREATE POLICY "Users can view relevant classroom memberships" ON "public"."classroom_memberships"
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classrooms 
    WHERE classrooms.id = classroom_memberships.classroom_id 
    AND classrooms.instructor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage classroom memberships" ON "public"."classroom_memberships";
CREATE POLICY "Users can manage classroom memberships" ON "public"."classroom_memberships"
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classrooms 
    WHERE classrooms.id = classroom_memberships.classroom_id 
    AND classrooms.instructor_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classrooms 
    WHERE classrooms.id = classroom_memberships.classroom_id 
    AND classrooms.instructor_id = auth.uid()
  )
);

-- Create RLS policies for classroom_teams table  
DROP POLICY IF EXISTS "Users can view teams in their classrooms" ON "public"."classroom_teams";
CREATE POLICY "Users can view teams in their classrooms" ON "public"."classroom_teams"
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classroom_memberships 
    WHERE classroom_memberships.classroom_id = classroom_teams.classroom_id 
    AND classroom_memberships.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Instructors can manage classroom teams" ON "public"."classroom_teams";
CREATE POLICY "Instructors can manage classroom teams" ON "public"."classroom_teams"
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classroom_memberships 
    WHERE classroom_memberships.classroom_id = classroom_teams.classroom_id 
    AND classroom_memberships.user_id = auth.uid()
    AND classroom_memberships.role IN ('instructor', 'ta')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classroom_memberships 
    WHERE classroom_memberships.classroom_id = classroom_teams.classroom_id 
    AND classroom_memberships.user_id = auth.uid()
    AND classroom_memberships.role IN ('instructor', 'ta')
  )
);

-- Create RLS policies for team_memberships table
DROP POLICY IF EXISTS "Users can view relevant team memberships" ON "public"."team_memberships";
CREATE POLICY "Users can view relevant team memberships" ON "public"."team_memberships"
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classroom_teams
    JOIN classroom_memberships ON classroom_memberships.classroom_id = classroom_teams.classroom_id
    WHERE classroom_teams.id = team_memberships.team_id 
    AND classroom_memberships.user_id = auth.uid()
    AND classroom_memberships.role IN ('instructor', 'ta')
  )
);

DROP POLICY IF EXISTS "Users can manage team memberships" ON "public"."team_memberships";
CREATE POLICY "Users can manage team memberships" ON "public"."team_memberships"
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classroom_teams
    JOIN classroom_memberships ON classroom_memberships.classroom_id = classroom_teams.classroom_id
    WHERE classroom_teams.id = team_memberships.team_id 
    AND classroom_memberships.user_id = auth.uid()
    AND classroom_memberships.role IN ('instructor', 'ta')
  )
)
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM classroom_teams
    JOIN classroom_memberships ON classroom_memberships.classroom_id = classroom_teams.classroom_id
    WHERE classroom_teams.id = team_memberships.team_id 
    AND classroom_memberships.user_id = auth.uid()
    AND classroom_memberships.role IN ('instructor', 'ta')
  )
);

-- Note: Skipping complex assessment submission policies for now
-- These require more complex user relationship checks through progress_id