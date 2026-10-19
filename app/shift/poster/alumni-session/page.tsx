import type { Metadata } from "next";

import { ShiftAlumniSessionPoster } from "@/components/shift/poster/ShiftAlumniSessionPoster";
import { ChromeBevelFilter } from "@/components/shift/poster/riso";
import { alumniCalendar } from "@/lib/content/shift-alumni";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";

/**
 * Poster for the next SHIFT alumni session, 1080x1350, from the live
 * calendar. Export: screenshot #shift-alumni-session.
 */

export const metadata: Metadata = {
  title: "SHIFT Alumni session poster",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ShiftAlumniSessionPosterPage() {
  const { doc } = await loadAlumniCalendar();
  const next = alumniCalendar(doc).upcoming.find((s) => !s.cancelled);

  return (
    <div className="min-h-screen overflow-auto bg-neutral-950 p-10">
      {/* Keep the Next.js dev indicator out of exported screenshots. */}
      <style>{"nextjs-portal{display:none!important}"}</style>
      <ChromeBevelFilter />
      {next ? (
        <ShiftAlumniSessionPoster session={next} defaults={doc.defaults} />
      ) : (
        <p className="text-neutral-300">No upcoming alumni session in the calendar.</p>
      )}
    </div>
  );
}
