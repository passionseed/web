-- ========================================
-- Migration: Expert Interview System
-- Created: 2026-03-13
-- Description: Tables for expert profiles, interviews, and mentoring
-- ========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- EXPERT PROFILES TABLE
-- ========================================

CREATE TABLE public.expert_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    photo_url TEXT,
    field_category TEXT NOT NULL,
    linkedin_url TEXT,

    interview_session_id TEXT UNIQUE NOT NULL,
    interview_data JSONB NOT NULL DEFAULT '{}',
    interview_transcript JSONB NOT NULL DEFAULT '[]',

    mentoring_preference TEXT NOT NULL DEFAULT 'none'
        CHECK (mentoring_preference IN ('none', 'free', 'paid')),
    booking_url TEXT,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'claimed')),
    admin_notes TEXT,

    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_expert_profiles_status ON public.expert_profiles(status);
CREATE INDEX idx_expert_profiles_user_id ON public.expert_profiles(user_id);
CREATE INDEX idx_expert_profiles_session_id ON public.expert_profiles(interview_session_id);
CREATE INDEX idx_expert_profiles_created_at ON public.expert_profiles(created_at);
CREATE INDEX idx_expert_profiles_field_category ON public.expert_profiles(field_category);

-- ========================================
-- EXPERT PATHLABS TABLE
-- ========================================

CREATE TABLE public.expert_pathlabs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expert_profile_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
    seed_id UUID REFERENCES public.seeds(id) ON DELETE SET NULL,
    path_id UUID REFERENCES public.paths(id) ON DELETE SET NULL,
    generation_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
    generation_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_at TIMESTAMPTZ
);

CREATE INDEX idx_expert_pathlabs_expert_profile ON public.expert_pathlabs(expert_profile_id);
CREATE INDEX idx_expert_pathlabs_seed ON public.expert_pathlabs(seed_id);
CREATE INDEX idx_expert_pathlabs_status ON public.expert_pathlabs(generation_status);

-- ========================================
-- EXPERT INTERVIEW RATE LIMITS TABLE
-- ========================================

CREATE TABLE public.expert_interview_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_hash TEXT NOT NULL,
    hour_bucket TIMESTAMPTZ NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(ip_hash, hour_bucket)
);

CREATE INDEX idx_expert_rate_limits_lookup ON public.expert_interview_rate_limits(ip_hash, hour_bucket);

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.expert_interview_rate_limits
    WHERE hour_bucket < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MENTOR SESSIONS TABLE
-- ========================================

CREATE TABLE public.mentor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    expert_profile_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
    booked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_type TEXT NOT NULL DEFAULT 'free'
        CHECK (session_type IN ('free', 'paid')),
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    notes_from_booker TEXT,
    notes_from_expert TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_sessions_expert ON public.mentor_sessions(expert_profile_id);
CREATE INDEX idx_mentor_sessions_booker ON public.mentor_sessions(booked_by_user_id);
CREATE INDEX idx_mentor_sessions_status ON public.mentor_sessions(status);
CREATE INDEX idx_mentor_sessions_scheduled ON public.mentor_sessions(scheduled_at);

-- ========================================
-- RLS
-- ========================================

ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_pathlabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_interview_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

-- Expert Profiles
CREATE POLICY "public_insert_expert_profiles" ON public.expert_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "public_view_approved_experts" ON public.expert_profiles
    FOR SELECT USING (status = 'approved');

CREATE POLICY "admins_manage_expert_profiles" ON public.expert_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'instructor')
        )
    );

-- Expert PathLabs
CREATE POLICY "public_view_expert_pathlabs" ON public.expert_pathlabs
    FOR SELECT USING (generation_status = 'completed');

CREATE POLICY "admins_manage_expert_pathlabs" ON public.expert_pathlabs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'instructor')
        )
    );

-- Rate Limits (service role only)
CREATE POLICY "service_role_rate_limits" ON public.expert_interview_rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Mentor Sessions
CREATE POLICY "users_view_own_sessions" ON public.mentor_sessions
    FOR SELECT USING (booked_by_user_id = auth.uid());

CREATE POLICY "users_create_sessions" ON public.mentor_sessions
    FOR INSERT WITH CHECK (booked_by_user_id = auth.uid());

CREATE POLICY "experts_view_own_sessions" ON public.mentor_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_profile_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "admins_manage_sessions" ON public.mentor_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ========================================
-- TRIGGERS
-- ========================================

CREATE TRIGGER update_expert_profiles_updated_at
    BEFORE UPDATE ON public.expert_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_sessions_updated_at
    BEFORE UPDATE ON public.mentor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- GRANTS
-- ========================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.expert_profiles TO authenticated, anon;
GRANT ALL ON public.expert_pathlabs TO authenticated, anon;
GRANT ALL ON public.expert_interview_rate_limits TO authenticated, anon;
GRANT ALL ON public.mentor_sessions TO authenticated, anon;

COMMENT ON TABLE public.expert_profiles IS 'Industry experts who contribute career insights via AI interview';
COMMENT ON TABLE public.expert_pathlabs IS 'Links expert profiles to generated PathLab content';
COMMENT ON TABLE public.expert_interview_rate_limits IS 'IP-based rate limiting for unauthenticated interviews';
COMMENT ON TABLE public.mentor_sessions IS 'Booked mentoring sessions between experts and parents/students';
