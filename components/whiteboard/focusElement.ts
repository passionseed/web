import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

/** The part of Excalidraw's API focusing needs (the whole API fits). */
export type FocusApi = Pick<ExcalidrawImperativeAPI, "getSceneElements" | "getAppState" | "scrollToContent">;

/** How much of the screen a focused frame fills. */
const FRAME_FILL = 0.9;

/**
 * Brings one element into view, for `/whiteboard/<id>?focus=<elementId>`
 * (the SHIFT High island's "เปิดแคนวาส" and "ดูบนแคนวาส"). A frame (a SHIFT
 * canvas) fills the screen; anything else, a note say, is centred without
 * zooming in: at most the current zoom and never past 100%. Only a live
 * element counts: false, and nothing moves, when it is missing or deleted.
 */
export function focusElement(api: FocusApi, id: string, reduced: boolean): boolean {
  const element = api.getSceneElements().find((el) => el.id === id && !el.isDeleted);
  if (!element) return false;
  const animate = !reduced;
  if (element.type === "frame" || element.type === "magicframe") {
    api.scrollToContent(element, { fitToViewport: true, viewportZoomFactor: FRAME_FILL, animate });
    return true;
  }
  const zoom = api.getAppState().zoom.value;
  api.scrollToContent(element, {
    fitToViewport: true,
    viewportZoomFactor: FRAME_FILL,
    maxZoom: Math.min(Number.isFinite(zoom) && zoom > 0 ? zoom : 1, 1),
    animate,
  });
  return true;
}
