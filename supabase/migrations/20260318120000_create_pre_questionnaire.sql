-- Create pre-questionnaire table
CREATE TABLE IF NOT EXISTS public.pre_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,

  -- Career planning
  uni_strategy TEXT,
  confidence_level TEXT,
  parent_support_level TEXT,
  ideal_success_scenario TEXT,

  -- Learning preferences
  self_learn_enjoyment TEXT,
  ai_proficiency TEXT,
  learning_style TEXT,

  -- Ikigai responses
  what_you_love TEXT,
  what_you_are_good_at TEXT,
  what_you_can_be_paid_for TEXT,
  what_the_world_needs TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pre_questionnaires ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own questionnaires"
  ON public.pre_questionnaires
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questionnaires"
  ON public.pre_questionnaires
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questionnaires"
  ON public.pre_questionnaires
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_pre_questionnaires_updated_at
  BEFORE UPDATE ON public.pre_questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_pre_questionnaires_user_id ON public.pre_questionnaires(user_id);

COMMENT ON TABLE public.pre_questionnaires IS 'Pre-questionnaire responses from students about their career planning and learning preferences';
