-- =====================================================
-- NPC CONVERSATION SYSTEM - Database Tables
-- Supports branching conversation trees with NPCs
-- Question Tree Event (QTE) system for PathLab
-- =====================================================

-- =====================================================
-- NPC CONVERSATIONS TABLE
-- Root table for conversation trees
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_npc_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID NOT NULL REFERENCES public.seeds(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,

  -- Starting point
  root_node_id UUID,  -- References path_npc_conversation_nodes.id (set after nodes created)

  -- Metadata
  estimated_minutes INT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_npc_conversations_seed ON public.path_npc_conversations(seed_id);
CREATE INDEX idx_npc_conversations_creator ON public.path_npc_conversations(created_by);

COMMENT ON TABLE public.path_npc_conversations IS 'Root container for NPC conversation trees';
COMMENT ON COLUMN public.path_npc_conversations.root_node_id IS 'Starting node of the conversation tree';

-- =====================================================
-- NPC CONVERSATION NODES TABLE
-- Individual conversation nodes (questions, statements, endings)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_npc_conversation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.path_npc_conversations(id) ON DELETE CASCADE,

  -- NPC speaking this node
  npc_avatar_id UUID REFERENCES public.seed_npc_avatars(id) ON DELETE SET NULL,

  -- Node content
  node_type TEXT NOT NULL CHECK (node_type IN ('question', 'statement', 'end')),
  text_content TEXT NOT NULL,

  -- Display settings
  title TEXT,  -- Optional short title for the node

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- Can store additional data like emotion, urgency, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_npc_nodes_conversation ON public.path_npc_conversation_nodes(conversation_id);
CREATE INDEX idx_npc_nodes_npc_avatar ON public.path_npc_conversation_nodes(npc_avatar_id);
CREATE INDEX idx_npc_nodes_type ON public.path_npc_conversation_nodes(node_type);

COMMENT ON TABLE public.path_npc_conversation_nodes IS 'Individual nodes in the conversation tree - questions, statements, or endings';
COMMENT ON COLUMN public.path_npc_conversation_nodes.node_type IS 'question: asks user to choose, statement: NPC speaks and auto-continues, end: conversation terminal';
COMMENT ON COLUMN public.path_npc_conversation_nodes.metadata IS 'Additional node data: emotion (happy, sad, neutral), urgency, background_color, etc.';

-- =====================================================
-- NPC CONVERSATION CHOICES TABLE
-- User choice options that branch the conversation
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_npc_conversation_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID NOT NULL REFERENCES public.path_npc_conversation_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES public.path_npc_conversation_nodes(id) ON DELETE SET NULL,

  -- Choice content
  choice_text TEXT NOT NULL,
  choice_label TEXT,  -- Optional short label (Q1, Q2, A, B, etc.)

  -- Display order
  display_order INT NOT NULL DEFAULT 0,

  -- Optional conditions for showing this choice
  conditions JSONB,  -- Can store conditions like: {"requires_previous_choice": "choice_id"}

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- Can store choice effects, points, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(from_node_id, display_order)
);

CREATE INDEX idx_npc_choices_from_node ON public.path_npc_conversation_choices(from_node_id);
CREATE INDEX idx_npc_choices_to_node ON public.path_npc_conversation_choices(to_node_id);
CREATE INDEX idx_npc_choices_order ON public.path_npc_conversation_choices(from_node_id, display_order);

COMMENT ON TABLE public.path_npc_conversation_choices IS 'User choice options that create branches in the conversation';
COMMENT ON COLUMN public.path_npc_conversation_choices.choice_label IS 'Short label for UI display (e.g., "Q1", "Q2", "Option A")';
COMMENT ON COLUMN public.path_npc_conversation_choices.conditions IS 'Optional conditions for displaying this choice based on previous selections';
COMMENT ON COLUMN public.path_npc_conversation_choices.metadata IS 'Additional choice data: personality_affect, relationship_points, etc.';

-- =====================================================
-- NPC CONVERSATION PROGRESS TABLE
-- Track user progress through conversations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_npc_conversation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES public.path_activity_progress(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.path_npc_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Current state
  current_node_id UUID REFERENCES public.path_npc_conversation_nodes(id) ON DELETE SET NULL,

  -- Progress tracking
  visited_node_ids UUID[] DEFAULT ARRAY[]::UUID[],
  choice_history JSONB DEFAULT '[]'::jsonb,  -- Array of {from_node_id, choice_id, to_node_id, timestamp}

  -- Completion
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(progress_id)  -- One conversation session per activity progress
);

CREATE INDEX idx_npc_progress_conversation ON public.path_npc_conversation_progress(conversation_id);
CREATE INDEX idx_npc_progress_user ON public.path_npc_conversation_progress(user_id);
CREATE INDEX idx_npc_progress_current_node ON public.path_npc_conversation_progress(current_node_id);
CREATE INDEX idx_npc_progress_completed ON public.path_npc_conversation_progress(is_completed);

COMMENT ON TABLE public.path_npc_conversation_progress IS 'User progress through NPC conversations';
COMMENT ON COLUMN public.path_npc_conversation_progress.visited_node_ids IS 'Array of all node IDs the user has visited';
COMMENT ON COLUMN public.path_npc_conversation_progress.choice_history IS 'Ordered array of choices made: [{from_node_id, choice_id, to_node_id, timestamp}, ...]';

-- =====================================================
-- PATH CONTENT - Add npc_chat content type
-- =====================================================

-- Drop the existing check constraint
ALTER TABLE public.path_content
  DROP CONSTRAINT IF EXISTS path_content_content_type_check;

-- Add updated check constraint with npc_chat included
ALTER TABLE public.path_content
  ADD CONSTRAINT path_content_content_type_check
  CHECK (content_type IN (
    -- Inherited from nodes
    'video',
    'short_video',
    'canva_slide',
    'text',
    'image',
    'pdf',
    'resource_link',
    'order_code',
    -- PathLab-specific content types
    'daily_prompt',
    'reflection_card',
    'emotion_check',
    'progress_snapshot',
    'ai_chat',
    'npc_chat'  -- NEW: Scripted conversation with NPCs
  ));

-- =====================================================
-- PATH ACTIVITIES - Add npc_dialogue activity type
-- =====================================================

-- Drop the existing check constraint
ALTER TABLE public.path_activities
  DROP CONSTRAINT IF EXISTS path_activities_activity_type_check;

-- Add updated check constraint with npc_dialogue included
ALTER TABLE public.path_activities
  ADD CONSTRAINT path_activities_activity_type_check
  CHECK (activity_type IN (
    'learning',
    'reflection',
    'milestone',
    'checkpoint',
    'journal_prompt',
    'ai_chat',
    'npc_dialogue'  -- NEW: Interactive NPC conversation activity
  ));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamp trigger
CREATE TRIGGER npc_conversations_updated_at
  BEFORE UPDATE ON public.path_npc_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_path_content_updated_at();

CREATE TRIGGER npc_conversation_progress_updated_at
  BEFORE UPDATE ON public.path_npc_conversation_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_path_content_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.path_npc_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_npc_conversation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_npc_conversation_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_npc_conversation_progress ENABLE ROW LEVEL SECURITY;

-- Conversations: Anyone can read, creators can manage
CREATE POLICY "Anyone can view NPC conversations"
  ON public.path_npc_conversations FOR SELECT
  USING (true);

CREATE POLICY "Creators can insert NPC conversations"
  ON public.path_npc_conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their NPC conversations"
  ON public.path_npc_conversations FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their NPC conversations"
  ON public.path_npc_conversations FOR DELETE
  USING (auth.uid() = created_by);

-- Admins can manage all conversations
CREATE POLICY "Admins can manage all NPC conversations"
  ON public.path_npc_conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Nodes: Anyone can read, creators can manage via conversation
CREATE POLICY "Anyone can view NPC conversation nodes"
  ON public.path_npc_conversation_nodes FOR SELECT
  USING (true);

CREATE POLICY "Conversation creators can insert nodes"
  ON public.path_npc_conversation_nodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.path_npc_conversations
      WHERE id = conversation_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Conversation creators can update nodes"
  ON public.path_npc_conversation_nodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.path_npc_conversations
      WHERE id = conversation_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Conversation creators can delete nodes"
  ON public.path_npc_conversation_nodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.path_npc_conversations
      WHERE id = conversation_id AND created_by = auth.uid()
    )
  );

-- Choices: Anyone can read, creators can manage via conversation
CREATE POLICY "Anyone can view NPC conversation choices"
  ON public.path_npc_conversation_choices FOR SELECT
  USING (true);

CREATE POLICY "Conversation creators can insert choices"
  ON public.path_npc_conversation_choices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.path_npc_conversation_nodes nodes
      JOIN public.path_npc_conversations conv ON conv.id = nodes.conversation_id
      WHERE nodes.id = from_node_id AND conv.created_by = auth.uid()
    )
  );

CREATE POLICY "Conversation creators can update choices"
  ON public.path_npc_conversation_choices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.path_npc_conversation_nodes nodes
      JOIN public.path_npc_conversations conv ON conv.id = nodes.conversation_id
      WHERE nodes.id = from_node_id AND conv.created_by = auth.uid()
    )
  );

CREATE POLICY "Conversation creators can delete choices"
  ON public.path_npc_conversation_choices FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.path_npc_conversation_nodes nodes
      JOIN public.path_npc_conversations conv ON conv.id = nodes.conversation_id
      WHERE nodes.id = from_node_id AND conv.created_by = auth.uid()
    )
  );

-- Progress: Users can only view/manage their own progress
CREATE POLICY "Users can view their own conversation progress"
  ON public.path_npc_conversation_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation progress"
  ON public.path_npc_conversation_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation progress"
  ON public.path_npc_conversation_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation progress"
  ON public.path_npc_conversation_progress FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTION - Get conversation tree
-- =====================================================

-- Function to retrieve full conversation tree
CREATE OR REPLACE FUNCTION get_npc_conversation_tree(conversation_uuid UUID)
RETURNS TABLE (
  conversation JSONB,
  nodes JSONB,
  choices JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_jsonb(c.*) AS conversation,
    COALESCE(jsonb_agg(DISTINCT n.*) FILTER (WHERE n.id IS NOT NULL), '[]'::jsonb) AS nodes,
    COALESCE(jsonb_agg(DISTINCT ch.*) FILTER (WHERE ch.id IS NOT NULL), '[]'::jsonb) AS choices
  FROM path_npc_conversations c
  LEFT JOIN path_npc_conversation_nodes n ON n.conversation_id = c.id
  LEFT JOIN path_npc_conversation_choices ch ON ch.from_node_id = n.id
  WHERE c.id = conversation_uuid
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_npc_conversation_tree IS 'Retrieves complete conversation tree with all nodes and choices';
