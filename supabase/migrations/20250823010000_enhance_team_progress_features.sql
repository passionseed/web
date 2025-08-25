-- Enhance team_node_progress with assignment and help features
ALTER TABLE team_node_progress 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS help_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS help_request_message TEXT,
ADD COLUMN IF NOT EXISTS scheduled_meeting_id UUID;

-- Add index for assignment tracking
CREATE INDEX IF NOT EXISTS idx_team_node_progress_assigned ON team_node_progress(assigned_to);
CREATE INDEX IF NOT EXISTS idx_team_node_progress_help ON team_node_progress(help_requested);

-- Create team_meetings table for scheduled help sessions
CREATE TABLE IF NOT EXISTS team_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES classroom_teams(id) ON DELETE CASCADE,
  node_id UUID REFERENCES map_nodes(id) ON DELETE SET NULL,
  scheduled_by UUID NOT NULL REFERENCES auth.users(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_topic TEXT,
  description TEXT,
  meeting_link TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for scheduled meetings
ALTER TABLE team_node_progress 
ADD CONSTRAINT team_node_progress_meeting_fkey 
FOREIGN KEY (scheduled_meeting_id) REFERENCES team_meetings(id) ON DELETE SET NULL;

-- Indexes for team_meetings
CREATE INDEX IF NOT EXISTS idx_team_meetings_team ON team_meetings(team_id);
CREATE INDEX IF NOT EXISTS idx_team_meetings_node ON team_meetings(node_id);
CREATE INDEX IF NOT EXISTS idx_team_meetings_scheduled ON team_meetings(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_team_meetings_status ON team_meetings(status);

-- Function to update meeting updated_at timestamp
CREATE OR REPLACE FUNCTION update_meeting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for meeting updates
CREATE OR REPLACE TRIGGER trigger_update_meeting_timestamp
  BEFORE UPDATE ON team_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_timestamp();

-- Enable RLS for team_meetings
ALTER TABLE team_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_meetings
CREATE POLICY "Team members can view their team's meetings" ON team_meetings
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Instructors can manage all team meetings" ON team_meetings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classroom_teams ct
      JOIN classroom_memberships cm ON cm.classroom_id = ct.classroom_id
      WHERE ct.id = team_meetings.team_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('instructor', 'ta')
    )
  );

CREATE POLICY "Team leaders can manage their team's meetings" ON team_meetings
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND is_leader = true AND left_at IS NULL
    )
  );