import { NextResponse } from "next/server";

import { calendarViewer, isUuid } from "@/lib/calendar/route-guard";
import { safeServerError } from "@/lib/security/route-guards";
import { blockAttendance } from "@/lib/supabase/calendar";

type Params = { params: Promise<{ id: string }> };

/** Counts only: booked vs arrived, help asked and given, and who closed with a next step. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await calendarViewer();
  if (!guard.ok) return guard.response;
  if (!isUuid(id)) return NextResponse.json({ error: "Block not found" }, { status: 404 });
  try {
    const attendance = await blockAttendance(id);
    if (attendance === undefined) return NextResponse.json({ error: "Block not found" }, { status: 404 });
    return NextResponse.json({ attendance });
  } catch (error) {
    return safeServerError("Failed to load attendance", error);
  }
}
