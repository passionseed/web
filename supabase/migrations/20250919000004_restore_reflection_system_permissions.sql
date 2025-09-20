-- Restore permissions for reflection/portal system tables
-- This fixes the permission denied errors on the portal page after the schema migration revoked all permissions

-- Grant SELECT permissions to authenticated users for reflection system tables
GRANT SELECT ON table "public"."projects" TO "authenticated";
GRANT SELECT ON table "public"."reflections" TO "authenticated";
GRANT SELECT ON table "public"."reflection_metrics" TO "authenticated";
GRANT SELECT ON table "public"."project_tags" TO "authenticated";
GRANT SELECT ON table "public"."tags" TO "authenticated";

-- Grant INSERT, UPDATE, DELETE permissions for users to manage their own data
GRANT INSERT, UPDATE, DELETE ON table "public"."projects" TO "authenticated";
GRANT INSERT, UPDATE, DELETE ON table "public"."reflections" TO "authenticated";
GRANT INSERT, UPDATE, DELETE ON table "public"."reflection_metrics" TO "authenticated";
GRANT INSERT, UPDATE, DELETE ON table "public"."project_tags" TO "authenticated";
GRANT INSERT, UPDATE, DELETE ON table "public"."tags" TO "authenticated";

-- Enable RLS on all tables
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reflections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reflection_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects table
DROP POLICY IF EXISTS "Users can manage their own projects" ON "public"."projects";
CREATE POLICY "Users can manage their own projects" ON "public"."projects"
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for reflections table
DROP POLICY IF EXISTS "Users can manage their own reflections" ON "public"."reflections";
CREATE POLICY "Users can manage their own reflections" ON "public"."reflections"
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for reflection_metrics table
DROP POLICY IF EXISTS "Users can manage their own reflection metrics" ON "public"."reflection_metrics";
CREATE POLICY "Users can manage their own reflection metrics" ON "public"."reflection_metrics"
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM reflections 
    WHERE reflections.id = reflection_metrics.reflection_id 
    AND reflections.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reflections 
    WHERE reflections.id = reflection_metrics.reflection_id 
    AND reflections.user_id = auth.uid()
  )
);

-- Create RLS policies for project_tags table
DROP POLICY IF EXISTS "Users can manage their own project tags" ON "public"."project_tags";
CREATE POLICY "Users can manage their own project tags" ON "public"."project_tags"
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_tags.project_id 
    AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_tags.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Create RLS policies for tags table
DROP POLICY IF EXISTS "Users can manage their own tags" ON "public"."tags";
CREATE POLICY "Users can manage their own tags" ON "public"."tags"
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);