import { NextResponse } from "next/server";

import { addDays, weekStart } from "@/lib/calendar/core";
import { calendarViewer, mayAttachBoard } from "@/lib/calendar/route-guard";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { safeServerError } from "@/lib/security/route-guards";
import { blockColumns, createBlock, listBlocks } from "@/lib/supabase/calendar";
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
    return NextResponse.json({ blocks: await listBlocks(guard.viewer, from, to) });
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
  try {
    return NextResponse.json({ id: await createBlock(guard.viewer, parsed.columns) }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to add block", error);
  }
}
