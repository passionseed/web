"use client";

import { Maximize2, Minus, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { grainTile, type GrainTile } from "../chrome/Grain";

export type WindowPos = { x: number; y: number; minimized?: boolean };

const MARGIN = 8;
/** Height of the title bar, which is all a minimized window shows. */
const BAR = 48;

/**
 * Where a window should sit so all of it is on screen (or, in a viewport
 * smaller than the window, its top-left corner is).
 */
export function fitToViewport(p: WindowPos, width: number, height: number): WindowPos {
  const shown = p.minimized ? BAR : Math.min(height, window.innerHeight - 2 * MARGIN);
  const maxX = Math.max(MARGIN, window.innerWidth - width - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - shown - MARGIN);
  return { ...p, x: Math.min(Math.max(p.x, MARGIN), maxX), y: Math.min(Math.max(p.y, MARGIN), maxY) };
}

/** A floating, draggable window over the canvas. */
export function PluginWindow({
  title,
  icon,
  tile,
  width,
  height,
  pos,
  onMove,
  onFocus,
  onClose,
  z,
  children,
}: {
  title: string;
  icon: ReactNode;
  tile?: GrainTile;
  width: number;
  height: number;
  pos: WindowPos;
  onMove: (pos: WindowPos) => void;
  onFocus: () => void;
  onClose: () => void;
  z: number;
  children: ReactNode;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [live, setLive] = useState<WindowPos | null>(null);
  const at = live ?? pos;
  // A window saved on a bigger screen, or left behind when the browser shrank, comes back into
  // view: checked when it opens and whenever the viewport changes size. Dragging and expanding
  // use the same fit, so a window is never left mostly off screen.
  const latest = useRef({ pos, onMove });
  useEffect(() => {
    latest.current = { pos, onMove };
  });
  useEffect(() => {
    let frame = 0;
    const fit = () => {
      frame = 0;
      if (drag.current) return;
      const { pos: now, onMove: move } = latest.current;
      const next = fitToViewport(now, width, height);
      if (next.x !== now.x || next.y !== now.y) move(next);
    };
    const onResize = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    fit();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [width, height]);

  return (
    <div
      role="dialog"
      aria-label={title}
      className="wb-window pointer-events-auto fixed flex flex-col overflow-hidden"
      style={{ left: at.x, top: at.y, width, height: at.minimized ? undefined : height, zIndex: z }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onFocus();
      }}
      onWheel={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="wb-window__bar flex cursor-grab touch-none select-none items-center gap-2.5 py-1.5 pl-3 pr-1.5 active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = { dx: e.clientX - at.x, dy: e.clientY - at.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) setLive(fitToViewport({ ...at, x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }, width, height));
        }}
        onPointerUp={() => {
          drag.current = null;
          if (live) onMove(live);
          setLive(null);
        }}
      >
        <span className={`${grainTile(tile)} wb-tile-icon--sm`}>{icon}</span>
        <span className="wb-window__title min-w-0 flex-1 truncate">{title}</span>
        <button
          type="button"
          title={at.minimized ? "ขยาย · Expand" : "ย่อ · Minimize"}
          aria-label={at.minimized ? "ขยาย · Expand" : "ย่อ · Minimize"}
          // Expanding from a bar parked at the bottom edge would open below the screen: fit it.
          onClick={() => onMove(fitToViewport({ ...pos, minimized: !pos.minimized }, width, height))}
          className="wb-window__btn"
        >
          {at.minimized ? <Maximize2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /> : <Minus className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />}
        </button>
        <button type="button" title="ปิด · Close" aria-label="ปิด · Close" onClick={onClose} className="wb-window__btn">
          <X className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
      {!at.minimized && <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>}
    </div>
  );
}
