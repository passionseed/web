import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  NPCConversationResponse,
  NPCConversationTree,
  NPCConversationNodeWithChoices,
} from '@/types/npc-conversations';

/**
 * GET /api/pathlab/npc-conversations/:conversationId
 * Fetches full conversation tree with all nodes and choices
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    const supabase = await createClient();

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from('path_npc_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Fetch all nodes with their choices and NPC avatars
    const { data: nodes, error: nodesError } = await supabase
      .from('path_npc_conversation_nodes')
      .select(
        `
        *,
        npc_avatar:seed_npc_avatars(*),
        choices:path_npc_conversation_choices(*)
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError);
      return NextResponse.json(
        { error: 'Failed to load conversation nodes' },
        { status: 500 }
      );
    }

    // Build tree structure
    const nodesMap = new Map<string, NPCConversationNodeWithChoices>();
    (nodes || []).forEach((node) => {
      nodesMap.set(node.id, {
        ...node,
        choices: (node.choices || []).sort(
          (a: any, b: any) => a.display_order - b.display_order
        ),
      });
    });

    // Find root node
    const rootNode = conversation.root_node_id
      ? nodesMap.get(conversation.root_node_id) || null
      : null;

    const tree: NPCConversationTree = {
      conversation,
      nodes: Array.from(nodesMap.values()),
      root_node: rootNode,
    };

    const response: NPCConversationResponse = {
      conversation: tree,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/pathlab/npc-conversations/:id:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
