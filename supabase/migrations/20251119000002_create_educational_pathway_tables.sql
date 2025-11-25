-- Create educational pathway tables for university selection and AI roadmap system

-- Universities table (admin managed)
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  short_name text,
  country text NOT NULL DEFAULT 'United States',
  state text,
  city text,
  website_url text,
  logo_url text,
  description text,
  admission_requirements text, -- Simple text field for requirements
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User university selections (high school students choose top 3)
CREATE TABLE IF NOT EXISTS public.user_university_targets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id uuid REFERENCES public.universities(id) ON DELETE CASCADE,
  priority_rank integer NOT NULL CHECK (priority_rank BETWEEN 1 AND 3),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, priority_rank),
  UNIQUE(user_id, university_id)
);

-- User interests with priority ranking
CREATE TABLE IF NOT EXISTS public.user_interest_priorities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_name text NOT NULL,
  priority_rank integer NOT NULL CHECK (priority_rank > 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, priority_rank)
);

-- AI generated roadmaps
CREATE TABLE IF NOT EXISTS public.ai_roadmaps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vision_statement text NOT NULL,
  top_university_id uuid REFERENCES public.universities(id),
  primary_interest text NOT NULL,
  roadmap_data jsonb NOT NULL, -- Major milestones stored as JSON
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_university_targets_user_id ON public.user_university_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interest_priorities_user_id ON public.user_interest_priorities(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_roadmaps_user_id ON public.ai_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_universities_country_state ON public.universities(country, state);

-- Add RLS policies
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_university_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interest_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_roadmaps ENABLE ROW LEVEL SECURITY;

-- Universities are readable by all authenticated users
CREATE POLICY "Universities are viewable by authenticated users" ON public.universities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only manage their own targets
CREATE POLICY "Users can manage their own university targets" ON public.user_university_targets
  FOR ALL USING (auth.uid() = user_id);

-- Users can only manage their own interests
CREATE POLICY "Users can manage their own interest priorities" ON public.user_interest_priorities
  FOR ALL USING (auth.uid() = user_id);

-- Users can only manage their own roadmaps
CREATE POLICY "Users can manage their own roadmaps" ON public.ai_roadmaps
  FOR ALL USING (auth.uid() = user_id);

-- Admin policies for universities (simplified for now - will add proper admin check later)
CREATE POLICY "Admins can manage universities" ON public.universities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update universities" ON public.universities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete universities" ON public.universities
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON public.universities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_university_targets_updated_at BEFORE UPDATE ON public.user_university_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_interest_priorities_updated_at BEFORE UPDATE ON public.user_interest_priorities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_roadmaps_updated_at BEFORE UPDATE ON public.ai_roadmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();