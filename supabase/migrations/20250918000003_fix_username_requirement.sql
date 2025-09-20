-- Fix the trigger function to provide a required username
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  temp_username text;
  counter int := 0;
BEGIN
  -- Generate a temporary unique username based on email or user ID
  temp_username := 'user_' || substring(new.id::text, 1, 8);
  
  -- Make sure username is unique by adding a counter if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = temp_username) LOOP
    counter := counter + 1;
    temp_username := 'user_' || substring(new.id::text, 1, 8) || '_' || counter;
  END LOOP;
  
  -- Insert with required fields
  INSERT INTO public.profiles (id, username, email, created_at, updated_at)
  VALUES (
    new.id,
    temp_username,
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

-- Ensure proper ownership and search path
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;