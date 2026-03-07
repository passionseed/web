CREATE TABLE IF NOT EXISTS beta_registration_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for querying abandoned registrations
CREATE INDEX idx_beta_funnel_status ON beta_registration_funnel(status);
CREATE INDEX idx_beta_funnel_created_at ON beta_registration_funnel(created_at);

-- Enable RLS
ALTER TABLE beta_registration_funnel ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (for tracking)
CREATE POLICY "Allow insert to funnel" ON beta_registration_funnel
  FOR INSERT WITH CHECK (true);

-- Allow updates from anyone (for completion)
CREATE POLICY "Allow update to funnel" ON beta_registration_funnel
  FOR UPDATE USING (true) WITH CHECK (true);

-- Allow select for admin purposes
CREATE POLICY "Allow select from funnel" ON beta_registration_funnel
  FOR SELECT USING (true);
