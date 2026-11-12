"use client";

import type { AppState, ExcalidrawImperativeAPI, ToolType } from "@excalidraw/excalidraw/types";
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

const hasKeys = (o: object) => {
  for (const _ in o) return true;
  return false;
};

/**
 * The current Excalidraw tool, and whether anything is selected or being typed into.
 * Excalidraw's onChange fires on every update (each remote cursor too), so this only sets state
 * when one of the two changes.
 */
export function useActiveTool(api: ExcalidrawImperativeAPI | null) {
  const [state, setState] = useState<{ tool: ToolType; selected: boolean }>({ tool: "selection", selected: false });
  const current = useRef(state);

  useEffect(() => {
    if (!api) return;
    const read = (appState: Pick<AppState, "activeTool" | "selectedElementIds" | "editingTextElement">) => {
      const tool = appState.activeTool.type as ToolType;
      const selected = hasKeys(appState.selectedElementIds) || appState.editingTextElement !== null;
      if (tool === current.current.tool && selected === current.current.selected) return;
      current.current = { tool, selected };
      setState(current.current);
    };
    read(api.getAppState());
    return api.onChange((_elements, appState) => read(appState));
  }, [api]);

  const setTool = useCallback(
    (type: ToolType) => {
      if (!api) return;
      api.setActiveTool({ type } as Parameters<ExcalidrawImperativeAPI["setActiveTool"]>[0]);
      focusCanvas();
    },
    [api],
  );

  return { tool: state.tool, selected: state.selected, setTool };
}
