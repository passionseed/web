import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Small look-alikes of the real buttons and labels, so each step in the guide
 * shows what to look for. They are pictures, not controls.
 */

/** A button in the staff pages or the board kit. */
export function Btn({ children, primary = false, mono = false }: { children: ReactNode; primary?: boolean; mono?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm",
        primary ? "border-orange-500 bg-orange-500 font-semibold text-orange-950" : "border-orange-300/40 bg-[var(--dusk-space-950)] text-white",
        mono && "font-space-mono text-xs",
      )}
    >
      {children}
    </span>
  );
}

/** A chip drawn on the whiteboard itself (light, like the board). */
export function BoardChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf1] px-3 py-1 text-[13px] font-semibold text-[#2b1a10] shadow-sm">
      {children}
    </span>
  );
}

/** Buttons pressed one after another. */
export function Path({ steps }: { steps: ReactNode[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span className="text-slate-400" aria-hidden="true">
              →
            </span>
          )}
          {step}
        </span>
      ))}
    </span>
  );
}

/** A dark panel standing in for part of a staff page. */
export function Panel({ children }: { children: ReactNode }) {
  return <div className="grid w-full gap-2.5 rounded-xl border border-orange-300/20 bg-[var(--dusk-space-950)] p-3.5">{children}</div>;
}

/** A corner of a SHIFT canvas: one zone, its + button, and a note. */
export function ZoneSketch() {
  return (
    <div className="w-full max-w-xs rounded-lg bg-[#f6f3ee] p-3 text-[13px] text-[#2b1a10]">
      <div className="relative rounded-md bg-pink-300/30 p-2.5 pb-3">
        <p className="font-semibold">🎤 สัมภาษณ์</p>
        <span className="absolute right-2 top-2">
          <BoardChip>＋ เพิ่ม</BoardChip>
        </span>
        <p className="mt-2 w-40 rounded bg-pink-300 p-2 text-xs leading-snug">พี่เภสัชบอกว่าคนแก่ถามเรื่องยาซ้ำทุกวัน</p>
      </div>
    </div>
  );
}

/** One row of the staff canvases page, with a made-up student. */
export function RowSketch() {
  return (
    <Panel>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-700 font-semibold" aria-hidden="true">
          ม
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">
            มิ้นท์ ศรีสุข <span className="font-normal text-slate-300">· มิ้นท์</span>
          </span>
          <span className="block text-xs text-orange-300">@mint_th · Mint ☀️</span>
        </span>
      </div>
      <p className="flex flex-wrap gap-3 text-sm tabular-nums">
        <span>
          🎯👥<span className="opacity-30 grayscale">💡🚀</span>
        </span>
        <span>🎤 3</span>
        <span>🔍 1</span>
        <span>🧪 0</span>
        <span>🔀 1</span>
        <span>Days 3/7</span>
      </p>
      <p className="text-[13px] text-slate-300">
        <span className="font-medium text-white">10 Nov:</span> เพิ่มสัมภาษณ์ 2 คนในช่อง 🎤 สัมภาษณ์ และเก็บ ปัญหา v2
      </p>
    </Panel>
  );
}

/** A label saying the people shown are made up. */
export function ExampleTag() {
  return <span className="font-space-mono text-[10px] uppercase tracking-widest text-amber-200">ตัวอย่าง ไม่ใช่นักเรียนจริง</span>;
}
