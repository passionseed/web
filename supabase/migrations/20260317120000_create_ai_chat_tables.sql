-- =====================================================
-- AI CHAT SYSTEM - Database Tables
-- Stores conversation history and tracks objective completion
-- =====================================================

-- Chat sessions table
CREATE TABLE IF NOT EXISTS public.path_ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES public.path_activity_progress(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.path_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress tracking
  objective TEXT NOT NULL,
  completion_percentage INT NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  total_messages INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure one session per activity progress
  UNIQUE(progress_id)
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS public.path_ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.path_ai_chat_sessions(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Index for fast retrieval
  CONSTRAINT path_ai_chat_messages_session_id_idx
    FOREIGN KEY (session_id)
    REFERENCES public.path_ai_chat_sessions(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_progress_id
  ON public.path_ai_chat_sessions(progress_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id
  ON public.path_ai_chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id
  ON public.path_ai_chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at
  ON public.path_ai_chat_messages(session_id, created_at);

-- Trigger to update session message count
CREATE OR REPLACE FUNCTION update_ai_chat_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.path_ai_chat_sessions
    SET
      total_messages = total_messages + 1,
      updated_at = now()
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.path_ai_chat_sessions
    SET
      total_messages = GREATEST(0, total_messages - 1),
      updated_at = now()
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_chat_message_count_trigger
AFTER INSERT OR DELETE ON public.path_ai_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_ai_chat_session_message_count();

-- RLS Policies
ALTER TABLE public.path_ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own chat sessions
CREATE POLICY "Users can view their own chat sessions"
  ON public.path_ai_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
  ON public.path_ai_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON public.path_ai_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can read/write messages in their sessions
CREATE POLICY "Users can view their own chat messages"
  ON public.path_ai_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.path_ai_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions"
  ON public.path_ai_chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.path_ai_chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE public.path_ai_chat_sessions IS 'AI chat sessions for PathLab activities with objective tracking';
COMMENT ON TABLE public.path_ai_chat_messages IS 'Individual messages in AI chat sessions';
COMMENT ON COLUMN public.path_ai_chat_sessions.completion_percentage IS 'Progress towards objective (0-100%)';
COMMENT ON COLUMN public.path_ai_chat_sessions.objective IS 'Goal that defines chat completion';
