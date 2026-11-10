-- SHIFT applications: PDPA parent consent for applicants under 20.
--
-- The apply form now asks for a birth date. Under 20 (Thai age of majority,
-- PDPA s.20) it also asks for a parent email; the parent gets a private link
-- (/shift/parent/{token}) and agrees by typing their full name, which is kept
-- with the time, IP and browser as the record of their electronic signature.
-- Admins cannot mark an applicant paid until a required parent has agreed.
-- AI progress tracking (SeedStack) is a separate, optional tick: enrollment
-- never depends on it (PDPA s.19), so it gets its own columns.
--
-- Rows from before this have no consent_notice_version and are not gated.
-- parent_contact becomes optional: applicants aged 20+ need no parent.
-- Additive, nullable and idempotent. RLS on the table is unchanged (admin-only).

ALTER TABLE public.shift_applications
  ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
  ADD COLUMN IF NOT EXISTS consent_notice_version TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_email TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_token_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_email_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS parent_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_relationship TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_consented_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS parent_declined_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS parent_withdrawn_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS parent_consent_ip TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_consent_user_agent TEXT NULL,
  ADD COLUMN IF NOT EXISTS parent_ai_consented_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS parent_ai_notice_version TEXT NULL;

ALTER TABLE public.shift_applications
  ALTER COLUMN parent_contact DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_applications_parent_token_hash
  ON public.shift_applications(parent_token_hash)
  WHERE parent_token_hash IS NOT NULL;

COMMENT ON COLUMN public.shift_applications.birth_date IS 'Applicant birth date; under 20 needs parent consent (PDPA s.20)';
COMMENT ON COLUMN public.shift_applications.consent_notice_version IS 'SHIFT privacy notice version shown at apply time; null on rows before 2026-10-29';
COMMENT ON COLUMN public.shift_applications.parent_token_hash IS 'sha256 of the parent consent link token; the raw token is only emailed';
COMMENT ON COLUMN public.shift_applications.parent_name IS 'Full name the parent typed as their electronic signature';
COMMENT ON COLUMN public.shift_applications.parent_consent_ip IS 'IP the parent answered from, kept as evidence of the signature';
COMMENT ON COLUMN public.shift_applications.parent_ai_consented_at IS 'Parent also agreed to AI progress tracking (SeedStack); optional, separate from enrollment';
COMMENT ON COLUMN public.shift_applications.parent_ai_notice_version IS 'SeedStack notice version the parent saw when agreeing to AI tracking';
