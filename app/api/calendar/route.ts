import { NextResponse } from "next/server";

import { addDays, weekStart } from "@/lib/calendar/core";
import { calendarViewer, knownRoom, mayAttachBoard } from "@/lib/calendar/route-guard";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { safeServerError } from "@/lib/security/route-guards";
import { blockColumns, createBlock, listBlocks } from "@/lib/supabase/calendar";
import { announceBlock, shareSettings } from "@/lib/supabase/calendar-notify";
import { readJson } from "@/lib/whiteboard/route-guard";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;

/** Blocks from ?from to ?to (Bangkok dates); defaults to this week. */
export async function GET(request: Request) {
  const guard = await calendarViewer();
  if (!guard.ok) return guard.response;
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? weekStart(bangkokToday());
  const to = params.get("to") ?? addDays(from, 6);
  if (!DATE.test(from) || !DATE.test(to) || to < from || to > addDays(from, MAX_DAYS)) {
    return NextResponse.json({ error: "Pick a shorter date range" }, { status: 422 });
  }
  try {
    const [blocks, share] = await Promise.all([listBlocks(guard.viewer, from, to), shareSettings()]);
    return NextResponse.json({ blocks, share });
  } catch (error) {
    return safeServerError("Failed to load calendar", error);
  }
}

export async function POST(request: Request) {
  const guard = await calendarViewer();
  if (!guard.ok) return guard.response;
  const parsed = blockColumns(await readJson(request));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });
  if (!(await mayAttachBoard(guard.viewer, parsed.columns))) {
    return NextResponse.json({ error: "Only the board owner can attach this board" }, { status: 403 });
  }
  if (!(await knownRoom(parsed.columns.room_channel_id))) {
    return NextResponse.json({ error: "Pick one of the community voice rooms" }, { status: 422 });
  }
  try {
    const id = await createBlock(guard.viewer, parsed.columns, parsed.roomBoard);
    const c = parsed.columns as { title: string; starts_at: string; ends_at: string; place: string | null };
    await announceBlock({ id, title: c.title, startsAt: c.starts_at, endsAt: c.ends_at, place: c.place }, guard.viewer.name);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to add block", error);
  }
}
