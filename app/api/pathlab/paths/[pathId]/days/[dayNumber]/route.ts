import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/pathlab/paths/[pathId]/days/[dayNumber]
 * Fetch a specific page/day with all activities
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathId: string; dayNumber: string }> }
) {
  try {
    const { pathId, dayNumber } = await params;
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

    // Fetch the specific day
    const { data: day } = await supabase
      .from('path_days')
      .select('*')
      .eq('path_id', pathId)
      .eq('day_number', parseInt(dayNumber, 10))
      .maybeSingle();

    if (!day) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Fetch activities for this day
    const { data: activities } = await supabase
      .from('path_activities')
      .select(
        `
        *,
        path_content (*),
        path_assessment:path_assessments (
          *,
          quiz_questions:path_quiz_questions (*)
        )
      `
      )
      .eq('path_day_id', day.id)
      .order('display_order', { ascending: true });

    return NextResponse.json({
      id: day.id,
      day_number: day.day_number,
      title: day.title,
      context_text: day.context_text,
      reflection_prompts: day.reflection_prompts || [],
      activities: activities || [],
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pathlab/paths/[pathId]/days/[dayNumber]
 * Update a specific page/day metadata only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pathId: string; dayNumber: string }> }
) {
  try {
    const { pathId, dayNumber } = await params;
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

    const body = await request.json();
    const updates = {
      title: typeof body.title === 'string' ? body.title.trim() || null : null,
      context_text:
        typeof body.context_text === 'string'
          ? body.context_text.trim()
          : '',
      reflection_prompts: Array.isArray(body.reflection_prompts)
        ? body.reflection_prompts.map((prompt: unknown) => String(prompt)).filter(Boolean)
        : [],
    };

    const dayNumberInt = parseInt(dayNumber, 10);
    if (!Number.isFinite(dayNumberInt)) {
      return NextResponse.json({ error: 'Invalid day number' }, { status: 400 });
    }

    const { data: updatedDay, error: updateError } = await supabase
      .from('path_days')
      .update(updates)
      .eq('path_id', pathId)
      .eq('day_number', dayNumberInt)
      .select('*')
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updatedDay) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ day: updatedDay });
  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
