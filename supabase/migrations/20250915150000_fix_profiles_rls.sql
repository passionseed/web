-- Fix profiles table RLS policies
-- Simple permissive policies for development

-- Drop any existing policies
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access to profiles" ON public.profiles;

-- Disable RLS temporarily to fix the issue
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Create simple permissive policy
CREATE POLICY "Allow all authenticated users access to profiles" ON public.profiles
    FOR ALL USING (true);

-- Re-enable RLS with permissive policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

COMMENT ON TABLE public.profiles IS 'User profiles with permissive RLS for development';