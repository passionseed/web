-- Create ps_requests table for inter-department request system
CREATE TABLE IF NOT EXISTS ps_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Request details
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'normal', 'low')),
  category TEXT NOT NULL,
  attachment_urls TEXT[], -- Array of attachment URLs
  
  -- Departments involved
  requesting_project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,
  receiving_project_id UUID NOT NULL REFERENCES ps_projects(id) ON DELETE CASCADE,
  
  -- Requester info
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Dates
  date_needed TIMESTAMPTZ NOT NULL,
  date_modified TIMESTAMPTZ, -- Set when acceptor changes the date
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status & Assignment
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed')),
  assigned_to UUID REFERENCES auth.users(id), -- Set when accepted
  assigned_at TIMESTAMPTZ,
  
  -- Rejection
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  
  -- Acceptance
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  
  -- Completion
  completed_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT different_projects CHECK (requesting_project_id != receiving_project_id)
);

-- Indexes for performance
CREATE INDEX idx_ps_requests_requesting ON ps_requests(requesting_project_id);
CREATE INDEX idx_ps_requests_receiving ON ps_requests(receiving_project_id);
CREATE INDEX idx_ps_requests_status ON ps_requests(status);
CREATE INDEX idx_ps_requests_assigned ON ps_requests(assigned_to);
CREATE INDEX idx_ps_requests_date_needed ON ps_requests(date_needed);
CREATE INDEX idx_ps_requests_created_by ON ps_requests(created_by);

-- Enable RLS
ALTER TABLE ps_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Members of either requesting or receiving project can view
CREATE POLICY "Members can view project requests"
  ON ps_requests FOR SELECT
  USING (
    requesting_project_id IN (
      SELECT project_id FROM ps_project_members WHERE user_id = auth.uid()
    )
    OR
    receiving_project_id IN (
      SELECT project_id FROM ps_project_members WHERE user_id = auth.uid()
    )
  );

-- Members of requesting project can create requests
CREATE POLICY "Members can create requests"
  ON ps_requests FOR INSERT
  WITH CHECK (
    requesting_project_id IN (
      SELECT project_id FROM ps_project_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Members of receiving project can update (accept/reject/assign)
CREATE POLICY "Receiving members can update requests"
  ON ps_requests FOR UPDATE
  USING (
    receiving_project_id IN (
      SELECT project_id FROM ps_project_members WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ps_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ps_requests_updated_at
  BEFORE UPDATE ON ps_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ps_requests_updated_at();
