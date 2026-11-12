"use client";

import { getSceneVersion } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useMemo } from "react";

/**
 * While something is being dragged, resized, rotated or drawn, the SHIFT
 * overlays step aside: the scene changes every frame then, and a tag chasing
 * a moving note is noise anyway. They come back when the pointer is released.
 */
export const isBusy = (appState: AppState): boolean =>
  appState.selectedElementsAreBeingDragged || appState.isResizing || appState.isRotating || Boolean(appState.newElement);

/**
 * Derives something from the board's elements, recomputing only when they
 * change (by scene version, since Excalidraw edits elements in place), not on
 * every pan or zoom frame, which only moves things on screen.
 */
export function useSceneMemo<T>(
  api: ExcalidrawImperativeAPI,
  derive: (elements: ReturnType<ExcalidrawImperativeAPI["getSceneElements"]>) => T,
  /** Anything else `derive` reads, such as who is looking. */
  deps: readonly unknown[],
): T {
  const version = getSceneVersion(api.getSceneElementsIncludingDeleted());
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed by scene version on purpose
  return useMemo(() => derive(api.getSceneElements()), [api, version, ...deps]);
}
