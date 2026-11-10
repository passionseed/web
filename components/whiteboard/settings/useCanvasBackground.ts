"use client";

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect } from "react";
import { flushSync } from "react-dom";

import { nextFrame } from "../useViewportTick";

const SEE_THROUGH = "transparent";
/** Dialogs that write the canvas colour into a file. */
const EXPORT_DIALOGS = ["imageExport", "jsonExport"];
const COPY_IMAGE = '[data-testid="copyAsPng"], [data-testid="copyAsSvg"]';
const COPY_HOLD_MS = 600;

/**
 * Keeps Excalidraw's canvas see-through, so the paper and dots under it (BoardBackdrop) show,
 * and hands it the board's real colour for as long as something is being exported: the "Save as
 * image" and "Save to" dialogs, and "Copy as PNG / SVG" (menu or Shift+Alt+C). Also puts the
 * canvas back after anything resets it (Reset the canvas, a restored scene).
 */
export function useCanvasBackground(api: ExcalidrawImperativeAPI | null, exportColor: string) {
  useEffect(() => {
    if (!api) return;
    let holding = false;
    let cancelReopen: (() => void) | null = null;
    let release: ReturnType<typeof setTimeout> | undefined;
    const set = (appState: Partial<AppState>) => api.updateScene({ appState: appState as never, captureUpdate: CaptureUpdateAction.NEVER });

    const check = (appState: AppState) => {
      const dialog = appState.openDialog?.name ?? "";
      const want = holding || EXPORT_DIALOGS.includes(dialog) ? exportColor : SEE_THROUGH;
      if (appState.viewBackgroundColor === want) return;
      if (dialog !== "imageExport") return set({ viewBackgroundColor: want });
      // The image dialog copies the app state when it opens: close it, set the colour, open it again.
      holding = true;
      set({ viewBackgroundColor: want, openDialog: null });
      cancelReopen = nextFrame(() => {
        set({ openDialog: { name: "imageExport" } });
        holding = false;
      });
    };

    /** A copy reads the colour the moment it starts: hold the real one until it has. */
    const hold = (sync: boolean) => {
      holding = true;
      if (sync) flushSync(() => set({ viewBackgroundColor: exportColor }));
      else set({ viewBackgroundColor: exportColor });
      clearTimeout(release);
      release = setTimeout(() => {
        holding = false;
        check(api.getAppState());
      }, COPY_HOLD_MS);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest(COPY_IMAGE)) hold(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.code === "KeyC") hold(true);
    };

    check(api.getAppState());
    const off = api.onChange((_elements, appState) => check(appState));
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      off();
      cancelReopen?.();
      clearTimeout(release);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [api, exportColor]);
}
