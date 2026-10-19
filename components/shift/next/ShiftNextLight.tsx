"use client";

import { useEffect } from "react";

/**
 * Pointer light for /shift/next glass panes: writes the cursor position into
 * --mx / --my on the pane under it, once per frame. Mouse only; touch gets a
 * one-time settle from CSS instead.
 */
export function ShiftNextLight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;

    const paint = () => {
      frame = 0;
      const target = last?.target;
      if (!(target instanceof Element) || !last) return;
      const pane = target.closest<HTMLElement>("[data-glass]");
      if (!pane) return;
      const rect = pane.getBoundingClientRect();
      pane.style.setProperty("--mx", `${last.clientX - rect.left}px`);
      pane.style.setProperty("--my", `${last.clientY - rect.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
