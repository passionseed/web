-- Fix interests table permissions for profile completion
-- This fixes the "permission denied for table interests" error on the finish-profile page

-- Grant all necessary permissions to authenticated users for interests table
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."interests" TO "authenticated";

-- Ensure the existing RLS policies allow users to manage their own interests
-- The policies should already exist: "can create" and "view interests"

-- Add missing UPDATE and DELETE policies for interests
CREATE POLICY "Users can update their own interests" ON "public"."interests"
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests" ON "public"."interests"
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);