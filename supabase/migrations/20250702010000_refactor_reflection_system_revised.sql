-- Step 1: Alter the existing 'projects' table

-- Add user_id, goal, image_url, and link columns
ALTER TABLE public.projects
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN goal TEXT,
ADD COLUMN image_url TEXT,
ADD COLUMN link TEXT;

-- Backfill user_id from the passion_trees table
UPDATE public.projects p
SET user_id = pt.user_id
FROM public.passion_trees pt
WHERE p.passion_tree_id = pt.id;

-- Now that user_id is backfilled, we can set it to NOT NULL
ALTER TABLE public.projects
ALTER COLUMN user_id SET NOT NULL;

-- Drop the now-redundant passion_tree_id column
ALTER TABLE public.projects
DROP COLUMN passion_tree_id;

-- Update RLS policies for the projects table to use the new user_id
-- Drop existing policies if they exist (or alter them)
DROP POLICY IF EXISTS "Users can view their own passion trees" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own passion trees" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own passion trees" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own passion trees" ON public.projects;

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Step 2: Create the 'project_tags' join table
CREATE TABLE public.project_tags (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Enable RLS for project_tags
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_tags
CREATE POLICY "Users can manage tags for their own projects"
  ON public.project_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid()));

-- Step 3: Modify the 'reflections' table
ALTER TABLE public.reflections
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN reason TEXT;

-- Step 4: Modify the 'reflection_metrics' table
ALTER TABLE public.reflection_metrics
RENAME COLUMN engagement TO progress;

-- Step 5: Drop the old 'reflection_tags' table
DROP TABLE public.reflection_tags;
