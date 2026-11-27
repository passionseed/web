"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { EL, EL_FIRE, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { formatThaiDate } from "@/lib/content/shift-cohort";
import type { SeatProgressView } from "@/lib/hackathon/elemental/share-rules";

import { KEY_VISUAL_MEDIA } from "../media";
import styles from "./seat-card.module.css";
import {
  cellHeat,
  clearOrder,
  freshCells,
  GRID_COLUMNS,
  GRID_ROWS,
  inviteState,
  readSeen,
  seatCardModel,
  seatPlace,
  stubTone,
  writeSeen,
  type InviteState,
  type StubTone,
} from "./seat-card-model";
import { BigCount, Body, Fine, Tag, v } from "./ui";

/**
 * The meter on every share surface (merged direction §6–7): a corrupted place
 * recovering. A 10×5 grid of fire pixels over the link's recovered-place
 * photo (the Ticket's photos); each device clears one; at 50 the photo is
 * clean and, with 1 paid sign-up, the seat drops into the earned row above as
 * a ticket stub. Seat 2 starts again on the next photo. A teacher's row also
 * holds the Demo Day stub. Full size on the share and teacher pages, "mini"
 * in the pay page's dark slab. The page says what's left (seatHeadline);
 * the card shows it.
 *
 * Motion: from the count this phone last saw (localStorage), never from 0;
 * at most 8 cells animate; nothing moves under prefers-reduced-motion. Screen
 * readers get one hidden line, not the grid.
 */

// copy: placeholder — Angpao rewrites
const COPY = {
  seat: { student: (i: number) => `ที่นั่งฟรีที่ ${i}`, teacher: (i: number) => `ที่นั่งที่ ${i}` },
  demoDay: "Demo Day",
  tone: {
    checking: "กำลังเช็ก",
    naming: "ใส่รหัส",
    given: "ได้แล้ว",
    rejected: "ไม่ผ่าน",
  } satisfies Record<StubTone, string>,
  invite: { todo: "", earned: "รอยืนยัน", verified: "ยืนยันแล้ว", sent: "ส่งแล้ว" } satisfies Record<InviteState, string>,
  maxedTag: (n: number) => `ครบ ${n} ที่`,
  devicesUnit: "เครื่อง",
  paid: "+ จ่ายผ่านลิงก์",
  paidLeft: (n: number) => `+ อีก ${n} คนจ่ายผ่านลิงก์`,
  total: (n: number) => `รวม ${n} เครื่อง`,
  maxed: "แชร์ต่อยังนับให้ทีมบนกระดาน",
  stamp: `ปิดนับ ${formatThaiDate(ELEMENTAL.registrationClosesOn, false)}`,
  label: "ที่นั่งฟรีจากลิงก์นี้",
  describe: (inSeat: number, per: number, seat: string, paid: number, paidPer: number, earned: number, max: number) =>
    `${seat}: ${inSeat} จาก ${per} เครื่อง, จ่ายผ่านลิงก์ ${paid} จาก ${paidPer} คน. ได้แล้ว ${earned} จาก ${max} ที่`,
  announce: (added: number, inSeat: number, per: number) => `เพิ่ม ${added} เครื่อง รวม ${inSeat} จาก ${per}`,
  announceSeat: (i: number) => `ได้ที่นั่งฟรีที่ ${i} แล้ว`,
};

type Size = "full" | "mini";

/** One stub in the earned row: a tiny Ticket (photo, tear line with notches, the seat's name). A dashed ghost until earned. */
function Stub({
  label,
  tag,
  photo,
  tone,
  size,
  entering,
}: {
  label: string;
  tag?: string;
  /** No photo: the dashed ghost. */
  photo?: string;
  tone?: "action" | "grey";
  size: Size;
  entering?: boolean;
}) {
  const ghost = !photo;
  const notch = "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full";
  return (
    <div
      className={`relative min-w-0 flex-1 overflow-hidden rounded-[2px] ${ghost ? "border border-dashed" : ""} ${entering ? styles.stubIn : ""}`}
      style={ghost ? { borderColor: "rgba(243,239,230,0.28)" } : { backgroundColor: EL.char }}
    >
      <div className={`relative ${size === "mini" ? "h-9" : "h-12"}`}>
        {photo && (
          <>
            <Image src={photo} alt="" fill sizes="180px" className="object-cover" style={tone === "grey" ? { filter: "grayscale(1) brightness(0.7)" } : undefined} />
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(12,13,12,0.85) 0%, rgba(12,13,12,0) 75%)" }} />
          </>
        )}
        {tag && (
          <span className="absolute bottom-0.5 left-2">
            <Tag tone={tone === "action" ? "action" : "secondary"}>{tag}</Tag>
          </span>
        )}
      </div>
      <div className="relative">
        <span className={`${notch} -left-1.5`} style={{ backgroundColor: "var(--el-bg)" }} />
        <span className={`${notch} -right-1.5`} style={{ backgroundColor: "var(--el-bg)" }} />
        <div className="mx-2.5 border-t border-dashed" style={{ borderColor: "rgba(243,239,230,0.22)" }} />
      </div>
      <p
        className={`truncate px-2.5 ${size === "mini" ? "py-1" : "py-1.5"}`}
        style={{ fontFamily: EL_FONT.body, fontWeight: 600, fontSize: 13, lineHeight: "20px", color: ghost ? v.fine : v.text }}
      >
        {label}
      </p>
    </div>
  );
}

/** The count, with the new number stepping in and a "+2" for a moment. */
function LiveCount({ value, goal, unit, plus }: { value: number; goal?: number; unit?: string; plus: number }) {
  return (
    <span className="relative inline-flex items-baseline gap-2">
      {plus > 0 && (
        <span key={`plus-${value}`} className={styles.plus} aria-hidden="true" style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "20px", color: v.action }}>
          +{plus}
        </span>
      )}
      <span key={value} className={plus > 0 ? styles.countIn : undefined}>
        <BigCount value={value} goal={goal} unit={unit} />
      </span>
    </span>
  );
}

type Motion = { fresh: Set<number>; wave: boolean; plus: number; newStub: number | null; announce: string };
const STILL: Motion = { fresh: new Set(), wave: false, plus: 0, newStub: null, announce: "" };

export function SeatCard({
  view,
  code,
  kind = "student",
  invite,
  size = "full",
  preview = false,
}: {
  view: SeatProgressView;
  /** The link's code: seeds the photo, the fire and the order the cells clear in. */
  code: string;
  kind?: "student" | "teacher";
  /** Teachers: staff checks on the Demo Day invite. */
  invite?: { verified: boolean; invited: boolean };
  size?: Size;
  /** No link yet (the school picker): just the empty grid and its count (the sky says the rule, and the search stays in the first screen); nothing remembered or animated. */
  preview?: boolean;
}) {
  const m = seatCardModel(view);
  const place = seatPlace(code, m.index);
  const rank = useMemo(() => clearOrder(code, m.index), [code, m.index]);
  const heat = useMemo(() => cellHeat(code, m.index), [code, m.index]);
  const seatName = COPY.seat[kind];

  // Animate from what this phone saw last. The page renders the current state; the effect only adds the flourish.
  const [motion, setMotion] = useState<Motion>(STILL);
  const seen = useRef<{ devices: number; seats: number } | null>(null);
  useEffect(() => {
    if (preview) return;
    const now = { devices: view.devices, seats: m.earned };
    const prev = seen.current ?? readSeen(code);
    const remember = () => {
      seen.current = now;
      writeSeen(code, now);
    };
    const added = prev ? now.devices - prev.devices : 0;
    const seatUp = !!prev && now.seats > prev.seats;
    if (!prev || (added <= 0 && !seatUp) || m.frozen) {
      remember();
      return;
    }
    const from = view.devices - m.inSeat;
    const announce = seatUp ? COPY.announceSeat(now.seats) : COPY.announce(added, m.inSeat, m.perSeat);
    // Motion off: nothing moves, but the hidden line still says what changed.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next: Motion = still
      ? { ...STILL, announce }
      : {
          fresh: freshCells(rank, m.inSeat, Math.max(0, prev.devices - from)),
          wave: seatUp,
          plus: Math.max(0, added),
          newStub: seatUp ? now.seats : null,
          announce,
        };
    // Remembered only once it plays, so a cancelled run (React's dev double effect, a quick re-render) plays it again.
    const start = setTimeout(() => {
      remember();
      setMotion(next);
    }, 0);
    const stop = setTimeout(() => setMotion((cur) => ({ ...cur, plus: 0, wave: false, fresh: new Set(), newStub: null })), 2400);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [preview, code, view.devices, m.earned, m.frozen, m.inSeat, m.perSeat, rank]);

  // The earned row: a teacher's Demo Day, then one slot per seat.
  const stubs: React.ReactNode[] = [];
  if (kind === "teacher") {
    const state = inviteState(view, invite ?? { verified: false, invited: false });
    stubs.push(
      <Stub
        key="demo-day"
        size={size}
        label={COPY.demoDay}
        photo={state === "todo" ? undefined : KEY_VISUAL_MEDIA.scenePoster}
        tag={state === "todo" ? undefined : COPY.invite[state]}
        tone={state === "sent" || state === "verified" ? "action" : undefined}
      />,
    );
  }
  for (let i = 1; i <= m.maxSeats; i++) {
    const seat = view.seats.find((s) => s.index === i);
    const tone = seat ? stubTone(seat) : null;
    stubs.push(
      <Stub
        key={i}
        size={size}
        label={seatName(i)}
        photo={seat ? seatPlace(code, i).src : undefined}
        tag={tone ? COPY.tone[tone] : undefined}
        tone={tone === "rejected" ? "grey" : tone === "given" || tone === "naming" ? "action" : undefined}
        entering={motion.newStub === i}
      />,
    );
  }

  const cells = GRID_COLUMNS * GRID_ROWS;
  return (
    <section aria-label={COPY.label}>
      <p className="sr-only">{COPY.describe(m.inSeat, m.perSeat, seatName(m.index), m.paidInSeat, m.paidPerSeat, m.earned, m.maxSeats)}</p>
      <p className="sr-only" aria-live="polite">
        {motion.announce}
      </p>

      {!preview && (
        <div aria-hidden="true" className="flex gap-2">
          {stubs}
        </div>
      )}

      <div aria-hidden="true" className={`flex items-end justify-between gap-3 ${preview ? "" : size === "mini" ? "mt-4" : "mt-6"}`}>
        <Tag>{m.maxed ? COPY.maxedTag(m.earned) : seatName(m.index)}</Tag>
        {m.maxed ? (
          <LiveCount value={view.devices} unit={COPY.devicesUnit} plus={motion.plus} />
        ) : (
          <LiveCount value={m.inSeat} goal={m.perSeat} plus={motion.plus} />
        )}
      </div>

      <div aria-hidden="true" className="relative mt-3 overflow-hidden rounded-[2px]" style={{ aspectRatio: "2 / 1", filter: m.frozen ? "grayscale(1) brightness(0.72)" : undefined }}>
        <Image src={place.src} alt="" fill sizes="(min-width: 640px) 576px, 100vw" className="object-cover" />
        <div className="absolute inset-0 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${GRID_ROWS}, minmax(0, 1fr))` }}>
          {Array.from({ length: cells }, (_, cell) => {
            const clear = rank[cell] < m.inSeat;
            if (clear) {
              const fresh = motion.fresh.has(cell);
              const order = fresh ? [...motion.fresh].sort((a, b) => rank[a] - rank[b]).indexOf(cell) : 0;
              return (
                <span key={cell} className="relative">
                  {fresh && <span className={`absolute inset-0 ${styles.clearing}`} style={{ animationDelay: `${order * 50}ms` }} />}
                  {motion.wave && <span className={`absolute inset-0 ${styles.wave}`} style={{ animationDelay: `${(cell % GRID_COLUMNS) * 35}ms` }} />}
                </span>
              );
            }
            return (
              <span
                key={cell}
                style={
                  m.last
                    ? { backgroundColor: "rgba(12,13,12,0.5)", boxShadow: `inset 0 0 0 2px ${EL.flameCore}` }
                    : { backgroundColor: EL_FIRE[heat[cell]], opacity: heat[cell] === 4 ? 0.94 : 1 }
                }
              />
            );
          })}
        </div>
        {m.frozen && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5" style={{ backgroundColor: "#0c0d0c", boxShadow: "inset 0 0 0 1px rgba(243,239,230,0.55)" }}>
            <Tag tone="text">{COPY.stamp}</Tag>
          </span>
        )}
      </div>

      <div aria-hidden="true" className={`mt-3 items-center justify-between gap-3 ${preview ? "hidden" : "flex"}`}>
        {m.maxed ? (
          <Body secondary as="span">
            {m.frozen ? "" : COPY.maxed}
          </Body>
        ) : (
          <span className="inline-flex items-center gap-2.5" style={{ fontFamily: EL_FONT.body, fontSize: 14, lineHeight: "22px", color: m.devicesDone ? v.action : v.secondary, fontWeight: m.devicesDone ? 600 : 400 }}>
            {m.devicesDone ? COPY.paidLeft(m.paidLeft) : COPY.paid}
            <span className="inline-flex gap-1">
              {Array.from({ length: m.paidPerSeat }, (_, i) => (
                <span
                  key={i}
                  className="h-3.5 w-3.5"
                  style={
                    i < m.paidInSeat
                      ? { backgroundColor: v.action }
                      : { boxShadow: `inset 0 0 0 ${m.devicesDone ? 2 : 1}px ${m.devicesDone ? "var(--el-action)" : "rgba(243,239,230,0.45)"}` }
                  }
                />
              ))}
            </span>
            <span className="tabular-nums">
              {m.paidInSeat}/{m.paidPerSeat}
            </span>
          </span>
        )}
        {!m.maxed && view.devices !== m.inSeat && <Fine as="span">{COPY.total(view.devices)}</Fine>}
      </div>
    </section>
  );
}
