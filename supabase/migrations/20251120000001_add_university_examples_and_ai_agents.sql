-- Add university example journey maps and AI agents archive
-- This allows admins to create reference journey maps for each university
-- and manage AI prompts/agents used throughout the system

-- University Example Journey Maps
CREATE TABLE IF NOT EXISTS public.university_example_maps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id uuid REFERENCES public.universities(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    target_audience text, -- e.g., "Game Development", "AI/ML", "General STEM"
    example_data jsonb NOT NULL, -- Stores the journey map structure
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- AI Agents Archive  
CREATE TABLE IF NOT EXISTS public.ai_agents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    use_case text NOT NULL, -- e.g., "roadmap_generation", "north_star_refinement"
    category text NOT NULL DEFAULT 'general', -- e.g., "educational", "journey_planning", "content_generation"
    system_prompt text NOT NULL,
    user_prompt_template text,
    model_config jsonb DEFAULT '{}' NOT NULL, -- temperature, top_p, etc.
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_used_at timestamptz
);

-- Indexes for better performance
CREATE INDEX idx_university_example_maps_university_id ON public.university_example_maps(university_id);
CREATE INDEX idx_university_example_maps_target_audience ON public.university_example_maps(target_audience);
CREATE INDEX idx_ai_agents_use_case ON public.ai_agents(use_case);
CREATE INDEX idx_ai_agents_category ON public.ai_agents(category);
CREATE INDEX idx_ai_agents_is_active ON public.ai_agents(is_active);

-- Row Level Security (RLS)
ALTER TABLE public.university_example_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for university_example_maps
CREATE POLICY "Anyone can view university example maps" ON public.university_example_maps
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage university example maps" ON public.university_example_maps
    FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for ai_agents  
CREATE POLICY "Anyone can view active AI agents" ON public.ai_agents
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage AI agents" ON public.ai_agents
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default AI agents for current system
INSERT INTO public.ai_agents (name, description, use_case, category, system_prompt, user_prompt_template) VALUES 
(
    'Educational Roadmap Generator',
    'Generates 3-year educational roadmaps for high school students based on their university goals and interests',
    'roadmap_generation',
    'educational',
    'You are an expert educational counselor with 15 years of experience helping high school students get into top universities. Create realistic, actionable 3-year roadmaps that maximize admission chances while considering the student''s interests and target university requirements.',
    'Create a detailed 3-year roadmap for a student with this profile:

Vision: "{vision_statement}"
Target University: {university_name}
Primary Interest: {primary_interest}
Secondary Interests: {secondary_interests}
University Requirements: {university_requirements}

Generate 6-8 major milestones focusing on:
1. Academic excellence
2. Skill development in their interest area  
3. Leadership and experience opportunities
4. University application preparation

Each milestone should include:
- Specific, measurable title
- Detailed description with concrete actions
- Realistic timeframe
- Category (academic/skill/experience/application)
- Importance level (critical/important/beneficial)'
),
(
    'North Star Goal Refiner',  
    'Refines and enhances North Star goals to be more specific, measurable, and achievable',
    'north_star_refinement',
    'journey_planning',
    'You are a goal-setting expert who helps people transform vague aspirations into clear, actionable North Star goals. Focus on making goals specific, measurable, achievable, relevant, and time-bound while maintaining the user''s passion and motivation.',
    'Refine this North Star goal to be more specific and actionable:

Original Goal: "{original_goal}"
Context: {user_context}
Timeline: {timeline}

Provide:
1. Refined goal statement
2. Key success metrics
3. Major milestone suggestions
4. Potential challenges and solutions'
);

-- Update timestamp trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_university_example_maps_updated_at BEFORE UPDATE ON public.university_example_maps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();