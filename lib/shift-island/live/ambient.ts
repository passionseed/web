/**
 * The island's small life by day, as data: a sparrow or two that fly in, hop
 * and peck by the grass and fly off again; a few butterflies that settle on
 * the flower patches and flutter between them; and the tufts and flowers the
 * breeze bends as each gust crosses, in step with the trees. Few of each and
 * slow, so the island feels lived in without getting busy.
 *
 * Night keeps only the campfire's smoke and the lights: no birds, no
 * butterflies and no ambient fireflies (the campfire guest brings those).
 * Birds come at dawn and dusk as well; butterflies only by day.
 *
 * Pure functions of the tick (125 ms of running time each), so the loop can
 * jump to any moment and a test can check every frame; fx.ts draws them and
 * repaints only their small boxes. Everything rests on the terrain's own
 * tufts and flower patches (terrain.ts), which keep clear of plots, tap
 * targets, the plaza and its people. Web only: the bot's PNG and GIF have
 * none of it.
 */
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { hash3 } from "./atmosphere";
import { GUST, TICK_MS, gustStart, swayDelay, type Span } from "./clock";
import { overlaps, union, type Rect } from "./geometry";
import type { SwayPiece, Terrain } from "./terrain";
import type { LightPhase } from "./types";

/** A bird or a butterfly at one tick: its sprite, its top-left (scene px), its mirror, and a bird's shadow on the ground. */
export interface Critter {
  name: string;
  x: number;
  y: number;
  /** Mirrored: a bird facing left (the sprite faces right). */
  flip: boolean;
  shadow: Rect | null;
}

interface Point {
  x: number;
  y: number;
}

/** Where a bird can stand by a tuft or a flower patch: the range its left edge may take, its top, and the piece's middle. */
interface Spot {
  x0: number;
  x1: number;
  y: number;
  cx: number;
}

interface Flutterer {
  /** The bloom it rests on, and the one it flutters to (null: a loop round its own). */
  home: Point;
  away: Point | null;
  wing: string;
  offset: number;
}

/** What one island's life works from: built once per layout (the terrain is). */
export interface LifePlan {
  spots: Spot[];
  birds: number;
  butterflies: Flutterer[];
  /** The tufts and flower patches the breeze bends, and when a gust reaches each (ms after it starts). */
  sway: readonly SwayPiece[];
  delays: Int32Array;
  /** Each bird's current visit, worked out once. */
  visits: ({ v: number; x: number; w: number; visit: Visit } | undefined)[];
}

// ------------------------------------------------------------------ plan

/** A bird's sprite box. */
export const BIRD = { w: 7, h: 5 } as const;
/** A butterfly's sprite box. */
export const BUTTERFLY = { w: 5, h: 3 } as const;
/** A bird stands within this many px of its tuft or flower patch, so it keeps the room the terrain keeps round them. */
const SPOT_REACH = 2;
/** Butterflies settle on patches at least this far apart, so they spread over the island. */
const FLUTTER_APART = 72;
/** A butterfly flutters to a patch this near, or loops round its own. */
const FLUTTER_REACH = 64;
const WINGS = ["y", "f", "r"] as const;

export function lifePlan(terrain: Pick<Terrain, "sway">, scene: Pick<IslandScene, "width">): LifePlan {
  const spots = terrain.sway.map(({ rect: r }) => {
    const x0 = r.x - SPOT_REACH;
    return { x0, x1: Math.max(x0, r.x + r.w + SPOT_REACH - BIRD.w), y: r.y + r.h + 1 - BIRD.h, cx: r.x + (r.w >> 1) };
  });
  const flowers = terrain.sway.filter((p) => p.hearts.length > 0);
  const want = Math.max(1, Math.min(3, Math.round(flowers.length / 5)));
  const order = [...flowers].sort((a, b) => hash3(a.rect.x, a.rect.y, 41) - hash3(b.rect.x, b.rect.y, 41));
  const homes: Point[] = [];
  for (const p of order) {
    const heart = p.hearts[0];
    if (homes.length >= want) break;
    if (homes.every((h) => Math.hypot(h.x - heart.x, h.y - heart.y) >= FLUTTER_APART)) homes.push(heart);
  }
  const butterflies = homes.map((home, k): Flutterer => {
    let away: Point | null = null;
    let best = FLUTTER_REACH;
    for (const p of flowers) {
      const heart = p.hearts[p.hearts.length - 1];
      const d = Math.hypot(heart.x - home.x, heart.y - home.y);
      if (d >= 12 && d < best) {
        best = d;
        away = heart;
      }
    }
    return { home, away, wing: WINGS[k % WINGS.length], offset: Math.floor(hash3(home.x, home.y, 43) * FLUTTER.cycle) };
  });
  return {
    spots,
    birds: spots.length === 0 ? 0 : scene.width >= 1000 ? 3 : 2,
    butterflies,
    sway: terrain.sway,
    delays: Int32Array.from(terrain.sway, (p) => swayDelay(p.rect.x, scene.width)),
    visits: [],
  };
}

// ------------------------------------------------------------------ birds

/** One bird's visit to the island, in ticks: it flies in, rests at a few spots with short hops between, and flies off. */
const VISIT = 960;
/** Px a tick on the way in and out, from and to the nearer shore (faster on a very wide island, so it never takes more than CROSS_MAX). */
const CROSS_SPEED = 3;
const CROSS_MAX = 200;
/** Px a tick between two spots, and the farthest next spot. */
const HOP_SPEED = 2;
const HOP_REACH = 72;
/** How high (px above its shadow) it crosses. */
const HIGH = 30;
/** Ticks at a spot: 8 to 12 s, in blocks of BLOCK ticks, each one thing (stand, peck, hop or turn). */
const REST_MIN = 64;
const REST_MORE = 32;
const BLOCK = 8;
/** Spots a visit stops at. */
const STOPS = 3;
/** Each bird's few seconds' lag on its share of the visit (at most three birds). */
const BIRD_LAG = [0, 1, 2].map((k) => Math.floor(hash3(k, 0, 17) * 120));

type Act = "stand" | "peck" | "hop" | "turn";

/** A rest at one spot: where it lands and, per block, what it does and where it stands and faces after. */
interface Rest {
  kind: "rest";
  y: number;
  ticks: number;
  acts: Act[];
  /** Per block j, the x and facing at its start (one more entry: after the last). */
  xs: number[];
  flips: boolean[];
}

type Leg = { kind: "in" | "hop" | "out"; from: Point; to: Point; ticks: number } | Rest;

interface Visit {
  legs: Leg[];
}

/** A rest's block j: what the bird does, the same every run. */
function restAction(k: number, v: number, stop: number, j: number): Act {
  const a = hash3(k * 7919 + v, stop * 31 + j, 13);
  return a < 0.45 ? "stand" : a < 0.75 ? "peck" : a < 0.9 ? "hop" : "turn";
}

/** A rest worked out block by block, once: a hop that would leave the spot's range turns round instead. */
function restAt(k: number, v: number, stop: number, spot: Spot, x: number, flip: boolean, ticks: number): Rest {
  const blocks = Math.ceil(ticks / BLOCK);
  const acts: Act[] = [];
  const xs = [x];
  const flips = [flip];
  for (let j = 0; j < blocks; j++) {
    const act = restAction(k, v, stop, j);
    if (act === "turn") flip = !flip;
    else if (act === "hop") {
      const nx = x + (flip ? -1 : 1);
      if (nx < spot.x0 || nx > spot.x1) flip = !flip;
      else x = nx;
    }
    acts.push(act);
    xs.push(x);
    flips.push(flip);
  }
  return { kind: "rest", y: spot.y, ticks, acts, xs, flips };
}

/** The spot nearest a hash pick within reach of `from` (not `not`), or `from` itself. */
function nearSpot(spots: readonly Spot[], from: number, not: number, pick: number): number {
  const a = spots[from];
  const near: number[] = [];
  spots.forEach((s, i) => {
    if (i === from || i === not) return;
    const d = Math.hypot(s.cx - a.cx, s.y - a.y);
    if (d >= 16 && d <= HOP_REACH) near.push(i);
  });
  return near.length ? near[Math.floor(pick * near.length) % near.length] : from;
}

/** Bird k's visit v over this span: worked out once and kept (each bird keeps its last). */
function visitOf(plan: LifePlan, k: number, v: number, span: Span): Visit {
  const kept = plan.visits[k];
  if (kept && kept.v === v && kept.x === span.x && kept.w === span.w) return kept.visit;
  const { spots } = plan;
  const stops: number[] = [Math.floor(hash3(k, v, 1) * spots.length) % spots.length];
  for (let s = 1; s < STOPS; s++) stops.push(nearSpot(spots, stops[s - 1], stops[s - 2] ?? -1, hash3(k, v, 2 + s)));
  // Off the nearer side of the span (where the gulls cross), out of sight, a little up or down the coast.
  const edge = (salt: number, from: Point): Point => ({
    x: from.x - span.x < span.x + span.w - from.x ? span.x - BIRD.w - 3 : span.x + span.w + 3,
    y: from.y + Math.round((hash3(k, v, salt) - 0.5) * 60),
  });
  const legs: Leg[] = [];
  let at: Point | null = null;
  stops.forEach((index, s) => {
    const spot = spots[index];
    const x = spot.x0 + Math.floor(hash3(k, v, 10 + s) * (spot.x1 - spot.x0 + 1));
    const to = { x, y: spot.y };
    const from: Point = at ?? edge(20, to);
    const d = Math.hypot(to.x - from.x, to.y - from.y);
    if (!at) legs.push({ kind: "in", from, to, ticks: Math.max(1, Math.min(CROSS_MAX, Math.ceil(d / CROSS_SPEED))) });
    else if (d > 0) legs.push({ kind: "hop", from, to, ticks: Math.max(4, Math.ceil(d / HOP_SPEED)) });
    const rest = restAt(k, v, s, spot, x, to.x < from.x, REST_MIN + Math.floor(hash3(k, v, 30 + s) * REST_MORE));
    legs.push(rest);
    at = { x: rest.xs[rest.xs.length - 1], y: spot.y };
  });
  const last = at as Point | null;
  if (last) {
    const to = edge(40, last);
    legs.push({ kind: "out", from: last, to, ticks: Math.max(1, Math.min(CROSS_MAX, Math.ceil(Math.hypot(to.x - last.x, to.y - last.y) / CROSS_SPEED))) });
  }
  const visit = { legs };
  plan.visits[k] = { v, x: span.x, w: span.w, visit };
  return visit;
}

/** A bird's shadow under a sprite whose top-left would be (x, y) on the ground. */
const birdShadow = (x: number, y: number): Rect => ({ x: x + 1, y: y + BIRD.h - 2, w: 5, h: 2 });

/** Flapping: a few beats, then a short glide with the wings in (a small bird's bounding flight). */
const flapFrame = (t: number) => (t % 8 < 5 && t % 2 === 0 ? "bird_fly_0" : "bird_fly_1");

/** One bird at local tick u of visit v, or null while it is away. */
function birdAt(plan: LifePlan, k: number, v: number, u: number, span: Span): Critter | null {
  const { legs } = visitOf(plan, k, v, span);
  let t = u;
  for (const leg of legs) {
    if (t >= leg.ticks) {
      t -= leg.ticks;
      continue;
    }
    if (leg.kind === "rest") {
      // A block's one thing happens on its first tick: a hop is in the air then, a turn has turned after it.
      const block = Math.floor(t / BLOCK);
      const within = t % BLOCK;
      const act = leg.acts[block];
      const at = within === 0 ? block : block + 1;
      const x = leg.xs[at];
      const hopping = act === "hop" && within === 0 && leg.xs[block + 1] !== x;
      const name = act === "peck" && (within === 2 || within === 3 || within === 5) ? "bird_peck" : "bird_stand";
      return { name, x, y: leg.y - (hopping ? 1 : 0), flip: leg.flips[at], shadow: birdShadow(x, leg.y) };
    }
    const p = t / leg.ticks;
    const gx = Math.round(leg.from.x + (leg.to.x - leg.from.x) * p);
    const gy = Math.round(leg.from.y + (leg.to.y - leg.from.y) * p);
    const d = Math.hypot(leg.to.x - leg.from.x, leg.to.y - leg.from.y);
    const z =
      leg.kind === "in"
        ? Math.round(HIGH * Math.min(1, (1 - p) * 2.5))
        : leg.kind === "out"
          ? Math.round(HIGH * Math.min(1, p * 2.5))
          : Math.round(Math.min(8, d / 5) * Math.sin(Math.PI * p));
    const name = leg.kind === "hop" ? (t % 2 === 0 ? "bird_fly_0" : "bird_fly_1") : flapFrame(t);
    return { name, x: gx, y: gy - z, flip: leg.to.x < leg.from.x, shadow: birdShadow(gx, gy) };
  }
  return null;
}

/**
 * The birds at a tick (dawn, day and dusk; none at night), one entry per
 * bird, null while it is away. `span`: where they cross, as the gulls do.
 */
export function birdsAt(tick: number, plan: LifePlan, span: Span, phase: LightPhase): (Critter | null)[] {
  if (phase === "night" || plan.birds === 0) return [];
  const out: (Critter | null)[] = [];
  for (let k = 0; k < plan.birds; k++) {
    // The birds keep apart in time: a share of the visit each, and a little more.
    const at = tick + Math.floor((k * VISIT) / plan.birds) + BIRD_LAG[k];
    out.push(birdAt(plan, k, Math.floor(at / VISIT), at % VISIT, span));
  }
  return out;
}

// ------------------------------------------------------------------ butterflies

/** A butterfly's round, in ticks: rest on its bloom (13 s), flutter over (5 s), rest on the other, flutter back. */
export const FLUTTER = { cycle: 288, rest: 104, fly: 40 } as const;
/** Wings while flying: open, half, closed, half. */
const FLAP = [0, 1, 2, 1] as const;

/** A resting butterfly's wings: open, now and then folding slowly shut and open again. */
function restWings(r: number): number {
  const f = r % 32;
  return f === 24 || f === 29 ? 1 : f > 24 && f < 29 ? 2 : 0;
}

/** Where a butterfly is on its flight from `a` to `b` (`b` null: a loop round `a`), t of FLUTTER.fly ticks. */
function flight(a: Point, b: Point | null, t: number, k: number): Point {
  const p = t / FLUTTER.fly;
  const wobble = Math.round(Math.sin(t * 1.3 + k) * 1.5);
  if (!b) return { x: a.x + Math.round(10 * Math.sin(2 * Math.PI * p)), y: a.y - Math.round(9 * Math.sin(Math.PI * p)) + wobble };
  const e = (1 - Math.cos(Math.PI * p)) / 2;
  return {
    x: Math.round(a.x + (b.x - a.x) * e + 2 * Math.sin(t * 0.8 + k * 2)),
    y: Math.round(a.y + (b.y - a.y) * e) - Math.round(7 * Math.sin(Math.PI * p)) + wobble,
  };
}

/** The butterflies at a tick (by day only), each over its bloom's heart. */
export function butterfliesAt(tick: number, plan: LifePlan, phase: LightPhase): Critter[] {
  if (phase !== "day") return [];
  return plan.butterflies.map((b, k) => {
    const u = (tick + b.offset) % FLUTTER.cycle;
    const there = b.away ?? b.home;
    const { rest, fly } = FLUTTER;
    let at: Point;
    let wings: number;
    if (u < rest) {
      at = b.home;
      wings = restWings(u);
    } else if (u < rest + fly) {
      at = flight(b.home, b.away, u - rest, k);
      wings = FLAP[(u - rest) % 4];
    } else if (u < 2 * rest + fly) {
      at = there;
      wings = restWings(u - rest - fly);
    } else {
      at = flight(there, b.away ? b.home : null, u - 2 * rest - fly, k);
      wings = FLAP[(u - 2 * rest - fly) % 4];
    }
    return { name: `butterfly_${b.wing}_${wings}`, x: at.x - 2, y: at.y - 1, flip: false, shadow: null };
  });
}

// ------------------------------------------------------------------ grass

/** How long the grass leans as a gust reaches it: the trees' first two beats, then it rises for good. */
const LEAN_MS = 2 * GUST.flip;

/** Which gust index a moment `t` ms into the run falls near (clock.ts swayB's own reckoning). */
const gustNear = (t: number) => Math.floor((t - GUST.first + GUST.jitter / 2) / GUST.period);

/**
 * Which tufts and flower patches lean in the breeze at a tick (dawn, day and
 * dusk; still at night): each bends as the gust reaches it, when the trees
 * there start to sway (clock.ts), and rises again LEAN_MS later, so a wave
 * runs across the grass. Indexes into plan.sway, in order, into `out`
 * (cleared first). Between gusts it looks at no piece.
 */
export function bentAt(tick: number, plan: LifePlan, phase: LightPhase, out: number[] = []): number[] {
  out.length = 0;
  if (phase === "night" || plan.sway.length === 0) return out;
  const ms = tick * TICK_MS;
  // The gusts that can be leaning any piece now (a piece's delay is at most GUST.spread); gusts are
  // seconds apart, so at most one of them is, and the list stays in index order.
  const g1 = gustNear(ms);
  for (let j = Math.max(0, gustNear(ms - GUST.spread) - 1); j <= g1; j++) {
    const local = ms - gustStart(j);
    if (local < 0 || local >= GUST.spread + LEAN_MS) continue;
    for (let i = 0; i < plan.delays.length; i++) {
      const d = local - plan.delays[i];
      if (d >= 0 && d < LEAN_MS) out.push(i);
    }
  }
  return out;
}

// ------------------------------------------------------------------ repaints

const contains = (a: Rect, b: Rect) => b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;

/**
 * Two frames of the same critters (index for index, null where one is
 * away): the boxes to repaint where one moved, changed, came or went. A bird
 * high over its shadow repaints the two apart, not the sky between them.
 */
export function critterDirty(a: readonly (Critter | null)[], b: readonly (Critter | null)[], size: { w: number; h: number }, out: Rect[]): void {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const p = a[i] ?? null;
    const q = b[i] ?? null;
    if (!p && !q) continue;
    if (p && q && p.name === q.name && p.x === q.x && p.y === q.y && p.flip === q.flip && p.shadow?.x === q.shadow?.x && p.shadow?.y === q.shadow?.y) continue;
    const pBox = p ? { x: p.x, y: p.y, w: size.w, h: size.h } : null;
    const qBox = q ? { x: q.x, y: q.y, w: size.w, h: size.h } : null;
    const sprite = pBox && qBox ? union(pBox, qBox) : (pBox ?? qBox)!;
    const ps = p?.shadow ?? null;
    const qs = q?.shadow ?? null;
    const shadow = ps && qs ? union(ps, qs) : (ps ?? qs);
    if (!shadow || contains(sprite, shadow)) out.push(sprite);
    else if (overlaps(sprite, shadow)) out.push(union(sprite, shadow));
    else out.push(sprite, shadow);
  }
}
