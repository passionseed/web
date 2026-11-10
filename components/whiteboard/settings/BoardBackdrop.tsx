"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { type CSSProperties, memo, useEffect, useRef } from "react";

import { backgroundFor, type BoardSettings, dotColorFor, dotLattice } from "@/lib/whiteboard/settings";

import { nextFrame } from "../useViewportTick";

/**
 * The board's paper: its colour and FigJam's dot grid, on our own layer under Excalidraw's
 * canvases (which are kept see-through, see useCanvasBackground). The dots are one CSS
 * radial-gradient; panning and zooming only move and resize its tile, written straight to the
 * element once a frame, so nothing re-renders.
 */
export const BoardBackdrop = memo(function BoardBackdrop({ api, settings }: { api: ExcalidrawImperativeAPI | null; settings: BoardSettings }) {
  const ref = useRef<HTMLDivElement>(null);
  const { background, dots } = settings;

  useEffect(() => {
    const el = ref.current;
    if (!api || !el || !dots) return;
    let cancel: (() => void) | null = null;
    const paint = () => {
      cancel = null;
      const s = api.getAppState();
      const { step, x, y, size } = dotLattice({ scrollX: s.scrollX, scrollY: s.scrollY, zoom: s.zoom.value });
      el.style.setProperty("--wb-dot-step", `${step}px`);
      el.style.setProperty("--wb-dot-size", `${size}px`);
      el.style.backgroundPosition = `${x}px ${y}px`;
    };
    const queue = () => {
      cancel ??= nextFrame(paint);
    };
    paint();
    const off = api.onScrollChange(queue);
    return () => {
      off();
      cancel?.();
    };
  }, [api, dots]);

  // A chosen colour comes as a pair, light and dark, each with its dots: whiteboard.css picks by
  // theme, so a theme switch needs no render. The theme's own paper and dots are in the CSS too.
  const light = backgroundFor(settings, "light");
  const dark = backgroundFor(settings, "dark");
  const style = background ? ({ "--bg-l": light, "--dot-l": dotColorFor(light), "--bg-d": dark, "--dot-d": dotColorFor(dark) } as CSSProperties) : undefined;
  return <div ref={ref} className={`wb-backdrop ${dots ? "wb-backdrop--dots" : ""} ${background ? "wb-backdrop--chosen" : ""}`} style={style} aria-hidden />;
});
