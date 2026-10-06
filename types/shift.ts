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
  parent_contact: string;
  consent: boolean;
  source: string | null;
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
