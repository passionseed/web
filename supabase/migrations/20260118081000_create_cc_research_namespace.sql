-- Community College research pipeline tables

CREATE TABLE IF NOT EXISTS public.cc_research_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    title text NOT NULL,
    goal text,
    state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'active', 'paused', 'completed', 'archived')),
    filters jsonb NOT NULL DEFAULT '{}'::jsonb,
    active_weights jsonb NOT NULL DEFAULT '{"studentScale":25,"advisorStaffing":25,"careerTransitionLanguage":20,"transferSignals":15,"easeOfContact":15}'::jsonb,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_research_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES public.cc_research_campaigns(id) ON DELETE CASCADE,
    institution_name text NOT NULL,
    institution_website text NOT NULL,
    geography text,
    student_count integer,
    tuition numeric(12,2),
    program_tags text[],
    notes text,
    score_total numeric(8,2) DEFAULT 0,
    score_breakdown jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'seeded' CHECK (
      status IN (
        'seeded',
        'enriched',
        'scored',
        'outreach_ready',
        'emailed',
        'linkedIned',
        'replied',
        'no_response',
        'interviewed',
        'blocked',
        'disqualified'
      )
    ),
    decision_makers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    decision_maker_count integer NOT NULL DEFAULT 0,
    source text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (campaign_id, institution_website)
);

CREATE TABLE IF NOT EXISTS public.cc_research_contacts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid NOT NULL REFERENCES public.cc_research_leads(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    role text,
    email text,
    linkedin_url text,
    verified boolean DEFAULT false,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_research_outreach (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid NOT NULL REFERENCES public.cc_research_leads(id) ON DELETE CASCADE,
    channel text NOT NULL CHECK (channel IN ('email', 'linkedin')),
    subject_a text,
    subject_b text,
    message text NOT NULL,
    sent_at timestamptz,
    response_at timestamptz,
    response_type text,
    next_action text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_research_interviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id uuid NOT NULL REFERENCES public.cc_research_leads(id) ON DELETE CASCADE,
    persona text NOT NULL,
    contact_name text,
    contact_role text,
    scheduled_at timestamptz,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'reschedule')),
    outcome text,
    pain_theme_tags text[],
    notes text,
    recording_link text,
    raw_transcript_snippet text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cc_research_feedback_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES public.cc_research_campaigns(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.cc_research_leads(id) ON DELETE CASCADE,
    segment_key text,
    outcome text NOT NULL,
    objection_reason text,
    score_snapshot_json jsonb,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- RLS: CC research tables are team internal only
ALTER TABLE public.cc_research_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_research_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_research_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_research_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_research_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_research_feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_research_campaigns_select_team" ON public.cc_research_campaigns
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_campaigns_modify_team" ON public.cc_research_campaigns
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_leads_select_team" ON public.cc_research_leads
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_leads_modify_team" ON public.cc_research_leads
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_contacts_select_team" ON public.cc_research_contacts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_contacts_modify_team" ON public.cc_research_contacts
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_outreach_select_team" ON public.cc_research_outreach
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_outreach_modify_team" ON public.cc_research_outreach
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_interviews_select_team" ON public.cc_research_interviews
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_interviews_modify_team" ON public.cc_research_interviews
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_feedback_events_select_team" ON public.cc_research_feedback_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE POLICY "cc_research_feedback_events_modify_team" ON public.cc_research_feedback_events
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'passion-seed-team'
));

CREATE INDEX IF NOT EXISTS idx_cc_research_leads_campaign_status ON public.cc_research_leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_cc_research_leads_geography ON public.cc_research_leads(geography);
CREATE INDEX IF NOT EXISTS idx_cc_research_outreach_lead ON public.cc_research_outreach(lead_id, channel);
CREATE INDEX IF NOT EXISTS idx_cc_research_interviews_lead ON public.cc_research_interviews(lead_id);
CREATE INDEX IF NOT EXISTS idx_cc_research_feedback_campaign ON public.cc_research_feedback_events(campaign_id);

CREATE TRIGGER update_cc_research_campaigns_updated_at
    BEFORE UPDATE ON public.cc_research_campaigns
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_cc_research_leads_updated_at
    BEFORE UPDATE ON public.cc_research_leads
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_cc_research_contacts_updated_at
    BEFORE UPDATE ON public.cc_research_contacts
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_cc_research_outreach_updated_at
    BEFORE UPDATE ON public.cc_research_outreach
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_cc_research_interviews_updated_at
    BEFORE UPDATE ON public.cc_research_interviews
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
