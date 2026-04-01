// Hackathon Phase Activity API
import { createClient } from '@supabase/supabase-js';
import type {
  HackathonProgramPhase,
  HackathonPhaseActivity,
  HackathonPhaseActivityContent,
  HackathonPhaseActivityAssessment,
  HackathonPhaseWithActivities,
  ContentType,
  AssessmentType,
} from '@/types/hackathon-phase-activity';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================================
// PHASES
// ============================================================================

export async function getPhaseBySlug(
  programId: string,
  slug: string
): Promise<HackathonPhaseWithActivities | null> {
  const supabase = getSupabase();

  const { data: phase, error } = await supabase
    .from('hackathon_program_phases')
    .select('*')
    .eq('program_id', programId)
    .eq('slug', slug)
    .single();

  if (error || !phase) return null;

  const { data: activities } = await supabase
    .from('hackathon_phase_activities')
    .select('*')
    .eq('phase_id', phase.id)
    .eq('is_draft', false)
    .order('display_order', { ascending: true });

  const activitiesWithContent = await Promise.all(
    (activities || []).map(async (activity) => {
      const { data: content } = await supabase
        .from('hackathon_phase_activity_content')
        .select('*')
        .eq('activity_id', activity.id)
        .order('display_order', { ascending: true });

      const { data: assessment } = await supabase
        .from('hackathon_phase_activity_assessments')
        .select('*')
        .eq('activity_id', activity.id)
        .single();

      return {
        ...activity,
        content: content || [],
        assessment: assessment || null,
      };
    })
  );

  return {
    ...phase,
    activities: activitiesWithContent,
  };
}

export async function getAllPhases(
  programId: string
): Promise<HackathonPhaseWithActivities[]> {
  const supabase = getSupabase();

  const { data: phases, error } = await supabase
    .from('hackathon_program_phases')
    .select('*')
    .eq('program_id', programId)
    .order('phase_number', { ascending: true });

  if (error || !phases) return [];

  return await Promise.all(
    phases.map(async (phase) => {
      const { data: activities } = await supabase
        .from('hackathon_phase_activities')
        .select('*')
        .eq('phase_id', phase.id)
        .eq('is_draft', false)
        .order('display_order', { ascending: true });

      const activitiesWithContent = await Promise.all(
        (activities || []).map(async (activity) => {
          const { data: content } = await supabase
            .from('hackathon_phase_activity_content')
            .select('*')
            .eq('activity_id', activity.id)
            .order('display_order', { ascending: true });

          const { data: assessment } = await supabase
            .from('hackathon_phase_activity_assessments')
            .select('*')
            .eq('activity_id', activity.id)
            .single();

          return {
            ...activity,
            content: content || [],
            assessment: assessment || null,
          };
        })
      );

      return {
        ...phase,
        activities: activitiesWithContent,
      };
    })
  );
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function getActivityById(
  activityId: string
): Promise<(HackathonPhaseActivity & {
  content: HackathonPhaseActivityContent[];
  assessment: HackathonPhaseActivityAssessment | null;
}) | null> {
  const supabase = getSupabase();

  const { data: activity, error } = await supabase
    .from('hackathon_phase_activities')
    .select('*')
    .eq('id', activityId)
    .eq('is_draft', false)
    .single();

  if (error || !activity) return null;

  const { data: content } = await supabase
    .from('hackathon_phase_activity_content')
    .select('*')
    .eq('activity_id', activityId)
    .order('display_order', { ascending: true });

  const { data: assessment } = await supabase
    .from('hackathon_phase_activity_assessments')
    .select('*')
    .eq('activity_id', activityId)
    .single();

  return {
    ...activity,
    content: content || [],
    assessment: assessment || null,
  };
}

// ============================================================================
// ADMIN: CREATE/UPDATE
// ============================================================================

export async function createPhase(data: {
  program_id: string;
  slug: string;
  title: string;
  description?: string;
  phase_number: number;
  starts_at?: string;
  ends_at?: string;
  due_at?: string;
}): Promise<HackathonProgramPhase | null> {
  const supabase = getSupabase();

  const { data: phase, error } = await supabase
    .from('hackathon_program_phases')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating phase:', error);
    return null;
  }

  return phase;
}

export async function createActivity(data: {
  phase_id: string;
  title: string;
  instructions?: string;
  display_order: number;
  estimated_minutes?: number;
  is_required?: boolean;
  is_draft?: boolean;
}): Promise<HackathonPhaseActivity | null> {
  const supabase = getSupabase();

  const { data: activity, error } = await supabase
    .from('hackathon_phase_activities')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating activity:', error);
    return null;
  }

  return activity;
}

export async function addActivityContent(data: {
  activity_id: string;
  content_type: ContentType;
  content_title?: string;
  content_url?: string;
  content_body?: string;
  display_order?: number;
  metadata?: Record<string, unknown>;
}): Promise<HackathonPhaseActivityContent | null> {
  const supabase = getSupabase();

  const { data: content, error } = await supabase
    .from('hackathon_phase_activity_content')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error adding content:', error);
    return null;
  }

  return content;
}

export async function addActivityAssessment(data: {
  activity_id: string;
  assessment_type: AssessmentType;
  points_possible?: number;
  is_graded?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<HackathonPhaseActivityAssessment | null> {
  const supabase = getSupabase();

  const { data: assessment, error } = await supabase
    .from('hackathon_phase_activity_assessments')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error adding assessment:', error);
    return null;
  }

  return assessment;
}

export async function updateActivityDraft(
  activityId: string,
  isDraft: boolean
): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('hackathon_phase_activities')
    .update({ is_draft: isDraft })
    .eq('id', activityId);

  return !error;
}

export async function deletePhase(phaseId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('hackathon_program_phases')
    .delete()
    .eq('id', phaseId);

  return !error;
}

export async function deleteActivity(activityId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('hackathon_phase_activities')
    .delete()
    .eq('id', activityId);

  return !error;
}

export async function deleteContent(contentId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('hackathon_phase_activity_content')
    .delete()
    .eq('id', contentId);

  return !error;
}

export async function deleteAssessment(activityId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('hackathon_phase_activity_assessments')
    .delete()
    .eq('activity_id', activityId);

  return !error;
}

export async function updatePhase(
  phaseId: string,
  data: Partial<{
    slug: string;
    title: string;
    description: string;
    phase_number: number;
    starts_at: string;
    ends_at: string;
    due_at: string;
  }>
): Promise<HackathonProgramPhase | null> {
  const supabase = getSupabase();

  const { data: phase, error } = await supabase
    .from('hackathon_program_phases')
    .update(data)
    .eq('id', phaseId)
    .select()
    .single();

  if (error) {
    console.error('Error updating phase:', error);
    return null;
  }

  return phase;
}

export async function updateActivity(
  activityId: string,
  data: Partial<{
    title: string;
    instructions: string;
    display_order: number;
    estimated_minutes: number;
    is_required: boolean;
    is_draft: boolean;
  }>
): Promise<HackathonPhaseActivity | null> {
  const supabase = getSupabase();

  const { data: activity, error } = await supabase
    .from('hackathon_phase_activities')
    .update(data)
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    console.error('Error updating activity:', error);
    return null;
  }

  return activity;
}

export async function updateContent(
  contentId: string,
  data: Partial<{
    content_title: string;
    content_url: string;
    content_body: string;
    display_order: number;
    metadata: Record<string, unknown>;
  }>
): Promise<HackathonPhaseActivityContent | null> {
  const supabase = getSupabase();

  const { data: content, error } = await supabase
    .from('hackathon_phase_activity_content')
    .update(data)
    .eq('id', contentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating content:', error);
    return null;
  }

  return content;
}

export async function updateAssessment(
  activityId: string,
  data: Partial<{
    assessment_type: AssessmentType;
    points_possible: number;
    is_graded: boolean;
    metadata: Record<string, unknown>;
  }>
): Promise<HackathonPhaseActivityAssessment | null> {
  const supabase = getSupabase();

  const { data: assessment, error } = await supabase
    .from('hackathon_phase_activity_assessments')
    .update(data)
    .eq('activity_id', activityId)
    .select()
    .single();

  if (error) {
    console.error('Error updating assessment:', error);
    return null;
  }

  return assessment;
}
