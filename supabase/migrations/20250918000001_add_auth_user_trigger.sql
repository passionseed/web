-- Create function to handle new user profile creation
-- This function will be triggered automatically when a new user is created in auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    now(),
    now()
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Grant necessary permissions for the function to work
-- The function runs with SECURITY DEFINER so it has elevated privileges
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Ensure the trigger function can access the profiles table
GRANT INSERT ON public.profiles TO postgres;
GRANT USAGE ON SCHEMA public TO postgres;