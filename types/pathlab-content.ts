// =====================================================
// PATHLAB CONTENT SYSTEM - TYPE DEFINITIONS
// Types for the new PathLab content system
// Separated from maps/nodes system
// =====================================================

// =====================================================
// ENUMS AND CONSTANTS
// =====================================================

// REMOVED: PathActivityType - no longer used
// Activities are now typed by their content_type or assessment_type

export type PathContentType =
  // Inherited from nodes
  | 'video'
  | 'short_video'       // Short-form video content (< 2 min)
  | 'canva_slide'
  | 'text'
  | 'image'
  | 'pdf'
  | 'resource_link'
  | 'order_code'
  // PathLab-specific content types
  | 'daily_prompt'      // Daily question or challenge
  | 'reflection_card'   // Guided reflection with prompts
  | 'emotion_check'     // Emotional state tracking
  | 'progress_snapshot' // Progress visualization
  | 'ai_chat'           // AI chat with objective tracking
  | 'npc_chat';         // Scripted conversation with NPCs (branching dialogue)

export type PathAssessmentType =
  // Inherited from nodes
  | 'quiz'
  | 'text_answer'
  | 'file_upload'
  | 'image_upload'
  | 'checklist'
  // PathLab-specific assessment types
  | 'daily_reflection'  // Daily structured reflection
  | 'interest_rating'   // Interest level assessment
  | 'energy_check';     // Energy/engagement check

export type PathActivityProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped';

// =====================================================
// CORE INTERFACES
// =====================================================

/**
 * PathActivity - Learning activity within a PathLab day
 * Each activity has EITHER content OR assessment (not both)
 * Activity type is determined by content_type or assessment_type
 */
export interface PathActivity {
  id: string;
  path_day_id: string;
  title: string;
  instructions: string | null;
  display_order: number;
  estimated_minutes: number | null;
  is_required: boolean;
  is_draft: boolean;
  draft_reason: string | null;
  created_at: string;
  updated_at: string;

  // Relations (loaded via joins)
  // Each activity should have EITHER path_content OR path_assessment
  path_content?: PathContent[];
  path_assessment?: PathAssessment | null;
}

/**
 * PathContent - Learning materials for PathLab activities
 * Similar to node_content but for PathLab
 */
export interface PathContent {
  id: string;
  activity_id: string;
  content_type: PathContentType;
  content_title: string | null;
  content_url: string | null;
  content_body: string | null;
  display_order: number;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * PathAssessment - Evaluations for PathLab activities
 * Similar to node_assessments but for PathLab
 */
export interface PathAssessment {
  id: string;
  activity_id: string;
  assessment_type: PathAssessmentType;
  points_possible: number | null;
  is_graded: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Relations (loaded via joins)
  quiz_questions?: PathQuizQuestion[];
}

/**
 * PathQuizQuestion - Quiz questions for PathLab assessments
 */
export interface PathQuizQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  options: Array<{ option: string; text: string }> | null;
  correct_option: string | null;
  created_at: string;
}

/**
 * PathActivityProgress - User progress through PathLab activities
 */
export interface PathActivityProgress {
  id: string;
  enrollment_id: string;
  activity_id: string;
  status: PathActivityProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
  created_at: string;
  updated_at: string;

  // Relations (loaded via joins)
  activity?: PathActivity;
  submission?: PathAssessmentSubmission | null;
}

/**
 * PathAssessmentSubmission - User responses to PathLab assessments
 */
export interface PathAssessmentSubmission {
  id: string;
  progress_id: string;
  assessment_id: string;
  text_answer: string | null;
  file_urls: string[] | null;
  image_url: string | null;
  quiz_answers: Record<string, string> | null;  // Maps question_id to selected option
  metadata: Record<string, any>;
  submitted_at: string;
}

// =====================================================
// EXTENDED TYPES FOR QUERIES
// =====================================================

/**
 * PathDayWithActivities - PathDay extended with activities
 * Used when fetching day data with full activity details
 */
export interface PathDayWithActivities {
  id: string;
  path_id: string;
  day_number: number;
  title: string | null;
  context_text: string;
  reflection_prompts: string[];
  node_ids: string[];  // Legacy field for backward compatibility
  created_at: string;
  migrated_from_nodes: boolean;
  migration_completed_at: string | null;

  // Relations
  activities?: PathActivity[];
}

/**
 * FullPathActivity - Activity with all nested content
 * Used for complete activity data with content and assessment
 */
export interface FullPathActivity extends PathActivity {
  path_content: PathContent[];
  path_assessment: (PathAssessment & {
    quiz_questions: PathQuizQuestion[];
  }) | null;
}

/**
 * PathActivityWithProgress - Activity combined with user progress
 * Used in student views to show both activity and their progress
 */
export interface PathActivityWithProgress extends PathActivity {
  progress?: PathActivityProgress;
}

// =====================================================
// INPUT TYPES FOR MUTATIONS
// =====================================================

/**
 * CreatePathActivityInput - Input for creating a new activity
 * Note: activity_type removed - type is determined by content_type or assessment_type
 */
export interface CreatePathActivityInput {
  path_day_id: string;
  title: string;
  instructions?: string;
  display_order: number;
  estimated_minutes?: number;
  is_required?: boolean;
  is_draft?: boolean;
  draft_reason?: string | null;
}

/**
 * UpdatePathActivityInput - Input for updating an activity
 * Note: activity_type removed - type is determined by content_type or assessment_type
 */
export interface UpdatePathActivityInput {
  title?: string;
  instructions?: string;
  display_order?: number;
  estimated_minutes?: number;
  is_required?: boolean;
  is_draft?: boolean;
  draft_reason?: string | null;
}

/**
 * CreatePathContentInput - Input for creating content
 */
export interface CreatePathContentInput {
  activity_id: string;
  content_type: PathContentType;
  content_title?: string;
  content_url?: string;
  content_body?: string;
  display_order: number;
  metadata?: Record<string, any>;
}

/**
 * UpdatePathContentInput - Input for updating content
 */
export interface UpdatePathContentInput {
  content_type?: PathContentType;
  content_title?: string;
  content_url?: string;
  content_body?: string;
  display_order?: number;
  metadata?: Record<string, any>;
}

/**
 * CreatePathAssessmentInput - Input for creating assessment
 */
export interface CreatePathAssessmentInput {
  activity_id: string;
  assessment_type: PathAssessmentType;
  points_possible?: number;
  is_graded?: boolean;
  metadata?: Record<string, any>;
  quiz_questions?: Array<{
    question_text: string;
    options?: Array<{ option: string; text: string }>;
    correct_option?: string;
  }>;
}

/**
 * UpdatePathAssessmentInput - Input for updating assessment
 */
export interface UpdatePathAssessmentInput {
  assessment_type?: PathAssessmentType;
  points_possible?: number;
  is_graded?: boolean;
  metadata?: Record<string, any>;
}

/**
 * SubmitPathAssessmentInput - Input for submitting assessment response
 */
export interface SubmitPathAssessmentInput {
  progress_id: string;
  assessment_id: string;
  text_answer?: string;
  file_urls?: string[];
  image_url?: string;
  quiz_answers?: Record<string, string>;
  metadata?: Record<string, any>;
}

// =====================================================
// MIGRATION TYPES
// =====================================================

/**
 * MigrationResult - Result from migration function
 */
export interface MigrationResult {
  path_day_id: string;
  activities_created: number;
  content_items_migrated: number;
  assessments_migrated: number;
  quiz_questions_migrated: number;
  status: 'success' | 'error';
  error_message: string | null;
}

/**
 * MigrationStatus - Overall migration status
 */
export interface MigrationStatus {
  total_days: number;
  migrated_days: number;
  unmigrated_days: number;
  migration_percentage: number;
}

/**
 * PathMigrationDetails - Detailed migration info for a path
 */
export interface PathMigrationDetails {
  day_number: number;
  day_id: string;
  is_migrated: boolean;
  node_count: number;
  activity_count: number;
  migration_date: string | null;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * PathContentMetadata - Typed metadata for different content types
 */
export type PathContentMetadata =
  | DailyPromptMetadata
  | ReflectionCardMetadata
  | EmotionCheckMetadata
  | ProgressSnapshotMetadata
  | AIChatMetadata
  | NPCChatMetadata
  | Record<string, any>;

export interface DailyPromptMetadata {
  prompt_type: 'reflection' | 'action' | 'gratitude' | 'challenge';
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

export interface ReflectionCardMetadata {
  prompts: string[];
  categories?: string[];
}

export interface EmotionCheckMetadata {
  emotion_scale: Array<{ value: number; label: string }>;
}

export interface ProgressSnapshotMetadata {
  metrics: Array<{ name: string; value: number; max: number }>;
}

export interface AIChatMetadata {
  system_prompt: string;             // Prompt for the AI
  objective: string;                  // Goal that defines completion
  completion_criteria?: string;       // Optional: How to detect completion
  model?: string;                     // AI model (default: "passion-6")
  max_messages?: number;              // Optional: Message limit
}

export interface NPCChatMetadata {
  conversation_id: string;            // ID of the NPC conversation tree
  summary?: string;                   // Brief summary of the conversation (shown to students)
  allow_restart?: boolean;            // Allow user to restart conversation (default: false)
  show_history?: boolean;             // Show conversation history (default: true)
}

/**
 * PathAssessmentMetadata - Typed metadata for different assessment types
 */
export type PathAssessmentMetadata =
  | ChecklistMetadata
  | DailyReflectionMetadata
  | InterestRatingMetadata
  | EnergyCheckMetadata
  | Record<string, any>;

export interface ChecklistMetadata {
  items: Array<{ id: string; text: string; required?: boolean }>;
}

export interface DailyReflectionMetadata {
  prompts: string[];
  min_words?: number;
}

export interface InterestRatingMetadata {
  scale_min: number;
  scale_max: number;
  labels?: { min: string; max: string };
}

export interface EnergyCheckMetadata {
  levels: Array<{ value: number; label: string; description?: string }>;
}

// =====================================================
// BUILDER TYPES (for PathDayBuilder component)
// =====================================================

/**
 * BuilderDay - Day representation in the builder UI
 * Supports both legacy (node_ids) and new (activities) modes
 */
export interface BuilderDay {
  id?: string;
  day_number: number;
  title: string | null;
  context_text: string;
  reflection_prompts: string[];
  // Legacy mode
  node_ids: string[];
  // New mode
  activities?: PathActivity[];
  migrated_from_nodes?: boolean;
}

/**
 * BuilderMode - Mode for PathDayBuilder component
 */
export type BuilderMode = 'legacy' | 'activities';

// =====================================================
// API RESPONSE TYPES
// =====================================================

/**
 * PathActivitiesResponse - Response from GET /api/pathlab/activities
 */
export interface PathActivitiesResponse {
  activities: FullPathActivity[];
}

/**
 * PathActivityResponse - Response from POST/PATCH /api/pathlab/activities
 */
export interface PathActivityResponse {
  activity: FullPathActivity;
}

/**
 * MigrationResponse - Response from POST /api/pathlab/migrate
 */
export interface MigrationResponse {
  results: MigrationResult[];
  summary: {
    total_days_processed: number;
    successful: number;
    failed: number;
  };
}
