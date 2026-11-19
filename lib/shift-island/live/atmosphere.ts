/**
 * The web island's atmosphere, as data: shallow water round the coast, wet
 * sand at the waterline, contact shadows, where light falls at night, the
 * petals and leaves the breeze carries, and the glints on the sea. Pure and
 * client-safe; fx.ts turns it into pixels. Nothing here reaches the bot's PNG
 * or GIF.
 */
import { MOTION_SPRITES, SHORE_FRAMES } from "@/bot/assets/island/motion-sprites";
import { SPRITES } from "@/bot/assets/island/sprites";
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { allSprites } from "./atlas";
import type { Span } from "./clock";
import type { SceneModel } from "./draw";
import type { Rect } from "./geometry";
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

const BLANK_16 = Array.from({ length: 16 }, () => ".".repeat(16));

/** The web's sprite set: every island sprite, the breeze, and no dotted lantern ring. */
export function webSprites(): Record<string, string[]> {
  return { ...allSprites(), ...BREEZE_SPRITES, lantern_glow_0: BLANK_16, lantern_glow_1: BLANK_16 };
}

// ------------------------------------------------------------------ water

/** How far the shallows reach from the waterline, in native px. */
export const SHALLOW_REACH = 26;
/** Sand this close (px) to where the water can reach stays wet. */
const WET_REACH = 3;

interface ShoreMask {
  /** Deep water in all three frames (the shallows may tint it). */
  water: Uint8Array;
  /** Sand in all three frames, next to where the wash reaches: wet. */
  wet: Uint8Array;
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
    return { water, wet };
  });
  return shoreMasks;
}

/** The water round the island, per pixel of `rect` (scene px). */
export interface WaterField {
  rect: Rect;
  /** Blocks of WATER_BLOCK x WATER_BLOCK px across the rect. */
  gw: number;
  gh: number;
  /** Per block of open-water cells: 0 none, 1..3 shallower. 0 on land and shore cells. */
  blocks: Uint8Array;
  /** Per pixel of shore cells only: 1..3 the band of open water there, WET for wet sand; 0 elsewhere. */
  edge: Uint8Array;
  /** Shore cells in the rect, as their top-left pixel index into `edge`: the bake walks only these. */
  shoreCells: number[];
}

/** The distance runs on blocks this many px square: a quarter of the work, bands that step in 2 px. */
export const WATER_BLOCK = 2;
/** `edge` value for wet sand. */
export const WET = 4;

/** The shallows' bands by distance from the waterline: clean contours, rounded by the distance itself. */
export function shallowLevel(distance: number): number {
  const l = 1 - distance / SHALLOW_REACH;
  if (l > 0.78) return 3;
  if (l > 0.5) return 2;
  if (l > 0.12) return 1;
  return 0;
}

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
  if (c1 < 0) return { rect: { x: 0, y: 0, w: 0, h: 0 }, gw: 0, gh: 0, blocks: new Uint8Array(0), edge: new Uint8Array(0), shoreCells: [] };
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
  const edge = new Uint8Array(w * h);
  const shoreCells: number[] = [];
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
      shoreCells.push((r - r0) * t * w + (c - c0) * t);
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
  const level = new Uint8Array(gw * gh);
  for (let y = gh - 1; y >= 0; y--) {
    for (let x = gw - 1; x >= 0; x--) {
      const i = y * gw + x;
      let d = dist[i];
      if (d === 0) {
        // A block the land touches: its water pixels sit right at the waterline.
        level[i] = shallowLevel(0);
        continue;
      }
      let n: number;
      if (x < gw - 1 && (n = dist[i + 1] + 3) < d) d = n;
      if (y < gh - 1) {
        if ((n = dist[i + gw] + 3) < d) d = n;
        if (x < gw - 1 && (n = dist[i + gw + 1] + 4) < d) d = n;
        if (x > 0 && (n = dist[i + gw - 1] + 4) < d) d = n;
      }
      dist[i] = d;
      if (d < FAR) level[i] = shallowLevel((d / 3) * B);
    }
  }
  // Open-water cells keep their blocks' bands; land and shore cells' blocks are cleared, and a
  // shore cell's own pixels take their block's band where they are open water in every frame.
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const kind = sea[r * scene.cols + c];
      if (kind === 0 || kind === 1) continue;
      const gx0 = (c - c0) * per;
      const gy0 = (r - r0) * per;
      if (kind >= 2) {
        const m = shore[kind - 2];
        const x0 = (c - c0) * t;
        const y0 = (r - r0) * t;
        for (let py = 0; py < t; py++) {
          const row = (y0 + py) * w + x0;
          const grow = (gy0 + Math.floor(py / B)) * gw + gx0;
          for (let px = 0; px < t; px++) {
            const p = py * 16 + px;
            if (m.water[p]) edge[row + px] = level[grow + Math.floor(px / B)];
            else if (m.wet[p]) edge[row + px] = WET;
          }
        }
      }
      for (let by = 0; by < per; by++) level.fill(0, (gy0 + by) * gw + gx0, (gy0 + by) * gw + gx0 + per);
    }
  }
  return { rect, gw, gh, blocks: level, edge, shoreCells };
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

/** Actors that stand on the ground and cast a shadow (glyphs, bulbs, notes, the fire and its pit do not). */
const NO_SHADOW = /^(count_|goal_|campfire_|notice_note|fest_count|lantern_glow|petal_|leaf_)/;

export function castsShadow(name: string): boolean {
  return !NO_SHADOW.test(name);
}

/** A shadow under a sprite at (x, y): its ellipse's box in scene px, or null. `lean` shifts it with the sun. */
export function shadowBox(name: string, x: number, y: number, flip: boolean, lean: number): Rect | null {
  const rows = spriteRows(name) ?? allSprites()[name];
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

/** Halo and pool sizes (radius x, radius y) per kind. */
export const LIGHT_SIZE: Readonly<Record<LightKind, { halo: number; pool: [number, number] | null }>> = {
  lamp: { halo: 9, pool: [20, 12] },
  lantern: { halo: 10, pool: [16, 10] },
  festoon: { halo: 0, pool: [30, 13] },
  fire: { halo: 24, pool: [36, 22] },
  board: { halo: 14, pool: [24, 11] },
  bulb: { halo: 4, pool: null },
};

/** How strong the hour's lights are: full at night, the fire and lanterns a little at dusk. */
export function lightStrength(phase: LightPhase, kind: LightKind): number {
  if (phase === "night") return 1;
  if (phase === "dusk") return kind === "fire" ? 0.6 : kind === "lantern" ? 0.4 : 0;
  return 0;
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

/** The fire's flicker: its halo's radius change for each of the flame's frames. */
export const FIRE_FLICKER = [0, -2, 1] as const;

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
