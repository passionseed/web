-- AI Chat Sessions and Messages for Objective Tracking
-- Stores chat sessions with automatic progress analysis

-- Sessions table: Tracks overall conversation progress
CREATE TABLE path_ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID REFERENCES path_activity_progress(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES path_activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Objective tracking
  objective TEXT NOT NULL,
  completion_percentage INT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Metadata
  total_messages INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table: Individual conversation messages
CREATE TABLE path_ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES path_ai_chat_sessions(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_chat_sessions_progress ON path_ai_chat_sessions(progress_id);
CREATE INDEX idx_ai_chat_sessions_user ON path_ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_messages_session ON path_ai_chat_messages(session_id);

-- RLS Policies
ALTER TABLE path_ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE path_ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Students can manage their own sessions
CREATE POLICY "Students can view own AI chat sessions"
  ON path_ai_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own AI chat sessions"
  ON path_ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own AI chat sessions"
  ON path_ai_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Students can manage messages in their sessions
CREATE POLICY "Students can view messages in own sessions"
  ON path_ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM path_ai_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert messages in own sessions"
  ON path_ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM path_ai_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_chat_session_updated_at
  BEFORE UPDATE ON path_ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_chat_session_updated_at();
