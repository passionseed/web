import type { AlumniSession } from "@/lib/content/shift-alumni";
import type { AlumniRsvp } from "@/lib/supabase/shift-alumni-rsvps";

/**
 * RSVPs grouped by session for /admin/shift/alumni, each marked with whether
 * the same nickname and round also answered the feedback form. Matching is
 * on a trimmed, lowercased nickname: a hint for the team, not a verification.
 */

export interface RsvpRow extends Pick<AlumniRsvp, "nickname" | "cohort" | "created_at"> {
  answeredFeedback: boolean;
}

export interface SessionRsvps {
  session: AlumniSession;
  rsvps: RsvpRow[];
  /** RSVPs per round, e.g. { "SHIFT[1]": 3 }. */
  byCohort: Record<string, number>;
}

export const personKey = (nickname: string, cohort: string) => `${cohort}|${nickname.trim().toLowerCase()}`;

export function groupRsvps(
  sessions: AlumniSession[],
  rsvps: AlumniRsvp[],
  feedbackKeys: Set<string>,
): SessionRsvps[] {
  return sessions.map((session) => {
    const rows = rsvps
      .filter((r) => r.session_date === session.date)
      .map((r) => ({
        nickname: r.nickname,
        cohort: r.cohort,
        created_at: r.created_at,
        answeredFeedback: feedbackKeys.has(personKey(r.nickname, r.cohort)),
      }));
    const byCohort: Record<string, number> = {};
    for (const row of rows) byCohort[row.cohort] = (byCohort[row.cohort] ?? 0) + 1;
    return { session, rsvps: rows, byCohort };
  });
}
