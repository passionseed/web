"use client";

import { CaptureUpdateAction, convertToExcalidrawElements, getCommonBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { remapIds } from "@/lib/whiteboard/core";

/** Scene coordinates of the middle of the screen. */
export function viewportCenter(api: ExcalidrawImperativeAPI): { x: number; y: number } {
  const { scrollX, scrollY, width, height, zoom } = api.getAppState();
  return { x: -scrollX + width / 2 / zoom.value, y: -scrollY + height / 2 / zoom.value };
}

const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

/**
 * Adds elements to the board centred on `at` (default: the middle of the
 * screen), selects them, and records one undo step.
 */
export function insertElements(
  api: ExcalidrawImperativeAPI,
  elements: readonly ExcalidrawElement[],
  at: { x: number; y: number } = viewportCenter(api),
): ExcalidrawElement[] {
  if (elements.length === 0) return [];
  const fresh = remapIds(elements, newId) as ExcalidrawElement[];
  const [minX, minY, maxX, maxY] = getCommonBounds(fresh);
  const dx = at.x - (minX + maxX) / 2;
  const dy = at.y - (minY + maxY) / 2;
  const placed = fresh.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy, index: null }) as unknown as ExcalidrawElement);

  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...placed],
    appState: {
      selectedElementIds: Object.fromEntries(placed.filter((el) => !("containerId" in el && el.containerId)).map((el) => [el.id, true])),
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return placed;
}

export function insertSkeletons(
  api: ExcalidrawImperativeAPI,
  skeletons: ExcalidrawElementSkeleton[],
  at?: { x: number; y: number },
): ExcalidrawElement[] {
  return insertElements(api, convertToExcalidrawElements(skeletons), at);
}
