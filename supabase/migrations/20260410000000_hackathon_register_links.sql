-- One-time registration links that bypass closed registration
CREATE TABLE IF NOT EXISTS public.hackathon_register_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  note TEXT, -- optional label for admin reference
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID REFERENCES public.hackathon_participants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- optional expiry; NULL means no expiry
);
