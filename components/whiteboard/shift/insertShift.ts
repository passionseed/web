"use client";

import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { projectFrameAt, projectFrameSkeleton, shiftCardSkeleton, type ShiftCardKind } from "@/lib/whiteboard/shift-cards";

import { insertElements, insertSkeletons, viewportCenter } from "../insert";

const jitter = () => Math.round(Math.random() * 40 - 20);

/**
 * Drops a SHIFT card in the middle of the screen. When that spot is inside a
 * project frame, the card joins the frame, as if it had been dragged there.
 */
export function insertShiftCard(api: ExcalidrawImperativeAPI, kind: ShiftCardKind) {
  const c = viewportCenter(api);
  const at = { x: c.x + jitter(), y: c.y + jitter() };
  const frame = projectFrameAt(api.getSceneElements(), at);
  const elements = convertToExcalidrawElements([shiftCardSkeleton(kind)]);
  const placed = frame ? elements.map((el) => ({ ...el, frameId: frame.id }) as ExcalidrawElement) : elements;
  insertElements(api, placed, at);
}

/** Adds an empty project frame where the viewer is looking and zooms to it. */
export function insertProjectFrame(api: ExcalidrawImperativeAPI, ownerName: string) {
  const placed = insertSkeletons(api, projectFrameSkeleton(`โปรเจกต์ · ${ownerName}`));
  api.scrollToContent(placed, { fitToViewport: true, viewportZoomFactor: 0.85, animate: true });
}
