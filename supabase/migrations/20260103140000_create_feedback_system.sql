-- Create Feedback System Tables

-- ps_feedback_forms
CREATE TABLE IF NOT EXISTS public.ps_feedback_forms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.ps_projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text, -- Public description
    team_notes text, -- Internal notes
    token uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE, -- Public access token
    is_active boolean DEFAULT true,
    require_auth boolean DEFAULT false, -- If true, user must be logged in
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ps_form_fields
CREATE TABLE IF NOT EXISTS public.ps_form_fields (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES public.ps_feedback_forms(id) ON DELETE CASCADE,
    label text NOT NULL,
    field_type text NOT NULL CHECK (field_type IN ('text', 'long_text', 'rating', 'boolean', 'select')),
    options jsonb, -- For select type
    is_required boolean DEFAULT false,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- ps_submissions
CREATE TABLE IF NOT EXISTS public.ps_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    form_id uuid REFERENCES public.ps_feedback_forms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id), -- Nullable for anon, populated if auth required/provided
    respondent_ip text, -- Optional, for spam prevention? (Not strictly needed)
    internal_rating integer CHECK (internal_rating >= 1 AND internal_rating <= 5),
    internal_notes text,
    created_at timestamptz DEFAULT now()
);

-- ps_submission_answers
CREATE TABLE IF NOT EXISTS public.ps_submission_answers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id uuid REFERENCES public.ps_submissions(id) ON DELETE CASCADE,
    field_id uuid REFERENCES public.ps_form_fields(id) ON DELETE CASCADE,
    answer_text text,
    answer_number numeric, -- For rating
    answer_boolean boolean,
    created_at timestamptz DEFAULT now()
);

-- ps_feedback_task_links
CREATE TABLE IF NOT EXISTS public.ps_feedback_task_links (
    submission_id uuid REFERENCES public.ps_submissions(id) ON DELETE CASCADE,
    task_id uuid REFERENCES public.ps_tasks(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (submission_id, task_id)
);

-- Triggers
CREATE TRIGGER update_ps_feedback_forms_updated_at
    BEFORE UPDATE ON public.ps_feedback_forms
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.ps_feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_submission_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_feedback_task_links ENABLE ROW LEVEL SECURITY;

-- Policies

-- ps_feedback_forms
-- Public read access via token (TODO: Might need a function or separate logic, but simple READ is acceptable if ID is known? No, we filter by token usually)
-- Actually, strict RLS: anon can read if they have the token? But typically we query by token.
-- Let's allow public read for active forms to facilitate the public page.
CREATE POLICY "Public read active forms" ON public.ps_feedback_forms
    FOR SELECT
    USING (is_active = true); -- Basic public access. We rely on the random token in URL for obscurity if needed, but 'public' implies public.

CREATE POLICY "Team full access forms" ON public.ps_feedback_forms
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

-- ps_form_fields
CREATE POLICY "Public read fields of active forms" ON public.ps_form_fields
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ps_feedback_forms
            WHERE id = ps_form_fields.form_id
            AND is_active = true
        )
    );

CREATE POLICY "Team full access fields" ON public.ps_form_fields
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

-- ps_submissions
-- Public INSERT policy (Anonymous)
CREATE POLICY "Public insert submissions" ON public.ps_submissions
    FOR INSERT
    WITH CHECK (true); -- Anyone can submit. Note: Need to validate form_id validity in app logic or trigger if strictly enforcing 'active' form here.

-- Authenticated Users INSERT (e.g., students)
-- Included in public insert usually, but if we want to restrict based on 'require_auth' in DB, it's complex in RLS.
-- Easier to enforce in App Layer: if require_auth, ensure auth.uid() is present.

CREATE POLICY "Team read submissions" ON public.ps_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Team update submissions" ON public.ps_submissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );
-- Submissions deletion? Typically team only.
CREATE POLICY "Team delete submissions" ON public.ps_submissions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );
-- Users can read their own submissions? Maybe later.

-- ps_submission_answers
CREATE POLICY "Public insert answers" ON public.ps_submission_answers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ps_submissions
            WHERE id = submission_id
            -- And that submission was just created? Hard to track.
            -- Simple 'true' for insert is easiest for public forms.
        )
    );

CREATE POLICY "Team read answers" ON public.ps_submission_answers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

-- ps_feedback_task_links
CREATE POLICY "Team full access links" ON public.ps_feedback_task_links
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );
