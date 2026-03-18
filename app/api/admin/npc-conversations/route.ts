import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/npc-conversations
 * Create a new NPC conversation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin/teacher
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'teacher']);

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { seed_id, path_day_id, title, description, estimated_minutes } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Get seed_id from path if not provided
    let finalSeedId = seed_id;
    if (!finalSeedId && path_day_id) {
      const { data: pathDay } = await supabase
        .from('path_days')
        .select('path:paths(seed_id)')
        .eq('id', path_day_id)
        .single();

      if (pathDay?.path?.seed_id) {
        finalSeedId = pathDay.path.seed_id;
      }
    }

    if (!finalSeedId) {
      return NextResponse.json(
        { error: 'Missing required field: seed_id or path_day_id' },
        { status: 400 }
      );
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('path_npc_conversations')
      .insert({
        seed_id: finalSeedId,
        title,
        description,
        estimated_minutes,
        created_by: user.id,
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/npc-conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
