import type { NextRequest } from "next/server";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { ELEMENT_ID, whiteboardFocusHref } from "@/lib/shift-island/canvas-link";
import { questApi } from "@/lib/supabase/shift-quests/db";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

/**
 * GET /shift/island/canvas[?note=<element id>]: opens the student's linked
 * SHIFT canvas on the whiteboard. Identity comes only from the session
 * (resolveIslandViewer, getUser underneath). A viewer who is not ready, a
 * project with no link, or any failure goes back to /shift/island. Otherwise a
 * 307 to /whiteboard/<board>?focus=<note or frame id>; a note id that is not a
 * plain element id is dropped (the frame is focused instead).
 *
 * The whiteboard is not read here: its own page enforces access (openBoard).
 * The board and frame ids only ever ride in this redirect, never in the island
 * page payload. Every answer is private and never stored; logs carry a code.
 */
export const dynamic = "force-dynamic";

const ISLAND = "/shift/island";
/** Whiteboard boards are uuids. */
const BOARD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CanvasLinkRow {
  board_id: unknown;
  frame_id: unknown;
}

/**
 * A same-origin 307 with a relative Location: the browser resolves it against
 * the page it is on. `request.url` cannot be used, because `next dev -H 0.0.0.0`
 * reports http://0.0.0.0:3000 there, a different origin without the session
 * cookie. Every path here starts with "/" and is built from checked ids.
 */
function redirectTo(path: string): Response {
  return new Response(null, { status: 307, headers: { Location: path, "Cache-Control": "no-store" } });
}

function failureCode(error: unknown): string {
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  if (error instanceof Error && error.message === "shift_quest_db_not_configured") return "not_configured";
  return error instanceof Error ? error.name : "unknown";
}

export async function GET(request: NextRequest): Promise<Response> {
  const viewer = await resolveIslandViewer();
  if (viewer.state !== "ready") return redirectTo(ISLAND);

  let row: CanvasLinkRow | null;
  try {
    row = await questApi().call<CanvasLinkRow | null>("shift_quest_canvas_get", viewer.actor);
  } catch (error) {
    console.error(`[shift-island] canvas redirect failed: ${failureCode(error)}`);
    return redirectTo(ISLAND);
  }
  if (!row || typeof row !== "object") return redirectTo(ISLAND);

  const boardId = typeof row.board_id === "string" && BOARD_ID.test(row.board_id) ? row.board_id.toLowerCase() : null;
  if (!boardId) {
    console.error("[shift-island] canvas redirect failed: bad_link");
    return redirectTo(ISLAND);
  }
  const frameId = typeof row.frame_id === "string" && ELEMENT_ID.test(row.frame_id) ? row.frame_id : null;
  const note = request.nextUrl.searchParams.get("note");
  const focus = note && ELEMENT_ID.test(note) ? note : frameId;
  return redirectTo(whiteboardFocusHref(boardId, focus));
}
