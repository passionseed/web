/**
 * Batch Activity Creation API
 * POST /api/pathlab/pages/[id]/activities
 *
 * Creates multiple activities for a page in one request.
 * Enforces 20-activity limit per page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  validateBatchActivities,
  validatePageActivityCount,
  MAX_ACTIVITIES_PER_PAGE,
} from '@/lib/pathlab/validation';
import { verifyPageOwnership, getCurrentUser } from '@/lib/pathlab/authorization';
import { sanitizeContent, validateContentUrl, logXssAttempt } from '@/lib/pathlab/sanitization';
import { handleApiError, logError, createPartialBatchError } from '@/lib/pathlab/errors';
import type { CreatePathActivityInput, FullPathActivity } from '@/types/pathlab';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params;

  try {
    // 1. Get current user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Verify page ownership
    await verifyPageOwnership(pageId, user.id);

    // 3. Parse request body
    const body = await request.json();
    const activities: CreatePathActivityInput[] = body.activities || [];

    // 4. Validate batch
    validateBatchActivities(activities);

    // 5. Check page activity count limit
    const supabase = await createClient();
    await validatePageActivityCount(
      pageId,
      activities.length,
      async () => {
        const { count } = await supabase
          .from('path_activities')
          .select('*', { count: 'exact', head: true })
          .eq('path_day_id', pageId);
        return count || 0;
      }
    );

    // 6. Create activities with content/assessments
    const results = await Promise.allSettled(
      activities.map(async (activity, index) => {
        try {
          // Create activity
          const { data: newActivity, error: activityError } = await supabase
            .from('path_activities')
            .insert({
              path_day_id: pageId,
              title: activity.title,
              instructions: activity.instructions || null,
              activity_type: activity.activity_type,
              display_order: activity.display_order,
              estimated_minutes: activity.estimated_minutes || null,
              is_required: activity.is_required ?? true,
            })
            .select()
            .single();

          if (activityError || !newActivity) {
            throw activityError || new Error('Failed to create activity');
          }

          // If activity has content, create it
          if (body.content && body.content[index]) {
            const content = body.content[index];

            // Sanitize content
            if (content.content_body) {
              const sanitized = sanitizeContent(content.content_body);
              if (sanitized !== content.content_body) {
                logXssAttempt(user.id, content.content_body, 'activity_content');
              }
              content.content_body = sanitized;
            }

            // Validate URL
            if (content.content_url) {
              const urlValidation = validateContentUrl(content.content_url);
              if (!urlValidation.valid) {
                throw new Error(urlValidation.error);
              }
            }

            await supabase.from('path_content').insert({
              activity_id: newActivity.id,
              content_type: content.content_type,
              content_title: content.content_title || null,
              content_url: content.content_url || null,
              content_body: content.content_body || null,
              display_order: 0,
              metadata: content.metadata || {},
            });
          }

          // If activity has assessment, create it
          if (body.assessments && body.assessments[index]) {
            const assessment = body.assessments[index];

            await supabase.from('path_assessments').insert({
              activity_id: newActivity.id,
              assessment_type: assessment.assessment_type,
              points_possible: assessment.points_possible || null,
              is_graded: assessment.is_graded || false,
              metadata: assessment.metadata || {},
            });
          }

          return { success: true, data: newActivity, index };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            index,
          };
        }
      })
    );

    // 7. Process results
    const processedResults = results.map(r =>
      r.status === 'fulfilled' ? r.value : { success: false, error: r.reason, index: 0 }
    );

    const partialError = createPartialBatchError(processedResults);

    if (partialError) {
      // Some failed
      logError(partialError, {
        operation: 'batch_activity_create',
        userId: user.id,
        pageId,
        total: activities.length,
        succeeded: partialError.succeeded.length,
        failed: partialError.failed.length,
      });

      return NextResponse.json(
        {
          error: partialError.userMessage,
          succeeded: partialError.succeeded,
          failed: partialError.failed.map(f => ({
            index: f.item,
            error: f.error.message,
          })),
        },
        { status: 207 } // Multi-Status
      );
    }

    // All succeeded
    const successfulActivities = processedResults.map(r => r.data);

    // 8. Fetch full activities with relations
    const { data: fullActivities } = await supabase
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
      .in(
        'id',
        successfulActivities.map(a => a.id)
      )
      .order('display_order', { ascending: true });

    return NextResponse.json({
      message: `${successfulActivities.length} activities created`,
      activities: fullActivities || [],
    });
  } catch (error) {
    logError(error, {
      operation: 'batch_activity_create',
      pageId,
    });

    const { statusCode, body } = handleApiError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * GET /api/pathlab/pages/[id]/activities
 * Fetch all activities for a page (with content and assessments)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify access
    await verifyPageOwnership(pageId, user.id);

    // Fetch activities with all relations (prevent N+1)
    const supabase = await createClient();
    const { data: activities, error } = await supabase
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
      .eq('path_day_id', pageId)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      activities: activities || [],
    });
  } catch (error) {
    logError(error, {
      operation: 'fetch_page_activities',
      pageId,
    });

    const { statusCode, body } = handleApiError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
