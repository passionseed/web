import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { actOnGame, getGameView, startGame, type GameResult } from "@/lib/supabase/whiteboard-games";
import { canManage } from "@/lib/whiteboard/core";
import { gameActionSchema, gameStartSchema } from "@/lib/whiteboard/games";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

/**
 * Spyfall rounds on a board. Everyone with a board role can play and host.
 * Each caller only ever gets their own card back; see toGameView.
 */

type Params = { params: Promise<{ id: string }> };

const respond = (result: GameResult, status: number) =>
  result.ok
    ? NextResponse.json(result.view, { status })
    : NextResponse.json({ error: result.error }, { status: result.status });

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json(await getGameView(id, guard.viewer.id));
  } catch (error) {
    return safeServerError("Failed to load the game", error);
  }
}

/** Deals a new round. Replaces a live one for its host or the owner, or for anyone once it is stale. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const parsed = gameStartSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid game" }, { status: 422 });
  }
  try {
    return respond(await startGame(id, guard.viewer.id, canManage(guard.role), parsed.data), 201);
  } catch (error) {
    return safeServerError("Failed to start the game", error);
  }
}

/** A vote, a spy's guess, or a phase change by the host or owner. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const parsed = gameActionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action" }, { status: 422 });
  }
  try {
    return respond(await actOnGame(id, guard.viewer.id, canManage(guard.role), parsed.data), 200);
  } catch (error) {
    return safeServerError("Failed to update the game", error);
  }
}
