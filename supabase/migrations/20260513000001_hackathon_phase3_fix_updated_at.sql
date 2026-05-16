-- Fix: add updated_at columns to Phase 3 tables that have handle_updated_at triggers
-- The triggers reference NEW.updated_at but these columns were missing
-- Run immediately after: 20260511000000_hackathon_phase3.sql

-- Add updated_at to hackathon_phase3_cycles (has trigger hackathon_phase3_cycles_updated_at)
ALTER TABLE public.hackathon_phase3_cycles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add updated_at to hackathon_phase3_cycle_steps (has trigger hackathon_phase3_cycle_steps_updated_at)
ALTER TABLE public.hackathon_phase3_cycle_steps
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Also add to other Phase 3 tables that commonly need updated_at for consistency
ALTER TABLE public.hackathon_phase3_test_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.hackathon_phase3_daily_checkins
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.hackathon_phase3_midphase_synthesis
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.hackathon_phase3_ritual_posts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.hackathon_phase3_video_submissions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
