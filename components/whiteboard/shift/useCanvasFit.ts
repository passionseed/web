"use client";

import { CaptureUpdateAction, newElementWith } from "@excalidraw/excalidraw";
import type { ExcalidrawElement, OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef } from "react";

import { accessOf, canEditCanvas, isProjectFrame } from "@/lib/whiteboard/canvas-access";
import { type FitElement, fitCanvas } from "@/lib/whiteboard/canvas-fit";

import { isBusy } from "./sceneMemo";

/** Wait this long after an edit, so typing or a burst of changes refits once. */
const SETTLE_MS = 250;

/**
 * Applies fitCanvas to these SHIFT canvases: rows grow or shrink with their
 * notes, and what is below moves with them. `room` asks one zone for a new
 * line of notes. Returns whether anything moved.
 */
export function fitCanvases(
  api: ExcalidrawImperativeAPI,
  frameIds: readonly string[],
  room?: { zoneId: string; height: number },
): boolean {
  const all = api.getSceneElementsIncludingDeleted();
  const moves = frameIds.flatMap((id) => fitCanvas(all as unknown as FitElement[], id, room));
  if (moves.length === 0) return false;
  const byId = new Map(moves.map((m) => [m.id, m]));
  api.updateScene({
    elements: all.map((el) => {
      const move = byId.get(el.id);
      if (!move) return el;
      const { id: _id, ...change } = move;
      // A new version of each moved element, so it syncs and saves like any edit.
      return newElementWith(el as ExcalidrawElement, change as Partial<ExcalidrawElement>) as OrderedExcalidrawElement;
    }),
    // Layout follows the person's own edit; undo goes back over their edit, and the refit after it puts the rows right.
    captureUpdate: CaptureUpdateAction.NEVER,
  });
  return true;
}

/**
 * Keeps the SHIFT canvases this person edits fitted to their notes. Only the
 * browser that made an edit refits, and only canvases it may change, so two
 * people never move the same rows at once. Returns the callback for
 * useWhiteboardSync's onLocalEdit.
 */
export function useCanvasFit(api: ExcalidrawImperativeAPI | null, meId: string, manager: boolean) {
  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const who = useRef({ meId, manager });
  who.current = { meId, manager };

  const run = useCallback(() => {
    timer.current = null;
    if (!api || pending.current.size === 0) return;
    // Not while something is being dragged or resized: refit once it is let go.
    if (isBusy(api.getAppState())) {
      timer.current = setTimeout(run, SETTLE_MS);
      return;
    }
    const frames = [...pending.current];
    pending.current.clear();
    fitCanvases(api, frames);
  }, [api]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (changed: readonly OrderedExcalidrawElement[]) => {
      if (!api) return;
      const scene = new Map(api.getSceneElementsIncludingDeleted().map((el) => [el.id, el]));
      for (const el of changed) {
        // The canvas it is in: its own frame, its note's frame (for text), or itself.
        const containerId = (el as { containerId?: string | null }).containerId;
        const container = containerId ? scene.get(containerId) : undefined;
        const frameId = isProjectFrame(el) ? el.id : (el.frameId ?? container?.frameId);
        const frame = frameId ? scene.get(frameId) : undefined;
        if (!frame || !isProjectFrame(frame)) continue;
        const access = accessOf(frame);
        if (access && !canEditCanvas(access, who.current.meId, who.current.manager)) continue;
        pending.current.add(frame.id);
      }
      if (pending.current.size && !timer.current) timer.current = setTimeout(run, SETTLE_MS);
    },
    [api, run],
  );
}
