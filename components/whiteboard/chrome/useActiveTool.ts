"use client";

import type { ExcalidrawImperativeAPI, ToolType } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gives keyboard focus back to the canvas, so Excalidraw's shortcuts (V, H, P,
 * R, Ctrl+Z...) keep working after a click on our own chrome, which lives
 * outside Excalidraw's container.
 */
export function focusCanvas() {
  if (typeof document === "undefined") return;
  document.querySelector<HTMLElement>(".whiteboard-room .excalidraw-container")?.focus({ preventScroll: true });
}

/**
 * The current Excalidraw tool. Excalidraw's onChange fires on every update
 * (each remote cursor too), so this only sets state when the tool type changes.
 */
export function useActiveTool(api: ExcalidrawImperativeAPI | null) {
  const [tool, setToolState] = useState<ToolType>("selection");
  const current = useRef<ToolType>("selection");

  useEffect(() => {
    if (!api) return;
    const read = (type: ToolType) => {
      if (type === current.current) return;
      current.current = type;
      setToolState(type);
    };
    read(api.getAppState().activeTool.type as ToolType);
    return api.onChange((_elements, appState) => read(appState.activeTool.type as ToolType));
  }, [api]);

  const setTool = useCallback(
    (type: ToolType) => {
      if (!api) return;
      api.setActiveTool({ type } as Parameters<ExcalidrawImperativeAPI["setActiveTool"]>[0]);
      focusCanvas();
    },
    [api],
  );

  return { tool, setTool };
}
