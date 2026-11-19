/**
 * The island's people, alive on the web: a slow breath (head and shoulders
 * settle by one native pixel, then rise) and now and then a blink, for
 * everyone who stands or sits still: the plaza's crowd between walks, the
 * campfire's sitters, the partner beside a tree, the story's builder and
 * tester. The crowd's walk cycle is crowdSprites.ts's; its pace, crowd.ts's.
 *
 * Every idle frame is made from the island's own sprite by moving or
 * recolouring a pixel or a row (never drawn anew), so outfits, sizes and
 * palette stay as they are, and a frame keeps its sprite's box: a tap's hit
 * box (actorBoxes, a partner's fixed box) is in step with what is drawn.
 *
 * Web only: the bot's GIF draws the actors and trees as plaza.ts and the
 * scene give them; only the web's engine passes them through livelyActors
 * and asks partnerSprite. Still, or under reduced motion, everyone shows
 * their first frame, the plain one. Pure and client-safe.
 */
import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { SPRITES } from "@/bot/assets/island/sprites";

import type { SceneTree } from "@/bot/src/quests/island/scene";

import { TICK_MS } from "./clock";
import type { Rect } from "./geometry";
import type { LiveActor } from "./types";

/** A person's eye: the one pixel a blink turns to skin, [x, y] in its sprite. */
type Eye = readonly [number, number];

/** The skin key: a closed eye. */
const SKIN = "k";

/** Closes the eye: that pixel becomes skin. */
export function blinkRows(rows: readonly string[], [x, y]: Eye): string[] {
  return rows.map((row, j) => (j === y ? row.slice(0, x) + SKIN + row.slice(x + 1) : row));
}

/**
 * Head and shoulders one native px lower: row `cut` (inside the body) gives
 * way and everything above it moves down, so the feet stay where they stand
 * and the sprite keeps its size (its top row is left empty).
 */
export function settleRows(rows: readonly string[], cut: number): string[] {
  return [".".repeat(rows[0]?.length ?? 0), ...rows.slice(0, cut), ...rows.slice(cut + 1)];
}

/** The idle variants a sprite has: `${name}_blink` and, with a cut, `${name}_rest` (the settled breath). */
interface IdleSprite {
  eye: Eye;
  /** The body row that gives way for the breath; none: the sprite only blinks (the builder's hammer stays put). */
  cut?: number;
}

/**
 * The people sprites that idle. The standing figures settle at their shirt's
 * hem (row 9), the sitters at the neck (row 4: a small nod over the fire).
 */
const IDLE: Readonly<Record<string, IdleSprite>> = {
  visitor: { eye: [4, 4], cut: 9 },
  builder_0: { eye: [4, 4] },
  builder_1: { eye: [4, 4] },
  tester_0: { eye: [4, 4], cut: 9 },
  tester_1: { eye: [4, 4], cut: 9 },
  ...Object.fromEntries(
    ["a", "b", "c", "d"].flatMap((v) => [0, 1].map((f) => [`sit_${v}_${f}`, { eye: [4, 2], cut: 4 } as IdleSprite])),
  ),
};

export type IdleVariant = "" | "rest" | "blink";

/** The atlas name of a sprite's idle variant ("" is the sprite itself). */
export const idleName = (name: string, variant: IdleVariant): string => (variant ? `${name}_${variant}` : name);

let cached: Record<string, string[]> | null = null;

/** Every idle variant by atlas name (computed once): in the web's atlas beside the sprites they come from. */
export function peopleSprites(): Record<string, string[]> {
  if (cached) return cached;
  const out: Record<string, string[]> = {};
  const rowsOf = (name: string) => (MOTION_SPRITES as Record<string, string[]>)[name] ?? SPRITES[name];
  for (const [name, idle] of Object.entries(IDLE)) {
    const rows = rowsOf(name);
    if (!rows) continue;
    out[idleName(name, "blink")] = blinkRows(rows, idle.eye);
    if (idle.cut != null) out[idleName(name, "rest")] = settleRows(rows, idle.cut);
  }
  cached = out;
  return out;
}

// ------------------------------------------------------------------ timing

/** About one breath, in ticks (3.5 s): up, then settled for its last BREATH_REST ticks. */
export const BREATH_TICKS = 28;
const BREATH_REST = 9;
/** How often a breath has a blink in it (one tick, while the head is up): about every five seconds. */
const BLINK_SHARE = 0.7;
/** The partners' clock: a whole number of breaths, so it runs on without a seam. */
const PARTNER_LOOP = 4 * BREATH_TICKS;

/** A fixed 0..1 for two integers. */
function noise(a: number, b = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * A still person's breathing and blinking over a loop of `n` ticks, one
 * entry per tick: whole breaths of about BREATH_TICKS that fill the loop
 * exactly (so it closes without a hitch), each settled ("rest") for its last
 * ticks and most with a blink early on. `seed` (any integer) shifts it and
 * picks the blinks, so people breathe out of step. Tick 0 is always plain:
 * the still frame.
 */
export function idlePattern(n: number, seed: number): IdleVariant[] {
  const out: IdleVariant[] = new Array<IdleVariant>(Math.max(0, n)).fill("");
  if (n < BREATH_TICKS / 2) return out;
  const breaths = Math.max(1, Math.round(n / BREATH_TICKS));
  for (let m = 0; m < breaths; m++) {
    const from = Math.floor((m * n) / breaths);
    const to = Math.floor(((m + 1) * n) / breaths);
    const rest = Math.min(BREATH_REST, Math.floor((to - from) / 3));
    for (let t = to - rest; t < to; t++) out[t] = "rest";
    const blink = from + 3 + Math.floor(noise(seed, m + 101) * 8);
    if (noise(seed, m) < BLINK_SHARE && blink < to - rest) out[blink] = "blink";
  }
  // Out of step: start somewhere else in the loop, on a plain tick.
  let shift = Math.floor(noise(seed, 977) * n);
  for (let tries = 0; tries < n && out[shift] !== ""; tries++) shift = (shift + 1) % n;
  return [...out.slice(shift), ...out.slice(0, shift)];
}

const partnerPatterns = new Map<number, IdleVariant[]>();

/** The partner beside a tree (its slot puts it out of step), at a tick: the visitor sprite or its idle variant. */
export function partnerSprite(tick: number, slot: number): string {
  let pattern = partnerPatterns.get(slot);
  if (!pattern) {
    pattern = idlePattern(PARTNER_LOOP, slot * 31 + 7);
    partnerPatterns.set(slot, pattern);
  }
  return idleName("visitor", pattern[((tick % PARTNER_LOOP) + PARTNER_LOOP) % PARTNER_LOOP]);
}

/** A tree partner's box: the visitor sprite's (10 x 14), where the scene stands it. */
const PARTNER = { w: 10, h: 14 } as const;

/** The partners whose frame differs between two ticks: their boxes, to repaint (the web's dirty list). */
export function partnerRects(prev: number, next: number, trees: readonly Pick<SceneTree, "slot" | "visitor">[]): Rect[] {
  const out: Rect[] = [];
  for (const tree of trees) {
    const v = tree.visitor;
    if (v && partnerSprite(prev, tree.slot) !== partnerSprite(next, tree.slot)) out.push({ x: v.x, y: v.y, w: PARTNER.w, h: PARTNER.h });
  }
  return out;
}

// ------------------------------------------------------------------ actors

/** Ticks per frame of an actor that idles: its own pace, in whole ticks (at least one). */
const ticksOf = (actor: LiveActor) => Math.max(1, Math.round((actor.frameMs ?? 500) / TICK_MS));

/** The most frames an idle loop may have (LiveActor: under 256). */
const MAX_FRAMES = 240;

/** True when every frame of the actor has idle variants: a sitter, the builder, the tester, a partner. */
function idles(actor: LiveActor): boolean {
  return actor.frames.length > 0 && actor.frames.every((f) => Object.prototype.hasOwnProperty.call(IDLE, f));
}

/**
 * One actor's idle loop, a frame per tick: its own frames at its own pace
 * (to the nearest tick), breathing and blinking on its own clock, as many
 * rounds as fit MAX_FRAMES so the loop closes on a whole number of them.
 * Its first frame stays its own first frame, plain: the one still frame.
 */
function idleLoop(actor: LiveActor, seed: number): LiveActor {
  const per = ticksOf(actor);
  const round = per * actor.frames.length;
  const length = Math.max(1, Math.floor(MAX_FRAMES / round)) * round;
  const frames = idlePattern(length, seed).map((variant, n) => {
    const name = actor.frames[Math.floor(n / per) % actor.frames.length];
    return variant === "rest" && IDLE[name].cut == null ? name : idleName(name, variant);
  });
  return { ...actor, frames, frameMs: TICK_MS };
}

/**
 * The actors as the web draws them: everyone who idles (all frames are
 * people sprites, no steps, not an arrival) gets their idle loop; anything
 * else (props, the fire, the crowd, whose scripts idle already) is returned
 * as it is. Same length and order, so an index still names the same actor.
 */
export function livelyActors(actors: readonly LiveActor[]): LiveActor[] {
  return actors.map((actor, i) => (actor.steps || actor.once || !idles(actor) ? actor : idleLoop(actor, i * 3 + Math.round(actor.x) + Math.round(actor.y))));
}
