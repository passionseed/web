/**
 * Activity Library API
 * GET /api/pathlab/library
 *
 * Fetches activity templates for the page builder library.
 * Returns user's own templates + public templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser, verifyIsInstructor } from '@/lib/pathlab/authorization';
import { handleApiError, logError } from '@/lib/pathlab/errors';

export async function GET(request: NextRequest) {
  try {
    // 1. Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is instructor
    await verifyIsInstructor(user.id);

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const activityType = searchParams.get('type');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'popular'; // popular | recent | title

    // 4. Build query
    const supabase = await createClient();
    let query = supabase
      .from('activity_templates')
      .select('*')
      .or(`created_by.eq.${user.id},is_public.eq.true`);

    // Filter by activity type
    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    // Search in title and description
    if (search && search.trim() !== '') {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        query = query.order('use_count', { ascending: false });
        break;
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'title':
        query = query.order('title', { ascending: true });
        break;
    }

    // 5. Execute query
    const { data: templates, error } = await query.limit(100);

    if (error) {
      // Handle corrupt JSON gracefully
      if (error.message.includes('JSON')) {
        logError(error, {
          operation: 'fetch_library_templates',
          userId: user.id,
          context: 'Possible corrupt template metadata',
        });

        // Return empty array and log issue
        return NextResponse.json({
          templates: [],
          warning: 'Some templates failed to load. Please contact support.',
        });
      }

      throw error;
    }

    return NextResponse.json({
      templates: templates || [],
      total: templates?.length ?? 0,
    });
  } catch (error) {
    logError(error, {
      operation: 'fetch_library',
    });

    const { statusCode, body } = handleApiError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * POST /api/pathlab/library
 * Create a new activity template
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user is instructor
    await verifyIsInstructor(user.id);

    // 3. Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'Template title is required' },
        { status: 400 }
      );
    }

    if (!body.activity_type) {
      return NextResponse.json(
        { error: 'Activity type is required' },
        { status: 400 }
      );
    }

    // Check if trying to create public template (admin only)
    if (body.is_public && !user.isAdmin) {
      return NextResponse.json(
        { error: 'Only administrators can create public templates' },
        { status: 403 }
      );
    }

    // 4. Create template
    const supabase = await createClient();
    const { data: template, error } = await supabase
      .from('activity_templates')
      .insert({
        created_by: user.id,
        title: body.title,
        description: body.description || null,
        activity_type: body.activity_type,
        content_template: body.content_template || null,
        assessment_template: body.assessment_template || null,
        estimated_minutes: body.estimated_minutes || null,
        is_public: body.is_public || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Template created',
      template,
    });
  } catch (error) {
    logError(error, {
      operation: 'create_template',
    });

    const { statusCode, body } = handleApiError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
