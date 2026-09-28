-- Admin triage fields for SHIFT applications: payment confirmation
-- (PromptPay slip checked on LINE) and a free-text admin note.
-- Additive and idempotent: safe to apply straight to production.

ALTER TABLE public.shift_applications
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS admin_note TEXT NULL;
