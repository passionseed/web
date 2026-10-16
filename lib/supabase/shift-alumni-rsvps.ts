import { createAdminClient } from "@/utils/supabase/admin";

/**
 * RSVPs for SHIFT alumni sessions. Admin-only table holding minors'
 * nicknames: the public page only ever gets counts from here.
 */

export interface AlumniRsvp {
  session_date: string;
  nickname: string;
  cohort: string;
  created_at: string;
}

/** "added", or "already" when this nickname and round already said yes. */
export async function addAlumniRsvp(rsvp: {
  date: string;
  nickname: string;
  cohort: string;
}): Promise<"added" | "already"> {
  const { error } = await createAdminClient()
    .from("shift_alumni_rsvps")
    .insert({ session_date: rsvp.date, nickname: rsvp.nickname, cohort: rsvp.cohort });
  if (!error) return "added";
  if (error.code === "23505") return "already";
  throw error;
}

/** Every RSVP for the given sessions, oldest first. */
export async function listAlumniRsvps(dates: string[]): Promise<AlumniRsvp[]> {
  if (dates.length === 0) return [];
  const { data, error } = await createAdminClient()
    .from("shift_alumni_rsvps")
    .select("session_date, nickname, cohort, created_at")
    .in("session_date", dates)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AlumniRsvp[];
}

/** RSVPs per session date. Empty when the table is missing or unreachable,
 *  so the public page still renders. */
export async function countAlumniRsvps(dates: string[]): Promise<Record<string, number>> {
  try {
    const counts: Record<string, number> = {};
    for (const rsvp of await listAlumniRsvps(dates)) {
      counts[rsvp.session_date] = (counts[rsvp.session_date] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}
