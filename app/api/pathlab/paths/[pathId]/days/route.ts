import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/pathlab/paths/[pathId]/days
 * Create a new page/day in the path
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pathId: string }> }
) {
  try {
    const { pathId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify path ownership
    const { data: path } = await supabase
      .from('paths')
      .select(
        `
        id,
        total_days,
        seed:seeds!inner (
          id,
          created_by
        )
      `
      )
      .eq('id', pathId)
      .single();

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const isOwner = (path.seed as any).created_by === user.id;

    // Check if user is admin/instructor
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'instructor']);

    const isAdminOrInstructor = !!roles?.length;

    if (!isOwner && !isAdminOrInstructor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { day_number, title, context_text, reflection_prompts } = body;

    // Validate day_number
    if (!day_number || day_number < 1) {
      return NextResponse.json(
        { error: 'Invalid day number' },
        { status: 400 }
      );
    }

    // Create the new page
    const { data: newPage, error: createError } = await supabase
      .from('path_days')
      .insert({
        path_id: pathId,
        day_number,
        title: title || null,
        context_text: context_text || '',
        reflection_prompts: reflection_prompts || [],
        node_ids: [], // Legacy field
        migrated_from_nodes: true, // Mark as using new system
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating page:', createError);
      return NextResponse.json(
        { error: 'Failed to create page' },
        { status: 500 }
      );
    }

    // Update total_days in path if needed
    if (day_number > path.total_days) {
      await supabase
        .from('paths')
        .update({ total_days: day_number })
        .eq('id', pathId);
    }

    return NextResponse.json({
      id: newPage.id,
      day_number: newPage.day_number,
      title: newPage.title,
      context_text: newPage.context_text,
      reflection_prompts: newPage.reflection_prompts || [],
      activities: [],
    });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
