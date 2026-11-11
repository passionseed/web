import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { boardPeople } from "@/lib/supabase/whiteboards";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 500;

/**
 * People on a board as SHIFT knows them: Discord name and picture, else their
 * profile. Body: { ids } (who the browser sees on the board). For anyone who can
 * open the board; the board loads this after it opens, so opening stays fast.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const body = (await readJson(request)) as { ids?: unknown } | undefined;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((v): v is string => typeof v === "string" && UUID.test(v)).slice(0, MAX_IDS) : [];
  try {
    return NextResponse.json({ people: await boardPeople(id, guard.viewer.id, ids) });
  } catch (error) {
    return safeServerError("Failed to load people", error);
  }
}
