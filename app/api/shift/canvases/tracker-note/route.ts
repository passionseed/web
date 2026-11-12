import { NextResponse } from "next/server";

import { requireUser, safeServerError } from "@/lib/security/route-guards";
import { trackerNoteBody, trackerNoteSchema } from "@/lib/shift/canvas-chat";
import { canViewShiftCanvases } from "@/lib/supabase/shift-canvas-access";
import { readShiftCanvas } from "@/lib/supabase/shift-canvases";
import { saveTrackerNotes } from "@/lib/supabase/shift-tracker-notes";

/**
 * POST /api/shift/canvases/tracker-note: saves one of Claude's answers about a
 * canvas as a SHIFT Tracker note for everyone on that canvas who is in the
 * Tracker. Same access as the canvases (canViewShiftCanvases). The people
 * come from the canvas, never from the request.
 */
export async function POST(request: Request) {
  const viewer = await requireUser();
  if (!viewer.ok) return viewer.response;

  const parsed = trackerNoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    if (!(await canViewShiftCanvases(viewer.value.userId))) {
      return NextResponse.json({ error: "Only SHIFT staff and mentors can save canvas notes." }, { status: 403 });
    }
    const canvas = await readShiftCanvas(parsed.data.boardId, parsed.data.frameId);
    if (!canvas) return NextResponse.json({ error: "That canvas no longer exists." }, { status: 404 });

    const people = [...(canvas.row.ownerPerson ? [canvas.row.ownerPerson] : []), ...canvas.row.team].map((p) => p.userId);
    const saved = await saveTrackerNotes(people, trackerNoteBody(canvas.row.title, parsed.data.answer), viewer.value.userId);
    if (saved.length === 0) {
      return NextResponse.json({ error: "Nobody on this canvas is in the SHIFT Tracker yet." }, { status: 422 });
    }
    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    return safeServerError("Could not save the note", error);
  }
}
