// =====================================================
// PATHLAB ACTIVITIES DATA ACCESS LAYER
// Database operations for PathLab content system
// Separated from maps/nodes system
// =====================================================

import { createClient } from "@/utils/supabase/server";
import type {
  PathActivity,
  PathContent,
  PathAssessment,
  PathQuizQuestion,
  FullPathActivity,
  CreatePathActivityInput,
  UpdatePathActivityInput,
  CreatePathContentInput,
  UpdatePathContentInput,
  CreatePathAssessmentInput,
  UpdatePathAssessmentInput,
  PathActivityProgress,
  PathAssessmentSubmission,
  SubmitPathAssessmentInput,
  PathDayWithActivities,
} from "@/types/pathlab";

// =====================================================
// PATH ACTIVITIES CRUD
// =====================================================

/**
 * Get all activities for a specific day with nested content and assessments
 */
export async function getPathDayActivities(
  dayId: string
): Promise<FullPathActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_activities")
    .select(`
      *,
      path_content (*),
      path_assessment:path_assessments (
        *,
        quiz_questions:path_quiz_questions (*)
      )
    `)
    .eq("path_day_id", dayId)
    .order("display_order", { ascending: true });

  if (error) throw error;

  // Transform the data to match FullPathActivity type
  return (data || []).map((activity) => ({
    ...activity,
    path_content: activity.path_content || [],
    path_assessment: activity.path_assessment?.[0] || null,
  })) as FullPathActivity[];
}

/**
 * Get a single activity by ID with all nested data
 */
export async function getPathActivity(
  activityId: string
): Promise<FullPathActivity | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_activities")
    .select(`
      *,
      path_content (*),
      path_assessment:path_assessments (
        *,
        quiz_questions:path_quiz_questions (*)
      )
    `)
    .eq("id", activityId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  // Transform to FullPathActivity
  return {
    ...data,
    path_content: data.path_content || [],
    path_assessment: data.path_assessment?.[0] || null,
  } as FullPathActivity;
}

/**
 * Create a new path activity
 */
export async function createPathActivity(
  input: CreatePathActivityInput
): Promise<PathActivity> {
  const supabase = await createClient();

  // Get the current max display_order for this day to avoid conflicts
  const { data: existingActivities } = await supabase
    .from("path_activities")
    .select("display_order")
    .eq("path_day_id", input.path_day_id)
    .order("display_order", { ascending: false })
    .limit(1);

  const maxDisplayOrder = existingActivities?.[0]?.display_order ?? -1;
  const nextDisplayOrder = maxDisplayOrder + 1;

  const { data, error} = await supabase
    .from("path_activities")
    .insert({
      path_day_id: input.path_day_id,
      title: input.title,
      instructions: input.instructions || null,
      // activity_type removed - determined by content_type or assessment_type
      display_order: nextDisplayOrder, // Use auto-calculated order
      estimated_minutes: input.estimated_minutes || null,
      is_required: input.is_required ?? true,
      is_draft: input.is_draft ?? false,
      draft_reason: input.draft_reason || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PathActivity;
}

/**
 * Update an existing path activity
 */
export async function updatePathActivity(
  activityId: string,
  updates: UpdatePathActivityInput
): Promise<PathActivity> {
  const supabase = await createClient();

  const { data, error} = await supabase
    .from("path_activities")
    .update(updates)
    .eq("id", activityId)
    .select()
    .single();

  if (error) throw error;
  return data as PathActivity;
}

/**
 * Delete a path activity (cascades to content and assessments)
 */
export async function deletePathActivity(activityId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("path_activities")
    .delete()
    .eq("id", activityId);

  if (error) throw error;
}

/**
 * Reorder activities within a day
 * @param dayId - The path_day_id
 * @param activityIds - Array of activity IDs in desired order
 */
export async function reorderPathActivities(
  dayId: string,
  activityIds: string[]
): Promise<void> {
  const supabase = await createClient();

  // Update display_order for each activity
  const updates = activityIds.map((id, index) =>
    supabase
      .from("path_activities")
      .update({ display_order: index })
      .eq("id", id)
      .eq("path_day_id", dayId)
  );

  const results = await Promise.all(updates);

  // Check for errors
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    throw errors[0].error;
  }
}

// =====================================================
// PATH CONTENT CRUD
// =====================================================

/**
 * Create a new path content item
 */
export async function createPathContent(
  input: CreatePathContentInput
): Promise<PathContent> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_content")
    .insert({
      activity_id: input.activity_id,
      content_type: input.content_type,
      content_title: input.content_title || null,
      content_url: input.content_url || null,
      content_body: input.content_body || null,
      display_order: input.display_order,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as PathContent;
}

/**
 * Update path content
 */
export async function updatePathContent(
  contentId: string,
  updates: UpdatePathContentInput
): Promise<PathContent> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_content")
    .update(updates)
    .eq("id", contentId)
    .select()
    .single();

  if (error) throw error;
  return data as PathContent;
}

/**
 * Delete path content
 */
export async function deletePathContent(contentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("path_content")
    .delete()
    .eq("id", contentId);

  if (error) throw error;
}

/**
 * Reorder content items within an activity
 */
export async function reorderPathContent(
  activityId: string,
  contentIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const updates = contentIds.map((id, index) =>
    supabase
      .from("path_content")
      .update({ display_order: index })
      .eq("id", id)
      .eq("activity_id", activityId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    throw errors[0].error;
  }
}

// =====================================================
// PATH ASSESSMENTS CRUD
// =====================================================

/**
 * Create a new path assessment with optional quiz questions
 */
export async function createPathAssessment(
  input: CreatePathAssessmentInput
): Promise<PathAssessment> {
  const supabase = await createClient();

  // Create assessment
  const { data: assessment, error: assessmentError } = await supabase
    .from("path_assessments")
    .insert({
      activity_id: input.activity_id,
      assessment_type: input.assessment_type,
      points_possible: input.points_possible || null,
      is_graded: input.is_graded ?? false,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (assessmentError) throw assessmentError;

  // Create quiz questions if provided
  let quiz_questions: PathQuizQuestion[] = [];
  if (input.quiz_questions && input.quiz_questions.length > 0) {
    const { data: questions, error: questionsError } = await supabase
      .from("path_quiz_questions")
      .insert(
        input.quiz_questions.map((q) => ({
          assessment_id: assessment.id,
          question_text: q.question_text,
          options: q.options || null,
          correct_option: q.correct_option || null,
        }))
      )
      .select();

    if (questionsError) throw questionsError;
    quiz_questions = questions as PathQuizQuestion[];
  }

  return {
    ...assessment,
    quiz_questions,
  } as PathAssessment;
}

/**
 * Update path assessment
 */
export async function updatePathAssessment(
  assessmentId: string,
  updates: UpdatePathAssessmentInput
): Promise<PathAssessment> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_assessments")
    .update(updates)
    .eq("id", assessmentId)
    .select(`
      *,
      quiz_questions:path_quiz_questions (*)
    `)
    .single();

  if (error) throw error;
  return data as PathAssessment;
}

/**
 * Delete path assessment (cascades to quiz questions)
 */
export async function deletePathAssessment(assessmentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("path_assessments")
    .delete()
    .eq("id", assessmentId);

  if (error) throw error;
}

/**
 * Add a quiz question to an assessment
 */
export async function addPathQuizQuestion(
  assessmentId: string,
  question: {
    question_text: string;
    options?: Array<{ option: string; text: string }>;
    correct_option?: string;
  }
): Promise<PathQuizQuestion> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_quiz_questions")
    .insert({
      assessment_id: assessmentId,
      question_text: question.question_text,
      options: question.options || null,
      correct_option: question.correct_option || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PathQuizQuestion;
}

/**
 * Delete a quiz question
 */
export async function deletePathQuizQuestion(questionId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("path_quiz_questions")
    .delete()
    .eq("id", questionId);

  if (error) throw error;
}

// =====================================================
// PROGRESS TRACKING
// =====================================================

/**
 * Get user progress for all activities in a day
 */
export async function getPathDayProgress(
  enrollmentId: string,
  dayId: string
): Promise<PathActivityProgress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_activity_progress")
    .select(`
      *,
      activity:path_activities (*)
    `)
    .eq("enrollment_id", enrollmentId)
    .eq("activity.path_day_id", dayId);

  if (error) throw error;
  return (data || []) as PathActivityProgress[];
}

/**
 * Create or update activity progress
 */
export async function upsertPathActivityProgress(
  enrollmentId: string,
  activityId: string,
  updates: {
    status?: PathActivityProgress["status"];
    started_at?: string;
    completed_at?: string;
    time_spent_seconds?: number;
  }
): Promise<PathActivityProgress> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_activity_progress")
    .upsert(
      {
        enrollment_id: enrollmentId,
        activity_id: activityId,
        ...updates,
      },
      {
        onConflict: "enrollment_id,activity_id",
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data as PathActivityProgress;
}

/**
 * Submit an assessment response
 */
export async function submitPathAssessment(
  input: SubmitPathAssessmentInput
): Promise<PathAssessmentSubmission> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_assessment_submissions")
    .upsert(
      {
        progress_id: input.progress_id,
        assessment_id: input.assessment_id,
        text_answer: input.text_answer || null,
        file_urls: input.file_urls || null,
        image_url: input.image_url || null,
        quiz_answers: input.quiz_answers || null,
        metadata: input.metadata || {},
        submitted_at: new Date().toISOString(),
      },
      {
        onConflict: "progress_id,assessment_id",
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data as PathAssessmentSubmission;
}

// =====================================================
// BULK OPERATIONS
// =====================================================

/**
 * Get complete day data with activities, content, assessments, and user progress
 */
export async function getPathDayWithActivitiesAndProgress(
  dayId: string,
  enrollmentId?: string
): Promise<PathDayWithActivities & { activities_with_progress?: any[] }> {
  const supabase = await createClient();

  // Get day data
  const { data: day, error: dayError } = await supabase
    .from("path_days")
    .select("*")
    .eq("id", dayId)
    .single();

  if (dayError) throw dayError;

  // Get activities with content and assessments
  const activities = await getPathDayActivities(dayId);

  // Get progress if enrollment provided
  let progress: PathActivityProgress[] = [];
  if (enrollmentId) {
    progress = await getPathDayProgress(enrollmentId, dayId);
  }

  // Combine activities with progress
  const activitiesWithProgress = activities.map((activity) => ({
    ...activity,
    progress: progress.find((p) => p.activity_id === activity.id),
  }));

  return {
    ...day,
    activities,
    activities_with_progress: enrollmentId ? activitiesWithProgress : undefined,
  } as any;
}

/**
 * Batch create activities from a template or migration
 */
export async function batchCreateActivities(
  dayId: string,
  activities: Array<
    CreatePathActivityInput & {
      content?: CreatePathContentInput[];
      assessment?: CreatePathAssessmentInput;
    }
  >
): Promise<FullPathActivity[]> {
  const results: FullPathActivity[] = [];

  for (const activityInput of activities) {
    // Create activity
    const activity = await createPathActivity({
      path_day_id: dayId,
      title: activityInput.title,
      instructions: activityInput.instructions,
      activity_type: activityInput.activity_type,
      display_order: activityInput.display_order,
      estimated_minutes: activityInput.estimated_minutes,
      is_required: activityInput.is_required,
    });

    // Create content items
    const contentItems: PathContent[] = [];
    if (activityInput.content) {
      for (const contentInput of activityInput.content) {
        const content = await createPathContent({
          ...contentInput,
          activity_id: activity.id,
        });
        contentItems.push(content);
      }
    }

    // Create assessment
    let assessment: PathAssessment | null = null;
    if (activityInput.assessment) {
      assessment = await createPathAssessment({
        ...activityInput.assessment,
        activity_id: activity.id,
      });
    }

    results.push({
      ...activity,
      path_content: contentItems,
      path_assessment: assessment,
    });
  }

  return results;
}
