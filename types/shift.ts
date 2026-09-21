export interface ShiftStudent {
  id: string;
  full_name: string;
  ig_handle: string | null;
  discord_handle: string | null;
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
