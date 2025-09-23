// Based on the database schema for the learning map feature

// From 20250725075742_add_user_roles.sql

export type UserRoleType = "student" | "TA" | "instructor" | "admin";

export interface UserRole {
  id: string; // uuid
  user_id: string; // uuid
  role: UserRoleType;
}

export interface Cohort {
  id: string; // uuid
  name: string;
  description: string | null;
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

export type MapCategory = "ai" | "3d" | "unity" | "hacking" | "custom";
export type MapVisibility = "public" | "private" | "team";

export interface LearningMap {
  id: string; // uuid
  title: string;
  description: string | null;
  creator_id: string | null; // uuid
  version?: number; // lightweight versioning for forks/pulls
  last_modified_by?: string | null;
  difficulty?: number; // 1-10, overall map difficulty
  category?: MapCategory; // map category
  visibility?: MapVisibility; // visibility setting
  total_students?: number; // cached count
  finished_students?: number; // cached count
  metadata?: Record<string, any>; // jsonb extensible data
  // New optimized image storage fields
  cover_image_url?: string | null; // Public URL to optimized image in B2
  cover_image_blurhash?: string | null; // Blurhash for instant placeholder
  cover_image_key?: string | null; // B2 file key for deletion
  cover_image_updated_at?: string | null; // When image was last updated
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  nodes?: MapNode[]; // Optional relation
}

export interface MapNode {
  id: string; // uuid
  map_id: string; // uuid
  title: string;
  instructions: string | null;
  version?: number; // node-level version
  last_modified_by?: string | null;
  difficulty: number;
  sprite_url: string | null;
  metadata: Record<string, any> | null; // jsonb
  node_type?: "learning" | "text" | "comment"; // Added node_type field with comment support
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  node_content?: NodeContent[]; // Changed from 'content' to 'node_content'
  node_assessments?: NodeAssessment[]; // Changed from 'assessment' to 'node_assessments' and made it an array
  node_paths_source?: NodePath[]; // Added missing relation
  node_paths_destination?: NodePath[]; // Added missing relation
}

export interface TeamMap {
  id: string; // uuid
  team_id: string; // uuid
  map_id: string; // uuid (forked map id)
  original_map_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  visibility?: string;
  metadata?: Record<string, any> | null;
}

export interface NodePath {
  id: string; // uuid
  source_node_id: string; // uuid
  destination_node_id: string; // uuid
}

export interface CohortMapEnrollment {
  id: string; // uuid
  cohort_id: string; // uuid
  map_id: string; // uuid
  enrolled_at: string; // timestamp with time zone
}

export interface UserMapEnrollment {
  id: string; // uuid
  user_id: string; // uuid
  map_id: string; // uuid
  enrolled_at: string; // timestamp with time zone
  completed_at: string | null; // timestamp with time zone
  progress_percentage: number; // 0-100
}

// From 20250725080607_add_map_content.sql

export type ContentType =
  | "video"
  | "canva_slide"
  | "text"
  | "image"
  | "pdf"
  | "resource_link";

export interface NodeContent {
  id: string; // uuid
  node_id: string; // uuid
  content_type: ContentType;
  content_url: string | null;
  content_body: string | null;
  created_at: string; // timestamp with time zone
}

export type AssessmentType =
  | "quiz"
  | "text_answer"
  | "image_upload"
  | "file_upload"
  | "checklist";

export interface NodeAssessment {
  id: string; // uuid
  node_id: string; // uuid
  assessment_type: AssessmentType;
  metadata?: Record<string, any> | null; // jsonb for checklist items and other metadata
  quiz_questions?: QuizQuestion[]; // Optional relation for quizzes
  points_possible?: number | null;
  is_graded?: boolean;
  // Group assessment fields
  is_group_assessment?: boolean;
  group_formation_method?: GroupFormationMethod;
  group_submission_mode?: GroupSubmissionMode;
  target_group_size?: number;
  allow_uneven_groups?: boolean;
  groups_config?: Record<string, any>;
}

export interface QuizQuestion {
  id: string; // uuid
  assessment_id: string; // uuid
  question_text: string;
  options: { option: string; text: string }[] | null; // jsonb
  correct_option: string | null;
}

export type ProgressStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "passed"
  | "failed";

export interface StudentNodeProgress {
  id: string; // uuid
  user_id: string; // uuid
  node_id: string; // uuid
  status: ProgressStatus;
  arrived_at: string | null; // timestamp with time zone
  started_at: string | null; // timestamp with time zone
  submitted_at: string | null; // timestamp with time zone
}

export interface AssessmentSubmission {
  id: string; // uuid
  progress_id: string; // uuid
  assessment_id: string; // uuid
  text_answer: string | null;
  file_urls: string[] | null; // Changed from file_url to file_urls array
  image_url: string | null;
  quiz_answers: Record<string, string> | null; // jsonb, e.g., {"question_id": "A"}
  submitted_at: string; // timestamp with time zone
  metadata?: Record<string, any> | null; // optional extensible metadata (e.g., checklist completion)
  // Group assessment fields
  assessment_group_id?: string | null; // uuid reference to assessment_groups
  submitted_for_group?: boolean; // whether this submission is for the entire group
}

export type Grade = "pass" | "fail";

export interface SubmissionGrade {
  id: string;
  submission_id: string;
  graded_by: string | null; // null for system/auto-graded submissions
  grade: Grade;
  rating?: number;
  points_awarded?: number | null;
  comments?: string;
  graded_at: string;
  profiles?: {
    id: string;
    username: string;
  };
}

export interface NodeLeaderboard {
  id: string; // uuid
  node_id: string; // uuid
  user_id: string; // uuid
  rank: number;
  grade_rating: number | null;
  completion_speed_seconds: number | null; // bigint
  ranked_at: string; // timestamp with time zone
}

// ========================================
// ASSESSMENT GROUPS TYPES
// ========================================

export type GroupFormationMethod = 'manual' | 'shuffle';
export type GroupSubmissionMode = 'all_members' | 'single_submission';

export interface AssessmentGroupSettings {
  is_group_assessment: boolean;
  group_formation_method: GroupFormationMethod;
  group_submission_mode: GroupSubmissionMode;
  target_group_size: number;
  allow_uneven_groups: boolean;
  groups_config: Record<string, any>;
}

export interface AssessmentGroup {
  id: string;
  assessment_id: string;
  group_name: string;
  group_number: number;
  created_at: string;
  created_by: string | null;
}

export interface AssessmentGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface AssessmentGroupWithMembers extends AssessmentGroup {
  members: Array<{
    user_id: string;
    full_name: string | null;
    username: string | null;
    assigned_at: string;
  }>;
}

export interface GroupSubmissionData {
  assessment_group_id: string;
  submitted_for_group: boolean;
}

// Extended NodeAssessment interface with group settings
export interface NodeAssessmentWithGroups extends NodeAssessment {
  is_group_assessment: boolean;
  group_formation_method: GroupFormationMethod;
  group_submission_mode: GroupSubmissionMode;
  target_group_size: number;
  allow_uneven_groups: boolean;
  groups_config: Record<string, any>;
  groups?: AssessmentGroupWithMembers[];
}

// Extended AssessmentSubmission interface with group data
export interface AssessmentSubmissionWithGroup extends AssessmentSubmission {
  assessment_group_id: string | null;
  submitted_for_group: boolean;
}

// Request/Response types for API
export interface CreateAssessmentGroupsRequest {
  assessment_id: string;
  target_group_size: number;
  allow_uneven_groups: boolean;
}

export interface UpdateAssessmentGroupsRequest {
  assessment_id: string;
  groups: Array<{
    group_name: string;
    member_ids: string[];
  }>;
}

export interface AssessmentGroupsResponse {
  groups: AssessmentGroupWithMembers[];
  total_students: number;
  total_groups: number;
}
