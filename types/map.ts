// Based on the database schema for the learning map feature

// From 20250725075742_add_user_roles.sql

export type UserRoleType = 'student' | 'TA' | 'instructor';

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

export type MapCategory = 'ai' | '3d' | 'unity' | 'hacking' | 'custom';

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
  content?: NodeContent[]; // Optional relation
  assessment?: NodeAssessment; // Optional relation
  paths?: NodePath[]; // Optional relation
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


// From 20250725080607_add_map_content.sql

export type ContentType = 'video' | 'canva_slide' | 'text_with_images';

export interface NodeContent {
  id: string; // uuid
  node_id: string; // uuid
  content_type: ContentType;
  content_url: string | null;
  content_body: string | null;
  created_at: string; // timestamp with time zone
}

export type AssessmentType = 'quiz' | 'text_answer' | 'image_upload' | 'file_upload';

export interface NodeAssessment {
  id: string; // uuid
  node_id: string; // uuid
  assessment_type: AssessmentType;
  questions?: QuizQuestion[]; // Optional relation for quizzes
}

export interface QuizQuestion {
  id: string; // uuid
  assessment_id: string; // uuid
  question_text: string;
  options: { option: string; text: string }[] | null; // jsonb
  correct_option: string | null;
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'submitted' | 'passed' | 'failed';

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
  file_url: string | null;
  image_url: string | null;
  quiz_answers: Record<string, string> | null; // jsonb, e.g., {"question_id": "A"}
  submitted_at: string; // timestamp with time zone
}

export type Grade = 'pass' | 'fail';

export interface SubmissionGrade {
  id: string; // uuid
  submission_id: string; // uuid
  graded_by: string; // uuid
  grade: Grade;
  rating: number | null;
  comments: string | null;
  graded_at: string; // timestamp with time zone
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
