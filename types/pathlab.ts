export type SeedType = "collaborative" | "pathlab";

export type PathEnrollmentStatus = "active" | "paused" | "quit" | "explored";

export type PathReflectionDecision =
  | "continue_now"
  | "continue_tomorrow"
  | "pause"
  | "quit"
  | "final_reflection";

export type PathExitReasonCategory =
  | "boring"
  | "confusing"
  | "stressful"
  | "not_me";

export type PathExitInterestChange = "more" | "less" | "same";

export type PathWouldExploreDeeper = "yes" | "maybe" | "no";

export interface Path {
  id: string;
  seed_id: string;
  total_days: number;
  created_by: string;
  created_at: string;
}

export interface PathDay {
  id: string;
  path_id: string;
  day_number: number;
  title: string | null;
  context_text: string;
  reflection_prompts: string[];
  node_ids: string[];
  created_at: string;
}

export interface PathEnrollment {
  id: string;
  user_id: string;
  path_id: string;
  current_day: number;
  status: PathEnrollmentStatus;
  why_joined: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

export interface PathReflection {
  id: string;
  enrollment_id: string;
  day_number: number;
  energy_level: number;
  confusion_level: number;
  interest_level: number;
  open_response: string | null;
  decision: PathReflectionDecision;
  time_spent_minutes: number | null;
  created_at: string;
}

export interface PathExitReflection {
  id: string;
  enrollment_id: string;
  trigger_day: number;
  reason_category: PathExitReasonCategory;
  interest_change: PathExitInterestChange;
  open_response: string | null;
  created_at: string;
}

export interface PathEndReflection {
  id: string;
  enrollment_id: string;
  overall_interest: number;
  fit_level: number;
  surprise_response: string | null;
  would_explore_deeper: PathWouldExploreDeeper;
  created_at: string;
}

export interface PathReport {
  id: string;
  enrollment_id: string;
  generated_by: string;
  report_data: Record<string, unknown>;
  report_text: string | null;
  share_token: string;
  created_at: string;
}

export interface PathTrendPoint {
  day_number: number;
  energy_level: number;
  confusion_level: number;
  interest_level: number;
  time_spent_minutes: number | null;
}

export interface PathReportData {
  seed_title: string;
  student_name: string | null;
  status: PathEnrollmentStatus;
  days_completed: number;
  total_days: number;
  total_time_minutes: number;
  trend: PathTrendPoint[];
  exit_reflection: PathExitReflection | null;
  end_reflection: PathEndReflection | null;
}
