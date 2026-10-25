"use client";

import "@/components/calendar/calendar.css";

import { Blocks } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PLUGINS } from "./registry";

/** The Apps button in the top bar: lists board windows and opens or closes them. */
export function PluginMenu({ open, onToggle }: { open: Record<string, unknown>; onToggle: (id: string) => void }) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shown) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setShown(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [shown]);

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
        <div className="wb-window absolute right-0 top-11 z-30 w-72 p-1.5">
          {PLUGINS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onToggle(p.id);
                setShown(false);
              }}
              className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left cal-hover"
            >
              <span className="mt-0.5">{p.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block text-xs opacity-60">{p.description}</span>
              </span>
              {open[p.id] ? <span className="text-xs text-orange-500">เปิดอยู่</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
