// Review system
export type ReviewStatus = "pending_review" | "passed" | "revision_required";
export type SubmissionScope = "individual" | "team";

// Common entities
export interface Person {
  id: string;
  name: string | null;
  email: string | null;
  university?: string | null;
}

export interface SubmissionMember {
  participant_id: string;
  name: string;
  email: string;
  university: string;
  is_owner: boolean;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  university: string;
  created_at: string;
  phone?: string | null;
  line_id?: string | null;
  discord_username?: string | null;
  instagram_handle?: string | null;
  grade_level?: string | null;
  track?: string | null;
  password_hash?: string | null;
}

// Submissions
export interface TeamSubmissionDetail {
  id: string;
  activity_id: string;
  activity_title: string | null;
  activity_display_order?: number | null;
  phase_id?: string | null;
  phase_title?: string | null;
  phase_number?: number | null;
  assessment_id?: string | null;
  prompt?: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
  submitted_by_name: string | null;
}

export interface IndividualSubmissionDetail {
  id: string;
  participant_id?: string;
  participant_name: string | null;
  activity_id: string;
  activity_title: string | null;
  activity_display_order?: number | null;
  phase_id?: string | null;
  phase_title?: string | null;
  phase_number?: number | null;
  assessment_id?: string | null;
  prompt?: string | null;
  status: string;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  submitted_at: string | null;
}

// Activity comments
export interface ActivityCommentReply {
  id: string;
  comment_id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar_url: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface ActivityComment {
  id: string;
  activity_id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar_url: string | null;
  content: string;
  engagement_score: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  replies: ActivityCommentReply[];
}

// Pagination
export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

// Review
export interface Review {
  id: string;
  review_status: ReviewStatus;
  score_awarded: number | null;
  points_possible: number | null;
  feedback: string;
  reviewed_at: string | null;
}

export interface SubmissionRevision {
  n: number;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[] | null;
  submitted_at: string;
  review: {
    status: ReviewStatus;
    score_awarded: number | null;
    points_possible: number | null;
    feedback: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
  } | null;
}

// Activity grouping (used in team submissions)
export interface ActivityGroup {
  activity_id: string;
  activity_title: string | null;
  activity_display_order: number | null;
  phase_id: string | null;
  phase_title: string | null;
  phase_number: number | null;
  prompt: string | null;
  status: string;
  submitted_at: string | null;
  team_submission: TeamSubmissionDetail | null;
  participant_submissions: IndividualSubmissionDetail[];
  comments: ActivityComment[];
}

export interface PhaseGroup {
  phase_id: string;
  phase_title: string | null;
  phase_number: number | null;
  activities: ActivityGroup[];
}

// Team data (used in team submissions page)
export interface TeamData {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  member_count: number;
  members: SubmissionMember[];
  total_score: number;
  activities: ActivityGroup[];
}

// Teams page types
export interface TeamMember {
  joined_at: string;
  participant_id: string;
  hackathon_participants: Participant;
}

export interface HackathonTeam {
  id: string;
  name: string;
  lobby_code: string;
  owner_id: string;
  created_at: string;
  total_score: number;
  hackathon_team_members: TeamMember[];
}

export interface LeaderboardMember {
  name: string;
  email: string;
  university: string;
}

export interface LeaderboardTeam {
  id: string;
  name: string;
  lobby_code: string;
  member_count: number;
  members: LeaderboardMember[];
  total_score: number;
  score_per_member: number;
  team_submissions: TeamSubmissionDetail[];
  individual_submissions: IndividualSubmissionDetail[];
}

export interface AssignedMentor {
  id: string;
  mentor_id: string;
  assigned_at: string;
  mentor_profiles: {
    id: string;
    full_name: string;
    email: string;
    session_type: string;
    photo_url: string | null;
  } | null;
}

export interface MentorOption {
  id: string;
  full_name: string;
  email: string;
  photo_url: string | null;
}

// Submissions review page
export interface Activity {
  id: string;
  title: string | null;
  instructions: string | null;
  hackathon_program_phases?: {
    title: string | null;
    phase_number: number | null;
  } | null;
}

export interface Assessment {
  id: string;
  assessment_type: string;
  points_possible: number | null;
  is_graded: boolean | null;
  metadata: Record<string, unknown> | null;
}

export interface AdminSubmission {
  scope: SubmissionScope;
  id: string;
  status: string;
  review_status: ReviewStatus;
  submitted_at: string | null;
  text_answer: string | null;
  image_url: string | null;
  file_urls: string[];
  revisions: SubmissionRevision[];
  participant: Person | null;
  team: { id: string; name: string | null; lobby_code: string | null } | null;
  team_members: Person[];
  submitted_by: Person | null;
  activity: Activity | null;
  assessment: Assessment | null;
  review: Review | null;
}

export interface SubmissionCounts {
  total: number;
  pending_review: number;
  passed: number;
  revision_required: number;
}

// Cluster visualization
export interface ClusterData {
  id: string;
  cluster_index: number;
  label: string | null;
  summary: string | null;
  member_count: number;
  color: string | null;
}

export interface ClusterPoint {
  assignmentId: string;
  clusterId: string;
  embeddingId: string;
  x: number;
  y: number;
  distance: number | null;
  snippet: string;
}

export interface ClusteringMeta {
  id: string;
  k: number;
  sample_count: number;
  created_at: string;
  algorithm: string;
}

// Status label map
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending_review: "Pending",
  passed: "Passed",
  revision_required: "Needs revision",
};
