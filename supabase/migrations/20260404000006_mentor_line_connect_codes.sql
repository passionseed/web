CREATE TABLE IF NOT EXISTS public.mentor_line_connect_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  line_user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_line_connect_codes_code_idx ON public.mentor_line_connect_codes(code);
CREATE INDEX IF NOT EXISTS mentor_line_connect_codes_expires_idx ON public.mentor_line_connect_codes(expires_at);
