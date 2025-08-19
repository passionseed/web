// Based on the database schema for the learning map feature

// From 20250725075742_add_user_roles.sql

export type UserRoleType = "student" | "TA" | "instructor";

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

export interface LearningMap {
  id: string; // uuid
  title: string;
  description: string | null;
  creator_id: string | null; // uuid
  difficulty?: number; // 1-10, overall map difficulty
  category?: MapCategory; // map category
  total_students?: number; // cached count
  finished_students?: number; // cached count
  metadata?: Record<string, any>; // jsonb extensible data
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  nodes?: MapNode[]; // Optional relation
}

export interface MapNode {
  id: string; // uuid
  map_id: string; // uuid
  title: string;
  instructions: string | null;
  difficulty: number;
  sprite_url: string | null;
  metadata: Record<string, any> | null; // jsonb
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  node_content?: NodeContent[]; // Changed from 'content' to 'node_content'
  node_assessments?: NodeAssessment[]; // Changed from 'assessment' to 'node_assessments' and made it an array
  node_paths_source?: NodePath[]; // Added missing relation
  node_paths_destination?: NodePath[]; // Added missing relation
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
  | "file_upload";

export interface NodeAssessment {
  id: string; // uuid
  node_id: string; // uuid
  assessment_type: AssessmentType;
  quiz_questions?: QuizQuestion[]; // Optional relation for quizzes
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
}

export type Grade = "pass" | "fail";

export interface SubmissionGrade {
  id: string;
  submission_id: string;
  graded_by: string | null; // null for system/auto-graded submissions
  grade: Grade;
  rating?: number;
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
