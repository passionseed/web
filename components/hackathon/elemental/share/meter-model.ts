import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

import { EL, EL_FIRE } from "@/components/hackathon/poster/elemental/brand";

import { seedFromKey } from "../scrub-dissolve";
import { placeFor, type RecoveredPlace } from "../places";

/**
 * The MeterCard's numbers and words, pure (tested in __tests__/meter.test.ts).
 * The card is a 10×5 grid over a recovered place: each device that opens the
 * link clears one corruption pixel, until the photo is clean at 50. The count
 * beside it is every device, past 50 too. There is no goal and no reward on
 * the card: sharing's rewards (team-name styles, the board) live elsewhere.
 */

export const GRID_COLUMNS = 10;
export const GRID_ROWS = 5;
export const GRID_CELLS = GRID_COLUMNS * GRID_ROWS;

export type MeterModel = {
  /** Every device counted (up to sign-up close). */
  devices: number;
  /** Cells cleared: one per device, at most GRID_CELLS. */
  cleared: number;
  /** The photo is clean. */
  full: boolean;
  /** Sign-up closed: numbers stopped. */
  frozen: boolean;
};

export function meterModel(view: Pick<ShareLinkView, "devices" | "phase">): MeterModel {
  const devices = Math.max(0, Math.floor(view.devices));
  const cleared = Math.min(GRID_CELLS, devices);
  return { devices, cleared, full: cleared === GRID_CELLS, frozen: view.phase === "after-close" };
}

// copy: placeholder — Angpao rewrites
const COPY = {
  devices: (n: number) => `${n} เครื่อง`,
  closed: "ปิดนับแล้ว",
  closedWith: (n: number) => `ปิดนับแล้ว · ${n} เครื่อง`,
};

/** The count in one short line ("12 เครื่อง"; after close "ปิดนับแล้ว · 74 เครื่อง"). */
export function meterHeadline(view: Pick<ShareLinkView, "devices" | "phase">): string {
  const m = meterModel(view);
  if (m.frozen) return m.devices ? COPY.closedWith(m.devices) : COPY.closed;
  return COPY.devices(m.devices);
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
 * The order the cells clear in, seeded by the link's code, so a link always
 * heals the same way: rank[cell] is when that cell clears (0 first).
 */
export function clearOrder(code: string, cells = GRID_CELLS): number[] {
  // The seed keeps the ":seat1" suffix it was made with, so links already shared heal the same way.
  const next = random(seedFromKey(`${code}:seat1`));
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
export function cellColors(code: string, cells = GRID_CELLS): string[] {
  const next = random(seedFromKey(`${code}:heat1`));
  return Array.from({ length: cells }, () => {
    const r = next();
    if (r < 0.3) return SMOKE[Math.floor((r / 0.3) * SMOKE.length)];
    const f = (r - 0.3) / 0.7;
    return EL_FIRE[f < 0.08 ? 1 : f < 0.33 ? 2 : f < 0.7 ? 3 : 4];
  });
}

/** The photo behind the link's grid. */
export function meterPlace(code: string): RecoveredPlace {
  return placeFor(code, null);
}

const SEEN_PREFIX = "el-meter-seen:";

/** The last device count this phone saw for a link, or null (first visit, private mode, storage off). */
export function readSeen(code: string): number | null {
  try {
    const raw = window.localStorage.getItem(SEEN_PREFIX + code);
    if (!raw) return null;
    const v = JSON.parse(raw) as { devices?: unknown };
    return typeof v.devices === "number" ? v.devices : null;
  } catch {
    return null;
  }
}

export function writeSeen(code: string, devices: number) {
  try {
    window.localStorage.setItem(SEEN_PREFIX + code, JSON.stringify({ devices }));
  } catch {
    // Storage off: the next visit just doesn't animate.
  }
}

/** At most this many cells animate at once; the rest are already clear. */
export const MAX_ANIMATED = 8;

/**
 * Which cells animate, given how many were clear when this phone last
 * looked: the newest clears, at most MAX_ANIMATED.
 */
export function freshCells(rank: readonly number[], cleared: number, prevCleared: number | null): Set<number> {
  if (prevCleared == null || cleared <= prevCleared) return new Set();
  const from = Math.max(prevCleared, cleared - MAX_ANIMATED);
  const out = new Set<number>();
  rank.forEach((r, cell) => {
    if (r >= from && r < cleared) out.add(cell);
  });
  return out;
}
