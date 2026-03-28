// Event types for Super Planner tracking

// Event type constants
export const EVENT_TYPES = {
  PORTFOLIO_UPLOADED: 'portfolio_uploaded',
  INTEREST_QUIZ_STARTED: 'interest_quiz_started',
  INTEREST_QUIZ_COMPLETED: 'interest_quiz_completed',
  INTEREST_QUIZ_ABANDONED: 'interest_quiz_abandoned',
  TCAS_PROGRAM_VIEWED: 'tcas_program_viewed',
  TCAS_PROGRAM_SAVED: 'tcas_program_saved',
  PLAN_CREATED: 'plan_created',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Event data schemas for each event type
export interface PortfolioUploadedData {
  file_count: number;
  file_types: string[];
  total_size_kb: number;
}

export interface InterestQuizStartedData {
  // Empty payload
}

export interface InterestQuizCompletedData {
  top_interests: string[];
  duration_seconds: number;
}

export interface InterestQuizAbandonedData {
  duration_seconds: number;
  questions_answered: number;
}

export interface TcasProgramViewedData {
  program_id: string;
  university_id: string;
  source: 'search' | 'recommendation';
}

export interface TcasProgramSavedData {
  program_id: string;
  university_id: string;
}

export interface PlanCreatedData {
  round_count: number;
  program_ids: string[];
}

// Union type for all event data
export type EventData =
  | PortfolioUploadedData
  | InterestQuizStartedData
  | InterestQuizCompletedData
  | InterestQuizAbandonedData
  | TcasProgramViewedData
  | TcasProgramSavedData
  | PlanCreatedData
  | Record<string, unknown>; // Fallback for extensibility

// Database row type
export interface UserEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  event_data: EventData;
  session_id: string | null;
  created_at: string;
}

// User status from view
export type UserPlannerStatus = 'not_started' | 'in_progress' | 'completed' | 'churned';

export interface UserPlannerStatusRow {
  user_id: string;
  email: string;
  profile_name: string | null;
  status: UserPlannerStatus;
  last_event_at: string | null;
  steps_completed: number;
}

// Step events for progress calculation
export const STEP_EVENTS: EventType[] = [
  EVENT_TYPES.PORTFOLIO_UPLOADED,
  EVENT_TYPES.INTEREST_QUIZ_COMPLETED,
  EVENT_TYPES.TCAS_PROGRAM_VIEWED,
  EVENT_TYPES.TCAS_PROGRAM_SAVED,
  EVENT_TYPES.PLAN_CREATED,
];

// Calculate progress percentage (0-100)
export function calculateProgress(events: UserEvent[]): number {
  const completed = STEP_EVENTS.filter((eventType) =>
    events.some((e) => e.event_type === eventType)
  );
  return Math.round((completed.length / STEP_EVENTS.length) * 100);
}