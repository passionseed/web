import "server-only";

import { cache } from "react";

import { canvasTitleOf, type CanvasChoice } from "@/lib/shift-island/quest-canvas";
import { accessOf, isProjectFrame, type CanvasAccess } from "@/lib/whiteboard/canvas-access";
import { shiftCanvasesOf } from "@/lib/whiteboard/shift-overview";
import { summarizeElements, type BoardSummary } from "@/lib/whiteboard/summary";
import { createAdminClient } from "@/utils/supabase/admin";

import { frameElements, liveFrame, onCanvasTeam, verifyLink, type CanvasLinkRow, type LinkVerdict } from "./canvas-snapshot";

/**
 * Whiteboard reads for the quest canvas link. The whiteboard tables are
 * admin-only under RLS, so this uses the service role, and only for a viewer
 * resolveIslandViewer() already returned as ready (its userId comes from
 * supabase.auth.getUser()). It never calls loadBoard, openBoard, roleFor or
 * listBoards: they write last_opened_at or let site admins in. The query
 * shapes are theirs (lib/supabase/whiteboards.ts).
 *
 * Every read re-checks the canvas rules (verifyLink, onCanvasTeam): only the
 * student's own canvases, as owner or teammate and as a board member. Nothing
 * here returns user ids, version authors or comments, and nothing logs note
 * text: a failure is a CanvasReadError carrying a step and a code.
 */

const db = () => createAdminClient();

/** A whiteboard read failed. `code` is PostgREST's or a short label, never a message. */
export class CanvasReadError extends Error {
  constructor(
    public readonly step: string,
    public readonly code: string
  ) {
    super(`canvas read failed: ${step} (${code})`);
    this.name = "CanvasReadError";
  }
}

interface BoardRow {
  id: string;
  title: string;
  owner_id: string;
  updated_at?: string | null;
  elements: unknown[];
}

function fail(step: string, error: { code?: string | null } | null | undefined): never {
  throw new CanvasReadError(step, error?.code || "unknown");
}

function toBoard(row: Record<string, unknown>): BoardRow {
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    owner_id: String(row.owner_id ?? ""),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    elements: Array.isArray(row.elements) ? row.elements : [],
  };
}

/** Boards the user owns or is a member of (both columns indexed). Once per request. */
const myBoardIds = cache(async (userId: string): Promise<string[]> => {
  const [members, owned] = await Promise.all([
    db().from("whiteboard_members").select("whiteboard_id").eq("user_id", userId),
    db().from("whiteboards").select("id").eq("owner_id", userId),
  ]);
  if (members.error) fail("members", members.error);
  if (owned.error) fail("owned", owned.error);
  const ids = [
    ...(members.data ?? []).map((m) => String(m.whiteboard_id)),
    ...(owned.data ?? []).map((b) => String(b.id)),
  ];
  return [...new Set(ids)];
});

/** One board with its elements, or null. Once per request. */
const readBoard = cache(async (boardId: string): Promise<BoardRow | null> => {
  const { data, error } = await db()
    .from("whiteboards")
    .select("id, title, owner_id, elements")
    .eq("id", boardId)
    .maybeSingle();
  if (error) fail("board", error);
  return data ? toBoard(data) : null;
});

/** Whether the user has a whiteboard_members row on the board (any role). Once per request. */
const isBoardMember = cache(async (boardId: string, userId: string): Promise<boolean> => {
  const { data, error } = await db()
    .from("whiteboard_members")
    .select("user_id")
    .eq("whiteboard_id", boardId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail("member", error);
  return Boolean(data);
});

/** Every board the user is on, with elements. Heavy: only for the picker and a lost link. */
const readMyBoards = cache(async (userId: string): Promise<BoardRow[]> => {
  const ids = await myBoardIds(userId);
  if (ids.length === 0) return [];
  const { data, error } = await db()
    .from("whiteboards")
    .select("id, title, updated_at, owner_id, elements")
    .in("id", ids);
  if (error) fail("boards", error);
  return (data ?? []).map(toBoard);
});

/** The live canvases on one board that the user may change as owner or teammate (never as a moderator). */
function choicesOn(
  board: BoardRow,
  userId: string,
  link: Pick<CanvasLinkRow, "board_id" | "frame_id"> | null,
  project?: string
): CanvasChoice[] {
  const out: CanvasChoice[] = [];
  for (const raw of board.elements as { id?: unknown; type?: unknown; isDeleted?: boolean }[]) {
    if (!raw || raw.type !== "frame" || raw.isDeleted || typeof raw.id !== "string") continue;
    const frame = raw as Parameters<typeof accessOf>[0] & { name?: string | null };
    if (!isProjectFrame(frame)) continue;
    if (project !== undefined && frame.customData?.project !== project) continue;
    const access = accessOf(frame);
    if (!onCanvasTeam(access, userId)) continue;
    const elements = frameElements(board.elements, frame.id);
    const stats = shiftCanvasesOf(elements, summarizeElements(elements)).find((s) => s.frameId === frame.id);
    out.push({
      boardId: board.id,
      frameId: frame.id,
      title: canvasTitleOf(frame.name),
      boardTitle: board.title,
      role: access!.owner === userId ? "owner" : "team",
      lastEdited: stats?.lastEdited ?? null,
      notes: stats?.notes ?? 0,
      versions: stats?.versions ?? 0,
      linked: !!link && link.board_id === board.id && link.frame_id === frame.id,
    });
  }
  return out;
}

const newestFirst = (a: CanvasChoice, b: CanvasChoice) =>
  (b.lastEdited ?? 0) - (a.lastEdited ?? 0) || a.title.localeCompare(b.title, "th");

/**
 * The SHIFT canvases the user owns or is a teammate on, across the boards
 * they are on: for the picker only (a board can be several MB).
 */
export async function listMyCanvases(
  userId: string,
  link: Pick<CanvasLinkRow, "board_id" | "frame_id"> | null
): Promise<CanvasChoice[]> {
  const boards = await readMyBoards(userId);
  return boards.flatMap((board) => choicesOn(board, userId, link)).sort(newestFirst);
}

/** Before linking: whether this canvas is the user's to link, and its project tag. */
export async function checkCanvasForLink(
  userId: string,
  boardId: string,
  frameId: string
): Promise<{ verdict: LinkVerdict; project: string | null }> {
  const [board, isMember] = await Promise.all([readBoard(boardId), isBoardMember(boardId, userId)]);
  const frame = board ? liveFrame(board.elements, frameId) : null;
  const tag = frame?.customData?.project;
  const project = typeof tag === "string" ? tag : null;
  // Linking takes the tag the canvas has now; verifyLink then checks the board, the team and that it is a canvas.
  const verdict = verifyLink({ board, isMember, userId, link: { frame_id: frameId, canvas_project: project ?? "" } });
  return { verdict, project: verdict === "ok" ? project : null };
}

export type LinkedCanvas =
  | {
      state: "ok";
      boardTitle: string;
      frameId: string;
      title: string;
      lastEdited: number | null;
      /** The canvas only (frameElements), never the rest of the board. */
      elements: unknown[];
      summary: BoardSummary;
      access: CanvasAccess;
    }
  | { state: "not_yours" }
  | { state: "gone"; candidates: CanvasChoice[] };

/**
 * The linked canvas, re-verified: the board and the user's membership row in
 * parallel, verifyLink, then the canvas cut out of the board and summarized.
 * A canvas that is gone or re-tagged offers the user's own canvases of the
 * same project as candidates; the link is never re-pointed automatically.
 */
export async function readLinkedCanvas(userId: string, link: CanvasLinkRow): Promise<LinkedCanvas> {
  const [board, isMember] = await Promise.all([readBoard(link.board_id), isBoardMember(link.board_id, userId)]);
  const verdict = verifyLink({ board, isMember, userId, link });
  if (verdict === "not_yours") return { state: "not_yours" };
  if (verdict !== "ok" || !board) {
    const candidates = (await readMyBoards(userId))
      .flatMap((b) => choicesOn(b, userId, null, link.canvas_project))
      .sort(newestFirst);
    return { state: "gone", candidates };
  }

  const elements = frameElements(board.elements, link.frame_id);
  const summary = summarizeElements(elements);
  const frame = liveFrame(elements, link.frame_id) as Parameters<typeof accessOf>[0] & { name?: string | null };
  const stats = shiftCanvasesOf(elements, summary).find((s) => s.frameId === link.frame_id);
  return {
    state: "ok",
    boardTitle: board.title,
    frameId: link.frame_id,
    title: canvasTitleOf(frame.name),
    lastEdited: stats?.lastEdited ?? null,
    elements,
    summary,
    access: accessOf(frame)!,
  };
}
