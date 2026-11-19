/**
 * Contact shadows on the living island (web only): a soft dark oval under
 * every tree, person and prop, so nothing floats. Trees, the well, the
 * bunting's posts and the night lamps are baked into the land layer once per
 * phase; the plaza's people and props get theirs just before they are drawn
 * (DrawState.underActors). The sun sets their lean: west at dawn, east at
 * dusk, short at noon, small and faint under the moon. Pure and client-safe.
 */
import type { IslandScene, SceneTree } from "@/bot/src/quests/island/scene";

import type { Rect } from "./geometry";
import type { LightPhase, LiveActor } from "./types";

type Triple = readonly [number, number, number];

interface ShadowLight {
  /** Shadow colour and its core and rim opacity. */
  rgb: Triple;
  core: number;
  rim: number;
  /** Lean (native px, + is east) and stretch for a tree, and for a small prop or person. */
  tree: { dx: number; stretch: number };
  small: { dx: number; stretch: number };
}

export const SHADOW_LIGHT: Readonly<Record<LightPhase, ShadowLight>> = {
  day: { rgb: [52, 34, 48], core: 0.3, rim: 0.15, tree: { dx: 1, stretch: 0 }, small: { dx: 0, stretch: 0 } },
  dawn: { rgb: [58, 46, 92], core: 0.3, rim: 0.14, tree: { dx: -4, stretch: 6 }, small: { dx: -1, stretch: 2 } },
  dusk: { rgb: [70, 26, 64], core: 0.34, rim: 0.17, tree: { dx: 4, stretch: 6 }, small: { dx: 1, stretch: 2 } },
  night: { rgb: [8, 8, 26], core: 0.32, rim: 0.14, tree: { dx: 0, stretch: -2 }, small: { dx: 0, stretch: 0 } },
};

/** The oval under a tree's soil mound (trees are 32 x 40 with the mound's foot on row 38). */
export function treeShadow(tree: Pick<SceneTree, "left" | "top">, phase: LightPhase): Rect {
  const { dx, stretch } = SHADOW_LIGHT[phase].tree;
  const w = 30 + stretch;
  return { x: tree.left + 16 - Math.floor(w / 2) + dx, y: tree.top + 34, w, h: 7 };
}

/** The ovals baked with the land besides the trees': under the well and the bunting's two posts. */
export function propShadows(scene: Pick<IslandScene, "well" | "banner">, phase: LightPhase): Rect[] {
  const { dx, stretch } = SHADOW_LIGHT[phase].small;
  const out: Rect[] = [{ x: scene.well.x + dx - Math.floor(stretch / 2), y: scene.well.y + 17, w: 24 + stretch, h: 7 }];
  if (scene.banner) {
    out.push({ x: scene.banner.x - 1 + dx, y: scene.banner.y + 17, w: 7 + stretch, h: 4 });
    out.push({ x: scene.banner.x + 42 + dx, y: scene.banner.y + 17, w: 7 + stretch, h: 4 });
  }
  return out;
}

/** A lamp post's oval (6 x 16 posts). */
export function lampShadow(p: { x: number; y: number }): Rect {
  return { x: p.x - 1, y: p.y + 13, w: 8, h: 4 };
}

/** People (crowd, campfire sitters, the story's builder and tester). */
const PERSON = /^(crowd_|sit_|builder_|tester_|visitor)/;

/**
 * The oval under an actor drawn at `rect`, or null for one that casts none
 * (glyphs, bulbs, notes, the flame and the pit). A walker's stays inside its
 * own rectangle, so the frame's dirty rectangles still cover it.
 */
export function actorShadow(actor: LiveActor, name: string, rect: Rect, phase: LightPhase): Rect | null {
  const { dx, stretch } = SHADOW_LIGHT[phase].small;
  let r: Rect | null = null;
  if (PERSON.test(name)) r = { x: rect.x + 1 + dx - Math.floor(stretch / 2), y: rect.y + rect.h - 3, w: rect.w - 2 + stretch, h: 3 };
  else if (name === "notice_board" || name === "prize_board") r = { x: rect.x + 1 + dx, y: rect.y + rect.h - 4, w: rect.w - 2 + stretch, h: 5 };
  else if (name.startsWith("fest_stage_")) r = { x: rect.x - 1 + dx, y: rect.y + rect.h - 6, w: rect.w + 2 + stretch, h: 7 };
  else if (name === "booth_flag" || name === "star_flag") r = { x: rect.x + dx, y: rect.y + rect.h - 2, w: 5 + stretch, h: 3 };
  if (!r || !actor.steps) return r;
  // A walker: clipped to its own box.
  const x0 = Math.max(r.x, rect.x);
  const x1 = Math.min(r.x + r.w, rect.x + rect.w);
  const y1 = Math.min(r.y + r.h, rect.y + rect.h);
  return x1 > x0 && y1 > r.y ? { x: x0, y: r.y, w: x1 - x0, h: y1 - r.y } : null;
}

/** The pixels of a w x h oval: a darker core and a lighter rim, straight alpha. */
export function shadowSprite(w: number, h: number, phase: LightPhase): Uint8ClampedArray {
  const { rgb, core, rim } = SHADOW_LIGHT[phase];
  const data = new Uint8ClampedArray(w * h * 4);
  const rx = w / 2;
  const ry = h / 2;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - rx) / rx;
      const dy = (j + 0.5 - ry) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const o = (j * w + i) * 4;
      data[o] = rgb[0];
      data[o + 1] = rgb[1];
      data[o + 2] = rgb[2];
      data[o + 3] = Math.round((d < 0.45 ? core : rim) * 255);
    }
  }
  return data;
}
