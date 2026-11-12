/**
 * Hand-made pixel art for the game-story guides, drawn in code so it is
 * deterministic, re-runnable and reviewable in a PR. Used by
 * scripts/radar-guide/art.ts when agy image generation is not available
 * (the default), and as the reference composition for agy prompts.
 *
 * Pure: draws into an RGBA buffer. No IO. Every scene is scenery and objects
 * only: no people (the host sprite is the generic grid in
 * components/radar/guide/story/pixel-art.ts), no text, no logos.
 *
 * Palette: Dusk City at night (company-brain/reels-style.md) with the career
 * accent for screens. Banned per skills/key-art-poster/SKILL.md: sunburst
 * rays, perspective floor grids, random glowing particles, scanlines, grain.
 */
import { HOST_GRIDS, HOST_PALETTE, STORY_PALETTE as C, type PixelGrid, type PixelPalette } from "../../components/radar/guide/story/pixel-art";

export const SCENE_SIZE = { w: 160, h: 100 } as const;
export const MAP_SIZE = { w: 108, h: 192 } as const;
export const FRAME_SIZE = { w: 108, h: 135 } as const;

// ---------------------------------------------------------------- canvas
export interface Canvas {
  w: number;
  h: number;
  data: Uint8ClampedArray; // RGBA
}

export function createCanvas(w: number, h: number): Canvas {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

function hex(color: string): [number, number, number, number] {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (!m) throw new Error(`bad colour ${color}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] ? parseInt(m[2], 16) : 255];
}

export function px(c: Canvas, x: number, y: number, color: string): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const [r, g, b, a] = hex(color);
  const i = (y * c.w + x) * 4;
  c.data[i] = r;
  c.data[i + 1] = g;
  c.data[i + 2] = b;
  c.data[i + 3] = a;
}

export function rect(c: Canvas, x: number, y: number, w: number, h: number, color: string): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(c, x + i, y + j, color);
}

/** Checkerboard dither between two colours (classic 16-bit gradient step). */
export function dither(c: Canvas, x: number, y: number, w: number, h: number, a: string, b: string, density = 0.5): void {
  // density 0.25 / 0.5 / 0.75 using a 2x2 Bayer matrix
  const bayer = [0, 0.5, 0.75, 0.25];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const t = bayer[((y + j) % 2) * 2 + ((x + i) % 2)];
      px(c, x + i, y + j, t < density ? b : a);
    }
}

export function line(c: Canvas, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    px(c, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function disc(c: Canvas, cx: number, cy: number, r: number, color: string): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(c, cx + x, cy + y, color);
}

export function blit(c: Canvas, grid: PixelGrid, palette: PixelPalette, x: number, y: number, scale = 1): void {
  grid.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const color = palette[row[i]];
      if (row[i] === "." || !color || color === "transparent") continue;
      rect(c, x + i * scale, y + j * scale, scale, scale, color);
    }
  });
}

/** Deterministic PRNG (mulberry32) so re-runs give identical files. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- scenery pieces
/** Night sky: dithered bands from near-black to plum at the horizon, plus a few still stars. */
export function nightSky(c: Canvas, horizon: number, seed: number, stars = 26): void {
  const bands = [C.night, C.ink, C.plum, C.plumMid];
  const step = Math.max(4, Math.floor(horizon / bands.length));
  for (let b = 0; b < bands.length; b++) {
    const y = b * step;
    const h = b === bands.length - 1 ? horizon - y : step;
    rect(c, 0, y, c.w, h, bands[b]);
    if (b > 0) dither(c, 0, y, c.w, 2, bands[b - 1], bands[b]);
  }
  const r = rng(seed);
  for (let i = 0; i < stars; i++) {
    const x = Math.floor(r() * c.w);
    const y = Math.floor(r() * (horizon - 8));
    px(c, x, y, r() > 0.8 ? C.litGold : C.cream);
    if (r() > 0.9) {
      px(c, x - 1, y, C.violet);
      px(c, x + 1, y, C.violet);
    }
  }
}

export function moon(c: Canvas, x: number, y: number, r = 6): void {
  disc(c, x, y, r + 2, C.plumMid);
  disc(c, x, y, r, C.litGold);
  disc(c, x + 2, y - 1, r - 1, C.plumMid);
}

/** A row of buildings with lit window dots (Dusk City signature). */
export function skyline(c: Canvas, base: number, seed: number, opts: { color?: string; minH?: number; maxH?: number; lit?: number } = {}): void {
  const { color = C.plum, minH = 8, maxH = 26, lit = 0.28 } = opts;
  const r = rng(seed);
  let x = -2;
  while (x < c.w) {
    const w = 6 + Math.floor(r() * 10);
    const h = minH + Math.floor(r() * (maxH - minH));
    rect(c, x, base - h, w, h, color);
    for (let wy = base - h + 2; wy < base - 1; wy += 3)
      for (let wx = x + 1; wx < x + w - 1; wx += 2) {
        if (r() < lit) px(c, wx, wy, [C.lit, C.litWarm, C.litGold, C.red][Math.floor(r() * 4)]);
      }
    x += w + (r() > 0.6 ? 1 : 0);
  }
}

export function ground(c: Canvas, y: number, color: string = C.ink): void {
  rect(c, 0, y, c.w, c.h - y, color);
}

/** Wall with a window onto the night city: the bedroom / desk interiors. */
function interior(c: Canvas, seed: number, win = { x: 96, y: 10, w: 48, h: 36 }): void {
  rect(c, 0, 0, c.w, c.h, C.plum);
  dither(c, 0, 0, c.w, 40, C.ink, C.plum, 0.25);
  // window
  rect(c, win.x - 2, win.y - 2, win.w + 4, win.h + 4, C.ink);
  const sky = createCanvas(win.w, win.h);
  nightSky(sky, win.h, seed, 10);
  skyline(sky, win.h, seed + 1, { color: C.ink, minH: 6, maxH: 18, lit: 0.35 });
  paste(c, sky, win.x, win.y);
  rect(c, win.x + Math.floor(win.w / 2) - 1, win.y, 2, win.h, C.ink);
  // floor
  rect(c, 0, 78, c.w, 22, C.ink);
  dither(c, 0, 78, c.w, 2, C.plum, C.ink);
}

function paste(c: Canvas, src: Canvas, x: number, y: number): void {
  for (let j = 0; j < src.h; j++)
    for (let i = 0; i < src.w; i++) {
      const k = (j * src.w + i) * 4;
      if (src.data[k + 3] === 0) continue;
      const tx = x + i;
      const ty = y + j;
      if (tx < 0 || ty < 0 || tx >= c.w || ty >= c.h) continue;
      const t = (ty * c.w + tx) * 4;
      c.data[t] = src.data[k];
      c.data[t + 1] = src.data[k + 1];
      c.data[t + 2] = src.data[k + 2];
      c.data[t + 3] = 255;
    }
}

function desk(c: Canvas, x: number, y: number, w: number): void {
  rect(c, x, y, w, 3, C.hair);
  rect(c, x, y + 3, w, 1, C.ink);
  rect(c, x + 2, y + 4, 2, 100 - y - 4, C.hair);
  rect(c, x + w - 4, y + 4, 2, 100 - y - 4, C.hair);
}

/** A monitor with abstract code bars (no letters). */
function monitor(c: Canvas, x: number, y: number, w: number, h: number, accent: string, seed: number, alert = false): void {
  rect(c, x - 1, y - 1, w + 2, h + 2, C.ink);
  rect(c, x, y, w, h, "#0b1a10");
  const r = rng(seed);
  for (let ly = y + 2; ly < y + h - 1; ly += 2) {
    let lx = x + 2 + (r() > 0.6 ? 2 : 0);
    while (lx < x + w - 3) {
      const len = 1 + Math.floor(r() * 5);
      rect(c, lx, ly, Math.min(len, x + w - 2 - lx), 1, r() > 0.85 ? C.cream : accent);
      lx += len + 1 + Math.floor(r() * 2);
      if (r() > 0.7) break;
    }
  }
  if (alert) rect(c, x + 2, y + h - 4, w - 4, 2, C.red);
  rect(c, x + Math.floor(w / 2) - 2, y + h + 1, 4, 2, C.ink);
  rect(c, x + Math.floor(w / 2) - 5, y + h + 3, 10, 1, C.ink);
}

const BUG: PixelGrid = [".G....G.", "..G..G..", ".GGGGGG.", "G.GRRG.G", ".GGGGGG.", "G.GGGG.G", ".GGGGGG.", "G..GG..G"];

const LOCK: PixelGrid = ["..KKKK..", ".K....K.", ".K....K.", "KYYYYYYK", "KYYKKYYK", "KYYKKYYK", "KYYYYYYK", "KKKKKKKK"];
const FLAG: PixelGrid = ["KOOOOO..", "KOOOOOO.", "KOOOOO..", "K.......", "K.......", "K.......", "K.......", "KK......"];
const COIN: PixelGrid = [".KKKK.", "KYYYYK", "KYKYYK", "KYKYYK", "KYYYYK", ".KKKK."];
const SHIELD: PixelGrid = [".KKKKKK.", "KGGGGGGK", "KGGGGGGK", "KGGKKGGK", ".KGGGGK.", ".KGGGGK.", "..KGGK..", "...KK..."];

// ---------------------------------------------------------------- scenes
export type SceneFn = (c: Canvas, accent: string) => void;

/** 1 mythos: a bedroom desk at night, a bug crawling out of the glowing screen. */
const mythos: SceneFn = (c, accent) => {
  interior(c, 11);
  desk(c, 14, 64, 70);
  monitor(c, 26, 34, 40, 26, accent, 7);
  blit(c, BUG, { G: accent, R: C.red }, 58, 50, 2);
  // a trail of old-code pixels dripping off the desk
  [4, 9, 15].forEach((d, i) => px(c, 70 + i * 3, 66 + d / 3, accent));
  rect(c, 18, 58, 6, 6, C.mouth); // mug
  rect(c, 19, 57, 4, 1, C.cream);
};

/** 2 doors: two doors in a wall; the left one locked, the right one ajar with violet light. */
const doors: SceneFn = (c, accent) => {
  nightSky(c, 60, 21);
  skyline(c, 60, 22, { color: C.plum, lit: 0.2 });
  ground(c, 60, C.ink);
  rect(c, 20, 20, 120, 60, C.plumMid);
  dither(c, 20, 20, 120, 6, C.plum, C.plumMid);
  // left door, locked
  rect(c, 38, 34, 30, 46, C.ink);
  rect(c, 40, 36, 26, 44, C.hair);
  rect(c, 42, 38, 22, 18, C.plum);
  rect(c, 42, 58, 22, 20, C.plum);
  blit(c, LOCK, { K: C.ink, Y: C.litGold }, 46, 50, 2);
  // right door, ajar
  rect(c, 92, 34, 30, 46, C.ink);
  rect(c, 94, 36, 26, 44, C.violet);
  dither(c, 94, 36, 26, 44, C.violet, C.cream, 0.25);
  rect(c, 94, 36, 8, 44, C.hair);
  // light spilling on the floor
  for (let y = 80; y < 100; y++) {
    const spread = Math.floor((y - 80) * 0.8);
    dither(c, 94 - spread, y, 26 + spread * 2, 1, C.ink, C.violetDeep, 0.5);
  }
  // request tokens rolling toward the doors
  [20, 30, 140, 150].forEach((x, i) => disc(c, x, 88 + (i % 2), 2, i < 2 ? accent : C.orange));
};

/** 3 triage: a wall of alert screens, one turning red. */
const triage: SceneFn = (c, accent) => {
  rect(c, 0, 0, c.w, c.h, C.ink);
  dither(c, 0, 70, c.w, 30, C.ink, C.plum, 0.25);
  const cols = 5;
  const rows = 3;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = 8 + i * 30;
      const y = 6 + j * 21;
      const isAlert = i === 3 && j === 1;
      monitor(c, x, y, 24, 14, isAlert ? C.red : accent, 31 + i * 7 + j, isAlert);
      // AI stamp chip on each screen corner
      rect(c, x + 19, y + 1, 4, 3, isAlert ? C.litGold : C.violet);
    }
  desk(c, 30, 76, 100);
  rect(c, 70, 70, 20, 6, C.plumMid); // keyboard
  dither(c, 70, 70, 20, 6, C.plumMid, C.cream, 0.25);
};

/** 4 scam: a big phone in front of the city, chat bubbles with red flag chips. */
const scam: SceneFn = (c, accent) => {
  nightSky(c, 72, 41);
  skyline(c, 72, 42, { color: C.plum, lit: 0.3, maxH: 30 });
  ground(c, 72);
  // phone
  rect(c, 52, 8, 56, 90, C.ink);
  rect(c, 54, 10, 52, 86, C.cream);
  rect(c, 54, 10, 52, 86, "#241a2e");
  rect(c, 54, 10, 52, 8, C.plumMid);
  const bubbles = [
    { x: 58, y: 22, w: 30, left: true, flag: false },
    { x: 70, y: 34, w: 32, left: false, flag: false },
    { x: 58, y: 46, w: 36, left: true, flag: true },
    { x: 58, y: 60, w: 26, left: true, flag: true },
    { x: 74, y: 74, w: 28, left: false, flag: false },
  ];
  for (const b of bubbles) {
    rect(c, b.x, b.y, b.w, 9, b.left ? C.plumMid : accent);
    for (let lx = b.x + 2; lx < b.x + b.w - 3; lx += 5) rect(c, lx, b.y + 3, 3, 1, b.left ? C.cream : C.ink);
    rect(c, b.x + 2, b.y + 6, Math.floor(b.w / 2), 1, b.left ? C.cream : C.ink);
    if (b.flag) blit(c, FLAG, { K: C.ink, O: C.red }, b.x + b.w - 3, b.y - 4, 1);
  }
};

/** 5 firstjob: a ladder up a tower; bottom rungs dissolving, new rungs higher up. */
const firstjob: SceneFn = (c, accent) => {
  nightSky(c, 84, 51);
  moon(c, 28, 18);
  skyline(c, 84, 52, { color: C.plum, lit: 0.18, maxH: 20 });
  ground(c, 84);
  rect(c, 92, 10, 40, 74, C.plumMid);
  for (let wy = 14; wy < 80; wy += 6) for (let wx = 96; wx < 128; wx += 6) px(c, wx, wy, wy < 40 ? C.lit : C.plum);
  // ladder rails
  rect(c, 70, 14, 2, 70, C.hair);
  rect(c, 84, 14, 2, 70, C.hair);
  for (let y = 18; y < 84; y += 7) {
    if (y > 60) {
      dither(c, 72, y, 12, 1, C.ink, C.hair, 0.25); // fading rung
    } else if (y < 34) {
      rect(c, 72, y, 12, 2, accent); // new rungs
    } else {
      rect(c, 72, y, 12, 1, C.hair);
    }
  }
  // proof blocks stacked under the ladder
  rect(c, 56, 86, 10, 6, accent);
  rect(c, 66, 86, 10, 6, C.orange);
  rect(c, 61, 80, 10, 6, C.violet);
};

/** 6 money: coin stacks rising like bars inside a shaded band, one tall stack apart. */
const money: SceneFn = (c) => {
  nightSky(c, 86, 61);
  skyline(c, 86, 62, { color: C.plum, lit: 0.15, maxH: 16 });
  ground(c, 86);
  dither(c, 10, 52, 100, 34, C.ink, C.plumMid, 0.25); // shaded band
  const heights = [3, 5, 6, 8];
  heights.forEach((n, i) => {
    for (let k = 0; k < n; k++) blit(c, COIN, { K: C.ink, Y: C.litGold }, 20 + i * 22, 80 - k * 4, 1);
  });
  // a down-arrow marker over the third stack (a stem and a pointed head, so it never reads as a digit)
  rect(c, 64, 37, 2, 6, C.magenta);
  for (let r = 0; r < 4; r++) rect(c, 61 + r, 43 + r, 8 - 2 * r, 1, C.magenta);
  // the tall ceiling stack, set apart
  rect(c, 118, 10, 1, 76, C.plumMid);
  for (let k = 0; k < 17; k++) blit(c, COIN, { K: C.ink, Y: C.lit }, 128, 80 - k * 4, 1);
};

/** 7 fit: a crossroads with three blank signposts, one lit. */
const fit: SceneFn = (c, accent) => {
  nightSky(c, 56, 71);
  moon(c, 132, 16);
  skyline(c, 56, 72, { color: C.plum, lit: 0.2, maxH: 14 });
  ground(c, 56, C.plum);
  dither(c, 0, 56, c.w, 44, C.plum, C.ink, 0.5);
  // three paths fanning out from the bottom centre
  for (let y = 56; y < 100; y++) {
    const t = (y - 56) / 44;
    const cx = 80;
    const w = 4 + Math.floor(t * 18);
    rect(c, cx - Math.floor(w / 2), y, w, 1, C.plumMid);
    rect(c, Math.round(cx - 6 - (1 - t) * 50) - 2, y, 4, 1, C.plumMid);
    rect(c, Math.round(cx + 6 + (1 - t) * 50) - 2, y, 4, 1, C.plumMid);
  }
  const posts = [
    { x: 28, lit: false },
    { x: 76, lit: true },
    { x: 124, lit: false },
  ];
  for (const p of posts) {
    rect(c, p.x + 3, 40, 2, 22, C.hair);
    rect(c, p.x - 4, 34, 16, 8, C.ink);
    rect(c, p.x - 3, 35, 14, 6, p.lit ? accent : C.plumMid);
    if (p.lit) dither(c, p.x - 6, 30, 20, 3, C.plum, accent, 0.25);
  }
};

/** 8 tcas: a university gate on a hill, paths leading up, blank flip tiles for the countdown. */
const tcas: SceneFn = (c, accent) => {
  nightSky(c, 60, 81);
  moon(c, 24, 14);
  // hill
  for (let x = 0; x < c.w; x++) {
    const h = Math.round(18 * Math.sin((x / c.w) * Math.PI));
    rect(c, x, 60 - h, 1, 40 + h, C.plum);
  }
  dither(c, 0, 70, c.w, 30, C.plum, C.ink, 0.5);
  // gate
  rect(c, 62, 22, 6, 30, C.cream);
  rect(c, 92, 22, 6, 30, C.cream);
  rect(c, 56, 18, 48, 6, C.cream);
  rect(c, 58, 14, 44, 4, C.orange);
  rect(c, 68, 30, 24, 22, C.ink);
  dither(c, 68, 30, 24, 22, C.ink, C.violetDeep, 0.25);
  // paths up the hill
  line(c, 80, 99, 80, 52, C.plumMid);
  line(c, 20, 99, 76, 52, C.plumMid);
  line(c, 140, 99, 84, 52, C.plumMid);
  // flip tiles
  for (let i = 0; i < 4; i++) {
    rect(c, 54 + i * 14, 82, 12, 14, C.ink);
    rect(c, 55 + i * 14, 83, 10, 12, i === 3 ? accent : C.plumMid);
    rect(c, 55 + i * 14, 88, 10, 1, C.ink);
  }
  // flags on the gate
  blit(c, FLAG, { K: C.ink, O: accent }, 58, 6, 1);
  blit(c, FLAG, { K: C.ink, O: C.magenta }, 96, 6, 1);
};

/** 9 terminal: a big terminal window with a cursor, a small shield. */
const terminal: SceneFn = (c, accent) => {
  interior(c, 91, { x: 118, y: 8, w: 34, h: 30 });
  rect(c, 10, 8, 100, 66, C.ink);
  rect(c, 12, 10, 96, 6, C.plumMid);
  [C.red, C.litGold, accent].forEach((col, i) => rect(c, 15 + i * 5, 12, 3, 2, col));
  rect(c, 12, 16, 96, 56, "#071009");
  const r = rng(93);
  for (let y = 20; y < 66; y += 4) {
    rect(c, 15, y, 2, 2, accent); // prompt
    const len = 10 + Math.floor(r() * 50);
    for (let x = 19; x < 19 + len; x += 4) rect(c, x, y, 3, 2, r() > 0.8 ? C.cream : C.plumMid);
  }
  rect(c, 19, 66, 4, 3, accent); // cursor
  blit(c, SHIELD, { K: C.ink, G: accent }, 120, 56, 2);
  desk(c, 4, 76, 152);
};

/** 10 tonight: a laptop on a desk, moon in the window, a flag planted beside it. */
const tonight: SceneFn = (c, accent) => {
  interior(c, 101, { x: 20, y: 10, w: 50, h: 38 });
  moon(c, 34, 22, 5);
  // lamp glow
  dither(c, 96, 30, 50, 34, C.plum, C.plumMid, 0.5);
  rect(c, 146, 26, 2, 40, C.ink);
  rect(c, 138, 22, 18, 6, C.orange);
  dither(c, 130, 28, 30, 3, C.plumMid, C.litGold, 0.25);
  desk(c, 10, 66, 140);
  // laptop
  rect(c, 70, 40, 44, 26, C.ink);
  rect(c, 72, 42, 40, 22, "#0b1a10");
  for (let y = 45; y < 62; y += 3) rect(c, 75, y, 8 + ((y * 7) % 24), 1, accent);
  rect(c, 64, 64, 56, 2, C.plumMid);
  blit(c, FLAG, { K: C.ink, O: C.orange }, 120, 50, 2);
};

/** 11 next: a rooftop at the edge of the city, the first light on the horizon, a path onward. */
const next: SceneFn = (c, accent) => {
  nightSky(c, 66, 111, 20);
  // first light band on the horizon (no rays)
  dither(c, 0, 56, c.w, 6, C.plumMid, C.orangeDeep, 0.25);
  rect(c, 0, 62, c.w, 4, C.orangeDeep);
  dither(c, 0, 62, c.w, 4, C.orangeDeep, C.litGold, 0.25);
  // fill the strip between the light band and the rooftops so building gaps stay opaque
  rect(c, 0, 66, c.w, 6, C.plumMid);
  skyline(c, 72, 112, { color: C.plum, lit: 0.3, maxH: 22 });
  ground(c, 72);
  // rooftop edge and a path of lit tiles toward the horizon
  rect(c, 0, 80, c.w, 2, C.plumMid);
  for (let i = 0; i < 6; i++) rect(c, 72 + i * 2, 96 - i * 3, 16 - i * 2, 2, i % 2 ? accent : C.lit);
  blit(c, FLAG, { K: C.ink, O: accent }, 120, 66, 2);
};

export const SCENES: Readonly<Record<string, SceneFn>> = {
  mythos,
  doors,
  triage,
  scam,
  firstjob,
  money,
  fit,
  tcas,
  terminal,
  tonight,
  next,
};

export function renderScene(key: string, accent: string): Canvas {
  const fn = SCENES[key];
  if (!fn) throw new Error(`no pixel scene for "${key}"`);
  const c = createCanvas(SCENE_SIZE.w, SCENE_SIZE.h);
  fn(c, accent);
  return c;
}

/** Vertical level-map background: islands in a night sea, no path (the DOM draws the route). */
export function renderMap(accent: string): Canvas {
  const c = createCanvas(MAP_SIZE.w, MAP_SIZE.h);
  rect(c, 0, 0, c.w, c.h, "#140c1c");
  const r = rng(201);
  for (let y = 0; y < c.h; y += 3)
    for (let x = (y / 3) % 2 ? 1 : 0; x < c.w; x += 7) if (r() > 0.55) rect(c, x, y, 2, 1, C.plum);
  const islands = [
    { x: 20, y: 22, r: 12 },
    { x: 84, y: 54, r: 14 },
    { x: 26, y: 96, r: 13 },
    { x: 82, y: 138, r: 12 },
    { x: 34, y: 176, r: 11 },
  ];
  for (const isl of islands) {
    disc(c, isl.x, isl.y, isl.r + 2, C.plumMid);
    disc(c, isl.x, isl.y, isl.r, C.plum);
    dither(c, isl.x - isl.r, isl.y + Math.floor(isl.r / 2), isl.r * 2, 2, C.plum, C.plumMid);
    for (let k = 0; k < 5; k++) px(c, isl.x - 5 + k * 2 + Math.floor(r() * 2), isl.y - 2 + Math.floor(r() * 4), r() > 0.5 ? C.lit : accent);
  }
  for (let i = 0; i < 30; i++) px(c, Math.floor(r() * c.w), Math.floor(r() * c.h), r() > 0.85 ? C.litGold : C.violetDeep);
  return c;
}

/** Profile card frame (4:5): chunky pixel border with corner studs, plum inside. */
export function renderFrame(accent: string): Canvas {
  const c = createCanvas(FRAME_SIZE.w, FRAME_SIZE.h);
  rect(c, 0, 0, c.w, c.h, C.ink);
  rect(c, 2, 2, c.w - 4, c.h - 4, accent);
  rect(c, 4, 4, c.w - 8, c.h - 8, C.ink);
  rect(c, 5, 5, c.w - 10, c.h - 10, C.plum);
  dither(c, 5, 5, c.w - 10, 40, C.ink, C.plum, 0.5);
  dither(c, 5, c.h - 30, c.w - 10, 25, C.plum, C.plumMid, 0.25);
  for (const [x, y] of [
    [1, 1],
    [c.w - 7, 1],
    [1, c.h - 7],
    [c.w - 7, c.h - 7],
  ] as const) {
    rect(c, x, y, 6, 6, C.ink);
    rect(c, x + 1, y + 1, 4, 4, C.orange);
    rect(c, x + 2, y + 2, 2, 2, C.litGold);
  }
  const r = rng(301);
  for (let i = 0; i < 18; i++) px(c, 8 + Math.floor(r() * (c.w - 16)), 8 + Math.floor(r() * 34), r() > 0.7 ? C.litGold : C.cream);
  return c;
}

/** The host sprite frame at 2x (48x64, GUIDE_HOST.spriteSize), transparent background. */
export function renderHost(frame: keyof typeof HOST_GRIDS): Canvas {
  const c = createCanvas(48, 64);
  blit(c, HOST_GRIDS[frame], HOST_PALETTE, 0, 0, 2);
  return c;
}
