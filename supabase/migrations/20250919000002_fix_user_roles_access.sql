-- Fix user_roles and interests table access issues
-- This fixes the "Error checking user roles: {}" and "Error fetching skills: {}" issues

-- Grant select permission to authenticated users for user_roles
GRANT SELECT ON table "public"."user_roles" TO "authenticated";

-- Grant select permission to authenticated users for interests (skills)
GRANT SELECT ON table "public"."interests" TO "authenticated";

-- Create RLS policy to allow users to read their own roles
CREATE POLICY "Users can read their own roles" ON "public"."user_roles"
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Enable RLS on user_roles table
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

-- The interests table should already have proper RLS policies, but ensure they're enabled
ALTER TABLE "public"."interests" ENABLE ROW LEVEL SECURITY;