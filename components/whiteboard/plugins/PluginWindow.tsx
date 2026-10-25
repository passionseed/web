"use client";

import { Minus, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

export type WindowPos = { x: number; y: number; minimized?: boolean };

/** A floating, draggable window over the canvas. */
export function PluginWindow({
  title,
  icon,
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
  const clamp = (p: WindowPos) => ({
    ...p,
    x: Math.min(Math.max(p.x, 8 - width + 120), window.innerWidth - 120),
    y: Math.min(Math.max(p.y, 8), window.innerHeight - 48),
  });

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
        className="wb-window__bar flex cursor-grab touch-none select-none items-center gap-2 px-3 py-2 active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = { dx: e.clientX - at.x, dy: e.clientY - at.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) setLive(clamp({ ...at, x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }));
        }}
        onPointerUp={() => {
          drag.current = null;
          if (live) onMove(live);
          setLive(null);
        }}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
        <button type="button" title={at.minimized ? "Expand" : "Minimize"} onClick={() => onMove({ ...pos, minimized: !pos.minimized })} className="rounded p-0.5 opacity-60 hover:opacity-100">
          <Minus className="h-4 w-4" />
        </button>
        <button type="button" title="Close" onClick={onClose} className="rounded p-0.5 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
      {!at.minimized && <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>}
    </div>
  );
}
