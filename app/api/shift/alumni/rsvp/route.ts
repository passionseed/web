import { NextResponse } from "next/server";

import { alumniCalendar } from "@/lib/content/shift-alumni";
import { alumniRsvpSchema } from "@/lib/shift/alumniRsvp";
import { safeServerError } from "@/lib/security/route-guards";
import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { addAlumniRsvp } from "@/lib/supabase/shift-alumni-rsvps";

/**
 * Public "I'm coming" for a SHIFT alumni session. No login, same as
 * /api/shift/feedback: the link is opened from LINE. Only upcoming sessions
 * that are on can be RSVP'd. The table is admin-only, so the insert uses the
 * service role.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = alumniRsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid RSVP" }, { status: 422 });
  }

  const rsvp = parsed.data;
  // Honeypot filled: pretend success so bots learn nothing.
  if (rsvp.website) return NextResponse.json({ ok: true });

  const { doc } = await loadAlumniCalendar();
  const session = alumniCalendar(doc).upcoming.find((s) => s.date === rsvp.date);
  if (!session || session.cancelled) {
    return NextResponse.json({ error: "นัดนี้ปิดรับแล้ว" }, { status: 422 });
  }

  try {
    const result = await addAlumniRsvp(rsvp);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return safeServerError("Failed to save alumni RSVP", error);
  }
}
