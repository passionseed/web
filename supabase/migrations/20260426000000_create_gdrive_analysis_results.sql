CREATE TABLE IF NOT EXISTS public.gdrive_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  
  drive_folder_id TEXT NOT NULL,
  drive_folder_url TEXT,
  
  extracted_content JSONB NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  evidence_quality TEXT CHECK (evidence_quality IN ('strong', 'moderate', 'weak', 'none')),
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  gaps TEXT[],
  red_flags TEXT[],
  evidence_summary JSONB,
  
  files_analyzed JSONB,
  total_files INTEGER DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'viewed', 'archived')),
  
  triggered_by UUID REFERENCES auth.users(id),
  viewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  admin_override JSONB,
  
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gdrive_analysis_team ON public.gdrive_analysis_results(team_id);
CREATE INDEX idx_gdrive_analysis_activity ON public.gdrive_analysis_results(activity_id);
CREATE INDEX idx_gdrive_analysis_status ON public.gdrive_analysis_results(status);

ALTER TABLE public.gdrive_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all analysis"
  ON public.gdrive_analysis_results FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'instructor')
  ));

CREATE POLICY "Admins can insert analysis"
  ON public.gdrive_analysis_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'instructor')
  ));

CREATE POLICY "Admins can update analysis"
  ON public.gdrive_analysis_results FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'instructor')
  ));
