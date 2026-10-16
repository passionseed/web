"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Shows a fixed-size poster scaled to its container's width. The box keeps
 * the poster's aspect ratio from the first paint, so nothing jumps; the
 * poster itself appears once its scale is measured.
 */
export function ScaledFrame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / width);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
      <div
        className="absolute left-0 top-0"
        style={{
          width,
          height,
          transform: `scale(${scale ?? 1})`,
          transformOrigin: "top left",
          visibility: scale === null ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </div>
  );
}
