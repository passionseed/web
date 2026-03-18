import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { NPCConversationListResponse } from '@/types/npc-conversations';

/**
 * GET /api/pathlab/npc-conversations
 * Lists all available NPC conversations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all conversations (anyone can read)
    const { data: conversations, error } = await supabase
      .from('path_npc_conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Failed to load conversations' },
        { status: 500 }
      );
    }

    const response: NPCConversationListResponse = {
      conversations: conversations || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/pathlab/npc-conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
