"use client";

import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import {
  freeSlot,
  isPlacementObstacle,
  projectFrameAt,
  projectFrameSkeleton,
  SHIFT_CARD_HEIGHT,
  SHIFT_CARD_WIDTH,
  shiftCardSkeleton,
  type ShiftCardKind,
} from "@/lib/whiteboard/shift-cards";

import { insertElements, insertSkeletons, viewportCenter } from "../insert";

/** Keeps new cards clear of a project frame's edge and its name. */
const FRAME_INSET = 24;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Whether a scene box is fully on screen. */
function onScreen(api: ExcalidrawImperativeAPI, box: { x: number; y: number; width: number; height: number }) {
  const { scrollX, scrollY, width, height, zoom } = api.getAppState();
  const left = -scrollX;
  const top = -scrollY;
  return box.x >= left && box.y >= top && box.x + box.width <= left + width / zoom.value && box.y + box.height <= top + height / zoom.value;
}

/**
 * Adds a SHIFT card at the first free spot near the middle of the screen, so
 * several clicks lay cards out side by side. When the middle of the screen is
 * inside a project frame, the card joins that frame and stays inside it.
 */
export function insertShiftCard(api: ExcalidrawImperativeAPI, kind: ShiftCardKind) {
  const center = viewportCenter(api);
  const scene = api.getSceneElements();
  const frame = projectFrameAt(scene, center);
  const within = frame
    ? { x: frame.x + FRAME_INSET, y: frame.y + FRAME_INSET, width: frame.width - 2 * FRAME_INSET, height: frame.height - 2 * FRAME_INSET }
    : null;
  const at = freeSlot(scene.filter(isPlacementObstacle), center, { width: SHIFT_CARD_WIDTH, height: SHIFT_CARD_HEIGHT }, within);
  const elements = convertToExcalidrawElements([shiftCardSkeleton(kind)]);
  const placed = insertElements(
    api,
    frame ? elements.map((el) => ({ ...el, frameId: frame.id }) as ExcalidrawElement) : elements,
    at,
  );
  const card = placed.find((el) => el.type === "rectangle");
  if (card && !onScreen(api, card)) api.scrollToContent(card, { animate: !reducedMotion() });
}

/** Adds an empty project frame where the viewer is looking and zooms to it. */
export function insertProjectFrame(api: ExcalidrawImperativeAPI, ownerName: string) {
  const placed = insertSkeletons(api, projectFrameSkeleton(`โปรเจกต์ · ${ownerName}`));
  api.scrollToContent(placed, { fitToViewport: true, viewportZoomFactor: 0.85, animate: !reducedMotion() });
}
