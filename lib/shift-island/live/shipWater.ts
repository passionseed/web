/**
 * The merchant ship on the water (ship.ts moors it, plaza.ts draws it): what
 * the web lays on the sea round it, as data. Pure and client-safe; fx.ts
 * draws it. Nothing here reaches the bot's PNG or GIF.
 *
 * - Its contact shadow: a soft ellipse of darker water under the hull,
 *   leaning with the sun like every other shadow (atmosphere.ts SHADOW_LEAN),
 *   baked into the land layer over the sea.
 * - Its foam: the water lapping at the waterline, brightest at the bow, and
 *   a few ripples, in three frames played 0-1-2-1 on the sea's own beat
 *   (clock.ts seaFrame), so it moves only on frames that repaint the whole
 *   view anyway. Palette keys, so it takes the hour's grade.
 * - Its lantern's light, at dawn, at dusk and through the night, at the
 *   lantern's strength of the hour (lightStrength "lantern"): a soft warm
 *   pool on the water by the stern, in the plaza pools' own steps and
 *   dithered edge (atmosphere.ts poolStep) laid as streaks the way light
 *   lies on water, a few golden glints on it that shift with the sea's beat,
 *   and the stall and the painted board warmed the way the fire warms the
 *   faces round it (a recoloured copy of the ship's own pixels over them).
 *   The pool and the glints only on open water: never on the beach or over
 *   anything that stands there.
 */
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

/** The contact shadow, from the ship's top-left: under the hull, its middle just past the keel. */
export const SHIP_SHADOW: Readonly<Rect> = { x: 7, y: 33, w: 52, h: 7 };

/** The foam's sprites sit at this offset from the ship's top-left (ship rows 33..39). */
export const SHIP_FOAM_AT = { x: 0, y: 33 } as const;

/** The foam's three frames (64 x 7), played 0-1-2-1. */
export const SHIP_FOAM_FRAMES = ["ship_foam_0", "ship_foam_1", "ship_foam_2"] as const;

/** Its size, native px. */
export const SHIP_FOAM_SIZE = { w: 64, h: 7 } as const;

/**
 * The water lapping at the ship: i the brightest foam (the bow's), u foam, v
 * ripples, each frame a little different so the lap moves.
 */
export const SHIP_WATER_SPRITES: Readonly<Record<string, string[]>> = {
  ship_foam_0: [
    "....u........................................................u..",
    ".....ui.....................................................iu..",
    "......uii.................................................iiu...",
    "........uiii...........................................uiuu.....",
    "...........uiiu.uiiu..uiu.uiiuu..uiu.uiiu..uiuu.uiu.uiiu........",
    "..........vv.....uvv......vvu.....vv......vuv.....vv............",
    ".....v.......vv........v.........vv........v.........vv....v....",
  ],
  ship_foam_1: [
    "................................................................",
    "...u.ui.....................................................iuu.",
    "......uii.................................................iiu...",
    "........uiii...........................................uiuu.....",
    "...........iuu.uiiu.uiuu..uiiu.uiu..uiiuu.uiu..uiiu.uiuu........",
    "........vv......vvu.....vv......uvv......vv......vvu............",
    "........vv........v.........vv........v.........vv..............",
  ],
  ship_foam_2: [
    "....u........................................................u..",
    ".....ui.....................................................iu..",
    "......uii.................................................iiu...",
    "........uiii...........................................uiuu.....",
    "...........uu.uiiuu.uiu.uiiu..uuiu.uiiu.uiu..uiiuu.uiu.u........",
    "...........vvu......vv......vvu.....vv.......uvv......vv........",
    "............v.........vv........v.........vv.........v..........",
  ],
};

const PING_PONG = [0, 1, 2, 1] as const;

/** The foam's frame at a sea step (clock.ts: a step every 3 ticks); 0 on a still island. */
export function shipFoamFrame(seaStep: number): (typeof SHIP_FOAM_FRAMES)[number] {
  return SHIP_FOAM_FRAMES[PING_PONG[((seaStep % 4) + 4) % 4]];
}

/**
 * The lantern's pool on the water, from the ship's top-left: centred under
 * the stall's lantern (sprite column 44), just past the keel, wide and flat
 * like light lying on water.
 */
export const SHIP_POOL = { x: 44, y: 39, rx: 20, ry: 6 } as const;

type Ink = { rgb: readonly [number, number, number]; alpha: number };

/** Per step of the pool (1 the rim .. 3 the heart): how many of a streak row's 3 px cells carry a dash. */
const STREAK_DENSITY = [0, 0.3, 0.55, 0.85] as const;
/** The dashes: a rosy orange at the rim, amber, a pale gold at the heart. */
const STREAK: readonly (Ink | null)[] = [
  null,
  { rgb: [214, 132, 92], alpha: 0.45 },
  { rgb: [236, 170, 96], alpha: 0.65 },
  { rgb: [250, 206, 120], alpha: 0.85 },
];
/** The faint warm wash on every other pixel of the pool. */
const WASH: readonly (Ink | null)[] = [
  null,
  { rgb: [236, 170, 96], alpha: 0.08 },
  { rgb: [236, 170, 96], alpha: 0.14 },
  { rgb: [236, 170, 96], alpha: 0.2 },
];

/**
 * The lantern's light on the water at world pixel (x, y), at full strength,
 * from the pool's step there (atmosphere.ts poolStep: the plaza pools' own
 * soft steps and dithered edge; `cy` is the pool's middle row). Light lies
 * on water in streaks: every other row from the middle carries short warm
 * dashes, more and brighter toward the heart, and every other pixel a faint
 * warm wash. Null where the water stays as it is. The same pixel always
 * gets the same ink, so the pool sits still while the sea moves under it.
 */
export function shipPoolInk(x: number, y: number, cy: number, step: number): Ink | null {
  if (step <= 0 || step > 3) return null;
  if (((y - cy) & 1) === 0 && mix(Math.floor((x + ((y >> 1) & 3) * 5) / 3), y, 13) < STREAK_DENSITY[step]) return STREAK[step];
  return WASH[step];
}

/**
 * What the lantern lights on the ship itself, from the sprite's top-left
 * (frame 0): the stall under the awning, and the painted board on the stern.
 * Each ends on the sprite's own outline or frame, so the warm copy drawn
 * over them (fx.ts) leaves no seam. Frame 1 sits SHIP_DIP px lower.
 */
export const SHIP_LAMPLIT: readonly Rect[] = [
  { x: 41, y: 19, w: 21, h: 10 },
  { x: 46, y: 29, w: 12, h: 7 },
];
/** How far each frame of the ship is dipped (the gentle rock), native px. */
export const SHIP_DIP: Readonly<Record<string, number>> = { merchant_ship_0: 0, merchant_ship_1: 1 };
/** The lamplit copy's alpha at the lantern's full strength. */
export const SHIP_LAMPLIT_ALPHA = 0.6;

/** The glints on the pool: a pale gold. */
export const SHIP_GLINT_RGB = [255, 222, 150] as const;

/** Glints on the pool at once. */
const GLINTS = 4;

/** A fixed 0..1 for three integers (the same mix as atmosphere.ts hash3, kept local to stay import-light). */
function mix(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * The lantern's glints on the water at a sea step: short golden dashes in
 * the pool's heart, just below the keel (native px, absolute). The same step
 * always gives the same glints; a still island keeps step 0's.
 */
export function shipGlints(seaStep: number, ship: { x: number; y: number }): { x: number; y: number; w: number }[] {
  const out: { x: number; y: number; w: number }[] = [];
  const cx = ship.x + SHIP_POOL.x;
  // Each glint lives two sea steps, the four out of step with one another.
  for (let k = 0; k < GLINTS; k++) {
    const life = Math.floor((seaStep + k) / 2);
    const across = mix(k, life, 3) * 2 - 1;
    const w = mix(k, life, 7) < 0.5 ? 2 : 3;
    const x = Math.round(cx + across * (SHIP_POOL.rx - 6)) - (w >> 1);
    // Rows 37..39 of the ship's box: below the keel, on the water ship.ts keeps open round the hull.
    const y = ship.y + 37 + Math.floor(mix(life, k, 11) * 3);
    out.push({ x, y, w });
  }
  return out;
}

/** The box every glint and the pool stay inside (for repaints), absolute native px. */
export function shipPoolBox(ship: { x: number; y: number }): Rect {
  return { x: ship.x + SHIP_POOL.x - SHIP_POOL.rx, y: ship.y + SHIP_POOL.y - SHIP_POOL.ry, w: 2 * SHIP_POOL.rx, h: 2 * SHIP_POOL.ry };
}
