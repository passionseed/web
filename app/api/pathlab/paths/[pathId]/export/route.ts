import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
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

    // Fetch path + seed + roles in parallel
    const [{ data: path }, { data: roles }] = await Promise.all([
      supabase
        .from('paths')
        .select('id, total_days, created_at, seed:seeds!inner(id, title, description, created_by)')
        .eq('id', pathId)
        .single(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'instructor']),
    ]);

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const seed = path.seed as any;
    const isOwner = seed.created_by === user.id;
    const isAdminOrInstructor = !!roles?.length;

    if (!isOwner && !isAdminOrInstructor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all days for this path
    const { data: days } = await supabase
      .from('path_days')
      .select('*')
      .eq('path_id', pathId)
      .order('day_number', { ascending: true });

    if (!days || days.length === 0) {
      const exportData = {
        exported_at: new Date().toISOString(),
        seed: { id: seed.id, title: seed.title, description: seed.description },
        path: { id: path.id, total_days: path.total_days },
        pages: [],
      };
      return buildDownloadResponse(exportData, seed.title);
    }

    // Fetch all activities for all days in one query
    const dayIds = days.map((d) => d.id);
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
      .in('path_day_id', dayIds)
      .order('display_order', { ascending: true });

    // Group activities by day id
    const activitiesByDayId = new Map<string, any[]>();
    for (const activity of activities || []) {
      const list = activitiesByDayId.get(activity.path_day_id) ?? [];
      list.push({
        ...activity,
        path_content: activity.path_content || [],
      });
      activitiesByDayId.set(activity.path_day_id, list);
    }

    const pages = days.map((day) => ({
      day_number: day.day_number,
      title: day.title,
      context_text: day.context_text,
      reflection_prompts: day.reflection_prompts || [],
      activities: activitiesByDayId.get(day.id) ?? [],
    }));

    const exportData = {
      exported_at: new Date().toISOString(),
      seed: { id: seed.id, title: seed.title, description: seed.description },
      path: { id: path.id, total_days: path.total_days },
      pages,
    };

    return buildDownloadResponse(exportData, seed.title);
  } catch (error) {
    console.error('Error exporting pathlab:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildDownloadResponse(data: object, seedTitle: string): NextResponse {
  const slug = seedTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug}-pathlab.json`;
  const json = JSON.stringify(data, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
