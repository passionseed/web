import Link from "next/link";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AlumniRsvpSessions } from "@/components/admin/shift-alumni/AlumniRsvpSessions";
import { adminMetadata } from "@/lib/admin/metadata";
import { alumniCalendar } from "@/lib/content/shift-alumni";
import { groupRsvps, personKey } from "@/lib/shift/alumniRsvpSummary";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { listAlumniRsvps, type AlumniRsvp } from "@/lib/supabase/shift-alumni-rsvps";
import { listShiftFeedback } from "@/lib/supabase/shift-feedback";

export const metadata = adminMetadata("/admin/shift/alumni");
export const dynamic = "force-dynamic";

/** Nickname and round of everyone who answered the feedback form. */
async function feedbackKeys(): Promise<Set<string>> {
  try {
    const rows = await listShiftFeedback();
    return new Set(rows.map((r) => personKey(r.nickname, r.cohort)));
  } catch {
    return new Set();
  }
}

async function loadRsvps(dates: string[]): Promise<AlumniRsvp[] | null> {
  try {
    return await listAlumniRsvps(dates);
  } catch (error) {
    console.error("Failed to load alumni RSVPs:", error);
    return null;
  }
}

export default async function AdminShiftAlumniPage() {
  const { doc } = await loadAlumniCalendar();
  const { upcoming, past } = alumniCalendar(doc);
  const sessions = [...upcoming, ...past];
  const [rsvps, answered] = await Promise.all([loadRsvps(sessions.map((s) => s.date)), feedbackKeys()]);
  const nextDate = upcoming.find((s) => !s.cancelled)?.date;

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">SHIFT Alumni</h2>
        <p className="text-sm text-muted-foreground">
          Who tapped ไปด้วย for each alumni session. Anyone with the link can RSVP, so names are as typed and not
          verified.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/shift/alumni" className="underline underline-offset-4">
            Edit sessions on /shift/alumni
          </Link>
          <Link href="/shift/poster/alumni-session" className="underline underline-offset-4">
            Poster for the next session
          </Link>
          <Link href="/admin/shift/alumni/board" className="underline underline-offset-4">
            Alumni board (goals, teams, standups)
          </Link>
        </div>
      </div>

      {rsvps === null ? (
        <p role="alert" className="text-sm text-muted-foreground">Failed to load RSVPs.</p>
      ) : (
        <AlumniRsvpSessions groups={groupRsvps(sessions, rsvps, answered)} nextDate={nextDate} />
      )}
    </div>
  );
}
