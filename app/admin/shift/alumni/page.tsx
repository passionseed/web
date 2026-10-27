import Link from "next/link";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AlumniRsvpSessions } from "@/components/admin/shift-alumni/AlumniRsvpSessions";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import { adminMetadata } from "@/lib/admin/metadata";
import { requireAdmin } from "@/lib/admin/requireAdmin";
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

const ALUMNI_LINKS = [
  { href: "/shift/alumni", label: "Edit sessions on /shift/alumni" },
  { href: "/shift/poster/alumni-session", label: "Poster for the next session" },
  { href: "/admin/shift/alumni/board", label: "Alumni board (goals, teams, standups)" },
];

function AlumniLinks() {
  return (
    <nav aria-label="Alumni tools" className="flex flex-wrap gap-x-4 text-sm">
      {ALUMNI_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-11 items-center underline decoration-muted-foreground underline-offset-4 hover:decoration-foreground active:decoration-foreground"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default async function AdminShiftAlumniPage() {
  // The admin layout also checks, but this page reads with the service-role client.
  await requireAdmin();
  const { doc } = await loadAlumniCalendar();
  const { upcoming, past } = alumniCalendar(doc);
  const sessions = [...upcoming, ...past];
  const [rsvps, answered] = await Promise.all([loadRsvps(sessions.map((s) => s.date)), feedbackKeys()]);
  const nextDate = upcoming.find((s) => !s.cancelled)?.date;

  return (
    <div className="space-y-4">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Alumni sessions"
        description="Who tapped ไปด้วย for each alumni session. Anyone with the link can RSVP, so names are as typed and not verified."
      />
      <AlumniLinks />

      {rsvps === null ? (
        <AdminErrorState
          title="Could not load RSVPs"
          message="The alumni session RSVPs did not load. Reload the page to try again."
        />
      ) : (
        <AlumniRsvpSessions groups={groupRsvps(sessions, rsvps, answered)} nextDate={nextDate} />
      )}
    </div>
  );
}
