-- Add instructor comment fields to team_node_progress table

-- Add columns for instructor comments
ALTER TABLE public.team_node_progress 
  ADD COLUMN IF NOT EXISTS instructor_comment TEXT,
  ADD COLUMN IF NOT EXISTS instructor_comment_at TIMESTAMPTZ;

-- Add index for instructor comments
CREATE INDEX IF NOT EXISTS idx_team_node_progress_instructor_comment_at 
  ON team_node_progress(instructor_comment_at) 
  WHERE instructor_comment_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN team_node_progress.instructor_comment IS 'Comments from instructors about team progress on this node';
COMMENT ON COLUMN team_node_progress.instructor_comment_at IS 'When the instructor comment was last updated';

-- Update RLS policy to allow instructors to add comments
CREATE POLICY "Instructors can add comments to team progress" ON team_node_progress
  FOR UPDATE USING (
    auth.uid() IS NULL OR -- Allow database triggers
    EXISTS (
      SELECT 1 FROM classroom_teams ct
      JOIN classroom_memberships cm ON cm.classroom_id = ct.classroom_id
      WHERE ct.id = team_node_progress.team_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('instructor', 'ta')
    )
  );

-- Optional: Create separate table for comment history (for future use)
CREATE TABLE IF NOT EXISTS public.team_progress_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES classroom_teams(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for the comments table
CREATE INDEX IF NOT EXISTS idx_team_progress_comments_team ON team_progress_comments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_progress_comments_node ON team_progress_comments(node_id);
CREATE INDEX IF NOT EXISTS idx_team_progress_comments_instructor ON team_progress_comments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_team_progress_comments_created_at ON team_progress_comments(created_at);

-- Enable RLS on comments table
ALTER TABLE team_progress_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments table
CREATE POLICY "Team members can view comments on their team progress" ON team_progress_comments
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Instructors can view and manage all team progress comments" ON team_progress_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classroom_teams ct
      JOIN classroom_memberships cm ON cm.classroom_id = ct.classroom_id
      WHERE ct.id = team_progress_comments.team_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('instructor', 'ta')
    )
  );

-- Add comments for documentation
COMMENT ON TABLE team_progress_comments IS 'Stores instructor comments on team progress for specific nodes';
COMMENT ON COLUMN team_progress_comments.team_id IS 'Reference to the team this comment is about';
COMMENT ON COLUMN team_progress_comments.node_id IS 'Reference to the learning map node this comment is about';
COMMENT ON COLUMN team_progress_comments.instructor_id IS 'Reference to the instructor who made the comment';
COMMENT ON COLUMN team_progress_comments.comment IS 'The instructor comment text';