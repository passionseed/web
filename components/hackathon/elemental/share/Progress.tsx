"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Armchair, Check, Ticket, X } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { PER_NETWORK_CAP } from "@/lib/hackathon/elemental/link-views-shared";
import { SHARE } from "@/lib/hackathon/elemental/share";
import { reachedInvite, SEAT_RULE, seatGoal, TEACHER_INVITE_DEVICES, type SeatProgressView } from "@/lib/hackathon/elemental/share-rules";

import { hairline } from "./ui";

/**
 * The house meter for share links, on the share pages and the pay-page card,
 * drawn from SeatProgressView (lib/hackathon/elemental/share-rules.ts):
 * devices toward the next seat as a strip of 50 pixels (filled column by
 * column), "และ", the paid sign-ups it needs as blocks, then one status line
 * per seat (SEAT_RULE: every 50 devices + 1 paid = 1 seat, up to 2) that
 * turns peach once earned. The title says what's left in words a
 * 15-year-old gets in three seconds: "อีก 38 เครื่อง + 1 คนจ่าย = ที่นั่งฟรีที่ 1".
 *
 * After close with no seat earned, it greys out under "ปิดนับแล้ว".
 * The UX designer is rebuilding these visuals; the logic lives in the view model.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  devices: "เครื่องที่เปิดลิงก์",
  devicesUnit: "เครื่อง",
  paid: "คนสมัครแล้วจ่ายผ่านลิงก์",
  paidUnit: "คน",
  and: "และ",
  wifi: `wifi เดียวกันนับได้ไม่เกิน ${PER_NETWORK_CAP} เครื่อง`,
  seat: (i: number) => `= ที่นั่งฟรีที่ ${i}`,
  seatRejected: (i: number) => `ที่นั่งฟรีที่ ${i}: ทีมงานเช็กแล้วไม่ผ่าน`,
  demoDay: "= เชิญคุณครูมา Demo Day",
  left: (d: number, p: number) => [d > 0 && `อีก ${d} เครื่อง`, p > 0 && `${d > 0 ? "+" : "อีก"} ${p} คนจ่าย`].filter(Boolean).join(" "),
  titleFirst: (left: string) => `${left} = ที่นั่งฟรีที่ 1`,
  titleMore: (have: number, left: string, next: number) => `ได้ ${have} ที่ · ${left} = ที่ ${next}`,
  titleReady: (next: number) => `ครบแล้ว = ที่นั่งฟรีที่ ${next}`,
  titleMaxed: (n: number) => `ได้ครบ ${n} ที่แล้ว`,
  titleClosed: "ปิดนับแล้ว",
  titleClosedWith: (n: number) => `ปิดนับแล้ว · ได้ ${n} ที่`,
  live: `อัปเดตเองทุก ${SHARE.pollMs / 1000} วินาที`,
  frozen: "ตัวเลขนับถึงวันปิดรับสมัคร",
};

const EMPTY = "rgba(29,33,31,0.09)";
const GREY = "rgba(29,33,31,0.32)";

/** The meter's headline (what's left for the next seat), also the pay-page card's title. */
export function meterTitle(view: SeatProgressView): string {
  const have = view.seats.length;
  if (view.phase === "after-close") return have ? COPY.titleClosedWith(have) : COPY.titleClosed;
  if (view.maxed || !view.next) return COPY.titleMaxed(have);
  const left = COPY.left(view.next.devicesLeft, view.next.paidLeft);
  if (!left) return COPY.titleReady(view.next.index);
  return have ? COPY.titleMore(have, left, view.next.index) : COPY.titleFirst(left);
}

/**
 * Where device n sits along the strip, as a CSS left: the strip fills column
 * by column (device n is in column ceil(n/2) of 25), so ticks for 10, 25 and
 * 50 devices land at 20%, 52% and 100%. For labels under the strip.
 */
export function deviceTickLeft(n: number, goal: number = SEAT_RULE.devicesPerSeat): string {
  const columns = Math.ceil(goal / 2);
  return `${(Math.min(columns, Math.ceil(n / 2)) / columns) * 100}%`;
}

/** Cells that just filled colour in one after another; nothing moves for people who turned motion off. */
function usePrevious(n: number) {
  const ref = useRef(n);
  useEffect(() => {
    ref.current = n;
  }, [n]);
  return ref.current;
}

/** "62/100", or once nothing more counts just "62 เครื่อง". */
function Count({ value, goal, unit, plain }: { value: number; goal: number; unit: string; plain?: boolean }) {
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

/**
 * 50 devices as 25 x 2 pixels, filled column by column (top, then bottom, then
 * the next column), so the strip reads left to right like a bar. Past the goal
 * the strip stays full.
 */
export function DeviceStrip({ value, goal = SEAT_RULE.devicesPerSeat, grey }: { value: number; goal?: number; grey?: boolean }) {
  const prev = usePrevious(value);
  const filled = Math.min(value, goal);
  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateRows: "repeat(2, auto)", gridAutoFlow: "column", gridAutoColumns: "minmax(0, 1fr)" }}
      aria-hidden="true"
    >
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

/** Paid sign-ups as blocks, one per paid sign-up the next seat needs. */
export function PaidBlocks({ value, goal = SEAT_RULE.paidPerSeat, grey, small }: { value: number; goal?: number; grey?: boolean; small?: boolean }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(goal, 1)}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: Math.max(goal, 1) }, (_, i) => {
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

/**
 * A reward as a status line (never a button): a dashed hairline until it's
 * earned, then a pale peach fill with orange text and a check.
 */
function Reward({ state, icon, children }: { state: "todo" | "done" | "no"; icon: ReactNode; children: ReactNode }) {
  const style =
    state === "done"
      ? { backgroundColor: "rgba(236,100,36,0.10)", color: EL.ember }
      : state === "no"
        ? { backgroundColor: EMPTY, color: EL.inkSoft }
        : { border: "1px dashed rgba(29,33,31,0.28)", color: EL.inkSoft };
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-base" style={style}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        {state === "done" ? <Check className="h-4 w-4" strokeWidth={2.5} /> : state === "no" ? <X className="h-4 w-4" /> : icon}
      </span>
      {children}
    </div>
  );
}

export function SeatMeter({
  view,
  kind,
  live = false,
  showTitle = true,
  framed = true,
}: {
  view: SeatProgressView;
  kind: "student" | "teacher";
  /** It refreshes itself (say so). */
  live?: boolean;
  showTitle?: boolean;
  /** In its own bordered box (share pages) or bare (inside the pay-page card). */
  framed?: boolean;
}) {
  const { rule } = view;
  const frozen = view.phase === "after-close";
  const grey = frozen && view.seats.length === 0;
  // The seat in progress: the next one, or the last one once maxed.
  const target = view.next?.index ?? rule.maxSeatsPerLink;
  const goal = seatGoal(target, rule);
  const from = seatGoal(target - 1, rule);
  const stripValue = Math.max(0, view.devices - from.devices);
  const invited = reachedInvite(view);

  const body = (
    <>
      {showTitle && <p className="mb-5 text-xl font-semibold">{meterTitle(view)}</p>}

      <div className="flex items-end justify-between gap-3">
        <span className="pb-1.5 text-base">{COPY.devices}</span>
        <Count value={view.devices} goal={goal.devices} unit={COPY.devicesUnit} plain={grey} />
      </div>
      <div className="mt-2">
        <DeviceStrip value={stripValue} goal={rule.devicesPerSeat} grey={grey} />
      </div>
      <p className="mt-1.5 text-xs" style={{ color: EL.inkSoft }}>
        {COPY.wifi}
      </p>
      {kind === "teacher" && (!frozen || invited) && (
        <div className="mt-3">
          <Reward state={invited ? "done" : "todo"} icon={<Ticket className="h-4 w-4" />}>
            {COPY.demoDay}
          </Reward>
          <span className="sr-only">{`${TEACHER_INVITE_DEVICES} ${COPY.devicesUnit}`}</span>
        </div>
      )}

      <And />

      <div className="flex items-end justify-between gap-3">
        <span className="pb-1.5 text-base">{COPY.paid}</span>
        <Count value={view.paid} goal={goal.paid} unit={COPY.paidUnit} plain={grey} />
      </div>
      <div className="mt-2">
        <PaidBlocks value={Math.min(view.paid, goal.paid)} goal={goal.paid} grey={grey} />
      </div>

      {!grey && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: rule.maxSeatsPerLink }, (_, i) => i + 1).map((index) => {
            const seat = view.seats.find((x) => x.index === index);
            if (!seat && frozen) return null;
            return (
              <Reward key={index} state={seat ? (seat.status === "rejected" ? "no" : "done") : "todo"} icon={<Armchair className="h-4 w-4" />}>
                {seat?.status === "rejected" ? COPY.seatRejected(index) : COPY.seat(index)}
              </Reward>
            );
          })}
        </div>
      )}

      {live || frozen ? (
        <p className="mt-4 border-t pt-3 text-sm" style={{ borderColor: hairline, color: EL.inkSoft }}>
          {frozen ? COPY.frozen : COPY.live}
        </p>
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
