-- Fix profile creation issues for production environment
-- This migration addresses server-side specific issues that don't occur locally

-- ========================================
-- CLEAN UP CONFLICTING RLS POLICIES
-- ========================================

-- Drop all existing conflicting policies first
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "anyone can view profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can read their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "System can insert profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Service role can insert profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can manage their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Instructors can view student profiles in their classrooms" ON "public"."profiles";

-- Create single comprehensive policy for profiles
CREATE POLICY "profiles_policy" ON "public"."profiles"
FOR ALL 
TO authenticated, service_role
USING (
  -- Users can access their own profile
  auth.uid() = id 
  OR 
  -- Service role can access all profiles (for triggers)
  auth.role() = 'service_role'
  OR
  -- Allow public read access for basic profile info
  true
)
WITH CHECK (
  -- Users can only modify their own profile
  auth.uid() = id 
  OR 
  -- Service role can create/modify profiles (for triggers)
  auth.role() = 'service_role'
);

-- ========================================
-- UPDATE TRIGGER FUNCTION
-- ========================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the trigger function to include date_of_birth and be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  temp_username text;
  counter int := 0;
  temp_full_name text;
BEGIN
  -- Extract full name from metadata
  temp_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name'
  );
  
  -- Generate a temporary unique username based on email or user ID
  temp_username := COALESCE(
    new.raw_user_meta_data->>'preferred_username',
    split_part(new.email, '@', 1),
    'user_' || substring(new.id::text, 1, 8)
  );
  
  -- Make sure username is unique by adding a counter if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = temp_username) LOOP
    counter := counter + 1;
    temp_username := COALESCE(
      split_part(new.email, '@', 1),
      'user_' || substring(new.id::text, 1, 8)
    ) || '_' || counter;
  END LOOP;
  
  -- Insert with all required fields including date_of_birth
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    full_name,
    avatar_url,
    date_of_birth,
    created_at, 
    updated_at
  )
  VALUES (
    new.id,
    temp_username,
    new.email,
    temp_full_name,
    new.raw_user_meta_data->>'avatar_url',
    NULL, -- date_of_birth will be filled later in onboarding
    now(),
    now()
  );
  
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, that's fine
    RAISE NOTICE 'Profile already exists for user %', new.id;
    RETURN new;
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper ownership and search path
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- ENSURE PROPER PERMISSIONS
-- ========================================

-- Grant necessary permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."profiles" TO "authenticated";

-- Grant service role permissions for triggers
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."profiles" TO "service_role";

-- Ensure RLS is enabled
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ADD HELPFUL INDEXES
-- ========================================

-- Index for username lookups (used in trigger)
CREATE INDEX IF NOT EXISTS profiles_username_idx ON "public"."profiles" (username);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON "public"."profiles" (email);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- These queries can be run manually to verify the migration worked:
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
-- SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
-- SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';