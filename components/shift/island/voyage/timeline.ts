/**
 * The voyage cutscene's clock and layout, pure: where the ship, the island,
 * the beach and the light are at `t` ms from the start, on a grid sized for
 * the screen. No DOM, so every beat is unit-testable; draw.ts paints it.
 *
 * Beats: the ship at anchor off the invite's beach, the student waving from
 * the stern; it weighs anchor and the beach falls away; open sea, dusk to
 * night to dawn; the island comes out of the dark with its lanterns lit; the
 * ship comes alongside the jetty; a circle closes on the student and the
 * living island takes the screen.
 */
import { BERTH_OVERLAP, ISLAND_W, ISLAND_WATER } from "./islandArt";
import { SHIP_W } from "../shipArt";

/** Beats, in ms from the start. */
export const VOYAGE = {
  /** The ship weighs anchor. */
  setOff: 900,
  /** Full sail. */
  cruise: 2200,
  /** Open sea: the second line. */
  sea: 2600,
  /** The island is sighted in the dark. */
  sighted: 4400,
  /** The island named: the third line. */
  land: 6200,
  /** The ship starts to slow. */
  brake: 7000,
  /** Alongside the jetty. */
  dock: 8400,
  /** The circle starts closing on the student. */
  iris: 8900,
  /** Over: the island underneath has the screen. */
  end: 9700,
} as const;

/** Lines under the picture, in order: set off, the sea, the island. */
export type VoyageLine = 0 | 1 | 2;

/** Scene columns across the screen: wider screens get more, not bigger, pixels. */
const COLUMNS = { phone: 140, wide: 200 } as const;
/** Wave travel at full sail, in scene px per ms (the nearest crests). */
export const CRUISE_SPEED = 0.06;

/** Where the student stands on the ship: on the cabin roof at the stern. */
export const PASSENGER = { x: 28, y: 2, w: 10, h: 14 } as const;

export interface VoyageLayout {
  /** Device pixels per scene pixel: always whole, so pixels stay square and crisp. */
  px: number;
  cols: number;
  rows: number;
  horizon: number;
  /** Row where the ship's hull meets the water. */
  shipWater: number;
  /** Row where the island's shore meets the water: just under the horizon, far off. */
  islandWater: number;
  /** Top of the sand in the opening shot, before the beach falls away. */
  beach: number;
  /** The ship's left column at anchor, under way, and alongside the jetty. */
  shipAnchor: number;
  shipCruise: number;
  shipDock: number;
  /** The island's left column once the ship is alongside. */
  islandDock: number;
}

export function voyageLayout(cssWidth: number, cssHeight: number, dpr: number): VoyageLayout {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const width = Math.max(1, Math.round(cssWidth * ratio));
  const height = Math.max(1, Math.round(cssHeight * ratio));
  const target = cssWidth >= 768 ? COLUMNS.wide : COLUMNS.phone;
  const px = Math.max(1, Math.floor(width / target));
  const cols = Math.ceil(width / px);
  const rows = Math.ceil(height / px);
  // Low enough that the tallest tree clears the top of a short landscape screen.
  const horizon = Math.max(Math.round(rows * 0.5), ISLAND_WATER + 2);
  const shipWater = horizon + Math.max(9, Math.round((rows - horizon) * 0.2));
  const beach = Math.max(shipWater + 4, Math.round(rows * 0.74));
  // The island and the ship side by side, centred, the bow over the jetty's end.
  const pair = ISLAND_W + SHIP_W - BERTH_OVERLAP;
  const islandDock = Math.round((cols - pair) / 2);
  return {
    px,
    cols,
    rows,
    horizon,
    shipWater,
    islandWater: horizon + 3,
    beach,
    shipAnchor: Math.round(cols * 0.6 - SHIP_W / 2),
    shipCruise: Math.round(cols / 2 - SHIP_W / 2),
    shipDock: islandDock + ISLAND_W - BERTH_OVERLAP,
    islandDock,
  };
}

/** 0 before `from`, 1 after `to`, linear between. */
export function ramp(t: number, from: number, to: number): number {
  if (t <= from) return 0;
  if (t >= to) return 1;
  return (t - from) / (to - from);
}

/** Slow in, slow out. */
export function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}

const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** How much of each light is in the sky; the three always add up to 1. */
export interface SkyMix {
  dusk: number;
  night: number;
  dawn: number;
}

export function skyAt(t: number): SkyMix {
  const dark = smooth(ramp(t, 2400, 4200));
  const light = smooth(ramp(t, 4800, 6600));
  return { dusk: 1 - dark, night: dark - light, dawn: light };
}

/** Speed as a share of full sail: up from setOff to cruise, down from brake to dock. */
export function speedAt(t: number): number {
  return ramp(t, VOYAGE.setOff, VOYAGE.cruise) - ramp(t, VOYAGE.brake, VOYAGE.dock);
}

/** Distance sailed in scene px (the integral of speedAt): how far the near waves have slid. */
export function travelAt(t: number): number {
  const { setOff, cruise, brake, dock } = VOYAGE;
  const v = CRUISE_SPEED;
  const accel = cruise - setOff;
  const decel = dock - brake;
  if (t <= setOff) return 0;
  if (t <= cruise) return (v * (t - setOff) ** 2) / (2 * accel);
  const atCruise = (v * accel) / 2;
  if (t <= brake) return atCruise + v * (t - cruise);
  const atBrake = atCruise + v * (brake - cruise);
  const s = Math.min(t, dock) - brake;
  return atBrake + v * s - (v * s * s) / (2 * decel);
}

/** The ship's left column: anchor, then centre under sail, then alongside the jetty. */
export function shipXAt(layout: VoyageLayout, t: number): number {
  const leave = smooth(ramp(t, VOYAGE.setOff, VOYAGE.cruise));
  const berth = smooth(ramp(t, VOYAGE.brake, VOYAGE.dock));
  return Math.round(lerp(lerp(layout.shipAnchor, layout.shipCruise, leave), layout.shipDock, berth));
}

/** A pixel up and down on the swell; still once alongside. */
export function bobAt(t: number): number {
  if (t >= VOYAGE.dock) return 0;
  return Math.round(Math.sin(t / 600));
}

/** The jetty's water is a row under the island's: the ship's hull sits there once alongside. */
const BERTH_DEPTH = 1;

/**
 * Row where the ship's hull meets the water: near the camera under sail, then
 * out toward the island as it slows, until it lies at the jetty's depth.
 */
export function shipWaterAt(layout: VoyageLayout, t: number): number {
  const berth = smooth(ramp(t, VOYAGE.brake - 600, VOYAGE.dock));
  return Math.round(lerp(layout.shipWater, layout.islandWater + BERTH_DEPTH, berth));
}

/** The ship's top row. */
export function shipTopAt(layout: VoyageLayout, t: number, shipH: number): number {
  return shipWaterAt(layout, t) - (shipH - 1) + bobAt(t);
}

/**
 * The island's left column: half of it already in frame but hidden in the
 * night when it is sighted, then sliding in, slower and slower, to its berth
 * as the ship slows. Starting half in frame keeps it slower than the near
 * waves, as something far away should be.
 */
export function islandXAt(layout: VoyageLayout, t: number): number {
  const start = -Math.round(ISLAND_W * 0.55);
  const x = ramp(t, VOYAGE.sighted, VOYAGE.dock);
  // Ease out (quadratic): steady at first, settling as the ship comes alongside.
  return Math.round(lerp(start, layout.islandDock, 1 - (1 - x) * (1 - x)));
}

/** The island comes out of the dark: 0 until it is sighted, fully there 1.4 s later. */
export function islandAlphaAt(t: number): number {
  return smooth(ramp(t, VOYAGE.sighted, VOYAGE.sighted + 1400));
}

/** Top of the sand: the beach of the opening shot drops out of frame as the ship gets under way. */
export function beachTopAt(layout: VoyageLayout, t: number): number {
  const away = smooth(ramp(t, 1100, 2700));
  return Math.round(lerp(layout.beach, layout.rows + 4, away));
}

/** Waving back at the beach while setting off, and again on arrival. */
export function wavingAt(t: number): boolean {
  const waving = t < VOYAGE.setOff + 1100 || t >= VOYAGE.dock;
  return waving && Math.floor(t / 320) % 2 === 0;
}

export function lineAt(t: number): VoyageLine {
  if (t < VOYAGE.sea) return 0;
  if (t < VOYAGE.land) return 1;
  return 2;
}

/** The student's head, in scene px: where the name tag floats and the circle closes. */
export function passengerAt(layout: VoyageLayout, t: number, shipH: number): { x: number; y: number } {
  return {
    x: shipXAt(layout, t) + PASSENGER.x + PASSENGER.w / 2,
    y: shipTopAt(layout, t, shipH) + PASSENGER.y,
  };
}
