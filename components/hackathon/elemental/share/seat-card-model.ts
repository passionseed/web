import { seatGoal, TEACHER_INVITE_DEVICES, type SeatProgressView, type SeatSlotView } from "@/lib/hackathon/elemental/share-rules";

import { EL, EL_FIRE } from "@/components/hackathon/poster/elemental/brand";

import { seedFromKey } from "../scrub-dissolve";
import { PLACES, placeFor, type RecoveredPlace } from "../places";

/**
 * The SeatCard's numbers and words, pure (tested in __tests__/seat-card.test.ts).
 * The card is a 10×5 grid over a recovered place: each device clears one
 * corruption pixel; at SEAT_RULE.devicesPerSeat (50) the photo is clean, and
 * with the paid sign-up the seat drops into the earned row as a stub. Seat 2
 * starts again on the next photo. Everything reads from SeatProgressView.
 */

export const GRID_COLUMNS = 10;
export const GRID_ROWS = 5;
/** The last few cells are drawn as targets ("อีกแค่ N"). */
export const LAST_CELLS = 10;

export type SeatCardModel = {
  /** The seat this grid is for (1-based). Once maxed, the last seat. */
  index: number;
  /** Devices counted toward this seat's grid, 0..perSeat. */
  inSeat: number;
  perSeat: number;
  /** Paid sign-ups counted toward this seat, 0..paidPerSeat. */
  paidInSeat: number;
  paidPerSeat: number;
  devicesLeft: number;
  paidLeft: number;
  /** All the devices are in, the paid sign-up isn't. */
  devicesDone: boolean;
  /** The grid's last LAST_CELLS cells: drawn as targets. */
  last: boolean;
  maxed: boolean;
  /** Sign-up closed: numbers stopped. */
  frozen: boolean;
  /** Seats earned so far (any status). */
  earned: number;
  maxSeats: number;
  /** No more seats to aim for, though the link isn't maxed: seats are closed event-wide, or staff shut the link. */
  noNext: boolean;
  linkRejected: boolean;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function seatCardModel(view: SeatProgressView): SeatCardModel {
  const { rule } = view;
  const earned = view.seats.length;
  const index = view.next?.index ?? Math.max(1, Math.min(rule.maxSeatsPerLink, earned));
  const from = seatGoal(index - 1, rule);
  const maxed = view.maxed || !view.next;
  const inSeat = maxed ? rule.devicesPerSeat : clamp(view.devices - from.devices, 0, rule.devicesPerSeat);
  const paidInSeat = maxed ? rule.paidPerSeat : clamp(view.paid - from.paid, 0, rule.paidPerSeat);
  // Seats closed (switch or cap) or the link shut: nothing more to promise.
  const noNext = !maxed && (!!view.seatsClosed || !!view.linkRejected);
  const devicesLeft = maxed || noNext ? 0 : (view.next?.devicesLeft ?? 0);
  const paidLeft = maxed || noNext ? 0 : (view.next?.paidLeft ?? 0);
  const frozen = view.phase === "after-close";
  return {
    index,
    inSeat,
    perSeat: rule.devicesPerSeat,
    paidInSeat,
    paidPerSeat: rule.paidPerSeat,
    devicesLeft,
    paidLeft,
    // After close nothing more counts: no targets, no nudge.
    devicesDone: !frozen && !maxed && devicesLeft === 0 && paidLeft > 0,
    last: !frozen && !maxed && devicesLeft > 0 && devicesLeft <= LAST_CELLS,
    maxed,
    frozen,
    earned,
    maxSeats: rule.maxSeatsPerLink,
    noNext,
    linkRejected: !!view.linkRejected,
  };
}

/**
 * Keeps "+ 1 คนจ่าย" and "อีก 38 เครื่อง" whole when the title wraps: no-break
 * spaces, and a word joiner inside "คนจ่าย" (Thai breaks between words without spaces).
 */
const nb = (s: string) => s.replace(/ /g, "\u00a0").replace("คนจ่าย", "คน\u2060จ่าย");

// copy: placeholder — Angpao rewrites
const COPY = {
  seatName: (i: number) => (i > 1 ? `ที่นั่งที่ ${i}` : "ที่นั่งฟรี"),
  // The paid half is always said while it's missing: "อีก 38 เครื่อง + 1 คนจ่าย ได้ที่นั่งฟรี".
  left: (d: number, p: number, i: number) => `${nb(`อีก ${d} เครื่อง`)}${p > 0 ? ` ${nb(`+ ${p} คนจ่าย`)}` : ""} ได้${COPY.seatName(i)}`,
  lastFew: (d: number, p: number) => `${nb(`อีกแค่ ${d} เครื่อง`)}${p > 0 ? ` ${nb(`+ ${p} คนจ่าย`)}` : ""}`,
  paidOnly: (p: number, i: number) => `${nb(`อีก ${p} คนจ่าย`)} ได้${COPY.seatName(i)}`,
  ready: "ครบแล้ว รอทีมงานเช็ก",
  maxed: (n: number) => `ได้ครบ ${n} ที่แล้ว`,
  closed: "ปิดนับแล้ว",
  closedWith: (n: number) => `ปิดนับแล้ว · ได้ ${n} ที่`,
  seatsClosed: "ที่นั่งฟรีหมดแล้ว",
  linkRejected: "ทีมงานปิดลิงก์นี้แล้ว",
};

/** What's left, in one short line: the share page's title and the pay slab's headline. */
export function seatHeadline(view: SeatProgressView): string {
  const m = seatCardModel(view);
  if (m.frozen) return m.earned ? COPY.closedWith(m.earned) : COPY.closed;
  if (m.linkRejected) return COPY.linkRejected;
  if (m.maxed) return COPY.maxed(m.earned);
  if (m.noNext) return COPY.seatsClosed;
  if (m.devicesLeft === 0 && m.paidLeft === 0) return COPY.ready;
  if (m.devicesDone) return COPY.paidOnly(m.paidLeft, m.index);
  if (m.last) return COPY.lastFew(m.devicesLeft, m.paidLeft);
  return COPY.left(m.devicesLeft, m.paidLeft, m.index);
}

/** mulberry32: a small seeded random. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The order the cells clear in, seeded by the link's code and the seat, so a
 * link always heals the same way: rank[cell] is when that cell clears (0 first).
 */
export function clearOrder(code: string, seatIndex: number, cells = GRID_COLUMNS * GRID_ROWS): number[] {
  const next = random(seedFromKey(`${code}:seat${seatIndex}`));
  const order = Array.from({ length: cells }, (_, i) => i);
  for (let i = cells - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const rank = new Array<number>(cells);
  order.forEach((cell, r) => {
    rank[cell] = r;
  });
  return rank;
}

/** Smoke, the other half of the poster's corruption (brand.ts: Air is the pixel smoke staining the sky). */
const SMOKE = [EL.smokeDark, EL.smoke, EL.ash] as const;

/**
 * Each corruption pixel's colour, seeded: about 70% fire (weighted toward the
 * deep reds, like the poster) and 30% smoke. Never the hottest fire
 * (#fff4dc): at rest it reads as a blank cell; it's the colour a cell
 * flashes as it clears.
 */
export function cellColors(code: string, seatIndex: number, cells = GRID_COLUMNS * GRID_ROWS): string[] {
  const next = random(seedFromKey(`${code}:heat${seatIndex}`));
  return Array.from({ length: cells }, () => {
    const r = next();
    if (r < 0.3) return SMOKE[Math.floor((r / 0.3) * SMOKE.length)];
    const f = (r - 0.3) / 0.7;
    return EL_FIRE[f < 0.08 ? 1 : f < 0.33 ? 2 : f < 0.7 ? 3 : 4];
  });
}

/** The photo behind seat `index`: the link's place, then the next one for seat 2, so each seat heals a different place. */
export function seatPlace(code: string, index: number): RecoveredPlace {
  const base = PLACES.indexOf(placeFor(code, null));
  return PLACES[(base + index - 1) % PLACES.length];
}

/** The stub state of an earned seat. */
export type StubTone = "checking" | "naming" | "given" | "rejected";

export function stubTone(seat: SeatSlotView): StubTone {
  if (seat.status === "confirmed") return "given";
  if (seat.status === "rejected") return "rejected";
  if (seat.status === "needs_recipient" || seat.recipientPaid) return "naming";
  return "checking";
}

/** A teacher's Demo Day stub: not yet, earned (staff still to verify), verified, or the invite sent. */
export type InviteState = "todo" | "earned" | "verified" | "sent";

export function inviteState(view: Pick<SeatProgressView, "devices">, link: { verified: boolean; invited: boolean }): InviteState {
  if (view.devices < TEACHER_INVITE_DEVICES) return "todo";
  return link.invited ? "sent" : link.verified ? "verified" : "earned";
}

const SEEN_PREFIX = "el-seat-seen:";

/** The last count this phone saw for a link, or null (first visit, private mode, storage off). */
export function readSeen(code: string): { devices: number; seats: number } | null {
  try {
    const raw = window.localStorage.getItem(SEEN_PREFIX + code);
    if (!raw) return null;
    const v = JSON.parse(raw) as { devices?: unknown; seats?: unknown };
    return typeof v.devices === "number" && typeof v.seats === "number" ? { devices: v.devices, seats: v.seats } : null;
  } catch {
    return null;
  }
}

export function writeSeen(code: string, seen: { devices: number; seats: number }) {
  try {
    window.localStorage.setItem(SEEN_PREFIX + code, JSON.stringify(seen));
  } catch {
    // Storage off: the next visit just doesn't animate.
  }
}

/** At most this many cells animate at once; the rest are already clear. */
export const MAX_ANIMATED = 8;

/**
 * Which cells animate, given the count this phone saw before: the newest
 * clears in this seat, at most MAX_ANIMATED. A seat earned since then
 * starts a fresh grid, so only its own new cells count.
 */
export function freshCells(rank: readonly number[], inSeat: number, prevInSeat: number | null): Set<number> {
  if (prevInSeat == null || inSeat <= prevInSeat) return new Set();
  const from = Math.max(prevInSeat, inSeat - MAX_ANIMATED);
  const out = new Set<number>();
  rank.forEach((r, cell) => {
    if (r >= from && r < inSeat) out.add(cell);
  });
  return out;
}
