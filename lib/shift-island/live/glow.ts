/**
 * Warm light on the living island (web only): where the campfire, the plaza
 * lamps, earned lanterns, the festival's bulbs and the countdown board throw
 * pools of light at dusk and night, and the pixels of each pool.
 *
 * A pool is a colour-dodge sprite: drawn over the finished frame it
 * multiplies what is under it by a warm factor (dark stays dark, outlines
 * stay crisp, faces by the fire catch the light). Pools are quantised into a
 * few bands with an ordered dither, so they read as pixel art and not as a
 * blurred gradient. Pure and client-safe: this file returns bytes; fx.ts
 * uploads them once per phase.
 */
import type { SceneModel } from "./draw";
import type { Rect } from "./geometry";
import type { LightPhase, LiveActor } from "./types";

type Triple = readonly [number, number, number];

export type LightKind = "fire" | "lamp" | "lantern" | "bulb" | "board" | "stage" | "boat";

export interface LightSource {
  kind: LightKind;
  /** The pool's centre, native px. */
  x: number;
  y: number;
  /** The light itself (the flame, a lamp's head, a lantern's glass): where its small halo glows. */
  hx: number;
  hy: number;
  /** What makes it flicker: the flame actor's frame, a tree's lantern glow frame, or nothing. */
  flicker: { actor: number } | { tree: number } | null;
}

interface PoolLook {
  /** Radius across, native px; the pool is squashed to an ellipse on the ground. */
  r: number;
  squash: number;
  /** The warm multiply at the centre, per channel (1 keeps the colour). */
  warm: Triple;
  /** The halo round the light itself, added to the frame: radius (0 for none) and colour at its heart. */
  halo: number;
  glow: Triple;
}

/** Each kind's pool at full strength (night). */
const LOOKS: Readonly<Record<LightKind, PoolLook>> = {
  fire: { r: 50, squash: 0.74, warm: [3.4, 2.3, 1.2], halo: 10, glow: [120, 70, 18] },
  lamp: { r: 24, squash: 0.8, warm: [2.5, 2.0, 1.3], halo: 6, glow: [96, 74, 30] },
  lantern: { r: 20, squash: 0.8, warm: [2.7, 2.0, 1.15], halo: 6, glow: [104, 70, 22] },
  bulb: { r: 10, squash: 0.85, warm: [1.9, 1.6, 1.15], halo: 3, glow: [70, 52, 20] },
  board: { r: 28, squash: 0.6, warm: [1.8, 1.55, 1.15], halo: 0, glow: [0, 0, 0] },
  stage: { r: 32, squash: 0.6, warm: [1.8, 1.5, 1.15], halo: 0, glow: [0, 0, 0] },
  boat: { r: 16, squash: 0.6, warm: [2.6, 2.0, 1.2], halo: 4, glow: [110, 76, 26] },
};

/** How strong each kind is in each light; 0 draws no pool. Lamps and the festoon only stand at night. */
const STRENGTH: Readonly<Record<LightPhase, Readonly<Record<LightKind, number>>>> = {
  day: { fire: 0, lamp: 0, lantern: 0, bulb: 0, board: 0, stage: 0, boat: 0 },
  dawn: { fire: 0.3, lamp: 0, lantern: 0.2, bulb: 0, board: 0, stage: 0, boat: 0 },
  dusk: { fire: 0.42, lamp: 0, lantern: 0.36, bulb: 0.3, board: 0.3, stage: 0.3, boat: 0 },
  night: { fire: 1, lamp: 1, lantern: 1, bulb: 1, board: 1, stage: 1, boat: 1 },
};

/** The boat's lamp at night, from where it is drawn (20 x 12, a lamp at the stern), or null. */
export function boatLight(boat: { x: number; y: number; flip: boolean } | null, phase: LightPhase): LightSource | null {
  if (!boat || STRENGTH[phase].boat <= 0) return null;
  const x = Math.round(boat.x);
  const y = Math.round(boat.y);
  return { kind: "boat", x: x + 10, y: y + 8, hx: boat.flip ? x + 4 : x + 15, hy: y + 4, flicker: null };
}

/** Flicker variants: a breath in size and strength, so the fire dances and lanterns waver. */
export const FLICKER = [
  { size: 0.97, power: 0.93 },
  { size: 1, power: 1 },
  { size: 1.03, power: 1.06 },
] as const;

export function poolStrength(kind: LightKind, phase: LightPhase): number {
  return STRENGTH[phase][kind];
}

/** The lights of this scene and plaza in a phase, strongest kinds first. */
export function lightSources(model: SceneModel, actors: readonly LiveActor[], phase: LightPhase): LightSource[] {
  const out: LightSource[] = [];
  const on = (kind: LightKind) => STRENGTH[phase][kind] > 0;
  const at = (kind: LightKind, x: number, y: number, hx = x, hy = y, flicker: LightSource["flicker"] = null): LightSource => ({ kind, x, y, hx, hy, flicker });
  actors.forEach((actor, i) => {
    const first = actor.frames[0];
    if (first === "campfire_flame_0" && on("fire")) out.push(at("fire", actor.x + 5, actor.y + 8, actor.x + 5, actor.y + 6, { actor: i }));
    else if (first === "goal_bulb" && on("bulb")) out.push(at("bulb", actor.x + 1, actor.y + 3, actor.x + 1, actor.y + 1));
    else if (first === "fest_count" && on("board")) out.push(at("board", actor.x + 22, actor.y + 10));
    else if (first === "fest_stage_3" && on("stage")) out.push(at("stage", actor.x + 22, actor.y + 12));
  });
  if (phase === "night") {
    for (const p of model.lamps) out.push(at("lamp", p.x + 3, p.y + 9, p.x + 3, p.y + 2));
    if (model.festoon) for (const dx of [10, 24, 38]) out.push(at("bulb", model.festoon.x + dx, model.festoon.y + 7, model.festoon.x + dx, model.festoon.y + 5));
  }
  if (on("lantern")) {
    model.trees.forEach((m, i) => {
      const l = m.tree.lantern;
      if (l) out.push(at("lantern", l.x + 4, l.y + 9, l.x + 4, l.y + 7, { tree: i }));
    });
  }
  return out;
}

/** The halo's box round the light itself (empty for a kind without one). */
export function haloBox(source: Pick<LightSource, "kind" | "hx" | "hy">): Rect {
  const r = LOOKS[source.kind].halo;
  return { x: source.hx - r, y: source.hy - r, w: r > 0 ? 2 * r + 1 : 0, h: r > 0 ? 2 * r + 1 : 0 };
}

/**
 * The pixels of a light's halo: a small round glow added to the frame (the
 * engine draws it with "lighter"), banded like the pools. Null for a kind
 * without one.
 */
export function haloSprite(kind: LightKind, phase: LightPhase, variant: number): PoolSprite | null {
  const look = LOOKS[kind];
  if (look.halo <= 0) return null;
  const r = look.halo;
  const w = 2 * r + 1;
  const power = STRENGTH[phase][kind] * FLICKER[variant].power;
  const data = new Uint8ClampedArray(w * w * 4);
  for (let j = 0; j < w; j++) {
    for (let i = 0; i < w; i++) {
      const d = Math.hypot(i - r, j - r) / (r + 0.5);
      if (d >= 1) continue;
      const f = Math.pow(1 - d, 2);
      const band = Math.min(4, Math.floor(f * 4 + BAYER[(j & 3) * 4 + (i & 3)]));
      if (band <= 0) continue;
      const k = (band / 4) * power;
      const o = (j * w + i) * 4;
      for (let c = 0; c < 3; c++) data[o + c] = Math.round(look.glow[c] * k);
      data[o + 3] = 255;
    }
  }
  return { w, h: w, data };
}

/** A pool's size for a kind and flicker variant: the sprite's box round its centre. */
export function poolBox(source: Pick<LightSource, "kind" | "x" | "y">, variant: number): Rect {
  const look = LOOKS[source.kind];
  const rx = Math.round(look.r * FLICKER[variant].size);
  const ry = Math.max(2, Math.round(rx * look.squash));
  return { x: source.x - rx, y: source.y - ry, w: 2 * rx + 1, h: 2 * ry + 1 };
}

/** The box that holds every flicker variant of a pool. */
export function poolBounds(source: Pick<LightSource, "kind" | "x" | "y">): Rect {
  return poolBox(source, FLICKER.length - 1);
}

/** 4x4 ordered dither thresholds, 0..1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Bands across a pool, centre included: enough that neighbouring bands differ little, so the dither reads as soft light. */
const BANDS = 9;

export interface PoolSprite {
  w: number;
  h: number;
  /** RGBA: the colour-dodge value per pixel; alpha 0 leaves the frame as it is. */
  data: Uint8ClampedArray;
}

/**
 * The pixels of one pool: a squashed disc whose light falls off in BANDS
 * steps, dithered where one band meets the next.
 */
export function poolSprite(kind: LightKind, phase: LightPhase, variant: number): PoolSprite {
  const look = LOOKS[kind];
  const box = poolBox({ kind, x: 0, y: 0 }, variant);
  const rx = (box.w - 1) / 2;
  const ry = (box.h - 1) / 2;
  const power = STRENGTH[phase][kind] * FLICKER[variant].power;
  const data = new Uint8ClampedArray(box.w * box.h * 4);
  for (let j = 0; j < box.h; j++) {
    for (let i = 0; i < box.w; i++) {
      const dx = (i - rx) / rx;
      const dy = (j - ry) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      const f = Math.pow(1 - d, 1.7);
      const band = Math.min(BANDS, Math.floor(f * BANDS + BAYER[(j & 3) * 4 + (i & 3)]));
      if (band <= 0) continue;
      const k = (band / BANDS) * power;
      const o = (j * box.w + i) * 4;
      for (let c = 0; c < 3; c++) {
        const m = 1 + (look.warm[c] - 1) * k;
        data[o + c] = Math.round((1 - 1 / m) * 255);
      }
      data[o + 3] = 255;
    }
  }
  return { w: box.w, h: box.h, data };
}

/** Which flicker variant a light shows for a frame: the flame's frame, the lantern's glow frame, else the middle one. */
export function flickerVariant(source: LightSource, actorFrames: ArrayLike<number>, glowFrames: ArrayLike<number>, still: boolean): number {
  if (still || !source.flicker) return 1;
  if ("actor" in source.flicker) return [0, 1, 2, 1][(actorFrames[source.flicker.actor] ?? 1) % 4];
  return glowFrames[source.flicker.tree] ? 2 : 1;
}
