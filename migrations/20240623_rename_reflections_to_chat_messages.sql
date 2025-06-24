-- Rename reflections table to chat_messages to better reflect its purpose
ALTER TABLE public.reflections RENAME TO chat_messages;

-- Rename constraints
ALTER TABLE public.chat_messages 
  RENAME CONSTRAINT reflections_pkey TO chat_messages_pkey;

ALTER TABLE public.chat_messages 
  RENAME CONSTRAINT reflections_user_id_fkey TO chat_messages_user_id_fkey;

ALTER TABLE public.chat_messages 
  RENAME CONSTRAINT reflections_role_check TO chat_messages_role_check;

-- Rename index
ALTER INDEX IF EXISTS public.reflections_user_id_created_at_idx 
  RENAME TO chat_messages_user_id_created_at_idx;

-- Update any existing RLS policies if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'reflections' 
    AND schemaname = 'public'
  ) THEN
    -- Drop existing policies on reflections
    DROP POLICY IF EXISTS "Allow individual read access" ON public.reflections;
    DROP POLICY IF EXISTS "Allow insert access" ON public.reflections;
    DROP POLICY IF EXISTS "Allow update access" ON public.reflections;
    DROP POLICY IF EXISTS "Allow delete access" ON public.reflections;
    
    -- Recreate policies on chat_messages
    CREATE POLICY "Allow individual read access" 
    ON public.chat_messages 
    FOR SELECT 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Allow insert access" 
    ON public.chat_messages 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Allow update access" 
    ON public.chat_messages 
    FOR UPDATE 
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Allow delete access" 
    ON public.chat_messages 
    FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Update any existing triggers or functions that reference the table name
-- This is a generic example - you'll need to adjust based on your actual triggers
DO $$
BEGIN
  -- Example for a trigger function that might reference the table
  -- Replace 'your_trigger_function' with actual function names
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'update_reflections_updated_at' 
    AND tgrelid = 'public.chat_messages'::regclass
  ) THEN
    DROP TRIGGER IF EXISTS update_reflections_updated_at ON public.chat_messages;
    
    CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION extensions.moddatetime('updated_at');
  END IF;
END $$;

-- Update any views that might reference the old table name
-- This is a placeholder - you'll need to update with actual view names
DO $$
BEGIN
  -- Example for a view that might reference reflections
  -- Replace 'your_view_name' with actual view names
  IF EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'your_view_name'
  ) THEN
    -- You'll need to recreate views that reference the old table name
    -- This is just an example - adjust based on your actual views
    DROP VIEW IF EXISTS public.your_view_name;
    
    CREATE OR REPLACE VIEW public.your_view_name AS
    SELECT * FROM public.chat_messages;
  END IF;
END $$;

-- Update any materialized views that might reference the old table name
-- This is a placeholder - you'll need to update with actual materialized view names
DO $$
BEGIN
  -- Example for a materialized view that might reference reflections
  -- Replace 'your_materialized_view' with actual materialized view names
  IF EXISTS (
    SELECT 1 
    FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'your_materialized_view'
  ) THEN
    -- You'll need to recreate materialized views that reference the old table name
    -- This is just an example - adjust based on your actual materialized views
    DROP MATERIALIZED VIEW IF EXISTS public.your_materialized_view;
    
    CREATE MATERIALIZED VIEW public.your_materialized_view AS
    SELECT * FROM public.chat_messages;
  END IF;
END $$;
