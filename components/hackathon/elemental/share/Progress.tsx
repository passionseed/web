"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { PER_NETWORK_CAP } from "@/lib/hackathon/elemental/link-views-shared";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { GOALS, qualifies, reachedDevicesGoal, remaining, type Goals, type Progress, type Race } from "@/lib/hackathon/elemental/share-rules";

import { hairline } from "./ui";

/**
 * The house meter for share links, on the share pages and the pay-page card:
 * devices as a strip of 50 pixels (one per device), "และ", the 3 paid seats
 * as blocks, then the reward row that stays outlined until both are full.
 * A 15-year-old should get it in three seconds: the title says what's left.
 *
 * mode "gone": the school's seat went to another link. The seat meters turn
 * grey and say so (a teacher's devices still count for Demo Day).
 * mode "rejected": staff turned the link down; everything is neutral grey.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  devices: "เครื่องที่เปิดลิงก์",
  devicesUnit: "เครื่อง",
  paid: "คนสมัครแล้วจ่ายผ่านลิงก์",
  paidUnit: "คน",
  and: "และ",
  wifi: `wifi เดียวกันนับได้ไม่เกิน ${PER_NETWORK_CAP} เครื่อง`,
  seat: "ที่นั่งฟรี 1 ที่",
  seatTeacher: "ที่นั่งฟรีของโรงเรียน",
  demoDay: "เชิญคุณครูมา Demo Day",
  gone: "ที่นั่งโรงเรียนนี้มีคนได้แล้ว",
  titleLeft: (r: Progress) =>
    `ที่นั่งฟรี: ${[r.devices > 0 && `อีก ${r.devices} เครื่อง`, r.paid > 0 && `${r.devices > 0 ? "+" : "อีก"} ${r.paid} คนจ่าย`].filter(Boolean).join(" ")}`,
  titleDone: "ที่นั่งฟรี: ครบแล้ว",
  titleTeacherDevices: (n: number) => `Demo Day: อีก ${n} เครื่อง`,
  titleTeacherPaid: (n: number) => `ที่นั่งฟรี: อีก ${n} คนจ่าย`,
  titleRejected: "ลิงก์นี้ไม่ได้ที่นั่งฟรี",
  titleStopped: "ปิดนับแล้ว ยังไม่ครบ",
  race: (r: Race) =>
    r.links <= 1
      ? "ตอนนี้มีลิงก์เดียวในโรงเรียนนี้"
      : `โรงเรียนนี้มี ${r.links} ลิงก์ · ${r.youLead ? "ลิงก์ของคุณนำอยู่" : `ลิงก์ที่นำอยู่ ${r.leader?.devices ?? 0}/${GOALS.devices} · ${r.leader?.paid ?? 0}/${GOALS.paid}`}`,
  live: `อัปเดตเองทุก ${SHARE.pollMs / 1000} วินาที`,
  frozen: "ตัวเลขนับถึงวันปิดรับสมัคร",
};

export type MeterMode = "open" | "gone" | "rejected";

const EMPTY = "rgba(29,33,31,0.09)";
const GREY = "rgba(29,33,31,0.32)";

/**
 * The meter's headline (what's left), also the pay-page card's title. Null
 * when there's nothing left to aim for that the page doesn't already say
 * (a teacher who is invited and whose school's seat is gone).
 */
export function meterTitle(
  progress: Progress,
  kind: "student" | "teacher",
  mode: MeterMode = "open",
  frozen = false,
  goals: Goals = GOALS,
): string | null {
  const left = remaining(progress, goals);
  if (mode === "rejected") return COPY.titleRejected;
  // After close nothing more counts: say it stopped short instead of "what's left".
  if (frozen && mode === "open" && !qualifies(progress, goals) && (kind === "student" || left.devices > 0)) return COPY.titleStopped;
  if (kind === "teacher") {
    if (left.devices > 0) return COPY.titleTeacherDevices(left.devices);
    if (mode === "gone") return null;
    return left.paid > 0 ? COPY.titleTeacherPaid(left.paid) : COPY.titleDone;
  }
  if (mode === "gone") return COPY.gone;
  return qualifies(progress, goals) ? COPY.titleDone : COPY.titleLeft(left);
}

/** Cells that just filled colour in one after another; nothing moves for people who turned motion off. */
function usePrevious(n: number) {
  const ref = useRef(n);
  useEffect(() => {
    ref.current = n;
  }, [n]);
  return ref.current;
}

/** "12/50", or once the goal no longer applies just "12 เครื่อง". */
function Count({ value, goal, unit, grey, plain }: { value: number; goal: number; unit: string; grey?: boolean; plain?: boolean }) {
  if (plain) {
    return (
      <span className="whitespace-nowrap tabular-nums" style={{ color: EL.inkSoft }}>
        <span className="text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
          {value}
        </span>{" "}
        <span className="text-base">{unit}</span>
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap tabular-nums" aria-label={`${value} จาก ${goal} ${unit}`} style={{ color: grey ? EL.inkSoft : undefined }}>
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
export function DeviceStrip({ value, goal = GOALS.devices, grey }: { value: number; goal?: number; grey?: boolean }) {
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
            style={{ backgroundColor: on ? (grey ? GREY : EL.flame) : EMPTY, transitionDelay: fresh ? `${(i - prev) * 40}ms` : undefined }}
          />
        );
      })}
    </div>
  );
}

/** 3 paid seats as three blocks. */
export function PaidBlocks({ value, goal = GOALS.paid, grey, small }: { value: number; goal?: number; grey?: boolean; small?: boolean }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${goal}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: goal }, (_, i) => {
        const on = i < value;
        return (
          <span
            key={i}
            className={`flex items-center justify-center rounded-md motion-safe:transition-colors motion-safe:duration-500 ${small ? "h-8" : "h-11"}`}
            style={{ backgroundColor: on ? (grey ? GREY : EL.flame) : "transparent", boxShadow: on ? undefined : `inset 0 0 0 1.5px ${EMPTY}` }}
          >
            {on && !grey && <Check className="h-5 w-5" style={{ color: EL.flameWhite }} strokeWidth={2.5} />}
          </span>
        );
      })}
    </div>
  );
}

/** "และ" between the two meters. */
function And() {
  return (
    <div className="my-4 flex items-center gap-3 text-sm" style={{ color: EL.inkSoft }} aria-hidden="true">
      <span className="h-px flex-1" style={{ backgroundColor: hairline }} />
      {COPY.and}
      <span className="h-px flex-1" style={{ backgroundColor: hairline }} />
    </div>
  );
}

/** The reward: outlined until it's earned, then filled with a check. */
function Reward({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <div
      className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold"
      style={done ? { backgroundColor: EL.flame, color: EL.flameWhite } : { boxShadow: `inset 0 0 0 1.5px ${EL.ink}`, color: EL.ink }}
    >
      {done && <Check className="h-5 w-5" strokeWidth={2.5} />}
      {children}
    </div>
  );
}

export function SeatMeter({
  progress,
  kind,
  mode = "open",
  race,
  live = false,
  frozen = false,
  showTitle = true,
  framed = true,
  goals = GOALS,
}: {
  progress: Progress;
  kind: "student" | "teacher";
  mode?: MeterMode;
  /** The anonymous race at the school. */
  race?: Race | null;
  /** It refreshes itself (say so). */
  live?: boolean;
  /** Sign-up has closed: the numbers stopped at close. */
  frozen?: boolean;
  showTitle?: boolean;
  /** In its own bordered box (share pages) or bare (inside the pay-page card). */
  framed?: boolean;
  goals?: Goals;
}) {
  const rejected = mode === "rejected";
  const seatGone = mode !== "open";
  // A teacher's devices still earn the Demo Day invite when the school's seat is gone.
  const devicesGrey = rejected || (seatGone && kind === "student");
  const done = qualifies(progress, goals);
  const invited = reachedDevicesGoal(progress, goals);

  const body = (
    <>
      {showTitle && meterTitle(progress, kind, mode, frozen, goals) && (
        <p className="mb-5 text-xl font-semibold">{meterTitle(progress, kind, mode, frozen, goals)}</p>
      )}

      <div className="flex items-end justify-between gap-3">
        <span className="pb-1.5 text-base">{COPY.devices}</span>
        <Count
          value={progress.devices}
          goal={goals.devices}
          unit={COPY.devicesUnit}
          grey={devicesGrey}
          plain={devicesGrey}
        />
      </div>
      <div className="mt-2">
        <DeviceStrip value={progress.devices} goal={goals.devices} grey={devicesGrey} />
      </div>
      <p className="mt-1.5 text-xs" style={{ color: EL.inkSoft }}>
        {COPY.wifi}
      </p>
      {kind === "teacher" && !rejected && (
        <div className="mt-3">
          <Reward done={invited}>{COPY.demoDay}</Reward>
        </div>
      )}

      <And />

      <div className="flex items-end justify-between gap-3">
        <span className="pb-1.5 text-base">{COPY.paid}</span>
        <Count value={progress.paid} goal={goals.paid} unit={COPY.paidUnit} grey={seatGone} plain={seatGone} />
      </div>
      <div className="mt-2">
        <PaidBlocks value={Math.min(progress.paid, goals.paid)} goal={goals.paid} grey={seatGone} />
      </div>
      {!seatGone && (
        <div className="mt-4">
          <Reward done={done}>{kind === "teacher" ? COPY.seatTeacher : COPY.seat}</Reward>
        </div>
      )}
      {kind === "teacher" && mode === "gone" && (
        <p className="mt-2 text-sm" style={{ color: EL.inkSoft }}>
          {COPY.gone}
        </p>
      )}

      {(race && !seatGone) || live || frozen ? (
        <div className="mt-4 space-y-1 border-t pt-3 text-sm" style={{ borderColor: hairline, color: EL.inkSoft }}>
          {race && !seatGone && <p>{COPY.race(race)}</p>}
          {(live || frozen) && <p>{frozen ? COPY.frozen : COPY.live}</p>}
        </div>
      ) : null}
    </>
  );

  if (!framed) return <div aria-live="polite">{body}</div>;
  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: hairline, backgroundColor: "rgba(255,255,255,0.45)" }} aria-live="polite">
      {body}
    </section>
  );
}
