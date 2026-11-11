/**
 * What moves on the living island at a given tick: pure functions of the
 * tick (125 ms of running time each), so the loop can jump straight to any
 * moment and tests can check every frame without a canvas.
 */
import type { IslandScene } from "@/bot/src/quests/island/scene";

import type { LiveActor } from "./types";

/** One tick of the island's clock. */
export const TICK_MS = 125;

/** Sea and foam play their three frames as 0-1-2-1. */
const PING_PONG = [0, 1, 2, 1] as const;
export type SeaFrame = 0 | 1 | 2;

/** Sea frame: a step every 3 ticks. */
export function seaFrame(tick: number): SeaFrame {
  return PING_PONG[Math.floor(tick / 3) % 4];
}

/** Shoreline foam frame: a step every 4 ticks. */
export function foamFrame(tick: number): SeaFrame {
  return PING_PONG[Math.floor(tick / 4) % 4];
}

export interface Mover {
  /** Sprite name. */
  name: string;
  x: number;
  y: number;
  flip: boolean;
}

/** Boat sprite size (boat and boat_1). */
export const BOAT_W = 20;
export const BOAT_H = 12;
/** How far past either edge the boat turns round, out of sight. */
const BOAT_TURN = 40;
const BOAT_FRAMES = ["boat", "boat_1"] as const;

/**
 * The stretch of sea the ambient life crosses, in scene px: the scene's own
 * width by default, wider when the island is drawn full screen with open sea
 * around it, so nothing turns round or pops up in plain sight.
 */
export interface Span {
  x: number;
  w: number;
}

const sceneSpan = (scene: Pick<IslandScene, "width">): Span => ({ x: 0, w: scene.width });

/**
 * The boat: 1 px every 2 ticks along the lane, there and back, turning round
 * out of sight. The sprite's bow points left, so it is drawn as is when sailing
 * left and mirrored when sailing right. At tick 0 it is where the PNG anchors
 * it, unmirrored and heading left. It bobs between its two frames every 4 ticks.
 */
export function boatAt(tick: number, scene: Pick<IslandScene, "width" | "lanes" | "boatStill">, span: Span = sceneSpan(scene)): Mover {
  const leg = span.w + BOAT_W + 2 * BOAT_TURN;
  const start = span.x - BOAT_W - BOAT_TURN;
  const end = start + leg - 1;
  const p = (Math.floor(tick / 2) + (end - scene.boatStill.x)) % (2 * leg);
  const left = p < leg;
  // Each turn holds the boat one step in place, so it never drifts the wrong way while turning.
  const x = left ? end - p : start + (p - leg);
  return { name: BOAT_FRAMES[Math.floor(tick / 4) % 2], x, y: scene.lanes.boatY, flip: !left };
}

/** Gull sprite size. */
export const GULL_W = 8;
export const GULL_H = 5;
const GULL_FRAMES = ["gull_0", "gull_1"] as const;
/** Ticks the pair spends out of sight between crossings. */
const GULL_GAP = 160;

/** Two gulls flying right together, 1 px per tick in the gull lane, flapping every 2 ticks. */
export function gullsAt(tick: number, scene: Pick<IslandScene, "width" | "lanes">, span: Span = sceneSpan(scene)): Mover[] {
  const period = span.w + 2 * GULL_W + 12 + GULL_GAP;
  const lead = span.x + ((tick + 40) % period) - GULL_W;
  const flap = Math.floor(tick / 2) % 2;
  return [
    { name: GULL_FRAMES[flap], x: lead, y: scene.lanes.gullY, flip: false },
    { name: GULL_FRAMES[1 - flap], x: lead - 12, y: scene.lanes.gullY + 4, flip: false },
  ];
}

/** Cloud shadow sizes. */
export const CLOUDS = [
  { name: "cloud_a", w: 48, h: 16, row: 0.3, offset: 60, gap: 96 },
  { name: "cloud_b", w: 32, h: 12, row: 0.64, offset: 260, gap: 160 },
] as const;

/** Cloud shadows drifting right, 1 px every 4 ticks, wrapping out of sight. */
export function cloudsAt(tick: number, scene: Pick<IslandScene, "width" | "height">, span: Span = sceneSpan(scene)): Mover[] {
  const step = Math.floor(tick / 4);
  return CLOUDS.map((c) => {
    const period = span.w + c.w + c.gap;
    return {
      name: c.name,
      x: span.x + ((step + c.offset) % period) - c.w - Math.floor(c.gap / 2),
      y: Math.round(scene.height * c.row - c.h / 2),
      flip: false,
    };
  });
}

/** Wind gusts: one every 6 to 8 s, 1.6 s of A/B flips at 400 ms, reaching trees left to right over 600 ms. */
export const GUST = { period: 7000, jitter: 1000, first: 2500, length: 1600, flip: 400, spread: 600 } as const;

/** A fixed pseudo-random 0..1 for gust k, so the gusts are irregular but the same every run. */
function gustNoise(k: number): number {
  let h = Math.imul(k + 1, 2654435761) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** When gust k starts, in ms of running time. Consecutive gusts are 6 to 8 s apart. */
export function gustStart(k: number): number {
  return GUST.first + k * GUST.period + Math.round((gustNoise(k) - 0.5) * GUST.jitter);
}

/** A tree's gust delay: trees further right feel the wind later. */
export function swayDelay(left: number, width: number): number {
  return Math.round((Math.max(0, left) / Math.max(1, width)) * GUST.spread);
}

/** True while a tree shows its sway frame B. */
export function swayB(ms: number, delay: number): boolean {
  const t = ms - delay;
  const k = Math.floor((t - GUST.first + GUST.jitter / 2) / GUST.period);
  for (const j of [k, k - 1]) {
    if (j < 0) continue;
    const local = t - gustStart(j);
    if (local >= 0 && local < GUST.length) return Math.floor(local / GUST.flip) % 2 === 0;
  }
  return false;
}

/** A night lantern's glow frame: a slow flicker, neighbours out of step. */
export function glowFrame(tick: number, slot: number): 0 | 1 {
  return ((Math.floor(tick / 6) + slot) % 2) as 0 | 1;
}

/** A story actor's frame index. */
export function actorFrame(tick: number, actor: Pick<LiveActor, "frames" | "frameMs">): number {
  const n = actor.frames.length;
  if (n <= 1) return 0;
  return Math.floor((tick * TICK_MS) / Math.max(TICK_MS, actor.frameMs ?? 500)) % n;
}

/** The first tick due after `ms` of running time, stepping `step` ticks at a time. */
export function nextTickAt(ms: number, step: number): number {
  return (Math.floor(ms / (TICK_MS * step)) + 1) * step;
}

/** Everything that moves, at one tick. */
export interface Motion {
  sea: SeaFrame;
  foam: SeaFrame;
  boat: Mover | null;
  gulls: Mover[];
  clouds: Mover[];
  /** Per scene tree: 1 while it shows its sway frame B. */
  sway: Uint8Array;
  /** Per scene tree: the glow frame of its lantern (night only). */
  glow: Uint8Array;
  /** Per actor: its frame index. */
  actors: Uint8Array;
}

export interface MotionInput {
  scene: IslandScene;
  /** Trees with a sway frame (stage 2 and up), by scene tree index. */
  swaying: readonly boolean[];
  actors: readonly LiveActor[];
  /** Boat, gulls and clouds. */
  ambient: boolean;
  /** One frame, nothing moving: sea and foam frame 0, sway A, boat at boatStill, no gulls or clouds. */
  still: boolean;
  /** Fitted and too small to see the sea move: only the boat, gulls and clouds animate. */
  lowDetail: boolean;
  night: boolean;
  /** Where the boat, gulls and clouds travel; default the scene's width. */
  span?: Span;
}

/** The island at one tick. */
export function motionAt(tick: number, input: MotionInput): Motion {
  const { scene, still, lowDetail, ambient, night } = input;
  const span = input.span ?? sceneSpan(scene);
  const frozen = still || lowDetail;
  const ms = tick * TICK_MS;
  const sway = new Uint8Array(scene.trees.length);
  const glow = new Uint8Array(scene.trees.length);
  if (!frozen) {
    scene.trees.forEach((tree, i) => {
      if (input.swaying[i] && swayB(ms, swayDelay(tree.left, scene.width))) sway[i] = 1;
      if (night && tree.lantern) glow[i] = glowFrame(tick, tree.slot);
    });
  }
  const actors = new Uint8Array(input.actors.length);
  if (!still) input.actors.forEach((actor, i) => (actors[i] = actorFrame(tick, actor)));
  let boat: Mover | null = null;
  if (ambient) boat = still ? { name: "boat", x: scene.boatStill.x, y: scene.boatStill.y, flip: false } : boatAt(tick, scene, span);
  // Gulls roost and cloud shadows fade at night.
  const sky = ambient && !still && !night;
  return {
    sea: frozen ? 0 : seaFrame(tick),
    foam: frozen ? 0 : foamFrame(tick),
    boat,
    gulls: sky ? gullsAt(tick, scene, span) : [],
    clouds: sky ? cloudsAt(tick, scene, span) : [],
    sway,
    glow,
    actors,
  };
}
