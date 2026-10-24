import { NextResponse } from "next/server";

import { getViewer, roleFor, type Viewer } from "@/lib/supabase/whiteboards";
import { canEdit, canManage, type WhiteboardRole } from "@/lib/whiteboard/core";

type Need = "view" | "edit" | "manage";

export type BoardGuard =
  | { ok: true; viewer: Viewer; role: WhiteboardRole }
  | { ok: false; response: NextResponse };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const deny = (error: string, status: number): BoardGuard => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

/** Signs the caller in and checks they may view, edit or manage the board. */
export async function guardBoard(boardId: string, need: Need): Promise<BoardGuard> {
  const viewer = await getViewer();
  if (!viewer) return deny("Sign in first", 401);
  if (!UUID.test(boardId)) return deny("Board not found", 404);
  const role = await roleFor(boardId, viewer);
  if (!role) return deny("Board not found", 404);
  if (need === "edit" && !canEdit(role)) return deny("You can only view this board", 403);
  if (need === "manage" && !canManage(role)) return deny("Only the owner can do that", 403);
  return { ok: true, viewer, role };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
