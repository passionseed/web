export interface ShiftStudent {
  id: string;
  full_name: string;
  ig_handle: string | null;
  discord_handle: string | null;
  application_id: string | null;
  user_id: string | null;
  discord_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftStudentNote {
  id: string;
  student_id: string;
  week_label: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftStudentSummary extends ShiftStudent {
  note_count: number;
  latest_note: Pick<ShiftStudentNote, "body" | "week_label" | "created_at"> | null;
  has_note_this_week: boolean;
}

export interface ShiftStudentsResponse {
  students: ShiftStudentSummary[];
  stats: {
    totalKids: number;
    notesThisWeek: number;
    kidsMissingNoteThisWeek: number;
    currentWeekLabel: string;
  };
}

export type ShiftApplicationStatus = "new" | "accepted" | "waitlist" | "declined";

export interface ShiftApplicationRow {
  id: string;
  cohort: string;
  full_name: string;
  nickname: string;
  grade: "m4" | "m5" | "m6" | "other";
  target_track: string | null;
  problem: string;
  availability: "all_days" | "some_days";
  ig_handle: string;
  discord_handle: string | null;
  /** Phone or LINE. Null for applicants aged 20+ (2026-10-29 on). */
  parent_contact: string | null;
  consent: boolean;
  /** PDPA parent consent (2026-10-29 on). Null on older rows. */
  birth_date: string | null;
  consent_notice_version: string | null;
  parent_email: string | null;
  parent_token_hash: string | null;
  parent_email_sent_at: string | null;
  parent_name: string | null;
  parent_relationship: string | null;
  parent_consented_at: string | null;
  parent_declined_at: string | null;
  parent_withdrawn_at: string | null;
  parent_consent_ip: string | null;
  parent_consent_user_agent: string | null;
  /** Optional, separate tick for AI progress tracking (SeedStack). */
  parent_ai_consented_at: string | null;
  parent_ai_notice_version: string | null;
  source: string | null;
  /** Self-reported "where did you find us". Null on rows before 2026-10-24. */
  found_via: "friend" | "camphub" | "instagram" | "facebook" | null;
  status: ShiftApplicationStatus;
  paid_at: string | null;
  admin_note: string | null;
  join_token: string | null;
  user_id: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
  linked_at: string | null;
  discord_joined_at: string | null;
  discord_error: string | null;
  created_at: string;
  updated_at: string;
}
