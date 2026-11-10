import type { CanvasScope } from "@/lib/shift/canvas-chat";
import { shiftCanvasesOf, type ShiftCanvasStats } from "@/lib/whiteboard/shift-overview";
import { authorIds, canvasToMarkdown, summarizeElements, type SummaryComment } from "@/lib/whiteboard/summary";
import { createAdminClient } from "@/utils/supabase/admin";

import { displayNames } from "./whiteboard-reader";

/**
 * Every SHIFT project canvas across boards, for the admin overview and for
 * Claude (/admin/shift/canvases). Uses the service role: callers must check
 * that the viewer is a site admin first.
 */

export type ShiftCanvasRow = ShiftCanvasStats & {
  boardId: string;
  boardTitle: string;
  ownerName: string;
  teamNames: string[];
};


type Board = { id: string; title: string; updated_at: string; elements: unknown[] };
type CommentRow = {
  id: string;
  whiteboard_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  x: number | null;
  y: number | null;
  resolved_at: string | null;
  created_at: string;
};
type Frame = { id: string; x: number; y: number; width: number; height: number };

/** Boards that hold a registered SHIFT project (whiteboard_projects), or just the ones asked for. */
async function loadBoards(only?: string[]): Promise<Board[]> {
  const db = createAdminClient();
  let ids = only;
  if (!ids) {
    const { data, error } = await db.from("whiteboard_projects").select("whiteboard_id").not("whiteboard_id", "is", null);
    if (error) throw error;
    ids = [...new Set((data ?? []).map((r) => r.whiteboard_id as string))];
  }
  if (ids.length === 0) return [];
  const { data, error } = await db.from("whiteboards").select("id, title, updated_at, elements").in("id", ids);
  if (error) throw error;
  return (data ?? []).map((b) => ({ ...b, elements: (b.elements as unknown[]) ?? [] }) as Board);
}

async function loadComments(boardIds: string[]): Promise<CommentRow[]> {
  if (boardIds.length === 0) return [];
  const { data, error } = await createAdminClient()
    .from("whiteboard_comments")
    .select("id, whiteboard_id, parent_id, author_id, body, x, y, resolved_at, created_at")
    .in("whiteboard_id", boardIds)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CommentRow[];
}

/** Comment threads pinned inside a canvas's frame. */
function commentsOn(frame: Frame, comments: CommentRow[], who: (id: string) => string): SummaryComment[] {
  const within = (c: CommentRow) =>
    c.x !== null && c.y !== null && c.x >= frame.x && c.x <= frame.x + frame.width && c.y >= frame.y && c.y <= frame.y + frame.height;
  return comments
    .filter((c) => !c.parent_id && within(c))
    .map((c) => ({
      author: who(c.author_id),
      body: c.body,
      createdAt: c.created_at,
      resolved: Boolean(c.resolved_at),
      replies: comments
        .filter((r) => r.parent_id === c.id)
        .map((r) => ({ author: who(r.author_id), body: r.body, createdAt: r.created_at })),
    }));
}

/** Every canvas on these boards with its Markdown, newest activity first. */
async function readCanvases(boards: Board[]): Promise<{ row: ShiftCanvasRow; markdown: string }[]> {
  const comments = await loadComments(boards.map((b) => b.id));
  const read = boards.map((board) => {
    const summary = summarizeElements(board.elements);
    return { board, summary, canvases: shiftCanvasesOf(board.elements, summary) };
  });
  const people = await displayNames([
    ...new Set([
      ...read.flatMap(({ summary, canvases }) => [
        ...authorIds(summary),
        ...canvases.flatMap((c) => [...(c.owner ? [c.owner] : []), ...c.editors]),
      ]),
      ...comments.map((c) => c.author_id),
    ]),
  ]);
  const who = (id: string) => people.get(id) ?? "Someone";

  const out = read.flatMap(({ board, summary, canvases }) => {
    const frames = new Map(
      (board.elements as Frame[]).filter((e) => e && canvases.some((c) => c.frameId === e.id)).map((e) => [e.id, e]),
    );
    const boardComments = comments.filter((c) => c.whiteboard_id === board.id);
    return canvases.map((canvas) => {
      const row: ShiftCanvasRow = {
        ...canvas,
        boardId: board.id,
        boardTitle: board.title,
        ownerName: canvas.owner ? who(canvas.owner) : "Unknown",
        teamNames: canvas.editors.map(who),
      };
      const frame = frames.get(canvas.frameId);
      const markdown =
        canvasToMarkdown(
          summary,
          canvas.frameId,
          {
            board: board.title,
            owner: row.ownerName,
            team: row.teamNames,
            ...(canvas.lastEdited ? { updatedAt: new Date(canvas.lastEdited).toISOString().slice(0, 16).replace("T", " ") } : {}),
          },
          frame ? commentsOn(frame, boardComments, who) : [],
          people,
        ) ?? "";
      return { row, markdown };
    });
  });
  return out.sort((a, b) => (b.row.lastEdited ?? 0) - (a.row.lastEdited ?? 0));
}

export async function listShiftCanvases(): Promise<ShiftCanvasRow[]> {
  return (await readCanvases(await loadBoards())).map((c) => c.row);
}

/** One canvas with its Markdown, or null when that board has no such canvas. */
export async function readShiftCanvas(boardId: string, frameId: string): Promise<{ row: ShiftCanvasRow; markdown: string } | null> {
  const canvases = await readCanvases(await loadBoards([boardId]));
  return canvases.find((c) => c.row.frameId === frameId) ?? null;
}

/** The Markdown Claude reads for a scope, or null when the canvas does not exist. */
export async function canvasContext(scope: CanvasScope): Promise<{ label: string; markdown: string; count: number } | null> {
  if ("all" in scope) {
    const canvases = await readCanvases(await loadBoards());
    return {
      label: "every SHIFT canvas",
      markdown: canvases.map((c) => c.markdown).join("\n---\n\n"),
      count: canvases.length,
    };
  }
  const canvas = await readShiftCanvas(scope.boardId, scope.frameId);
  return canvas ? { label: canvas.row.title, markdown: canvas.markdown, count: 1 } : null;
}
