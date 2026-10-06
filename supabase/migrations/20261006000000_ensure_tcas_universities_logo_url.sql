-- 20260504000000_add_university_logos.sql is recorded as applied in the remote
-- migration history, but the column never actually landed in production
-- (queries failed with 42703 "column tcas_universities.logo_url does not exist").
-- Re-apply the same idempotent statements under a new version so db push runs them.

ALTER TABLE public.tcas_universities
ADD COLUMN IF NOT EXISTS logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_tcas_universities_logo_url ON tcas_universities(logo_url);
