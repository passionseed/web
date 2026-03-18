import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  MakeChoiceInput,
  MakeChoiceResponse,
  NPCChoiceHistoryEntry,
  NPCConversationNodeWithChoices,
} from '@/types/npc-conversations';

/**
 * POST /api/pathlab/npc-conversations/choice
 * Records user's choice and advances conversation to next node
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MakeChoiceInput = await request.json();
    const { progress_id, choice_id } = body;

    if (!progress_id || !choice_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current progress
    const { data: progress, error: progressError } = await supabase
      .from('path_npc_conversation_progress')
      .select('*')
      .eq('id', progress_id)
      .eq('user_id', user.id)
      .single();

    if (progressError || !progress) {
      return NextResponse.json(
        { error: 'Conversation progress not found' },
        { status: 404 }
      );
    }

    // Verify choice exists and belongs to current node
    const { data: choice, error: choiceError } = await supabase
      .from('path_npc_conversation_choices')
      .select('*')
      .eq('id', choice_id)
      .eq('from_node_id', progress.current_node_id)
      .single();

    if (choiceError || !choice) {
      return NextResponse.json(
        { error: 'Invalid choice for current node' },
        { status: 400 }
      );
    }

    // Create choice history entry
    const historyEntry: NPCChoiceHistoryEntry = {
      from_node_id: choice.from_node_id,
      choice_id: choice.id,
      to_node_id: choice.to_node_id,
      timestamp: new Date().toISOString(),
    };

    // Determine next node and completion status
    const nextNodeId = choice.to_node_id;
    let isCompleted = false;

    // Check if next node is an end node
    if (nextNodeId) {
      const { data: nextNode } = await supabase
        .from('path_npc_conversation_nodes')
        .select('node_type')
        .eq('id', nextNodeId)
        .single();

      if (nextNode?.node_type === 'end') {
        isCompleted = true;
      }
    } else {
      // No next node means conversation ends
      isCompleted = true;
    }

    // Update visited nodes (add next node if it exists)
    const newVisitedNodes = [...progress.visited_node_ids];
    if (nextNodeId && !newVisitedNodes.includes(nextNodeId)) {
      newVisitedNodes.push(nextNodeId);
    }

    // Update progress
    const updateData: any = {
      current_node_id: nextNodeId,
      visited_node_ids: newVisitedNodes,
      choice_history: [...progress.choice_history, historyEntry],
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    };

    if (isCompleted) {
      updateData.completed_at = new Date().toISOString();

      // Also update the activity progress to completed
      await supabase
        .from('path_activity_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', progress.progress_id);
    }

    const { data: updatedProgress, error: updateError } = await supabase
      .from('path_npc_conversation_progress')
      .update(updateData)
      .eq('id', progress_id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating progress:', updateError);
      return NextResponse.json(
        { error: 'Failed to update conversation progress' },
        { status: 500 }
      );
    }

    // Fetch next node with choices and NPC avatar
    let nextNode: NPCConversationNodeWithChoices | null = null;

    if (nextNodeId) {
      const { data: nodeData } = await supabase
        .from('path_npc_conversation_nodes')
        .select(
          `
          *,
          npc_avatar:seed_npc_avatars(*),
          choices:path_npc_conversation_choices(*)
        `
        )
        .eq('id', nextNodeId)
        .single();

      if (nodeData) {
        nextNode = {
          ...nodeData,
          choices: (nodeData.choices || []).sort(
            (a: any, b: any) => a.display_order - b.display_order
          ),
        };
      }
    }

    const response: MakeChoiceResponse = {
      progress: updatedProgress,
      next_node: nextNode,
      is_completed: isCompleted,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST /api/pathlab/npc-conversations/choice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
