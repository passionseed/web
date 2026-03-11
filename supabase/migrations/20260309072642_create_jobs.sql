-- Migration: Create jobs table (placeholder to fix broken migration chain)
-- Created: 2026-03-10

CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    company TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read jobs" ON public.jobs FOR SELECT TO authenticated, anon USING (true);
