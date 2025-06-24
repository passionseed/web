-- Enable Row Level Security on all reflection-related tables
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_insights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reflections" ON public.reflections;
DROP POLICY IF EXISTS "Users can insert their own reflections" ON public.reflections;
DROP POLICY IF EXISTS "Users can update their own reflections" ON public.reflections;
DROP POLICY IF EXISTS "Users can delete their own reflections" ON public.reflections;

-- Policies for reflections table
CREATE POLICY "Users can view their own reflections" 
ON public.reflections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections" 
ON public.reflections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections" 
ON public.reflections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections" 
ON public.reflections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for tags table
CREATE POLICY "Users can view their own tags" 
ON public.tags 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" 
ON public.tags 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" 
ON public.tags 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for reflection_tags junction table
CREATE POLICY "Users can view their own reflection tags" 
ON public.reflection_tags 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.reflections r 
    WHERE r.id = reflection_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own reflection tags" 
ON public.reflection_tags 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reflections r 
    WHERE r.id = reflection_id AND r.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM public.tags t
    WHERE t.id = tag_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reflection tags" 
ON public.reflection_tags 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.reflections r 
    WHERE r.id = reflection_id AND r.user_id = auth.uid()
  )
);

-- Policies for reflection_metrics table
CREATE POLICY "Users can view their own reflection metrics" 
ON public.reflection_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.reflections r 
    WHERE r.id = reflection_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own reflection metrics" 
ON public.reflection_metrics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reflections r 
    WHERE r.id = reflection_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own reflection metrics" 
ON public.reflection_metrics 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.reflections r 
    WHERE r.id = reflection_id AND r.user_id = auth.uid()
  )
);

-- Policies for monthly_insights table
CREATE POLICY "Users can view their own monthly insights" 
ON public.monthly_insights 
FOR SELECT 
USING (auth.uid() = user_id);

-- Function to check if a user can access a reflection
CREATE OR REPLACE FUNCTION public.can_access_reflection(reflection_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.reflections r 
    WHERE r.id = reflection_id 
    AND r.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can access a tag
CREATE OR REPLACE FUNCTION public.can_access_tag(tag_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.tags t 
    WHERE t.id = tag_id 
    AND t.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE 
ON ALL TABLES IN SCHEMA public 
TO authenticated;

-- Enable RLS on all sequences
ALTER TABLE public.reflections ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.tags ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Create indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS reflections_user_id_idx ON public.reflections(user_id);
CREATE INDEX IF NOT EXISTS tags_user_id_idx ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS reflection_tags_reflection_id_idx ON public.reflection_tags(reflection_id);
CREATE INDEX IF NOT EXISTS reflection_metrics_reflection_id_idx ON public.reflection_metrics(reflection_id);
CREATE INDEX IF NOT EXISTS monthly_insights_user_id_idx ON public.monthly_insights(user_id);

-- Add comments for documentation
COMMENT ON TABLE public.reflections IS 'User reflections with emotional context and content';
COMMENT ON TABLE public.tags IS 'Tags for categorizing reflections';
COMMENT ON TABLE public.reflection_tags IS 'Junction table for many-to-many relationship between reflections and tags';
COMMENT ON TABLE public.reflection_metrics IS 'Quantitative metrics for reflections';
COMMENT ON TABLE public.monthly_insights IS 'Aggregated insights generated from monthly reflection data';

-- Notify the application that RLS is configured
NOTIFY pgrst, 'reload schema';
