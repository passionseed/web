import { NextResponse } from "next/server";

import { isQuestLead } from "@/lib/supabase/whiteboard-groups";
import { guardBoard, type BoardGuard } from "@/lib/whiteboard/route-guard";

/** Signs the caller in and checks they are staff on the board (owner, site admin or staff). */
export async function guardLead(boardId: string): Promise<BoardGuard> {
  const guard = await guardBoard(boardId, "view");
  if (!guard.ok) return guard;
  if (!(await isQuestLead(boardId, guard.viewer))) {
    return { ok: false, response: NextResponse.json({ error: "Only staff can do that" }, { status: 403 }) };
  }
  return guard;
}
