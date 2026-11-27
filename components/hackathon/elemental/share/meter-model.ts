import { EL, EL_FIRE } from "@/components/hackathon/poster/elemental/brand";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";
import { nextUnlock, STYLE_PART_TH, STYLE_PARTS, TEAM_STYLE_TIERS, type StylePart } from "@/lib/hackathon/elemental/team-style";

import { seedFromKey } from "../scrub-dissolve";
import { placeFor, type RecoveredPlace } from "../places";

/**
 * The MeterCard's numbers and words, pure (tested in __tests__/meter.test.ts).
 *
 * Sharing earns looks only (Big, 2026-11-27): the team's devices unlock its
 * name styles (TEAM_STYLE_TIERS: colours 10, fonts 25, effects 50), and a
 * live Instagram Story proof from any member unlocks them all at once. The
 * card is a 10×5 grid over a recovered place, one cell per team device,
 * filled column by column so the tiers are bands: 2 columns = colours, 5 =
 * fonts, all 10 = effects. A solo sign-up is a team of one. Without team data
 * (the board isn't up), it counts the link's own devices toward a clean photo.
 */

export const GRID_COLUMNS = 10;
export const GRID_ROWS = 5;
export const GRID_CELLS = GRID_COLUMNS * GRID_ROWS;

export type MeterTeam = {
  /** Devices over every member's link (a solo sign-up: their own). */
  devices: number;
  solo: boolean;
  /** A member has a live Story proof (team-style data). */
  storyUnlocked?: boolean;
};

export type MeterTier = { part: StylePart; at: number; unlocked: boolean };

export type MeterModel = {
  /** "team": progress toward the team's next style. "count": the link's devices only (no team data). */
  mode: "team" | "count";
  /** The number the grid counts: the team's devices (count mode: the link's). */
  devices: number;
  /** This link's own devices. */
  linkDevices: number;
  /** Cells cleared: one per device, at most GRID_CELLS. */
  cleared: number;
  tiers: MeterTier[];
  /** The next style and how many more devices it needs; null when everything is open (or in count mode). */
  next: { part: StylePart; at: number; left: number } | null;
  allUnlocked: boolean;
  /** Everything is open because of a Story proof, not (yet) the devices. */
  byStory: boolean;
  solo: boolean;
  /** Sign-up closed: numbers stopped. */
  frozen: boolean;
};

export function meterModel(link: Pick<ShareLinkView, "devices" | "phase" | "storyProof">, team?: MeterTeam | null): MeterModel {
  const linkDevices = Math.max(0, Math.floor(link.devices));
  const frozen = link.phase === "after-close";
  if (!team) {
    return { mode: "count", devices: linkDevices, linkDevices, cleared: Math.min(GRID_CELLS, linkDevices), tiers: [], next: null, allUnlocked: false, byStory: false, solo: true, frozen };
  }
  const devices = Math.max(0, Math.floor(team.devices), linkDevices);
  // This person's own live proof counts at once (right after an upload, before the team data reloads).
  const story = Boolean(team.storyUnlocked) || link.storyProof === "unlocked";
  const byDevices = devices >= TEAM_STYLE_TIERS.effect;
  const tiers = STYLE_PARTS.map((part) => ({ part, at: TEAM_STYLE_TIERS[part], unlocked: story || devices >= TEAM_STYLE_TIERS[part] }));
  return {
    mode: "team",
    devices,
    linkDevices,
    cleared: Math.min(GRID_CELLS, devices),
    tiers,
    next: nextUnlock(devices, story),
    allUnlocked: story || byDevices,
    byStory: story && !byDevices,
    solo: team.solo,
    frozen,
  };
}

/** No-break spaces keep "อีก 6 เครื่อง" whole when a title wraps. */
const nb = (s: string) => s.replace(/ /g, " ");

// copy: placeholder — Angpao rewrites
const COPY = {
  // Word joiners keep "ปลดล็อกเอฟเฟกต์" whole (Thai would break inside it, between words with no space).
  next: (left: number, part: StylePart) => `${nb(`อีก ${left} เครื่อง`)} ปลด\u2060ล็อก\u2060${STYLE_PART_TH[part]}`,
  allUnlocked: "ปลดล็อกครบแล้ว",
  devices: (n: number) => nb(`${n} เครื่อง`),
  closed: "ปิดนับแล้ว",
  closedWith: (n: number) => `ปิดนับแล้ว · ${nb(`${n} เครื่อง`)}`,
};

/** What's next, in one short line: the share page's title ("อีก 6 เครื่อง ปลดล็อกฟอนต์"). */
export function meterHeadline(m: MeterModel): string {
  if (m.frozen) return m.devices ? COPY.closedWith(m.devices) : COPY.closed;
  if (m.mode === "count") return COPY.devices(m.devices);
  if (m.next) return COPY.next(m.next.left, m.next.part);
  return COPY.allUnlocked;
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
 * The order the cells clear in: rank[cell] is when that cell clears (0 first).
 * Column by column (5 devices a column), so the tiers are bands of the photo;
 * inside a column the rows clear in an order seeded by the link's code, so
 * the edge of the healed part stays ragged, like the poster's pixels.
 */
export function clearOrder(code: string): number[] {
  const next = random(seedFromKey(`${code}:columns`));
  const rank = new Array<number>(GRID_CELLS);
  for (let col = 0; col < GRID_COLUMNS; col++) {
    const rows = Array.from({ length: GRID_ROWS }, (_, r) => r);
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    rows.forEach((row, k) => {
      rank[row * GRID_COLUMNS + col] = col * GRID_ROWS + k;
    });
  }
  return rank;
}

/** Where a tier's band ends, as a share of the grid's width: colours 20%, fonts 50%, effects 100%. */
export function tierEdge(at: number): number {
  return Math.min(1, Math.ceil(at / GRID_ROWS) / GRID_COLUMNS);
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

/** The last count this phone saw on this card, or null (first visit, private mode, storage off). */
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
