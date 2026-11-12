/**
 * Links from the island to the student's linked SHIFT canvas on the
 * whiteboard. Client-safe and pure.
 *
 * The island never knows the board or frame id: it links to CANVAS_ROUTE, and
 * that route (app/shift/island/canvas/route.ts) resolves the link on the
 * server and redirects to the whiteboard with `?focus=<element id>`.
 */

/** The redirect route that opens the viewer's linked canvas. */
export const CANVAS_ROUTE = "/shift/island/canvas";

/** An Excalidraw element id as the island accepts it (nanoid-like). Anything else is dropped. */
export const ELEMENT_ID = /^[A-Za-z0-9_-]{1,100}$/;

const validId = (id: string | null | undefined): id is string => typeof id === "string" && ELEMENT_ID.test(id);

/** CANVAS_ROUTE, or CANVAS_ROUTE?note=<id> when the note id is valid. */
export function canvasHref(noteId?: string | null): string {
  return validId(noteId) ? `${CANVAS_ROUTE}?note=${encodeURIComponent(noteId)}` : CANVAS_ROUTE;
}

/** /whiteboard/<boardId>, plus ?focus=<id> when the focus id is valid. */
export function whiteboardFocusHref(boardId: string, focusId: string | null): string {
  const base = `/whiteboard/${encodeURIComponent(boardId)}`;
  return validId(focusId) ? `${base}?focus=${encodeURIComponent(focusId)}` : base;
}
