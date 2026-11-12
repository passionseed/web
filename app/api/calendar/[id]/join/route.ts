import { NextResponse } from "next/server";

import { calendarViewer, isUuid } from "@/lib/calendar/route-guard";
import { safeServerError } from "@/lib/security/route-guards";
import { blockOwner, setJoined } from "@/lib/supabase/calendar";
import { readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

/** { joined: true } says "I'm in"; false takes it back. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await calendarViewer();
  if (!guard.ok) return guard.response;
  const body = (await readJson(request)) as { joined?: unknown } | undefined;
  if (typeof body?.joined !== "boolean") return NextResponse.json({ error: "Say joined: true or false" }, { status: 422 });
  try {
    if (!isUuid(id) || !(await blockOwner(id))) return NextResponse.json({ error: "Block not found" }, { status: 404 });
    await setJoined(id, guard.viewer.id, body.joined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to update", error);
  }
}
