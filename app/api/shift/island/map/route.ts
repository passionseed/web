import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { RenderError } from "@/bot/src/quests/island/render";
import { renderIslandPng } from "@/lib/shift-island/picture";
import { getIslandMap } from "@/lib/supabase/shift-quests/page";
import type { IslandViewer } from "@/lib/supabase/shift-quests/types";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

/**
 * GET /api/shift/island/map: the island picture for the signed-in student,
 * their own plot marked. Identity comes only from the session
 * (resolveIslandViewer); the `v` query parameter only busts caches.
 *
 * 200 image/png | 401 signed out or no Discord | 403 not eligible or not
 * started | 503 quest database unavailable | 500 the island cannot be drawn.
 * Every answer is private and never stored.
 */
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } as const;

/** Thrown by questApi() when SHIFT_QUEST_DATABASE_URL is missing or names the wrong role. */
const NOT_CONFIGURED = "shift_quest_db_not_configured";

function text(status: number, body: string): Response {
  return new Response(body, { status, headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
}

/** Every viewer but a ready one is turned away; a state this route does not know is refused. */
function refuse(state: IslandViewer["state"]): Response {
  if (state === "signed_out" || state === "no_discord") return text(401, "sign in required");
  if (state === "unavailable") return text(503, "unavailable");
  return text(403, "not available");
}

/** The status for a failure, after one log line: where it failed and a code, never student text. */
function fail(error: unknown): Response {
  let code: string;
  let status = 503;
  if (error instanceof RenderError) {
    code = `render:${error.code} detail=${error.detail}`;
    status = 500;
  } else if (error instanceof QuestError) {
    code = `${error.fn ?? "shift_quest_island_map"}:sq:${error.code}`;
  } else if (error instanceof QuestDbError) {
    code = `${error.fn}:sqlstate=${error.sqlstate}`;
  } else if (error instanceof Error && error.message === NOT_CONFIGURED) {
    code = NOT_CONFIGURED;
  } else {
    code = `unexpected:${error instanceof Error ? error.name : "unknown"}`;
    status = 500;
  }
  console.error(`[shift-island] map route failed: ${code}`);
  return status === 500 ? text(500, "island picture failed") : text(503, "unavailable");
}

export async function GET(): Promise<Response> {
  try {
    const viewer = await resolveIslandViewer();
    if (viewer.state !== "ready") return refuse(viewer.state);
    const map = await getIslandMap(viewer.actor);
    const { png } = renderIslandPng(map);
    return new Response(new Uint8Array(png), { status: 200, headers: { ...HEADERS, "Content-Type": "image/png" } });
  } catch (error) {
    return fail(error);
  }
}
