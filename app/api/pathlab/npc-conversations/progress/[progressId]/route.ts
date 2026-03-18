import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  NPCConversationProgressResponse,
  NPCConversationNodeWithChoices,
  NPCConversationChoice,
} from '@/types/npc-conversations';

/**
 * GET /api/pathlab/npc-conversations/progress/:progressId
 * Fetches user's conversation progress and current state
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ progressId: string }> }
) {
  try {
    const { progressId } = await context.params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch or create conversation progress
    const { data: existingProgress } = await supabase
      .from('path_npc_conversation_progress')
      .select(
        `
        *,
        conversation:path_npc_conversations(*)
      `
      )
      .eq('progress_id', progressId)
      .eq('user_id', user.id)
      .single();

    let progress = existingProgress;

    // If no progress exists, we need to get the activity's conversation_id
    if (!progress) {
      // Get the activity progress to find conversation_id
      const { data: activityProgress } = await supabase
        .from('path_activity_progress')
        .select(
          `
          *,
          activity:path_activities(
            *,
            path_content(*)
          )
        `
        )
        .eq('id', progressId)
        .single();

      if (!activityProgress) {
        return NextResponse.json(
          { error: 'Activity progress not found' },
          { status: 404 }
        );
      }

      // Find npc_chat content to get conversation_id
      const npcChatContent = activityProgress.activity?.path_content?.find(
        (c: any) => c.content_type === 'npc_chat'
      );

      if (!npcChatContent?.metadata?.conversation_id) {
        return NextResponse.json(
          { error: 'No NPC conversation configured for this activity' },
          { status: 400 }
        );
      }

      const conversationId = npcChatContent.metadata.conversation_id;

      // Get conversation to find root node
      const { data: conversation } = await supabase
        .from('path_npc_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      // Create initial progress
      const { data: newProgress, error: createError } = await supabase
        .from('path_npc_conversation_progress')
        .insert({
          progress_id: progressId,
          conversation_id: conversationId,
          user_id: user.id,
          current_node_id: conversation.root_node_id,
          visited_node_ids: conversation.root_node_id
            ? [conversation.root_node_id]
            : [],
          choice_history: [],
        })
        .select(
          `
          *,
          conversation:path_npc_conversations(*)
        `
        )
        .single();

      if (createError) {
        console.error('Error creating progress:', createError);
        return NextResponse.json(
          { error: 'Failed to create conversation progress' },
          { status: 500 }
        );
      }

      progress = newProgress;
    }

    // Fetch current node with NPC avatar
    let currentNode: NPCConversationNodeWithChoices | null = null;
    let availableChoices: NPCConversationChoice[] = [];

    if (progress.current_node_id) {
      const { data: nodeData } = await supabase
        .from('path_npc_conversation_nodes')
        .select('*, npc_avatar:seed_npc_avatars(*)')
        .eq('id', progress.current_node_id)
        .single();

      if (nodeData) {
        // Fetch choices separately
        const { data: nodeChoices } = await supabase
          .from('path_npc_conversation_choices')
          .select('*')
          .eq('from_node_id', nodeData.id)
          .order('display_order', { ascending: true });

        const choices = nodeChoices || [];
        currentNode = {
          ...nodeData,
          choices,
        };
        availableChoices = choices;
      }
    }

    const response: NPCConversationProgressResponse = {
      progress,
      current_node: currentNode,
      available_choices: availableChoices,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/pathlab/npc-conversations/progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
