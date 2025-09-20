-- Fix the auth trigger function to properly handle RLS and permissions
-- The previous function might fail due to RLS policies

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Insert with explicit security context bypass
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
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

-- Ensure the function can bypass RLS by granting it appropriate role
-- and setting the search path explicitly
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;

-- Create a more permissive INSERT policy for system operations
DROP POLICY IF EXISTS "System can insert profiles" ON "public"."profiles";

CREATE POLICY "System can insert profiles" ON "public"."profiles" 
FOR INSERT 
TO postgres
WITH CHECK (true);

-- Ensure service_role can also insert profiles for system operations
GRANT INSERT ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Service role can insert profiles" ON "public"."profiles";

CREATE POLICY "Service role can insert profiles" ON "public"."profiles" 
FOR INSERT 
TO service_role
WITH CHECK (true);