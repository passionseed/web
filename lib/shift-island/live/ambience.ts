/**
 * Small life on the living island (web only), as pure functions of the tick
 * like clock.ts: smoke curling up from the campfire, a few fireflies over the
 * meadow at night, and light glinting on the sea (a moon path at night, the
 * sun's at dawn and dusk, a few sparkles by day). Sparse on purpose: a
 * handful of each, never clutter. Nothing here moves on a still island.
 */
import type { SceneModel } from "./draw";
import type { Rect } from "./geometry";
import type { LightPhase, LiveActor } from "./types";

type Triple = readonly [number, number, number];

/** A fixed pseudo-random 0..1 for integers a, b, c. */
export function hash3(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------- smoke

export interface Puff {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1 */
  alpha: number;
}

/** Smoke rises 1 px per step; a step is 2 ticks (4 a second): slow and soft. */
const SMOKE_STEP_TICKS = 2;
const SMOKE_LIFE = 26;
const SMOKE_PUFFS = 5;

export const SMOKE_RGB: Readonly<Record<LightPhase, Triple>> = {
  day: [208, 204, 206],
  dawn: [214, 206, 222],
  dusk: [196, 168, 186],
  night: [150, 146, 180],
};

/** Where the smoke starts: the top of the campfire's flame, or null without a fire. */
export function smokeOrigin(actors: readonly LiveActor[]): { x: number; y: number } | null {
  const flame = actors.find((a) => a.frames[0] === "campfire_flame_0");
  return flame ? { x: flame.x + 5, y: flame.y } : null;
}

/** The box every puff stays in (for repaints). */
export function smokeBounds(origin: { x: number; y: number }): Rect {
  return { x: origin.x - 4, y: origin.y - SMOKE_LIFE - 4, w: 14, h: SMOKE_LIFE + 5 };
}

/** The smoke step a tick shows: the puffs change only when it does. */
export const smokeStep = (tick: number) => Math.floor(tick / SMOKE_STEP_TICKS);

/** The puffs at one smoke step: born small at the flame, drifting a little east, fading as they rise. */
export function smokeAt(step: number, origin: { x: number; y: number }): Puff[] {
  const out: Puff[] = [];
  for (let k = 0; k < SMOKE_PUFFS; k++) {
    const a = (step + Math.round((k * SMOKE_LIFE) / SMOKE_PUFFS)) % SMOKE_LIFE;
    const sway = Math.round(Math.sin(a * 0.38 + k * 1.7) * Math.min(2, a / 6));
    const size = a < 4 ? 2 : a < 10 ? 3 : a < 18 ? 4 : 5;
    const alpha = a < 2 ? 0.45 : a < 12 ? 0.6 : a < 19 ? 0.42 : 0.2;
    out.push({ x: origin.x - 1 + sway + Math.floor(a / 9), y: origin.y - 2 - a, w: size, h: size - (a < 4 ? 0 : 1), alpha });
  }
  return out;
}

// ------------------------------------------------------------- fireflies

export interface Firefly {
  x: number;
  y: number;
  /** 0 (dark) to 3 (brightest). */
  level: number;
}

const MAX_FLIES = 7;
/** The firefly sprite is 3 x 3 round its centre. */
export const FLY_SIZE = 3;

/** Where fireflies hover: by the leafy trees (stage 2 and up), a few around the well when there are few trees. */
export function fireflyAnchors(model: SceneModel): { x: number; y: number }[] {
  const trees = model.trees
    .map((m) => m.tree)
    .filter((t) => t.stage >= 2)
    .sort((a, b) => a.slot - b.slot);
  const out = trees.slice(0, MAX_FLIES).map((t, i) => ({ x: t.left + 16 + (i % 2 === 0 ? -13 : 14), y: t.top + 22 + (i % 3) * 3 }));
  const well = model.scene.well;
  const extra = [
    { x: well.x - 70, y: well.y + 60 },
    { x: well.x + 90, y: well.y + 64 },
    { x: well.x - 40, y: well.y - 52 },
  ];
  while (out.length < 4 && extra.length) out.push(extra.shift()!);
  return out;
}

/** The fireflies at a tick: slow loops round their anchors, each blinking on its own beat. */
export function firefliesAt(tick: number, anchors: readonly { x: number; y: number }[]): Firefly[] {
  return anchors.map((a, i) => {
    const t = tick;
    const x = a.x + Math.round(7 * Math.sin(t * 0.045 + i * 2.1) + 3 * Math.sin(t * 0.11 + i));
    const y = a.y + Math.round(5 * Math.sin(t * 0.06 + i * 1.3));
    const c = (t + i * 13) % 44;
    const level = c < 2 ? 1 : c < 4 ? 2 : c < 18 ? 3 : c < 20 ? 2 : c < 22 ? 1 : 0;
    return { x, y, level };
  });
}

export function flyRect(f: Pick<Firefly, "x" | "y">): Rect {
  return { x: f.x - 1, y: f.y - 1, w: FLY_SIZE, h: FLY_SIZE };
}

// ------------------------------------------------------------- glints

export interface Glint {
  x: number;
  y: number;
  w: number;
}

interface GlintLook {
  /** The path's centre across the scene (0..1), or null for sparkles everywhere. */
  path: number | null;
  /** Chance per 8 px cell on the path and off it. */
  on: number;
  off: number;
  rgb: Triple;
  alpha: number;
}

export const GLINTS: Readonly<Record<LightPhase, GlintLook>> = {
  day: { path: null, on: 0, off: 0.03, rgb: [244, 252, 255], alpha: 0.7 },
  dawn: { path: 0.8, on: 0.2, off: 0.02, rgb: [255, 226, 206], alpha: 0.65 },
  dusk: { path: 0.2, on: 0.3, off: 0.02, rgb: [255, 206, 128], alpha: 0.75 },
  night: { path: 0.68, on: 0.3, off: 0.01, rgb: [214, 220, 255], alpha: 0.5 },
};

const CELL = 8;
/** Where the light's path on the water ends, as a share of the scene's height (about the island's north shore). */
const PATH_END = 0.42;

/** Open water at native pixel (x, y): outside the scene, or a water tile inside it (not the shore). */
function openWater(model: SceneModel, x: number, y: number): boolean {
  const { scene } = model;
  const col = Math.floor(x / scene.tile);
  const row = Math.floor(y / scene.tile);
  if (col < 0 || row < 0 || col >= scene.cols || row >= scene.rows) return true;
  const kind = model.sea[row * scene.cols + col];
  return kind === 0 || kind === 1;
}

/** The glints inside rect r for a glint frame (it changes with the sea's frames). */
export function glintsIn(r: Rect, model: SceneModel, phase: LightPhase, frame: number): Glint[] {
  const look = GLINTS[phase];
  const out: Glint[] = [];
  const w = model.scene.width;
  const h = Math.max(1, model.scene.height);
  const cx = look.path == null ? 0 : look.path * w;
  for (let gy = Math.floor(r.y / CELL); gy * CELL < r.y + r.h; gy++) {
    for (let gx = Math.floor(r.x / CELL); gx * CELL < r.x + r.w; gx++) {
      const x0 = gx * CELL;
      const y0 = gy * CELL;
      let p = look.off;
      // The path runs from the top of the picture (towards the moon or sun) down to the island, widening as it nears.
      if (look.path != null && y0 < h * PATH_END) {
        const half = 10 + (Math.max(0, y0) / (h * PATH_END)) * 22;
        if (Math.abs(x0 + CELL / 2 - cx) < half) p = look.on;
      }
      if (hash3(gx, gy, frame) >= p) continue;
      const x = x0 + Math.floor(hash3(gx, gy, frame + 7919) * (CELL - 3));
      const y = y0 + Math.floor(hash3(gy, gx, frame + 104729) * CELL);
      if (!openWater(model, x, y) || !openWater(model, x + 2, y)) continue;
      out.push({ x, y, w: hash3(gx, frame, gy) < 0.5 ? 2 : 3 });
    }
  }
  return out;
}

/** The glint frame for a tick: a new pattern each time the sea steps (every 3 ticks). */
export const glintFrame = (tick: number) => Math.floor(tick / 3);
