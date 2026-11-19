/**
 * The merchant ship on the water (ship.ts moors it, plaza.ts draws it): what
 * the web lays on the sea round it, as data and pure helpers. Client-safe;
 * fx.ts draws it. Nothing here reaches the bot's PNG or GIF.
 *
 * - Its waterline: the hull sits in the sea, not on it. The sprite stops at
 *   SHIP_WATERLINE (the sea shows where the keel would be), and the foam is
 *   drawn over the ship's last plank and the water under it, so the hull
 *   meets the water along a broken line of foam. The ship's gentle rock dips
 *   it one more row into the same water. The interact outline stops at the
 *   waterline too (outline.ts).
 * - Its contact shadow: a soft ellipse of darker water under the hull,
 *   deeper than a figure's (a whole hull, not two feet), leaning with the
 *   sun like every other shadow (atmosphere.ts SHADOW_LEAN), baked into the
 *   land layer over the sea.
 * - Its foam: three frames played 0-1-2-1 on the sea's own beat (clock.ts
 *   seaFrame), so it moves only on frames that repaint the whole view
 *   anyway. Palette keys, so it takes the hour's grade.
 * - Its lantern's light, at dawn, at dusk and through the night, at the
 *   lantern's strength of the hour (lightStrength "lantern"): the plaza
 *   lamps' own small glow round the lantern itself; a soft warm pool on the
 *   open water round the stern in the plaza pools' own steps and dithered
 *   edge (atmosphere.ts poolStep), laid as warm streaks over a warm wash the
 *   way light lies on water, with a few golden glints that shift with the
 *   sea's beat; and the ship itself warmed round the lantern (the stall, its
 *   painted board, the hull and the main sail's foot nearest it) in the same
 *   soft steps, a recoloured copy of its own pixels the way the fire warms
 *   the faces round it. The pool and the glints only on open water: never on
 *   the beach or over anything that stands there.
 */
import { bayer, poolStep } from "./atmosphere";
import type { Rect } from "./geometry";
import type { LiveActor } from "./types";

/** The ship's sprites (motion-sprites.ts merchant_ship_0 and _1). */
const SHIP = /^merchant_ship_/;

/** True for a frame of the merchant ship. */
export function isShipSprite(name: string): boolean {
  return SHIP.test(name);
}

/** Where the ship is moored (its sprite's top-left, native px, frame 0), or null with no ship among the actors. */
export function shipOf(actors: readonly LiveActor[]): { x: number; y: number } | null {
  const ship = actors.find((a) => isShipSprite(a.frames[0] ?? ""));
  return ship ? { x: Math.round(ship.x), y: Math.round(ship.y) } : null;
}

/** The first sprite row under the water, in both frames: the sprite leaves it and every row below empty. */
export const SHIP_WATERLINE = 35;

/** How far each frame of the ship is dipped (the gentle rock), native px. */
export const SHIP_DIP: Readonly<Record<string, number>> = { merchant_ship_0: 0, merchant_ship_1: 1 };

/** The contact shadow, from the ship's top-left: under the hull, its heart just under the waterline. */
export const SHIP_SHADOW: Readonly<Rect> = { x: 6, y: 34, w: 54, h: 6 };
/** How much darker the hull's shadow is than a figure's at the same hour: a 1-2 px band of deeper water at a phone's 2 CSS px. */
export const SHIP_SHADOW_DEPTH = 1.6;

/** The foam's sprites sit at this offset from the ship's top-left: over the hull's last plank (row 34) and the water under it. */
export const SHIP_FOAM_AT = { x: 0, y: SHIP_WATERLINE - 1 } as const;

/** The foam's three frames (64 x 6), played 0-1-2-1. */
export const SHIP_FOAM_FRAMES = ["ship_foam_0", "ship_foam_1", "ship_foam_2"] as const;

/** Its size, native px. */
export const SHIP_FOAM_SIZE = { w: 64, h: 6 } as const;

/**
 * The water at the ship, drawn over its last plank and the sea under it: i
 * the bright foam (the beach's own shore foam), u foam, v ripples. Row 0
 * (the hull's last plank) has the water climbing the bow and the stern and
 * a few splashes; row 1 is the waterline, a broken lap the length of the
 * hull; the rows under it are the hull's shade on the water, ripples
 * spreading out of it. Each frame a little different, so the lap moves.
 */
export const SHIP_WATER_SPRITES: Readonly<Record<string, string[]>> = {
  ship_foam_0: [
    "....uui...u..........u..........u..........u..........u.....uu..",
    "...u.uiiu.uu.uiu..uu.uiiu.uu.uiu..uu.uiiu.uu.uiu..uu.uiiu.uuuu..",
    "..uv..........vv...............vv...............vv...........vu.",
    ".vv...........vv...........vv...........vv...........vv.........",
    "........vvv................vvv................vvv...............",
    "....................vv.....................vv...................",
  ],
  ship_foam_1: [
    "....uui......u..........u..........u..........u..........u..uu..",
    "...uuuu.uiiu.uu.uiu..uu.uiiu.uu.uiu..uu.uiiu.uu.uiu..uu.uiiuu...",
    "..uv...............vv...............vv...............vv......vu.",
    ".....vv...........vv...........vv...........vv...........vv.....",
    "...........vvv................vvv................vvv............",
    "..........................vv.....................vv.............",
  ],
  ship_foam_2: [
    "....uui.........u..........u..........u..........u..........uu..",
    "....uuu.uu.uiu..uu.uiiu.uu.uiu..uu.uiiu.uu.uiu..uu.uiiu.uu.uu...",
    "..uv....................vv...............vv..................vu.",
    ".........vv...........vv...........vv...........vv...........vv.",
    "..............vvv................vvv................vvv.........",
    "................................vv..............................",
  ],
};

const PING_PONG = [0, 1, 2, 1] as const;

/** The foam's frame at a sea step (clock.ts: a step every 3 ticks); 0 on a still island. */
export function shipFoamFrame(seaStep: number): (typeof SHIP_FOAM_FRAMES)[number] {
  return SHIP_FOAM_FRAMES[PING_PONG[((seaStep % 4) + 4) % 4]];
}

// ------------------------------------------------------------------ the lantern

/** The stall's hanging lantern (sprite column 44, rows 26..27 of frame 0): the middle of its glow, from the ship's top-left. */
export const SHIP_LANTERN = { x: 45, y: 27 } as const;
/** Its small glow's radius, native px: the plaza lamps' own (atmosphere.ts LIGHT_SIZE.lamp), the ship's only light. */
export const SHIP_HALO = 7;
/** The glow's brightness against a lamp's: the lantern hangs in the stall's shade, so it glows a little more to read. */
export const SHIP_HALO_GAIN = 1.5;

/** How far the lantern warms the ship itself round it (the stall, the board, the hull and the sail's foot), native px. */
export const SHIP_GLOW = { rx: 22, ry: 10 } as const;
/** The warm copy's alpha per step of that light (1 the rim .. 3 the heart), at the lantern's full strength: the fire's on faces. */
export const SHIP_GLOW_ALPHA = [0, 0.3, 0.44, 0.58] as const;

/**
 * Per pixel of a ship frame (rows as in motion-sprites.ts, dipped `dip`
 * px), the step of the lantern's light on it (0..3; poolStep's soft steps
 * round the lantern), 0 where the sprite is clear and on the lantern, the
 * portholes and the coin, which glow on their own. Worked out in frame 0's
 * place, so the dither sits still on the ship as it rocks.
 */
export function shipGlowSteps(rows: readonly string[], dip: number): Uint8Array {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === "." || ch === "y") continue;
      out[y * w + x] = poolStep(x, y - dip, SHIP_LANTERN.x, SHIP_LANTERN.y, SHIP_GLOW.rx, SHIP_GLOW.ry);
    }
  }
  return out;
}

/**
 * The lantern's pool on the water, from the ship's top-left: centred under
 * the stall's lantern, just under the waterline, wide and flat like light
 * lying on water; its top half under the hull.
 */
export const SHIP_POOL = { x: 45, y: SHIP_WATERLINE + 2, rx: 26, ry: 10 } as const;

type Ink = { rgb: readonly [number, number, number]; alpha: number };

/** Per step of the pool (1 the rim .. 3 the heart): how many of a streak row's 3 px cells carry a dash. */
const STREAK_DENSITY = [0, 0.3, 0.55, 0.85] as const;
/** The dashes: a rosy orange at the rim, amber, a pale gold at the heart. */
const STREAK: readonly (Ink | null)[] = [
  null,
  { rgb: [214, 132, 92], alpha: 0.5 },
  { rgb: [236, 170, 96], alpha: 0.7 },
  { rgb: [250, 206, 120], alpha: 0.9 },
];
/** The warm wash under the streaks, in the plaza pools' steps: the pool reads as a pool, not a stroke. */
const WASH: readonly (Ink | null)[] = [
  null,
  { rgb: [226, 150, 96], alpha: 0.16 },
  { rgb: [236, 170, 96], alpha: 0.26 },
  { rgb: [244, 186, 104], alpha: 0.36 },
];

/**
 * The lantern's light on the water at world pixel (x, y), at full strength,
 * from the pool's step there (atmosphere.ts poolStep: the plaza pools' own
 * soft steps and dithered edge; `cy` is the pool's middle row). Light lies
 * on water in streaks: every other row from the middle carries short warm
 * dashes, more and brighter toward the heart, over a warm wash on the rest,
 * itself dithered at the rim. Null where the water stays as it is. The same
 * pixel always gets the same ink, so the pool sits still while the sea
 * moves under it.
 */
export function shipPoolInk(x: number, y: number, cy: number, step: number): Ink | null {
  if (step <= 0 || step > 3) return null;
  if (((y - cy) & 1) === 0 && mix(Math.floor((x + ((y >> 1) & 3) * 5) / 3), y, 13) < STREAK_DENSITY[step]) return STREAK[step];
  // The rim's wash on every other pixel only, so the pool's edge stays soft.
  if (step === 1 && bayer(x, y) >= 0.5) return null;
  return WASH[step];
}

/** RGBA, little-endian (as ImageData lays it out), at alpha 0..1. */
const word = (rgb: readonly [number, number, number], alpha: number) =>
  ((Math.round(Math.max(0, Math.min(1, alpha)) * 255) << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]) >>> 0;

/** What the pool needs of the island: its tiles' sea kinds (draw.ts SceneModel.sea: 0 and 1 open water) and its grid. */
export interface PoolWater {
  sea: Int8Array;
  cols: number;
  rows: number;
  tile: number;
}

/**
 * The lantern's pool as RGBA words over its box (shipPoolBox), at a
 * strength (lightStrength "lantern" of the hour): on open water only (sea
 * kinds 0 and 1; past the island's edge the open sea goes on), never on the
 * beach or the shore's foam. Null at strength 0 (by day) or where no pixel
 * of it lies on open water.
 */
export function shipPoolWords(water: PoolWater, ship: { x: number; y: number }, strength: number): { box: Rect; words: Uint32Array<ArrayBuffer> } | null {
  if (strength <= 0) return null;
  const box = shipPoolBox(ship);
  const cx = ship.x + SHIP_POOL.x;
  const cy = ship.y + SHIP_POOL.y;
  const words = new Uint32Array(box.w * box.h);
  let any = false;
  for (let j = 0; j < box.h; j++) {
    const y = box.y + j;
    const row = Math.floor(y / water.tile);
    for (let i = 0; i < box.w; i++) {
      const x = box.x + i;
      const col = Math.floor(x / water.tile);
      const inside = col >= 0 && col < water.cols && row >= 0 && row < water.rows;
      if (inside) {
        const kind = water.sea[row * water.cols + col];
        if (kind < 0 || kind > 1) continue;
      }
      const ink = shipPoolInk(x, y, cy, poolStep(x, y, cx, cy, SHIP_POOL.rx, SHIP_POOL.ry));
      if (!ink) continue;
      words[j * box.w + i] = word(ink.rgb, ink.alpha * strength);
      any = true;
    }
  }
  return any ? { box, words } : null;
}

/** The glints on the pool: a pale gold. */
export const SHIP_GLINT_RGB = [255, 222, 150] as const;

/** Glints on the pool at once. */
const GLINTS = 5;

/** A fixed 0..1 for three integers (the same mix as atmosphere.ts hash3, kept local to stay import-light). */
function mix(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * The lantern's glints on the water at a sea step: short golden dashes in
 * the pool's heart, just under the waterline (native px, absolute). The same
 * step always gives the same glints; a still island keeps step 0's.
 */
export function shipGlints(seaStep: number, ship: { x: number; y: number }): { x: number; y: number; w: number }[] {
  const out: { x: number; y: number; w: number }[] = [];
  const cx = ship.x + SHIP_POOL.x;
  // Each glint lives two sea steps, all of them out of step with one another.
  for (let k = 0; k < GLINTS; k++) {
    const life = Math.floor((seaStep + k) / 2);
    const across = mix(k, life, 3) * 2 - 1;
    const w = mix(k, life, 7) < 0.5 ? 2 : 3;
    const x = Math.round(cx + across * (SHIP_POOL.rx - 8)) - (w >> 1);
    // Rows 37..39 of the ship's box: under the foam's lap, on the water ship.ts keeps open round the hull.
    const y = ship.y + SHIP_WATERLINE + 2 + Math.floor(mix(life, k, 11) * 3);
    out.push({ x, y, w });
  }
  return out;
}

/** The box every glint and the pool stay inside (for repaints), absolute native px. */
export function shipPoolBox(ship: { x: number; y: number }): Rect {
  return { x: ship.x + SHIP_POOL.x - SHIP_POOL.rx, y: ship.y + SHIP_POOL.y - SHIP_POOL.ry, w: 2 * SHIP_POOL.rx, h: 2 * SHIP_POOL.ry };
}
