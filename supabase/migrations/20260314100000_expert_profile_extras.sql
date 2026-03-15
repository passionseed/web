-- Add email, data consent, and claim token fields to expert_profiles
ALTER TABLE public.expert_profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS data_consent_agreed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS claim_token TEXT,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_expert_profiles_email ON public.expert_profiles(email);
CREATE INDEX IF NOT EXISTS idx_expert_profiles_claim_token ON public.expert_profiles(claim_token);
