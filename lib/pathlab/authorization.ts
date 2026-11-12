/**
 * Authorization for PathLab Page Builder
 *
 * Verifies user permissions before allowing operations on pages and activities.
 * Implements defense-in-depth: checks at both app and database (RLS) levels.
 */

import { createClient } from '@/utils/supabase/server';

export class UnauthorizedError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public statusCode: number = 404) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Verify a student may record progress against an activity.
 *
 * Authorization chain: enrollment → user_id, and activity → day → path, which
 * must be the same path the enrollment is for. Checking only the enrollment
 * would let a student post progress for activities on someone else's path.
 */
export async function verifyEnrollmentActivity(
  enrollmentId: string,
  activityId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from('path_enrollments')
    .select('id, user_id, path_id')
    .eq('id', enrollmentId)
    .maybeSingle();

  if (!enrollment) {
    throw new NotFoundError('Enrollment not found');
  }

  if (enrollment.user_id !== userId) {
    throw new UnauthorizedError('You do not own this enrollment');
  }

  const { data: activity } = await supabase
    .from('path_activities')
    .select('id, path_day_id, day:path_days!inner(path_id)')
    .eq('id', activityId)
    .maybeSingle();

  if (!activity) {
    throw new NotFoundError('Activity not found');
  }

  const activityPathId = (activity as { day?: { path_id?: string } }).day?.path_id;

  if (activityPathId !== enrollment.path_id) {
    throw new UnauthorizedError('Activity does not belong to this enrollment');
  }
}

/**
 * Verify user owns the seed that contains this page
 *
 * Authorization chain: page → path → seed → created_by
 */
export async function verifyPageOwnership(
  pageId: string,
  userId: string
): Promise<{
  pageId: string;
  pathId: string;
  seedId: string;
  ownerId: string;
  isOwner: boolean;
  isAdmin: boolean;
}> {
  const supabase = await createClient();

  // Fetch page with full ownership chain
  const { data: page, error } = await supabase
    .from('path_days')
    .select(
      `
      id,
      path_id,
      path:paths!inner (
        id,
        seed_id,
        seed:seeds!inner (
          id,
          created_by
        )
      )
    `
    )
    .eq('id', pageId)
    .single();

  if (error || !page) {
    throw new NotFoundError(`Page not found: ${pageId}`);
  }

  // Check if user is admin
  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  const isAdmin = !!adminRole;
  const ownerId = (page.path as any).seed.created_by;
  const isOwner = ownerId === userId;

  // User must be owner or admin
  if (!isOwner && !isAdmin) {
    throw new UnauthorizedError(
      `User ${userId} does not have permission to edit page ${pageId}`
    );
  }

  return {
    pageId: page.id,
    pathId: (page.path as any).id,
    seedId: (page.path as any).seed.id,
    ownerId,
    isOwner,
    isAdmin,
  };
}

/**
 * Verify user owns the activity (via page → path → seed)
 */
export async function verifyActivityOwnership(
  activityId: string,
  userId: string
): Promise<{
  activityId: string;
  pageId: string;
  pathId: string;
  seedId: string;
  ownerId: string;
  isOwner: boolean;
  isAdmin: boolean;
}> {
  const supabase = await createClient();

  // Fetch activity with full ownership chain
  const { data: activity, error } = await supabase
    .from('path_activities')
    .select(
      `
      id,
      path_day_id,
      path_day:path_days!inner (
        id,
        path_id,
        path:paths!inner (
          id,
          seed_id,
          seed:seeds!inner (
            id,
            created_by
          )
        )
      )
    `
    )
    .eq('id', activityId)
    .single();

  if (error || !activity) {
    throw new NotFoundError(`Activity not found: ${activityId}`);
  }

  // Check if user is admin
  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  const isAdmin = !!adminRole;
  const ownerId = (activity.path_day as any).path.seed.created_by;
  const isOwner = ownerId === userId;

  if (!isOwner && !isAdmin) {
    throw new UnauthorizedError(
      `User ${userId} does not have permission to edit activity ${activityId}`
    );
  }

  return {
    activityId: activity.id,
    pageId: (activity.path_day as any).id,
    pathId: (activity.path_day as any).path.id,
    seedId: (activity.path_day as any).path.seed.id,
    ownerId,
    isOwner,
    isAdmin,
  };
}

/**
 * Verify user can create public templates (admin only)
 */
export async function verifyCanCreatePublicTemplate(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (!adminRole) {
    throw new UnauthorizedError(
      'Only administrators can create public templates'
    );
  }
}

/**
 * Verify user can delete activity (check for student progress)
 */
export async function verifyCanDeleteActivity(
  activityId: string,
  userId: string
): Promise<void> {
  // First verify ownership
  await verifyActivityOwnership(activityId, userId);

  // Check if activity has student progress
  const supabase = await createClient();
  const { data: progress } = await supabase
    .from('path_activity_progress')
    .select('id')
    .eq('activity_id', activityId)
    .limit(1)
    .maybeSingle();

  if (progress) {
    throw new UnauthorizedError(
      'Cannot delete activity with student progress. Students have already started this activity.',
      409 // Conflict status code
    );
  }
}

/**
 * Get user info (for logging)
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string | undefined;
  isAdmin: boolean;
} | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Check admin status
  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    isAdmin: !!adminRole,
  };
}

/**
 * Check if user has any instructor role
 */
export async function verifyIsInstructor(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'instructor']);

  if (!roles || roles.length === 0) {
    throw new UnauthorizedError(
      'You must be an instructor to access the page builder'
    );
  }
}

/** Resolve a builder child record to its activity before authorizing a mutation. */
export async function verifyBuilderRecordOwnership(
  kind: 'content' | 'assessment' | 'question', id: string, userId: string
): Promise<void> {
  const supabase = await createClient();
  if (kind === 'question') {
    const { data, error } = await supabase.from('path_quiz_questions')
      .select('assessment_id').eq('id', id).maybeSingle();
    if (error || !data) throw new NotFoundError('Question not found');
    return verifyBuilderRecordOwnership('assessment', data.assessment_id, userId);
  }
  const table = kind === 'content' ? 'path_content' : 'path_assessments';
  const { data, error } = await supabase.from(table).select('activity_id').eq('id', id).maybeSingle();
  if (error || !data) throw new NotFoundError('Record not found');
  await verifyActivityOwnership(data.activity_id, userId);
}
