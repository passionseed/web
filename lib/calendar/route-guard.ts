import { NextResponse } from "next/server";

import { voiceRooms } from "@/lib/supabase/calendar-notify";
import { getViewer, roleFor, type Viewer } from "@/lib/supabase/whiteboards";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID.test(id);

export async function calendarViewer(): Promise<{ ok: true; viewer: Viewer } | { ok: false; response: NextResponse }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, response: NextResponse.json({ error: "Sign in first" }, { status: 401 }) };
  return { ok: true, viewer };
}

/**
 * Only a board's owner may attach it to a block: the block shows the board's
 * share link to everyone, and only the owner holds that link.
 */
export async function mayAttachBoard(viewer: Viewer, columns: Record<string, unknown>): Promise<boolean> {
  const boardId = columns.whiteboard_id;
  if (boardId === undefined || boardId === null) return true;
  return typeof boardId === "string" && isUuid(boardId) && (await roleFor(boardId, viewer)) === "owner";
}

/** Only voice rooms admins listed at /admin/calendar can be used. */
export async function knownRoom(channelId: unknown): Promise<boolean> {
  if (channelId === undefined || channelId === null) return true;
  const { rooms } = await voiceRooms();
  return rooms.some((r) => r.channelId === channelId);
}
