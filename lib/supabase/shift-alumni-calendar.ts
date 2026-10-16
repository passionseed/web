import {
  ALUMNI_DEFAULT_DOC,
  parseAlumniCalendarDoc,
  type AlumniCalendarDoc,
} from "@/lib/content/shift-alumni";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * The saved alumni calendar, or the defaults in code when nothing is saved,
 * the table is missing, or there is no env (CI builds). Never throws, so
 * public pages can call it at build or request time.
 */
export async function loadAlumniCalendar(): Promise<{ doc: AlumniCalendarDoc; updatedAt: string | null }> {
  try {
    const { data } = await createAdminClient()
      .from("shift_alumni_calendar")
      .select("content, updated_at")
      .eq("id", "main")
      .maybeSingle();
    const doc = parseAlumniCalendarDoc(data?.content);
    if (doc) return { doc, updatedAt: data?.updated_at ?? null };
  } catch {
    // Fall through to the defaults.
  }
  return { doc: ALUMNI_DEFAULT_DOC, updatedAt: null };
}
