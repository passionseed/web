-- Restore necessary permissions for profiles table
-- This fixes the auth callback error where new users can't be created

-- Grant select and insert permissions to authenticated users for their own profiles
grant select on table "public"."profiles" to "authenticated";
grant insert on table "public"."profiles" to "authenticated";
grant update on table "public"."profiles" to "authenticated";

-- Ensure proper RLS policies exist
-- Update existing insert policy to allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."profiles";

CREATE POLICY "Users can insert their own profile" ON "public"."profiles" 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Update existing select policy 
DROP POLICY IF EXISTS "Users can read their own profile" ON "public"."profiles";

CREATE POLICY "Users can read their own profile" ON "public"."profiles" 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Update existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";

CREATE POLICY "Users can update their own profile" ON "public"."profiles" 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Enable RLS on profiles table if not already enabled
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;