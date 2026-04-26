// Hackathon Phase Activity Types

export type ContentType =
  | 'video'
  | 'short_video'
  | 'canva_slide'
  | 'text'
  | 'image'
  | 'pdf'
  | 'ai_chat'
  | 'npc_chat'
  | 'chat_comic';

export type AssessmentType =
  | 'text_answer'
  | 'file_upload'
  | 'image_upload';

export interface HackathonProgramPhase {
  id: string;
  program_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  phase_number: number;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HackathonPhaseActivity {
  id: string;
  phase_id: string;
  title: string;
  instructions: string | null;
  display_order: number;
  estimated_minutes: number | null;
  is_required: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface HackathonPhaseActivityContent {
  id: string;
  activity_id: string;
  content_type: ContentType;
  content_title: string | null;
  content_url: string | null;
  content_body: string | null;
  display_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface HackathonPhaseActivityAssessment {
  id: string;
  activity_id: string;
  assessment_type: AssessmentType;
  points_possible: number;
  is_graded: boolean;
  metadata: {
    rubric?: Record<string, number>;
    min_words?: number;
    submission_label?: string;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export interface HackathonPhaseWithActivities extends HackathonProgramPhase {
  activities: (HackathonPhaseActivity & {
    content?: HackathonPhaseActivityContent[];
    assessment?: HackathonPhaseActivityAssessment | null;
  })[];
}

export interface PhaseActivitySubmission {
  id: string;
  phase_activity_id: string;
  user_id: string;
  submission_type: 'individual' | 'team';
  content_text?: string;
  content_url?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
}
