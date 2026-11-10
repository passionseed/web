"use client";

import { getSceneVersion } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useState } from "react";

/**
 * Runs `cb` on the next animation frame, or soon after when the tab is hidden
 * (browsers pause requestAnimationFrame there). Returns a cancel function.
 */
export function nextFrame(cb: () => void): () => void {
  if (typeof document !== "undefined" && document.hidden) {
    const t = setTimeout(cb, 50);
    return () => clearTimeout(t);
  }
  const id = requestAnimationFrame(cb);
  return () => cancelAnimationFrame(id);
}

type Viewport = Pick<AppState, "scrollX" | "scrollY" | "width" | "height" | "offsetLeft" | "offsetTop"> & {
  zoom: number;
};

const viewportOf = (s: AppState): Viewport => ({
  scrollX: s.scrollX,
  scrollY: s.scrollY,
  zoom: s.zoom.value,
  width: s.width,
  height: s.height,
  offsetLeft: s.offsetLeft,
  offsetTop: s.offsetTop,
});

const sameViewport = (a: Viewport, b: Viewport) =>
  a.scrollX === b.scrollX &&
  a.scrollY === b.scrollY &&
  a.zoom === b.zoom &&
  a.width === b.width &&
  a.height === b.height &&
  a.offsetLeft === b.offsetLeft &&
  a.offsetTop === b.offsetTop;

/**
 * Subscribes to every Excalidraw update but re-renders at most once per frame,
 * and only when the value `read` returns has moved (by `same`).
 */
function useFilteredTick<T>(api: ExcalidrawImperativeAPI, read: () => T, same: (a: T, b: T) => boolean): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let last = read();
    let cancel: (() => void) | null = null;
    const check = () => {
      cancel = null;
      const next = read();
      if (same(last, next)) return;
      last = next;
      setTick((t) => t + 1);
    };
    const schedule = () => {
      if (!cancel) cancel = nextFrame(check);
    };
    const offScroll = api.onScrollChange(schedule);
    const offChange = api.onChange(schedule);
    return () => {
      offScroll();
      offChange();
      cancel?.();
    };
    // `read` and `same` are module-level or stable per api in this file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  return tick;
}

/** Re-renders when the canvas scrolls, zooms or resizes. Returns a counter that changes each time. */
export function useViewportTick(api: ExcalidrawImperativeAPI): number {
  return useFilteredTick(api, () => viewportOf(api.getAppState()), sameViewport);
}

/** Re-renders when any element changes. Returns a counter that changes with the scene. */
export function useSceneTick(api: ExcalidrawImperativeAPI): number {
  return useFilteredTick(
    api,
    () => getSceneVersion(api.getSceneElementsIncludingDeleted()),
    (a, b) => a === b,
  );
}
