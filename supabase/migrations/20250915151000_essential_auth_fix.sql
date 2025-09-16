-- ESSENTIAL: Fix authentication by ensuring user roles exist and are accessible

-- 1. Create trigger to auto-assign student role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default student role for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Ensure existing users have profiles first, then roles
INSERT INTO public.profiles (id, email, full_name, username)
SELECT au.id, au.email, au.email, SPLIT_PART(au.email, '@', 1)
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 4. Now assign student role to existing users
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'student'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = au.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Enable simple RLS for user_roles (authenticated users can read all)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Authenticated users can read user roles" ON public.user_roles;

-- Create single permissive policy for authenticated users
CREATE POLICY "Authenticated users can read user roles" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT ON public.user_roles TO authenticated;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-assigns student role to new users';