/**
 * The web island's atmosphere, as data: shallow water round the coast, wet
 * sand at the waterline, contact shadows, where light falls at dawn, dusk and
 * night and how it breathes, the campfire's smoke, the petals and leaves the
 * breeze carries, and the glints on the sea. Pure and client-safe; fx.ts
 * turns it into pixels. Nothing here reaches the bot's PNG or GIF.
 */
import { MOTION_SPRITES, SHORE_FRAMES } from "@/bot/assets/island/motion-sprites";
import { SPRITES } from "@/bot/assets/island/sprites";
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { allSprites } from "./atlas";
import type { Span } from "./clock";
import type { SceneModel } from "./draw";
import type { Rect } from "./geometry";
import { SHIP_WATER_SPRITES } from "./shipWater";
import { signSprites } from "./signposts";
import type { LightPhase, LiveActor } from "./types";

// ------------------------------------------------------------------ noise

/** A fixed 0..1 for three integers. */
export function hash3(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519) ^ 0x2c1b3c6d;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ------------------------------------------------------------------ sprites

/** Sea cell kinds as draw.ts numbers them: 0, 1 open water; 2..5 shore_n, shore_s, shore_e, shore_w. */
const SHORE_KINDS = ["shore_n", "shore_s", "shore_e", "shore_w"] as const;

const spriteRows = (name: string): string[] | undefined =>
  (SPRITES as Record<string, string[]>)[name] ?? (MOTION_SPRITES as Record<string, string[]>)[name];

/** Every sprite by name (the plaza's crowd included), read once: the sprites never change. */
let everySprite: Record<string, string[]> | null = null;
const anySpriteRows = (name: string): string[] | undefined => spriteRows(name) ?? (everySprite ??= allSprites())[name];

/**
 * The breeze's petals and leaves (palette keys, so they take the hour's
 * grade), and the lantern's dotted ring blanked: on the web a lantern's light
 * is a pool, not a ring.
 */
export const BREEZE_SPRITES: Readonly<Record<string, string[]>> = {
  // Tumbling: face on, edge on, face on the other way, edge on.
  petal_0: [".fp", "pp.", "p.."],
  petal_1: ["fpp"],
  petal_2: ["pf.", ".pp", "..p"],
  petal_3: ["p", "p", "f"],
  leaf_0: ["..j", ".nj", "nn."],
  leaf_1: ["nnj"],
  leaf_2: ["j..", "jn.", ".nn"],
  leaf_3: ["j", "n", "n"],
};

/**
 * The island's small daytime life (ambient.ts), in palette keys so it takes
 * the hour's grade: a sparrow facing right (standing, pecking, wings up and
 * down) and butterflies in three colours (wings open, half, closed; from
 * above), each its own original sprite.
 */
export const LIFE_SPRITES: Readonly<Record<string, string[]>> = {
  bird_stand: ["....bb.", "...bcoy", ".bbccf.", "bbcccf.", "..z.z.."],
  bird_peck: [".......", ".......", ".bbcbb.", "bbcccbo", "..z.z.y"],
  bird_fly_0: ["..b....", "..bb...", "bbccoy.", "..cf...", "......."],
  bird_fly_1: [".......", "..bcoy.", "bbcb...", "..b....", "......."],
  ...butterfly("y", "y", "o"),
  ...butterfly("f", "z", "o"),
  ...butterfly("r", "k", "o"),
};

/** A butterfly's three frames, `wing` with `mark` on the forewings round an `body` body: butterfly_<wing>_0..2. */
function butterfly(wing: string, mark: string, body: string): Record<string, string[]> {
  const rows = (r: string[]) => r.map((row) => row.replace(/W/g, wing).replace(/M/g, mark).replace(/B/g, body));
  return {
    [`butterfly_${wing}_0`]: rows(["WW.WW", "WMBMW", ".WBW."]),
    [`butterfly_${wing}_1`]: rows([".W.W.", ".WBW.", "..B.."]),
    [`butterfly_${wing}_2`]: rows(["..W..", "..B..", "..B.."]),
  };
}

const BLANK_16 = Array.from({ length: 16 }, () => ".".repeat(16));

/**
 * The web's sprite set: every island sprite, the breeze, the island's small
 * life, the plots' signposts, the foam round the merchant ship, and no dotted
 * lantern ring.
 */
export function webSprites(): Record<string, string[]> {
  return {
    ...allSprites(),
    ...BREEZE_SPRITES,
    ...LIFE_SPRITES,
    ...signSprites(),
    ...SHIP_WATER_SPRITES,
    lantern_glow_0: BLANK_16,
    lantern_glow_1: BLANK_16,
  };
}

// ------------------------------------------------------------------ water

/** How far the shallows reach from the waterline, in native px. */
export const SHALLOW_REACH = 24;
/** Sand this close (px) to where the water can reach stays wet. */
const WET_REACH = 3;

interface ShoreMask {
  /** Deep water in all three frames (the shallows may tint it). */
  water: Uint8Array;
  /** Sand in all three frames, next to where the wash reaches: wet. */
  wet: Uint8Array;
  /** Sand in all three frames, out of the wash's reach: dry beach (terrain.ts may set a pebble there). */
  dry: Uint8Array;
}

let shoreMasks: ShoreMask[] | null = null;

/** Per shore kind, 16 x 16: which pixels stay open water, and which sand the wash keeps wet. */
function masks(): ShoreMask[] {
  if (shoreMasks) return shoreMasks;
  shoreMasks = SHORE_KINDS.map((kind) => {
    const frames = SHORE_FRAMES[kind].map((name) => spriteRows(name) ?? []);
    const water = new Uint8Array(256);
    const sand = new Uint8Array(256);
    /** Water or wash in any frame (not the sand's own pale speckles). */
    const wash = new Uint8Array(256);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const chars = frames.map((rows) => rows[y]?.[x] ?? ".");
        water[y * 16 + x] = chars.every((c) => c === "w") ? 1 : 0;
        sand[y * 16 + x] = chars.every((c) => c === "s" || c === "d" || c === "i") && chars.some((c) => c !== "i") ? 1 : 0;
        wash[y * 16 + x] = chars.some((c) => c === "w" || c === "v" || c === "u") ? 1 : 0;
      }
    }
    const wet = new Uint8Array(256);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (!sand[y * 16 + x]) continue;
        let near = false;
        for (let dy = -WET_REACH; dy <= WET_REACH && !near; dy++) {
          for (let dx = -WET_REACH; dx <= WET_REACH; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx > 15 || ny > 15) continue;
            if (wash[ny * 16 + nx]) {
              near = true;
              break;
            }
          }
        }
        wet[y * 16 + x] = near ? 1 : 0;
      }
    }
    const dry = sand.map((v, i) => (v && !wet[i] ? 1 : 0));
    return { water, wet, dry };
  });
  return shoreMasks;
}

/** Per shore kind (draw.ts numbering less 2: shore_n, shore_s, shore_e, shore_w), 16 x 16: the dry beach, sand in every frame and never wet. */
export function dryShore(): readonly Uint8Array[] {
  return masks().map((m) => m.dry);
}

/**
 * The water round the island, per pixel of `rect` (scene px): a level of
 * shallows (1..SHALLOW_LEVELS, deeper to shallower) or WET sand, and the
 * cells that hold any of it, so a bake only walks those.
 */
export interface WaterField {
  rect: Rect;
  /** Per pixel of the rect: 0 none, 1..SHALLOW_LEVELS the shallows (dithered), WET for wet sand. */
  level: Uint8Array;
  /** Cells with any shallows or wet sand, as their top-left pixel index into `level`. */
  cells: number[];
}

/** The distance runs on blocks this many px square: a quarter of the work; the dither hides the 2 px steps. */
export const WATER_BLOCK = 2;
/** Levels of shallows, the deepest first. */
export const SHALLOW_LEVELS = 4;
/** `level` value for wet sand. */
export const WET = 7;

/** 4 x 4 ordered dither thresholds, 0..1, by world pixel: the pattern never moves with what it shades. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function bayer(x: number, y: number): number {
  return BAYER[(y & 3) * 4 + (x & 3)];
}

/**
 * The shallows at a world pixel `distance` px from the waterline: a smooth
 * falloff, dithered between levels in world space, so the band follows the
 * coast with no contour lines (0 past the reach).
 */
export function shallowLevel(distance: number, x: number, y: number): number {
  const f = 1 - distance / SHALLOW_REACH;
  if (f <= 0) return 0;
  return Math.min(SHALLOW_LEVELS, Math.floor(f ** 1.5 * SHALLOW_LEVELS + bayer(x, y)));
}

const NO_WATER: WaterField = { rect: { x: 0, y: 0, w: 0, h: 0 }, level: new Uint8Array(0), cells: [] };

/**
 * Shallows and wet sand for a scene: a chamfer distance from every land
 * pixel (land cells, and whatever of a shore cell is not open water in every
 * frame), over the land's bounding box plus the reach. Built once per scene.
 */
export function waterField(scene: IslandScene, sea: Int8Array): WaterField {
  const t = scene.tile;
  let c0 = scene.cols;
  let r0 = scene.rows;
  let c1 = -1;
  let r1 = -1;
  for (let k = 0; k < sea.length; k++) {
    if (sea[k] >= 0 && sea[k] < 2) continue;
    const c = k % scene.cols;
    const r = Math.floor(k / scene.cols);
    c0 = Math.min(c0, c);
    r0 = Math.min(r0, r);
    c1 = Math.max(c1, c);
    r1 = Math.max(r1, r);
  }
  if (c1 < 0) return NO_WATER;
  const pad = Math.ceil(SHALLOW_REACH / t);
  c0 = Math.max(0, c0 - pad);
  r0 = Math.max(0, r0 - pad);
  c1 = Math.min(scene.cols - 1, c1 + pad);
  r1 = Math.min(scene.rows - 1, r1 + pad);
  const rect = { x: c0 * t, y: r0 * t, w: (c1 - c0 + 1) * t, h: (r1 - r0 + 1) * t };
  const { w, h } = rect;
  const shore = masks();
  // Distances in thirds of a block, capped just past the reach.
  const B = WATER_BLOCK;
  const gw = w / B;
  const gh = h / B;
  const FAR = Math.ceil((SHALLOW_REACH / B) * 3) + 4;
  const dist = new Uint16Array(gw * gh);
  const per = t / B;
  // Cell by cell: land blocks stay 0, open water is FAR; a shore block is water only if all of it is.
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const kind = sea[r * scene.cols + c];
      if (kind < 0) continue;
      const gbase = (r - r0) * per * gw + (c - c0) * per;
      if (kind < 2) {
        for (let by = 0; by < per; by++) dist.fill(FAR, gbase + by * gw, gbase + by * gw + per);
        continue;
      }
      const m = shore[kind - 2];
      for (let by = 0; by < per; by++) {
        for (let bx = 0; bx < per; bx++) {
          const p = by * B * 16 + bx * B;
          if (m.water[p] && m.water[p + 1] && m.water[p + 16] && m.water[p + 17]) dist[gbase + by * gw + bx] = FAR;
        }
      }
    }
  }
  // Chamfer 3-4, two passes; land (0) is skipped, so the island's inside costs nothing.
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      let d = dist[i];
      if (d === 0) continue;
      let n: number;
      if (x > 0 && (n = dist[i - 1] + 3) < d) d = n;
      if (y > 0) {
        if ((n = dist[i - gw] + 3) < d) d = n;
        if (x > 0 && (n = dist[i - gw - 1] + 4) < d) d = n;
        if (x < gw - 1 && (n = dist[i - gw + 1] + 4) < d) d = n;
      }
      dist[i] = d;
    }
  }
  for (let y = gh - 1; y >= 0; y--) {
    for (let x = gw - 1; x >= 0; x--) {
      const i = y * gw + x;
      let d = dist[i];
      if (d === 0) continue;
      let n: number;
      if (x < gw - 1 && (n = dist[i + 1] + 3) < d) d = n;
      if (y < gh - 1) {
        if ((n = dist[i + gw] + 3) < d) d = n;
        if (x < gw - 1 && (n = dist[i + gw + 1] + 4) < d) d = n;
        if (x > 0 && (n = dist[i + gw - 1] + 4) < d) d = n;
      }
      dist[i] = d;
    }
  }
  // Per pixel, cell by cell: open water takes its block's distance (a block the land touches sits
  // at the waterline); a shore cell only where it is open water in every frame, plus its wet sand.
  const level = new Uint8Array(w * h);
  const cells: number[] = [];
  const reach = (SHALLOW_REACH / B) * 3;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const kind = sea[r * scene.cols + c];
      if (kind < 0) continue;
      const m = kind >= 2 ? shore[kind - 2] : null;
      const x0 = (c - c0) * t;
      const y0 = (r - r0) * t;
      const gx0 = (c - c0) * per;
      const gy0 = (r - r0) * per;
      if (!m) {
        // Open water past the reach (most of the sea): no pixel to look at.
        let near = false;
        for (let by = 0; by < per && !near; by++) for (let bx = 0; bx < per; bx++) if (dist[(gy0 + by) * gw + gx0 + bx] < reach) near = true;
        if (!near) continue;
      }
      let any = false;
      for (let py = 0; py < t; py++) {
        const row = (y0 + py) * w + x0;
        const grow = (gy0 + (py >> 1)) * gw + gx0;
        for (let px = 0; px < t; px++) {
          const p = py * 16 + px;
          if (m && !m.water[p]) {
            if (m.wet[p]) {
              level[row + px] = WET;
              any = true;
            }
            continue;
          }
          const d = dist[grow + (px >> 1)];
          if (d >= reach) continue;
          const v = shallowLevel((d / 3) * B, rect.x + x0 + px, rect.y + y0 + py);
          if (v === 0) continue;
          level[row + px] = v;
          any = true;
        }
      }
      if (any) cells.push(y0 * w + x0);
    }
  }
  return { rect, level, cells };
}

// ------------------------------------------------------------------ shadows

/** Rim (1) and core (2) of a flat ellipse, w x h. */
export function ellipseMask(w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - w / 2) / (w / 2);
      const ny = (y + 0.5 - h / 2) / (h / 2);
      const r = nx * nx + ny * ny;
      out[y * w + x] = r <= 0.42 ? 2 : r <= 1 ? 1 : 0;
    }
  }
  return out;
}

/** Where a sprite meets the ground: the inked columns of its last two inked rows, and the row under them. */
export function footprint(rows: readonly string[]): { x0: number; x1: number; bottom: number } | null {
  let bottom = -1;
  for (let y = rows.length - 1; y >= 0; y--) {
    if (/[^.]/.test(rows[y])) {
      bottom = y;
      break;
    }
  }
  if (bottom < 0) return null;
  let x0 = Infinity;
  let x1 = -1;
  for (const y of [bottom, bottom - 1]) {
    const row = rows[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      if (row[x] === ".") continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
  }
  return x1 < 0 ? null : { x0, x1, bottom: bottom + 1 };
}

/**
 * Actors that stand on the ground and cast a shadow (glyphs, bulbs, notes,
 * the fire and its pit do not; the merchant ship floats, and its shadow on
 * the water is its own, shipWater.ts).
 */
const NO_SHADOW = /^(count_|goal_|campfire_|notice_note|fest_count|lantern_glow|petal_|leaf_|merchant_ship_|ship_foam_)/;

export function castsShadow(name: string): boolean {
  return !NO_SHADOW.test(name);
}

/** A shadow under a sprite at (x, y): its ellipse's box in scene px, or null. `lean` shifts it with the sun. */
export function shadowBox(name: string, x: number, y: number, flip: boolean, lean: number): Rect | null {
  const rows = anySpriteRows(name);
  if (!rows?.length) return null;
  const foot = footprint(rows);
  if (!foot) return null;
  const width = rows[0].length;
  const x0 = flip ? width - 1 - foot.x1 : foot.x0;
  const span = foot.x1 - foot.x0 + 1;
  const w = Math.max(6, span + (span > 12 ? 5 : 4));
  const h = w >= 20 ? 4 : 3;
  // Centred just under the feet: the last inked row and the two below it.
  return { x: x + x0 + Math.floor((span - w) / 2) + lean, y: y + foot.bottom - h + 2, w, h };
}

/** Where the sun leans the shadows (px right): morning from the east, evening from the west, none at night. */
export const SHADOW_LEAN: Readonly<Record<LightPhase, number>> = { dawn: -2, day: 1, dusk: 2, night: 0 };

// ------------------------------------------------------------------ light

export type LightKind = "lamp" | "lantern" | "festoon" | "fire" | "board" | "bulb";

export interface LightSource {
  kind: LightKind;
  /** The glow over sprites (faces, trunks), centre in scene px. */
  hx: number;
  hy: number;
  /** The pool on the ground, centre in scene px; null: no pool. */
  gx: number | null;
  gy: number | null;
}

/**
 * Per kind: the small glow round the light itself (radius; 0 for none) and
 * its pool on the ground (radius x, radius y). The fire and the countdown
 * board have no glow: the fire lights the faces round it instead, and a glow
 * over the board would paint over the stall.
 */
export const LIGHT_SIZE: Readonly<Record<LightKind, { halo: number; pool: [number, number] | null }>> = {
  lamp: { halo: 7, pool: [22, 13] },
  lantern: { halo: 6, pool: [18, 11] },
  festoon: { halo: 0, pool: [30, 13] },
  fire: { halo: 0, pool: [42, 26] },
  board: { halo: 0, pool: [24, 10] },
  bulb: { halo: 3, pool: null },
};

/**
 * How strong the hour's lights are: none by day, faint at dawn and dusk (the
 * fire and the lanterns only), full at night.
 */
const STRENGTH: Readonly<Record<LightPhase, Readonly<Record<LightKind, number>>>> = {
  day: { lamp: 0, lantern: 0, festoon: 0, fire: 0, board: 0, bulb: 0 },
  dawn: { lamp: 0, lantern: 0.22, festoon: 0, fire: 0.3, board: 0, bulb: 0 },
  dusk: { lamp: 0, lantern: 0.3, festoon: 0, fire: 0.42, board: 0, bulb: 0 },
  // The fire is the heart of the night; lamps and lanterns light a little less ground.
  night: { lamp: 0.8, lantern: 0.85, festoon: 0.8, fire: 1, board: 0.6, bulb: 1 },
};

export function lightStrength(phase: LightPhase, kind: LightKind): number {
  return STRENGTH[phase][kind];
}

/** A pool's light at each of its steps (0 none, 3 the heart), at full strength. */
export const POOL_ALPHA = [0, 0.26, 0.45, 0.62] as const;
/** Where each step begins, as the share of the radius left to the rim: the rim, the middle, the heart. */
const POOL_EDGES = [0.03, 0.27, 0.56] as const;
/** How wide (as a share of the radius) the dither blends each step into the next: a few px of soft edge. */
const POOL_SOFT = 0.14;

/**
 * The step of a pool's light at world pixel (x, y), for a pool centred at
 * (cx, cy) with radii rx, ry: three steps from the rim to the heart, each
 * edge dithered over a few px in world space, so the pool reads soft and
 * never shimmers when its brightness changes.
 */
export function poolStep(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  const r = Math.sqrt(nx * nx + ny * ny);
  if (r >= 1) return 0;
  const t = 1 - r + (bayer(x, y) - 0.5) * POOL_SOFT;
  return t > POOL_EDGES[2] ? 3 : t > POOL_EDGES[1] ? 2 : t > POOL_EDGES[0] ? 1 : 0;
}

/** A lamp's light: a soft amber. */
export const LAMP_WARM = [1.1, 0.93, 0.68] as const;
/** The fire's: deeper and more orange, so its pool still reads warm where it thins out over the moonlit stone. */
export const FIRE_WARM = [1.24, 0.85, 0.5] as const;

/**
 * The ground under a warm lamp, from its daytime colour: the colour itself in
 * an amber light, then eased a little toward grey, so lit grass reads as warm
 * grass and lit stone as warm stone rather than mustard paint. Warm enough
 * that a soft blend over the moonlit blue still reads warm.
 */
export function lamplight(rgb: readonly [number, number, number], warm: readonly number[] = LAMP_WARM): [number, number, number] {
  const lit = [0, 1, 2].map((i) => rgb[i] * warm[i]);
  const luma = 0.299 * lit[0] + 0.587 * lit[1] + 0.114 * lit[2];
  return lit.map((v) => Math.min(255, Math.round(luma + 0.78 * (v - luma)))) as [number, number, number];
}

/** A sprite in the fire's light (faces, shirts, the pit's stones), from its daytime colour. */
export function firelight(rgb: readonly [number, number, number]): [number, number, number] {
  const warm = [1.04, 0.8, 0.58];
  return [0, 1, 2].map((i) => Math.min(255, Math.round(rgb[i] * warm[i]))) as [number, number, number];
}

/** How bright the fire's light is per step of its breath; the middle one when still. */
export const BREATH = [0.86, 1, 1.12] as const;
/** The breath's slow walk between its steps, one entry per BREATH_TICKS. */
const BREATH_WALK = [1, 1, 2, 1, 0, 1, 2, 2, 1, 0, 0, 1, 2, 1] as const;
const BREATH_TICKS = 3;

/** The fire's breath step at a tick (an index into BREATH): it changes at most every BREATH_TICKS ticks. */
export function breathAt(tick: number): number {
  return BREATH_WALK[Math.floor(tick / BREATH_TICKS) % BREATH_WALK.length];
}

/** Actors that never catch the fire's light: the flame itself, glyphs, bulbs, notes, boards, the ship out at sea. */
const UNLIT = /^(campfire_flame|count_|goal_|notice_|fest_|prize_|petal_|leaf_|merchant_ship_)/;

export function catchesLight(name: string): boolean {
  return !UNLIT.test(name);
}

/** Every light on the island in a phase: lamps, lanterns and the festoon (night), the fire, the countdown board, the lit bulbs. */
export function lightSources(model: SceneModel, actors: readonly LiveActor[], phase: LightPhase): LightSource[] {
  const out: LightSource[] = [];
  const add = (s: LightSource) => {
    if (lightStrength(phase, s.kind) > 0) out.push(s);
  };
  // Lamp posts and the festoon are drawn only at night (draw.ts).
  if (phase === "night") {
    for (const p of model.lamps) add({ kind: "lamp", hx: p.x + 3, hy: p.y + 2, gx: p.x + 3, gy: p.y + 15 });
    if (model.festoon) add({ kind: "festoon", hx: model.festoon.x + 24, hy: model.festoon.y + 4, gx: model.festoon.x + 24, gy: model.festoon.y + 18 });
  }
  for (const m of model.trees) {
    const l = m.tree.lantern;
    if (l) add({ kind: "lantern", hx: l.x + 4, hy: l.y + 7, gx: l.x + 4, gy: l.y + 13 });
  }
  for (const a of actors) {
    const name = a.frames[0] ?? "";
    if (name.startsWith("campfire_flame")) add({ kind: "fire", hx: Math.round(a.x) + 5, hy: Math.round(a.y) + 5, gx: Math.round(a.x) + 5, gy: Math.round(a.y) + 8 });
    else if (name === "fest_count") add({ kind: "board", hx: Math.round(a.x) + 22, hy: Math.round(a.y) + 9, gx: Math.round(a.x) + 22, gy: Math.round(a.y) + 24 });
    else if (name === "goal_bulb") add({ kind: "bulb", hx: Math.round(a.x) + 1, hy: Math.round(a.y) + 1, gx: null, gy: null });
  }
  return out;
}

// ------------------------------------------------------------------ smoke

export interface Puff {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1 */
  alpha: number;
}

/**
 * Smoke rises 1 px per step; a step is 3 ticks (under 3 a second): slow and
 * soft, and on the sea's own beat, so it moves only on frames that repaint
 * the whole view anyway.
 */
const SMOKE_STEP_TICKS = 3;
const SMOKE_LIFE = 26;
const SMOKE_PUFFS = 5;

/** The smoke's colour in each light: pale grey by day, lilac at dawn, rose at dusk, moonlit blue at night. */
export const SMOKE_RGB: Readonly<Record<LightPhase, readonly [number, number, number]>> = {
  day: [222, 224, 228],
  dawn: [222, 214, 230],
  dusk: [214, 190, 204],
  night: [150, 154, 190],
};

/** Where the smoke starts: the top of the campfire's flame, or null without a fire. */
export function smokeOrigin(actors: readonly LiveActor[]): { x: number; y: number } | null {
  const flame = actors.find((a) => (a.frames[0] ?? "").startsWith("campfire_flame"));
  return flame ? { x: Math.round(flame.x) + 5, y: Math.round(flame.y) } : null;
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
    const alpha = a < 2 ? 0.4 : a < 12 ? 0.5 : a < 19 ? 0.34 : 0.16;
    out.push({ x: origin.x - 1 + sway + Math.floor(a / 9), y: origin.y - 2 - a, w: size, h: size - (a < 4 ? 0 : 1), alpha });
  }
  return out;
}

// ------------------------------------------------------------------ breeze

export interface Drift {
  name: string;
  x: number;
  y: number;
}

/** Native px of open span per petal or leaf on the breeze: sparse on purpose. */
const BREEZE_SPACING = 110;
/** Ticks between tumble frames. */
const TUMBLE_TICKS = 3;

/**
 * Petals and leaves carried left to right on the breeze (the way the gusts
 * sweep the trees), a few at a time, bobbing as they go. Pure: the same tick
 * always puts them in the same place. None at night.
 */
export function breezeAt(tick: number, scene: Pick<IslandScene, "width" | "height">, span: Span, phase: LightPhase): Drift[] {
  if (phase === "night") return [];
  const count = Math.max(3, Math.min(12, Math.round(span.w / BREEZE_SPACING)));
  const out: Drift[] = [];
  const lane = span.w + 40;
  for (let k = 0; k < count; k++) {
    const speed = 2 + Math.floor(hash3(k, 7, 1) * 2); // px per 3 ticks: 2 or 3
    const offset = Math.floor(hash3(k, 3, 9) * lane);
    const travelled = Math.floor((tick * speed) / 3) + offset;
    const x = span.x - 20 + (travelled % lane);
    const lap = Math.floor(travelled / lane);
    // Each lap takes a new height on the island's middle band, so the same petal never retraces a line.
    const band = 0.22 + hash3(k, lap, 5) * 0.6;
    const bob = Math.round(Math.sin((tick + k * 17) / 9) * 3 + Math.sin((tick + k * 5) / 23) * 4);
    const y = Math.round(scene.height * band) + bob;
    const leaf = hash3(k, lap, 11) < 0.45;
    const frame = Math.floor((tick + k * 2) / TUMBLE_TICKS) % 4;
    out.push({ name: `${leaf ? "leaf" : "petal"}_${frame}`, x, y });
  }
  return out;
}

// ------------------------------------------------------------------ glints

export type GlintFrame = "dot" | "dash" | "cross";

/** Where the low sun (or the moon) lays its path on the sea: a band of scene px. */
export function glintPath(scene: Pick<IslandScene, "width">): { x: number; w: number } {
  return { x: Math.round(scene.width * 0.62), w: 56 };
}

/** Glints per open-water cell: a scatter everywhere, many more on the sun's or moon's path. */
const GLINT_BASE: Readonly<Record<LightPhase, number>> = { dawn: 0.05, day: 0.06, dusk: 0.04, night: 0.02 };
const GLINT_PATH: Readonly<Record<LightPhase, number>> = { dawn: 0.35, day: 0, dusk: 0.5, night: 0.42 };

/**
 * The glint on one open-water cell at a sea step (the sea's own 3-tick beat,
 * so a glint changes only when the whole view repaints anyway), or null.
 */
export function glintAt(
  col: number,
  row: number,
  step: number,
  phase: LightPhase,
  path: { x: number; w: number },
  tile: number,
  density = 1
): { x: number; y: number; frame: GlintFrame } | null {
  const life = Math.floor(step / 2);
  const roll = hash3(col, row, life);
  const cx = col * tile + 8;
  const near = Math.max(0, 1 - Math.abs(cx - path.x) / (path.w / 2));
  const chance = (GLINT_BASE[phase] + GLINT_PATH[phase] * near) * density;
  if (roll >= chance) return null;
  const h = hash3(col, row, life + 7919);
  const x = col * tile + 2 + Math.floor(h * 12);
  const y = row * tile + 2 + Math.floor(hash3(row, col, life) * 12);
  const first = h < 0.5 ? "dash" : "dot";
  return { x, y, frame: step % 2 === 0 ? first : "cross" };
}
