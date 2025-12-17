CREATE TABLE IF NOT EXISTS public.thailand_admission_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    curriculum_id text,
    curriculum_name_th text,
    curriculum_name_en text,
    university_name_th text,
    level_name_th text,
    total_plan integer,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.thailand_admission_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
DROP POLICY IF EXISTS "Thailand admission plans are viewable by authenticated users" ON public.thailand_admission_plans;
CREATE POLICY "Thailand admission plans are viewable by authenticated users" 
ON public.thailand_admission_plans FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Allow read access to anon users (optional, if needed for public pages)
DROP POLICY IF EXISTS "Thailand admission plans are viewable by anon users" ON public.thailand_admission_plans;
CREATE POLICY "Thailand admission plans are viewable by anon users" 
ON public.thailand_admission_plans FOR SELECT 
TO anon 
USING (true);

-- Policy: Allow insert/update/delete only by service role or specific admins (simplified for now)
DROP POLICY IF EXISTS "Service role can manage thailand admission plans" ON public.thailand_admission_plans;
CREATE POLICY "Service role can manage thailand admission plans" 
ON public.thailand_admission_plans 
TO service_role 
USING (true) 
WITH CHECK (true);
