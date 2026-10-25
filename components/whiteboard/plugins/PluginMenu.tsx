"use client";

import "@/components/calendar/calendar.css";

import { AppWindow, Blocks } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PLUGINS } from "./registry";
import type { BoardPlugin } from "./types";

/**
 * The Apps button in the top bar. Editors place an app on the board as a
 * widget everyone sees; anyone can open it as a window just for themselves.
 */
export function PluginMenu({
  open,
  onToggle,
  onPlace,
}: {
  open: Record<string, unknown>;
  onToggle: (id: string) => void;
  /** Set when the viewer may edit the board. */
  onPlace?: (plugin: BoardPlugin) => void;
}) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shown) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setShown(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [shown]);

  const pick = (fn: () => void) => {
    fn();
    setShown(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Apps"
        onClick={() => setShown((s) => !s)}
        className={`wb-pill ${Object.keys(open).length ? "wb-pill--on" : ""}`}
      >
        <Blocks className="h-4 w-4" />
        <span className="hidden sm:inline">แอป</span>
      </button>
      {shown && (
        <div className="wb-window absolute right-0 top-11 z-30 w-80 p-1.5">
          {PLUGINS.map((p) => {
            const placeable = Boolean(onPlace && p.widget);
            return (
              <div key={p.id} className="cal-hover flex items-start gap-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => pick(() => (placeable ? onPlace!(p) : onToggle(p.id)))}
                  className="flex min-w-0 flex-1 items-start gap-2.5 p-2 text-left"
                >
                  <span className="mt-0.5">{p.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs opacity-60">
                      {placeable ? "วางบนบอร์ดให้ทุกคนเห็น · " : ""}
                      {p.description}
                    </span>
                  </span>
                </button>
                {placeable && (
                  <button
                    type="button"
                    title={open[p.id] ? "ปิดหน้าต่าง" : "เปิดเป็นหน้าต่าง (เห็นคนเดียว)"}
                    onClick={() => pick(() => onToggle(p.id))}
                    className={`m-1.5 rounded-md p-1.5 ${open[p.id] ? "text-orange-500" : "opacity-60 hover:opacity-100"}`}
                  >
                    <AppWindow className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
