-- Create some default tags that will be available to all users
-- These tags are inserted with a NULL user_id, allowing them to be used by any user
-- When a user selects one of these tags, a new user-specific tag will be created

-- First, create a function to ensure default tags exist
CREATE OR REPLACE FUNCTION ensure_default_tags() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run for new users
  IF TG_OP = 'INSERT' THEN
    -- Insert default tags for the new user
    INSERT INTO public.tags (user_id, name, color)
    SELECT NEW.id, name, color
    FROM (
      VALUES 
        ('Work', '#3b82f6'),
        ('Personal', '#10b981'),
        ('Health', '#ef4444'),
        ('Learning', '#8b5cf6'),
        ('Goals', '#f59e0b')
    ) AS default_tags(name, color)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tags 
      WHERE user_id = NEW.id AND name = default_tags.name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create a trigger to add default tags when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_default_tags();

-- Also add some default tags for existing users who don't have any tags yet
-- This is a one-time operation
DO $$
BEGIN
  -- Only run if we have users but no tags
  IF EXISTS (SELECT 1 FROM auth.users) AND 
     NOT EXISTS (SELECT 1 FROM public.tags LIMIT 1) THEN
    
    INSERT INTO public.tags (user_id, name, color)
    SELECT 
      u.id, 
      dt.name, 
      dt.color
    FROM 
      auth.users u
    CROSS JOIN (
      VALUES 
        ('Work', '#3b82f6'),
        ('Personal', '#10b981'),
        ('Health', '#ef4444'),
        ('Learning', '#8b5cf6'),
        ('Goals', '#f59e0b')
    ) AS dt(name, color)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tags t WHERE t.user_id = u.id AND t.name = dt.name
    );
    
  END IF;
END $$;
