/**
 * Shallow water round the island (web only): a band of lighter, clearer
 * water hugging the coast and fading out to the deep, with soft round
 * corners where the coast steps. Baked into the land layer once per phase
 * (it sits over the animated sea, so the ripples still show through). Pure
 * and client-safe: it returns pixels; fx.ts uploads them.
 */
import type { SceneModel } from "./draw";
import type { Rect } from "./geometry";
import type { LightPhase } from "./types";

type Triple = readonly [number, number, number];

/** How far out the shallows reach, native px: under a tile, so only a cell's neighbours are searched. */
export const SHALLOW_REACH = 15;
const LEVELS = 4;
/** The water colour of the shallows per light, and its opacity right at the coast. */
export const SHALLOWS: Readonly<Record<LightPhase, { rgb: Triple; alpha: number }>> = {
  day: { rgb: [128, 222, 212], alpha: 0.5 },
  dawn: { rgb: [178, 214, 222], alpha: 0.42 },
  dusk: { rgb: [150, 168, 196], alpha: 0.4 },
  night: { rgb: [64, 104, 146], alpha: 0.4 },
};

/** Sea kinds (draw.ts SEA_KINDS): 0, 1 open water; 2..5 shore north, south, east, west; -1 land. */
const OPEN = (kind: number) => kind === 0 || kind === 1;

/** A shore tile's open water: its outer 4 px (the rest is foam and sand). */
const SHORE_WATER = 4;

/** The dry part of a cell (land, or a shore tile's sand and foam), or null for open water. */
function dryRect(kind: number, x: number, y: number, t: number): Rect | null {
  const s = SHORE_WATER;
  if (kind < 0) return { x, y, w: t, h: t };
  if (kind === 2) return { x, y: y + s, w: t, h: t - s };
  if (kind === 3) return { x, y, w: t, h: t - s };
  if (kind === 4) return { x, y, w: t - s, h: t };
  if (kind === 5) return { x: x + s, y, w: t - s, h: t };
  return null;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Per scene pixel, the distance to the coast for water near it (255 elsewhere). Once per scene. */
export function coastDistance(model: SceneModel): Uint8Array {
  const { scene, sea } = model;
  const t = scene.tile;
  const W = scene.width;
  const out = new Uint8Array(scene.width * scene.height).fill(255);
  const reach = Math.ceil(SHALLOW_REACH / t);
  const far = SHALLOW_REACH * SHALLOW_REACH;
  const kindAt = (c: number, r: number) => (c < 0 || r < 0 || c >= scene.cols || r >= scene.rows ? 0 : sea[r * scene.cols + c]);
  const dry: Rect[] = [];
  for (let r = 0; r < scene.rows; r++) {
    for (let c = 0; c < scene.cols; c++) {
      const kind = kindAt(c, r);
      if (kind < 0) continue;
      // The dry ground nearby, a run of land cells in a row as one rectangle.
      dry.length = 0;
      for (let j = r - reach; j <= r + reach; j++) {
        let run: Rect | null = null;
        for (let i = c - reach; i <= c + reach; i++) {
          const k = kindAt(i, j);
          if (k < 0 && run) {
            run.w += t;
            continue;
          }
          if (run) dry.push(run);
          run = null;
          if (k < 0) run = { x: i * t, y: j * t, w: t, h: t };
          else if (!OPEN(k)) dry.push(dryRect(k, i * t, j * t, t)!);
        }
        if (run) dry.push(run);
      }
      if (!dry.length) continue;
      const own = dryRect(kind, c * t, r * t, t);
      for (let y = r * t; y < (r + 1) * t; y++) {
        for (let x = c * t; x < (c + 1) * t; x++) {
          if (own && x >= own.x && x < own.x + own.w && y >= own.y && y < own.y + own.h) continue;
          let best = far;
          for (let k = 0; k < dry.length; k++) {
            const d = dry[k];
            let dx = d.x - x;
            if (dx < 0) dx = x > d.x + d.w - 1 ? x - (d.x + d.w - 1) : 0;
            let dy = d.y - y;
            if (dy < 0) dy = y > d.y + d.h - 1 ? y - (d.y + d.h - 1) : 0;
            const sq = dx * dx + dy * dy;
            if (sq < best) best = sq;
          }
          if (best < far) out[y * W + x] = Math.round(Math.sqrt(best));
        }
      }
    }
  }
  return out;
}

/** The shallows' pixels for a phase (scene size, straight alpha), from coastDistance. */
export function shallowsPixels(distance: Uint8Array, width: number, height: number, phase: LightPhase): Uint8ClampedArray {
  const { rgb, alpha } = SHALLOWS[phase];
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const d = distance[y * width + x];
      if (d >= SHALLOW_REACH) continue;
      const f = 1 - d / SHALLOW_REACH;
      const level = Math.min(LEVELS, Math.floor(f * f * LEVELS + BAYER[(y & 3) * 4 + (x & 3)]));
      if (level <= 0) continue;
      const o = (y * width + x) * 4;
      data[o] = rgb[0];
      data[o + 1] = rgb[1];
      data[o + 2] = rgb[2];
      data[o + 3] = Math.round((level / LEVELS) * alpha * 255);
    }
  }
  return data;
}
