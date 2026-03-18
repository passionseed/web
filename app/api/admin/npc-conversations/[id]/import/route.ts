import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface ImportNode {
  id: string;
  type: 'question' | 'statement' | 'end';
  title?: string;
  text: string;
  npc_name?: string;
  metadata?: any;
}

interface ImportChoice {
  from: string;
  to: string;
  text: string;
  label?: string;
  order: number;
  conditions?: any;
  metadata?: any;
}

interface ImportData {
  nodes: ImportNode[];
  choices: ImportChoice[];
  root_node: string;
}

/**
 * POST /api/admin/npc-conversations/:id/import
 * Import conversation nodes and choices from JSON
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get conversation and verify ownership
    const { data: conversation, error: convError } = await supabase
      .from('path_npc_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const body: ImportData = await request.json();
    const { nodes, choices, root_node } = body;

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid format: nodes array is required' },
        { status: 400 }
      );
    }

    if (!choices || !Array.isArray(choices)) {
      return NextResponse.json(
        { error: 'Invalid format: choices array is required' },
        { status: 400 }
      );
    }

    if (!root_node) {
      return NextResponse.json(
        { error: 'Invalid format: root_node is required' },
        { status: 400 }
      );
    }

    // Get NPCs for this conversation's seed
    const { data: npcs } = await supabase
      .from('seed_npc_avatars')
      .select('id, name')
      .eq('seed_id', conversation.seed_id);

    const npcMap = new Map((npcs || []).map((npc) => [npc.name, npc.id]));

    // Map to track old IDs to new UUIDs
    const nodeIdMap = new Map<string, string>();

    // Step 1: Create all nodes
    for (const node of nodes) {
      const npcAvatarId = node.npc_name ? npcMap.get(node.npc_name) : null;

      const { data: createdNode, error: nodeError } = await supabase
        .from('path_npc_conversation_nodes')
        .insert({
          conversation_id: conversationId,
          npc_avatar_id: npcAvatarId,
          node_type: node.type,
          title: node.title || null,
          text_content: node.text,
          metadata: node.metadata || {},
        })
        .select()
        .single();

      if (nodeError) {
        console.error('Error creating node:', nodeError);
        throw new Error(`Failed to create node: ${node.id}`);
      }

      // Map old ID to new UUID
      nodeIdMap.set(node.id, createdNode.id);
    }

    // Step 2: Create all choices
    for (const choice of choices) {
      const fromNodeId = nodeIdMap.get(choice.from);
      const toNodeId = choice.to ? nodeIdMap.get(choice.to) : null;

      if (!fromNodeId) {
        throw new Error(`Invalid choice: source node '${choice.from}' not found`);
      }

      const { error: choiceError } = await supabase
        .from('path_npc_conversation_choices')
        .insert({
          from_node_id: fromNodeId,
          to_node_id: toNodeId,
          choice_text: choice.text,
          choice_label: choice.label || null,
          display_order: choice.order,
          conditions: choice.conditions || null,
          metadata: choice.metadata || {},
        });

      if (choiceError) {
        console.error('Error creating choice:', choiceError);
        throw new Error('Failed to create choice');
      }
    }

    // Step 3: Set root node
    const rootNodeId = nodeIdMap.get(root_node);
    if (!rootNodeId) {
      throw new Error(`Root node '${root_node}' not found in nodes`);
    }

    const { error: updateError } = await supabase
      .from('path_npc_conversations')
      .update({ root_node_id: rootNodeId })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating root node:', updateError);
      throw new Error('Failed to set root node');
    }

    return NextResponse.json({
      success: true,
      nodesCreated: nodes.length,
      choicesCreated: choices.length,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/npc-conversations/:id/import:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import conversation' },
      { status: 500 }
    );
  }
}
