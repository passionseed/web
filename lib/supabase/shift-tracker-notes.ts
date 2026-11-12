import { getShiftWeekLabel } from "@/lib/shift/week-label";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Saves a note to the SHIFT Tracker (/admin/shift) for each of these accounts
 * that is a Tracker student (shift_students.user_id), in the current week.
 * Uses the service role: the caller checks the writer may read the canvas.
 * Returns the names it saved for.
 */
export async function saveTrackerNotes(userIds: string[], body: string, by: string): Promise<string[]> {
  if (userIds.length === 0) return [];
  const db = createAdminClient();
  const { data: students, error } = await db.from("shift_students").select("id, full_name").in("user_id", userIds);
  if (error) throw error;
  if (!students?.length) return [];
  const week = getShiftWeekLabel();
  const { error: insertError } = await db
    .from("shift_student_notes")
    .insert(students.map((s) => ({ student_id: s.id as string, week_label: week, body, created_by: by })));
  if (insertError) throw insertError;
  return students.map((s) => s.full_name as string);
}
