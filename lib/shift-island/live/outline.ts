/**
 * The interact outline, drawn (founder ask, 2026-11-19): a 1 px ring in a
 * warm light colour traced round the silhouette of the one clickable thing
 * that is picked (interact.ts), just outside its pixels, and nothing else.
 * No text, no box, no halo.
 *
 * - The ring comes from the sprites' alpha in the atlas: the pixels outside
 *   the thing's shape (reached from its edge, so holes inside it stay
 *   empty) that touch it side on. Each shape's ring is made once and kept
 *   (a person's walk frames, the fire's flame frames and a tree's sway are a
 *   few shapes each); a frame only draws it, two small drawImages (the gold,
 *   then the cream at the pulse's alpha) per repainted rect it meets.
 * - It is drawn in the thing's own layer, just under it: a tree's before the
 *   tree, a plaza piece's before its first actor, a tree partner's after its
 *   tree. Whatever stands in front (a signpost, a person walking past) still
 *   covers it, and it never paints over the thing itself.
 * - It is lamplight gold, and without reduced motion it pulses gently by
 *   brightening towards a pale cream and back (PULSE), never fading below
 *   its gold, so it stays as clear on the pale plaza stones as on the grass.
 *   It steps on the sea's beat (every 3 ticks, clock.ts seaFrame), when the
 *   whole view repaints anyway, so the pulse costs no repaint of its own. A
 *   still island (reduced motion) holds it steady, halfway.
 *
 * Generic over the image type, so the tests draw it with the software
 * canvas (pixelCanvas.ts) and the browser with a canvas. Web only: the bot
 * draws no outline.
 */
import type { AtlasData, AtlasRect } from "./atlas";
import { treeSpriteKey } from "./atlas";
import type { Motion } from "./clock";
import { actorAt, actorRect, type DrawContext, type DrawFx, type SceneModel } from "./draw";
import { TIGHT } from "./figures";
import { overlaps, union, type Rect } from "./geometry";
import { NONE_NEAR, gapSquared, holds, nearestOf, settle, type Aim, type InteractTarget, type Nearest, type OutlineShape } from "./interact";
import { idleName } from "./people";
import { SHIP_WATERLINE, isShipSprite } from "./shipWater";
import type { LiveActor } from "./types";

/**
 * The ring's colours, the same in every hour: lamplight gold, and the pale
 * cream it brightens to. Its yellow stands apart from the green grass and
 * the grey-blue plaza stones by day, and reads as light by night.
 */
export const OUTLINE_RGB = [255, 216, 112] as const;
export const OUTLINE_LIT_RGB = [255, 246, 214] as const;
/**
 * The gentle pulse: how much of the cream lies over the gold, a step every
 * PULSE_TICKS ticks (125 ms each), a 3 s breath. PULSE_TICKS is the sea's
 * beat, so each step lands on a tick that repaints the whole view.
 */
export const PULSE = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25] as const;
export const PULSE_TICKS = 3;
/** A still island's ring: halfway, steady. */
export const STILL_GLOW = 0.5;
/** Rings kept: a few shapes each for the things picked lately. */
const KEEP = 48;
/** The most shapes made for one thing when it is picked (a walker has a few walk frames each way). */
const MOST_SHAPES = 24;

/** One sprite of a silhouette, where it stands (native px). */
export interface Part {
  name: string;
  x: number;
  y: number;
  flip: boolean;
}

/** Which draw hook the ring goes in, and for which tree or actor index (draw.ts DrawFx). */
export type RingSlot = { hook: "beforeTree" | "afterTree" | "beforeActor"; index: number };

/** The atlas as the ring needs it: its bytes (for the alpha) and where each sprite is. */
export type AlphaAtlas = Pick<AtlasData, "width" | "height" | "data" | "rects" | "flipped">;

/** What a frame shows, for working out a silhouette and a target's box. */
export interface OutlineFrame {
  model: SceneModel;
  /** The actors as drawn (the engine's cast), index for index with the targets' actor indexes. */
  actors: readonly LiveActor[];
  motion: Motion & { tick: number };
  atlas: AlphaAtlas;
  /** The partner beside tree `index` this frame (people.ts partnerSprite); absent: the plain visitor. */
  partner?: (index: number) => string;
  /** Still (reduced motion, or a still or tiny island): the ring holds steady. */
  still: boolean;
}

/** The ring as drawn on one frame. */
export interface Ring<Img> {
  /** The target it shows (interact.ts key). */
  key: string;
  /** Its shape's parts, relative to one another: an equal sig is an equal ring. */
  sig: string;
  slot: RingSlot;
  /** Two rings stacked: the gold over the cream (each box.h tall). */
  img: Img;
  /** Where the ring goes, native px, at its own size. */
  box: Rect;
  /** How much of the cream lies over the gold (PULSE). */
  glow: number;
}

/**
 * The sprites that make a shape on a frame, and where its ring goes in the
 * draw order. A tree is its sprite (or its sway frame, in its style), roots,
 * key flag and lantern (its partner is a target of its own); a partner, the
 * visitor's frame of the moment; actors, each one's frame where it stands.
 */
export function silhouette(shape: OutlineShape, frame: Pick<OutlineFrame, "model" | "actors" | "motion" | "partner">): { parts: Part[]; slot: RingSlot } | null {
  const { model, motion } = frame;
  if (shape.kind === "tree" || shape.kind === "partner") {
    const m = model.trees[shape.tree];
    if (!m) return null;
    const t = m.tree;
    if (shape.kind === "partner") {
      if (!t.visitor) return null;
      const name = frame.partner?.(shape.tree) ?? "visitor";
      return { parts: [{ name, x: t.visitor.x, y: t.visitor.y, flip: false }], slot: { hook: "afterTree", index: shape.tree } };
    }
    const parts: Part[] = [{ name: treeSpriteKey(motion.sway[shape.tree] && m.b ? m.b : t.sprite, t.style), x: t.left, y: t.top, flip: false }];
    if (t.roots) parts.push({ name: t.roots.sprite, x: t.roots.x, y: t.roots.y, flip: false });
    if (t.key) parts.push({ name: "key_flag", x: t.key.x, y: t.key.y, flip: false });
    if (t.lantern) parts.push({ name: "lantern", x: t.lantern.x, y: t.lantern.y, flip: false });
    return { parts, slot: { hook: "beforeTree", index: shape.tree } };
  }
  const parts: Part[] = [];
  let first = Infinity;
  for (const index of shape.actors) {
    const actor = frame.actors[index];
    if (!actor) continue;
    const f = motion.actors[index] ?? 0;
    const at = actorAt(actor, f);
    parts.push({ name: actor.frames[f] ?? actor.frames[0], x: at.x, y: at.y, flip: at.flip });
    first = Math.min(first, index);
  }
  return parts.length ? { parts, slot: { hook: "beforeActor", index: first } } : null;
}

/** A shape's parts relative to their top-left corner: the key a ring is kept by. */
export function shapeSig(parts: readonly Part[]): string {
  const { x0, y0 } = corner(parts);
  return parts.map((p) => `${p.name}|${p.flip ? 1 : 0}|${p.x - x0}|${p.y - y0}`).join(";");
}

/**
 * Every shape a thing can take as it moves, at most MOST_SHAPES: a tree
 * still and swaying, a partner plain, settled and blinking, and for actors
 * each one's frames (a walker's steps, the fire's flames) in every
 * combination. Made all at once when the thing is picked, so no frame after
 * that makes a ring.
 */
export function shapeVariants(shape: OutlineShape, frame: Pick<OutlineFrame, "model" | "actors" | "motion" | "atlas">): Part[][] {
  const { model, motion } = frame;
  const at = (overrides: Partial<Motion>) => silhouette(shape, { model, actors: frame.actors, motion: { ...motion, ...overrides } })?.parts;
  const out: Part[][] = [];
  const add = (parts: Part[] | undefined) => {
    if (parts && out.length < MOST_SHAPES) out.push(parts);
  };
  if (shape.kind === "tree") {
    const m = model.trees[shape.tree];
    if (!m) return out;
    for (const sway of m.b ? [0, 1] : [0]) {
      const swayed = motion.sway.slice();
      swayed[shape.tree] = sway;
      add(at({ sway: swayed }));
    }
    return out;
  }
  if (shape.kind === "partner") {
    for (const variant of ["", "rest", "blink"] as const) {
      const name = idleName("visitor", variant);
      if (frame.atlas.rects.has(name)) add(silhouette(shape, { model, actors: frame.actors, motion, partner: () => name })?.parts);
    }
    return out;
  }
  // Each actor's distinct frames (by sprite, mirror and, among several actors, place), then every combination of them.
  const choices = shape.actors.map((index) => {
    const actor = frame.actors[index];
    if (!actor) return [0];
    const seen = new Map<string, number>();
    actor.frames.forEach((name, f) => {
      const p = actorAt(actor, f);
      const key = shape.actors.length === 1 ? `${name}|${p.flip}` : `${name}|${p.flip}|${p.x}|${p.y}`;
      if (!seen.has(key)) seen.set(key, f);
    });
    return [...seen.values()];
  });
  const pick = new Array<number>(choices.length).fill(0);
  for (;;) {
    const frames = motion.actors.slice();
    shape.actors.forEach((index, k) => (frames[index] = choices[k][pick[k]]));
    add(at({ actors: frames }));
    if (out.length >= MOST_SHAPES) break;
    let k = 0;
    while (k < pick.length && ++pick[k] >= choices[k].length) pick[k++] = 0;
    if (k >= pick.length) break;
  }
  return out;
}

/** A ring's pixels: `bits` is 1 on the ring, row by row over the box (native px), which is the shape's box grown by one. */
export interface RingMask {
  x: number;
  y: number;
  w: number;
  h: number;
  bits: Uint8Array;
}

/**
 * The ring round a shape, from its sprites' alpha in the atlas: every pixel
 * outside the shape (reachable from its box's edge without crossing it, so
 * a hole inside stays empty) that has a pixel of the shape left, right,
 * above or below it. Null when no part is in the atlas.
 */
export function ringMask(parts: readonly Part[], atlas: AlphaAtlas): RingMask | null {
  const placed: { p: Part; a: AtlasRect }[] = [];
  for (const p of parts) {
    const a = (p.flip ? atlas.flipped : atlas.rects).get(p.name);
    if (a) placed.push({ p, a });
  }
  if (!placed.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const { p, a } of placed) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + a.w);
    y1 = Math.max(y1, p.y + a.h);
  }
  x0 -= 1;
  y0 -= 1;
  const w = x1 + 1 - x0;
  const h = y1 + 1 - y0;
  const solid = new Uint8Array(w * h);
  const bytes = atlas.data;
  for (const { p, a } of placed) {
    for (let j = 0; j < a.h; j++) {
      const from = ((a.y + j) * atlas.width + a.x) * 4 + 3;
      const to = (p.y - y0 + j) * w + (p.x - x0);
      for (let i = 0; i < a.w; i++) if (bytes[from + i * 4] > 0) solid[to + i] = 1;
    }
  }
  // Outside: flood from the box's edge (always empty: the box is one wider than the shape) through empty pixels.
  const outside = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const visit = (k: number) => {
    if (solid[k] || outside[k]) return;
    outside[k] = 1;
    stack[top++] = k;
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  while (top > 0) {
    const k = stack[--top];
    const x = k % w;
    if (x > 0) visit(k - 1);
    if (x < w - 1) visit(k + 1);
    if (k >= w) visit(k - w);
    if (k < (h - 1) * w) visit(k + w);
  }
  const bits = new Uint8Array(w * h);
  for (let k = 0; k < bits.length; k++) {
    if (!outside[k]) continue;
    const x = k % w;
    if ((x > 0 && solid[k - 1]) || (x < w - 1 && solid[k + 1]) || (k >= w && solid[k - w]) || (k < (h - 1) * w && solid[k + w])) bits[k] = 1;
  }
  // The merchant ship sits in the sea: its ring stops at the waterline, as the hull does (shipWater.ts).
  for (const { p, a } of placed) {
    if (!isShipSprite(p.name)) continue;
    for (let y = Math.max(0, p.y + SHIP_WATERLINE - y0); y < h; y++) bits.fill(0, y * w + Math.max(0, p.x - 1 - x0), y * w + Math.min(w, p.x + a.w + 1 - x0));
  }
  return { x: x0, y: y0, w, h, bits };
}

const opaque = ([r, g, b]: readonly number[]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

/**
 * RGBA words (little-endian, as the atlas stores them) for a ring, mask.w by
 * 2 * mask.h: the ring in OUTLINE_RGB over the same ring in OUTLINE_LIT_RGB,
 * clear elsewhere.
 */
export function ringWords(mask: RingMask): Uint32Array<ArrayBuffer> {
  const gold = opaque(OUTLINE_RGB);
  const cream = opaque(OUTLINE_LIT_RGB);
  const n = mask.w * mask.h;
  const words = new Uint32Array(2 * n);
  for (let k = 0; k < n; k++) {
    if (!mask.bits[k]) continue;
    words[k] = gold;
    words[n + k] = cream;
  }
  return words;
}

/** How much the ring is brightened on a tick: the pulse's step, or STILL_GLOW while still. */
export function pulseAt(tick: number, still: boolean): number {
  if (still) return STILL_GLOW;
  const n = PULSE.length;
  return PULSE[(((Math.floor(tick / PULSE_TICKS) % n) + n) % n)];
}

/** Two rings draw the same pixels. */
export function sameRing<Img>(a: Ring<Img> | null, b: Ring<Img> | null): boolean {
  if (!a || !b) return a === b;
  return a.key === b.key && a.sig === b.sig && a.glow === b.glow && a.box.x === b.box.x && a.box.y === b.box.y && a.slot.hook === b.slot.hook && a.slot.index === b.slot.index;
}

/** What to repaint when the ring changes: where it was and where it is now (nothing when it is the same). */
export function ringDirty<Img>(prev: Ring<Img> | null, next: Ring<Img> | null): Rect[] {
  if (sameRing(prev, next)) return [];
  const out: Rect[] = [];
  if (prev) out.push(prev.box);
  if (next) out.push(next.box);
  return out;
}

/**
 * What a tick repaints for the ring beyond what moved on it: nothing while
 * the same thing keeps it at the same pulse step, since its ring changes
 * only a pixel round the parts that took a step or a new frame (a walker,
 * the fire's flame, a swaying tree, a breathing partner), and the tick
 * repaints each of those with SHADOW_PAD (4 px) round it. A new thing, or a
 * pulse step off the sea's beat: where the ring was and where it is.
 */
export function ringTickDirty<Img>(prev: Ring<Img> | null, next: Ring<Img> | null): Rect[] {
  if (prev && next && prev.key === next.key && prev.glow === next.glow && prev.slot.hook === next.slot.hook && prev.slot.index === next.slot.index) return [];
  return ringDirty(prev, next);
}

/** A target's box on a frame: its own, or its actors' boxes where they stand now, grown by its slop. */
export function targetBox(target: InteractTarget, frame: Pick<OutlineFrame, "actors" | "motion" | "atlas">): Rect | null {
  if (target.box) return target.box;
  if (target.shape.kind !== "actors") return null;
  let box: Rect | null = null;
  for (const index of target.shape.actors) {
    const actor = frame.actors[index];
    if (!actor) continue;
    const r = actorRect(actor, frame.motion.actors[index] ?? 0, frame.atlas.rects);
    if (r) box = box ? union(box, r) : r;
  }
  if (!box) return null;
  const s = target.slop ?? { x: 0, y: 0 };
  return { x: box.x - s.x, y: box.y - s.y, w: box.w + 2 * s.x, h: box.h + 2 * s.y };
}

/**
 * Where a person counts even over a button (interact.ts settle): a
 * partner's own tight box, or a walker's actors' boxes where they stand now
 * grown by TIGHT. Null for anything else.
 */
export function targetTight(target: InteractTarget, frame: Pick<OutlineFrame, "actors" | "motion" | "atlas">): Rect | null {
  if (!target.person) return null;
  if (target.tight) return target.tight;
  if (target.box) return null;
  return targetBox({ ...target, slop: { x: TIGHT, y: TIGHT } }, frame);
}

/**
 * Everywhere a walker target can be over all its frames (the union of its
 * actors' boxes on each, grown by its slop): it can only come near an aim
 * that is near this. Null for a target with a box of its own.
 */
export function walkerReach(target: InteractTarget, actors: readonly LiveActor[], rects: AlphaAtlas["rects"]): Rect | null {
  if (target.box || target.shape.kind !== "actors") return null;
  let box: Rect | null = null;
  for (const index of target.shape.actors) {
    const actor = actors[index];
    if (!actor) continue;
    for (let f = 0; f < actor.frames.length; f++) {
      const r = actorRect(actor, f, rects);
      if (r) box = box ? union(box, r) : r;
    }
  }
  if (!box) return null;
  const s = target.slop ?? { x: 0, y: 0 };
  return { x: box.x - s.x, y: box.y - s.y, w: box.w + 2 * s.x, h: box.h + 2 * s.y };
}

/** Each walker target's reach over its whole path (walkerReach), for one list of targets and actors. */
interface Paths {
  targets: readonly InteractTarget[];
  actors: readonly LiveActor[];
  reach: (Rect | null)[];
  /** The targets that move (people, all of them). */
  walkers: number[];
  /** The rest, with a box of their own (or nothing drawn): the buttons, and the people who stand still (a tree's partner). */
  still: number[];
  stillPeople: number[];
}

/** The ring's last frame, to hand back as it was while its shape stays the same. */
interface LastRing<Img> {
  index: number;
  parts: Part[];
  ring: Ring<Img>;
  /** What its shape was worked out from (momentOf), and for which scene and actors. */
  moment: (number | string)[];
  model: SceneModel;
  actors: readonly LiveActor[];
}

/**
 * All a shape depends on in a frame: a tree's sway frame, a partner's
 * sprite, or each actor's frame (which fixes its sprite and its step).
 */
function momentOf(shape: OutlineShape, frame: Pick<OutlineFrame, "motion" | "partner">): (number | string)[] {
  if (shape.kind === "tree") return [frame.motion.sway[shape.tree] ?? 0];
  if (shape.kind === "partner") return [frame.partner?.(shape.tree) ?? "visitor"];
  return shape.actors.map((i) => frame.motion.actors[i] ?? 0);
}

/** The frame shows a shape as it was at `moment`, without working anything out anew. */
function sameMoment(moment: readonly (number | string)[], shape: OutlineShape, frame: Pick<OutlineFrame, "motion" | "partner">): boolean {
  if (shape.kind === "tree") return moment[0] === (frame.motion.sway[shape.tree] ?? 0);
  if (shape.kind === "partner") return moment[0] === (frame.partner?.(shape.tree) ?? "visitor");
  const { actors } = frame.motion;
  for (let k = 0; k < shape.actors.length; k++) if (moment[k] !== (actors[shape.actors[k]] ?? 0)) return false;
  return true;
}

const sameParts = (a: readonly Part[], b: readonly Part[]) =>
  a.length === b.length && a.every((p, i) => p.name === b[i].name && p.x === b[i].x && p.y === b[i].y && p.flip === b[i].flip);

/**
 * Which thing shows the ring, and the ring itself: the targets, where the
 * player is aiming, and the hotspot a keyboard has focused (it wins). Keeps
 * each shape's ring once made. One per island.
 *
 * Cheap per tick: the things that never move are searched once per aim, and
 * on each tick only the walkers whose path ever comes within its reach (none,
 * mostly). A ring whose shape did not change is the last one, its pulse step
 * aside. The pick is nearestTarget's (interact.ts), the tap's rule between a
 * person and a button included.
 */
export class OutlineLayer<Img> {
  aim: Aim | null = null;
  focused: string | null = null;
  private list: readonly InteractTarget[] = [];
  private readonly rings = new Map<string, { img: Img; dx: number; dy: number; w: number; h: number } | null>();
  /** The thing whose shapes were made last (its key), so they are made once per pick. */
  private prepared: string | null = null;
  private paths: Paths | null = null;
  /** For this aim: the nearest of the buttons and of the people that never move, and the walkers that can come near it. */
  private plan: { aim: Aim; paths: Paths; button: Nearest; person: Nearest; walkers: number[] } | null = null;
  private last: LastRing<Img> | null = null;

  /** The things that can be picked. New ones (the plaza changed): the picked thing's shapes are made again. */
  get targets(): readonly InteractTarget[] {
    return this.list;
  }

  set targets(next: readonly InteractTarget[]) {
    if (next !== this.list) {
      this.prepared = null;
      this.last = null;
    }
    this.list = next;
  }

  /** `make` turns a ring's RGBA words into an image (a canvas in the browser), once per shape. */
  constructor(private readonly make: (words: Uint32Array<ArrayBuffer>, w: number, h: number) => Img) {}

  /** The index of the target that shows the ring on this frame: the focused one, else the nearest the aim; -1 for none. */
  pick(frame: Pick<OutlineFrame, "actors" | "motion" | "atlas">): number {
    const targets = this.targets;
    if (!targets.length) return -1;
    if (this.focused) {
      const i = targets.findIndex((t) => t.key === this.focused);
      if (i >= 0) return i;
    }
    const aim = this.aim;
    if (!aim) return -1;
    const plan = this.planFor(aim, frame);
    const person = plan.walkers.length ? nearestOf(targets, (t) => targetBox(t, frame), aim, plan.walkers, plan.person) : plan.person;
    // Between a person and a button the aim is inside of, the tap's rule (interact.ts settle).
    return settle(plan.button, person, (i) => {
      const tight = targetTight(targets[i], frame);
      return tight != null && holds(tight, aim);
    });
  }

  /** The walkers' paths (once per targets and actors), then the plan for this aim (once per aim). */
  private planFor(aim: Aim, frame: Pick<OutlineFrame, "actors" | "atlas">) {
    const targets = this.targets;
    let paths = this.paths;
    if (!paths || paths.targets !== targets || paths.actors !== frame.actors) {
      const reach = targets.map((t) => walkerReach(t, frame.actors, frame.atlas.rects));
      const walkers: number[] = [];
      const still: number[] = [];
      const stillPeople: number[] = [];
      targets.forEach((t, i) => (t.box ? (t.person ? stillPeople : still) : reach[i] ? walkers : t.person ? stillPeople : still).push(i));
      paths = this.paths = { targets, actors: frame.actors, reach, walkers, still, stillPeople };
    }
    const kept = this.plan;
    if (kept && kept.paths === paths && kept.aim.x === aim.x && kept.aim.y === aim.y && kept.aim.reach === aim.reach) return kept;
    const r2 = aim.reach * aim.reach;
    const p = paths;
    const own = (t: InteractTarget) => t.box ?? null;
    const button = p.still.length ? nearestOf(targets, own, aim, p.still) : NONE_NEAR;
    const person = p.stillPeople.length ? nearestOf(targets, own, aim, p.stillPeople) : NONE_NEAR;
    const walkers = p.walkers.filter((i) => gapSquared(p.reach[i]!, aim) <= r2);
    this.plan = { aim, paths: p, button, person, walkers };
    return this.plan;
  }

  /** The ring on this frame, or null when nothing is picked (or its shape is not drawn). */
  ring(frame: OutlineFrame): Ring<Img> | null {
    const index = this.pick(frame);
    if (index < 0) return null;
    const target = this.targets[index];
    // Picked anew: every shape it can take, made now.
    if (this.prepared !== target.key) {
      this.prepared = target.key;
      for (const parts of shapeVariants(target.shape, frame)) this.kept(parts, frame.atlas);
    }
    const glow = pulseAt(frame.motion.tick, frame.still);
    // Nothing it is drawn from has moved since the last frame (most ticks): the same ring, at this frame's pulse step.
    const last = this.last;
    const same = last && last.index === index && last.ring.key === target.key && last.model === frame.model && last.actors === frame.actors;
    if (same && sameMoment(last.moment, target.shape, frame)) return this.pulsed(last, glow);
    const shape = silhouette(target.shape, frame);
    if (!shape) return null;
    // The same shape all the same (a walker's next frame that is the same sprite in the same place).
    if (same && sameParts(last.parts, shape.parts)) {
      last.moment = momentOf(target.shape, frame);
      return this.pulsed(last, glow);
    }
    const sig = shapeSig(shape.parts);
    const kept = this.kept(shape.parts, frame.atlas, sig);
    if (!kept) return null;
    const { x0, y0 } = corner(shape.parts);
    const ring: Ring<Img> = {
      key: target.key,
      sig,
      slot: shape.slot,
      img: kept.img,
      box: { x: x0 + kept.dx, y: y0 + kept.dy, w: kept.w, h: kept.h },
      glow,
    };
    this.last = { index, parts: shape.parts, ring, moment: momentOf(target.shape, frame), model: frame.model, actors: frame.actors };
    return ring;
  }

  /** The last ring at this pulse step (a new object only when the step changed). */
  private pulsed(last: LastRing<Img>, glow: number): Ring<Img> {
    if (last.ring.glow !== glow) last.ring = { ...last.ring, glow };
    return last.ring;
  }

  /** A shape's ring, made the first time it is asked for and kept (null: none of its sprites is in the atlas). */
  private kept(parts: readonly Part[], atlas: AlphaAtlas, sig = shapeSig(parts)) {
    let kept = this.rings.get(sig);
    if (kept !== undefined) return kept;
    const mask = ringMask(parts, atlas);
    const { x0, y0 } = corner(parts);
    kept = mask ? { img: this.make(ringWords(mask), mask.w, 2 * mask.h), dx: mask.x - x0, dy: mask.y - y0, w: mask.w, h: mask.h } : null;
    if (this.rings.size >= KEEP) this.rings.delete(this.rings.keys().next().value as string);
    this.rings.set(sig, kept);
    return kept;
  }
}

/** The top-left corner of a shape's parts. */
function corner(parts: readonly Part[]): { x0: number; y0: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  for (const p of parts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
  }
  return { x0, y0 };
}

/**
 * The frame's draw hooks with the ring slotted in where its slot says (the
 * ring is all that uses those hooks), only in the repainted rects it meets
 * (redrawRect clips each to its rect). It fills the slot on `fx` itself,
 * which must be the paint's own fresh hooks.
 */
export function withRing<Img>(fx: DrawFx, ctx: DrawContext<Img>, ring: Ring<Img> | null): DrawFx {
  if (!ring) return fx;
  const { img, box, glow, slot } = ring;
  const draw = (r: Rect) => {
    if (!overlaps(box, r)) return;
    ctx.drawImage(img, 0, 0, box.w, box.h, box.x, box.y, box.w, box.h);
    if (glow <= 0) return;
    ctx.globalAlpha = glow;
    ctx.drawImage(img, 0, box.h, box.w, box.h, box.x, box.y, box.w, box.h);
    ctx.globalAlpha = 1;
  };
  // Into the paint's own hooks (a fresh object each paint, its slots declared there), so their shape never changes.
  fx[slot.hook] = { index: slot.index, draw };
  return fx;
}
