"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { GOALS, remaining, reachedDevicesGoal, qualifies, type Goals, type Progress } from "@/lib/hackathon/elemental/share-rules";

import { hairline } from "./ui";

/**
 * How far a share link is, at a glance: one line that says what's left,
 * then the devices as a strip of pixels (one per device) and the paid seats
 * as three big blocks. A 15-year-old should get it in three seconds.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  devices: "คนเปิดลิงก์",
  devicesUnit: "เครื่อง",
  paid: "สมัครแล้วจ่ายผ่านลิงก์",
  paidUnit: "คน",
  left: (r: Progress) =>
    r.devices > 0 && r.paid > 0
      ? `อีก ${r.devices} เครื่อง กับอีก ${r.paid} คนจ่าย`
      : r.devices > 0
        ? `อีก ${r.devices} เครื่อง`
        : `อีก ${r.paid} คนจ่าย`,
  start: "ยังไม่มีใครเปิด ส่งลิงก์แรกเลย",
  done: "ครบทั้งสองอย่างแล้ว",
  studentRule: "ครบทั้งสองอย่าง ได้ที่นั่งฟรีของโรงเรียน",
  totals: (p: Progress) => `ลิงก์ของคุณ: ${p.devices} เครื่อง ${p.paid} คนจ่าย`,
  teacherDevicesLeft: (n: number) => `อีก ${n} เครื่อง ได้รับเชิญมา Demo Day`,
  teacherDevicesDone: "ครบแล้ว ได้รับเชิญมา Demo Day",
  teacherSeatGone: "ที่นั่งฟรีของโรงเรียนนี้มีคนได้แล้ว",
  teacherDevices: (n: number) => `ครบ ${n} เครื่อง: เชิญคุณครูมา Demo Day`,
  teacherPaid: (n: number) => `ครบ ${n} คนด้วย: ที่นั่งฟรีของโรงเรียน`,
  live: `อัปเดตเองทุก ${SHARE.pollMs / 1000} วินาที`,
  compactDevices: "เปิดลิงก์",
  compactPaid: "จ่ายแล้ว",
};

const EMPTY = "rgba(29,33,31,0.09)";

/** Cells that just filled pop in, one after another; nothing moves for people who turned motion off. */
function usePrevious(n: number) {
  const ref = useRef(n);
  useEffect(() => {
    ref.current = n;
  }, [n]);
  return ref.current;
}

function Count({ value, goal, unit }: { value: number; goal: number; unit: string }) {
  return (
    <span className="whitespace-nowrap tabular-nums" aria-label={`${value} จาก ${goal} ${unit}`}>
      <span className="text-4xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
        {value}
      </span>
      <span className="text-lg" style={{ color: EL.inkSoft }}>
        /{goal}
      </span>
    </span>
  );
}

/** 50 devices as 25 x 2 pixels. Past the goal the strip stays full. */
function DeviceStrip({ value, goal }: { value: number; goal: number }) {
  const prev = usePrevious(value);
  const filled = Math.min(value, goal);
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.ceil(goal / 2)}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: goal }, (_, i) => {
        const on = i < filled;
        const fresh = on && i >= prev;
        return (
          <span
            key={i}
            className="aspect-square rounded-[2px] motion-safe:transition-colors motion-safe:duration-500"
            style={{ backgroundColor: on ? EL.flame : EMPTY, transitionDelay: fresh ? `${(i - prev) * 40}ms` : undefined }}
          />
        );
      })}
    </div>
  );
}

/** 3 paid seats as three blocks. */
function PaidBlocks({ value, goal, size = "big" }: { value: number; goal: number; size?: "big" | "small" }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${goal}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: goal }, (_, i) => {
        const on = i < value;
        return (
          <span
            key={i}
            className={`flex items-center justify-center rounded-md motion-safe:transition-colors motion-safe:duration-500 ${size === "big" ? "h-11" : "h-3"}`}
            style={{ backgroundColor: on ? EL.flame : "transparent", boxShadow: on ? undefined : `inset 0 0 0 1.5px ${EMPTY}` }}
          >
            {size === "big" && on && <Check className="h-5 w-5" style={{ color: EL.flameWhite }} strokeWidth={2.5} />}
          </span>
        );
      })}
    </div>
  );
}

function Milestone({ done, children }: { done: boolean; children: string }) {
  return (
    <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: done ? EL.ink : EL.inkSoft }}>
      {done && <Check className="h-4 w-4 shrink-0" style={{ color: EL.flame }} strokeWidth={2.5} />}
      {children}
    </p>
  );
}

/** The full version, for the share pages. */
export function ShareProgress({
  progress,
  kind,
  goals = GOALS,
  live = false,
  seatGone = false,
}: {
  progress: Progress;
  kind: "student" | "teacher";
  goals?: Goals;
  live?: boolean;
  /** The school's seat went to another link (or this one was turned down): nothing left to aim for but the count. */
  seatGone?: boolean;
}) {
  const left = remaining(progress, goals);
  const done = qualifies(progress, goals);
  const headline = seatGone
    ? kind === "teacher"
      ? left.devices > 0
        ? COPY.teacherDevicesLeft(left.devices)
        : COPY.teacherDevicesDone
      : COPY.totals(progress)
    : done
      ? COPY.done
      : progress.devices === 0 && progress.paid === 0
        ? COPY.start
        : COPY.left(left);
  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: hairline, backgroundColor: "rgba(255,255,255,0.45)" }} aria-live="polite">
      <p className="text-xl font-semibold">{headline}</p>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <span className="pb-1.5 text-base">{COPY.devices}</span>
          <Count value={progress.devices} goal={goals.devices} unit={COPY.devicesUnit} />
        </div>
        <div className="mt-2">
          <DeviceStrip value={progress.devices} goal={goals.devices} />
        </div>
        {kind === "teacher" && <Milestone done={reachedDevicesGoal(progress, goals)}>{COPY.teacherDevices(goals.devices)}</Milestone>}
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <span className="pb-1.5 text-base">{COPY.paid}</span>
          <Count value={progress.paid} goal={goals.paid} unit={COPY.paidUnit} />
        </div>
        <div className="mt-2">
          <PaidBlocks value={Math.min(progress.paid, goals.paid)} goal={goals.paid} />
        </div>
        {kind === "teacher" && (seatGone ? <Milestone done={false}>{COPY.teacherSeatGone}</Milestone> : <Milestone done={done}>{COPY.teacherPaid(goals.paid)}</Milestone>)}
      </div>

      {((kind === "student" && !seatGone) || live) && (
        <p className="mt-5 border-t pt-3 text-sm" style={{ borderColor: hairline, color: EL.inkSoft }}>
          {[kind === "student" && !seatGone && COPY.studentRule, live && COPY.live].filter(Boolean).join(" · ")}
        </p>
      )}
    </section>
  );
}

/** Two thin rows for the pay-page card. */
export function ShareProgressCompact({ progress, goals = GOALS }: { progress: Progress; goals?: Goals }) {
  const pct = Math.min(100, Math.round((progress.devices / goals.devices) * 100));
  return (
    <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3 gap-y-2.5 text-sm">
      <span>{COPY.compactDevices}</span>
      <span className="h-3 overflow-hidden rounded-[3px]" style={{ backgroundColor: EMPTY }} aria-hidden="true">
        <span className="block h-full rounded-[3px] motion-safe:transition-[width] motion-safe:duration-700" style={{ width: `${pct}%`, backgroundColor: EL.flame }} />
      </span>
      <span className="text-right tabular-nums" aria-label={`${progress.devices} จาก ${goals.devices} ${COPY.devicesUnit}`}>
        {progress.devices}/{goals.devices}
      </span>
      <span>{COPY.compactPaid}</span>
      <PaidBlocks value={Math.min(progress.paid, goals.paid)} goal={goals.paid} size="small" />
      <span className="text-right tabular-nums" aria-label={`${progress.paid} จาก ${goals.paid} ${COPY.paidUnit}`}>
        {progress.paid}/{goals.paid}
      </span>
    </div>
  );
}
