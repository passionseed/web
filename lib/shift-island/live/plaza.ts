/**
 * The plaza as a place to gather: the quest notice board, the Demo Day
 * festival (sign, stage, lantern string, booth flags and stars) and the voice
 * campfire, as LiveActors the existing engine draws above the trees, plus
 * where the DOM tap targets and labels go. Pure and client-safe.
 *
 * Opt-in: with nothing to show it returns NO_PLAZA, so the canvas stays the
 * bot's PNG by day. Everything sits at fixed offsets from the plaza centre,
 * which never moves as the island grows; plaza.test.ts proves every piece
 * stays clear of trees, tags, decorations, paths, pins, lamps and other plots'
 * tap targets for islands of every size.
 *
 * Privacy: people sit only at the campfire, one figure per seat, the variant
 * chosen by seat order (never by person). Booths carry a slot and a kind only.
 *
 * Plan: docs/designs/shift-high-island-web.md, "Festival, notice board, voice
 * campfire, canvas link".
 */
import { ACTOR_FRAMES, GOAL_BULB_SPOTS, MOTION_SIZES, type MotionSpriteName } from "@/bot/assets/island/motion-sprites";
import type { IslandScene, SceneRect, SceneTree } from "@/bot/src/quests/island/scene";
import type { Festival } from "@/lib/shift-island/festival";
import type { NoticeKind } from "@/lib/shift-island/notice";

import type { LiveActor } from "./types";

/** Seats drawn round the campfire; more people show as a "+N" label. */
export const MAX_SEATS = 8;

export interface PlazaInput {
  festival: Festival | null;
  /** The pinned notes, in pin order (at most 3 are drawn); null = no notice board. */
  pins: NoticeKind[] | null;
  /** null = no campfire (no coworking channel, or no data). */
  campfire: { count: number } | null;
}

export type PlazaSpotId = "notice" | "stage" | "campfire";

/**
 * A tap target, percent (0..100) of the picture: x and y are its top-left
 * corner, w and h its size, rounded to 4 decimals like IslandHotspot. Drawn
 * centre anchored like the plot hotspots (left = x + w / 2), so a 48px floor
 * grows evenly round it.
 */
export interface PlazaSpot {
  id: PlazaSpotId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlazaLabelId = "sign" | "campfireCount" | "campfireMore";

/** A DOM label's anchor point, percent of the picture. bottom = translate(-50%, -100%), left = translate(0, -50%). */
export interface PlazaLabel {
  id: PlazaLabelId;
  x: number;
  y: number;
  anchor: "bottom" | "left";
}

export interface PlazaWorld {
  actors: LiveActor[];
  spots: PlazaSpot[];
  labels: PlazaLabel[];
}

/** Nothing on the plaza: one shared value, so the engine's actors never change. */
export const NO_PLAZA: PlazaWorld = { actors: [], spots: [], labels: [] };

type Point = readonly [number, number];

/**
 * Where everything goes, in native px from the plaza centre (top-left corners
 * and sizes). Spot boxes keep inside the 32 px band between the helper path
 * rows above and below the plaza, and off the corner lamp posts.
 */
export const PLAZA_LAYOUT = {
  noticeBoard: [-38, -24] as Point,
  notes: [[-35, -21], [-29, -22], [-22, -21]] as readonly Point[],
  noticeSpot: { x: -40, y: -28, w: 28, h: 30 },
  sign: [36, -12] as Point,
  stage: [50, -16] as Point,
  stageSpot: { x: 36, y: -16, w: 58, h: 31 },
  signLabel: [43, -14] as Point,
  /** The goal string's bulbs sit on the festival banner (the festoon spot); booth flags from each tree's corner. */
  boothFlag: [4, 22] as Point,
  pit: [-63, 46] as Point,
  flame: [-61, 38] as Point,
  /** In fill order: front pair, back pair, outer front pair, outer back pair. */
  seats: [[-73, 54], [-47, 54], [-71, 34], [-49, 34], [-87, 52], [-33, 52], [-85, 36], [-35, 36]] as readonly Point[],
  campfireSpot: { x: -92, y: 32, w: 72, h: 32 },
  campfireCount: [-56, 32] as Point,
  campfireMore: [-24, 46] as Point,
} as const;

/** Seats right of this (native px from the plaza centre) face left, towards the fire. */
const FIRE_X = -56;
/** Seats with their top above this sit behind the fire (drawn before the flame). */
const FRONT_Y = 45;
const FLAME_MS = 250;
const SIT_MS = 1100;
const SITTERS = [ACTOR_FRAMES.sitA, ACTOR_FRAMES.sitB, ACTOR_FRAMES.sitC, ACTOR_FRAMES.sitD] as const;
const NOTES: Record<NoticeKind, MotionSpriteName> = {
  active: "notice_note_active",
  main: "notice_note_main",
  side: "notice_note_side",
};
const STAGES: readonly MotionSpriteName[] = ["fest_stage_0", "fest_stage_1", "fest_stage_2", "fest_stage_3"];
/** At most this many notes fit the board. */
const MAX_NOTES = 3;

/** Four decimals, as picture.ts: precise to well under a pixel, short in props. */
const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

const count = (v: unknown, max = Number.MAX_SAFE_INTEGER): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;
};

/** A sprite's size from MOTION_SIZES. */
export function plazaSpriteSize(name: MotionSpriteName): { w: number; h: number } {
  const [w, h] = MOTION_SIZES[name];
  return { w, h };
}

/** The plaza's centre in native px: the well's middle (the well is 24 x 24, centred on the plaza). */
export function plazaCentre(scene: IslandScene): { x: number; y: number } {
  return { x: scene.well.x + 12, y: scene.well.y + 12 };
}

/** A native box as a percent spot, edges rounded (not sizes) so x + w lands on the right edge. */
function spotOf(id: PlazaSpotId, box: SceneRect, scene: IslandScene): PlazaSpot {
  const x0 = Math.max(0, box.x);
  const y0 = Math.max(0, box.y);
  const x1 = Math.min(scene.width, box.x + box.w);
  const y1 = Math.min(scene.height, box.y + box.h);
  const left = round4((x0 / scene.width) * 100);
  const right = round4((x1 / scene.width) * 100);
  const top = round4((y0 / scene.height) * 100);
  const bottom = round4((y1 / scene.height) * 100);
  return { id, x: left, y: top, w: round4(right - left), h: round4(bottom - top) };
}

function labelOf(id: PlazaLabelId, at: { x: number; y: number }, anchor: PlazaLabel["anchor"], scene: IslandScene): PlazaLabel {
  return { id, x: round4((at.x / scene.width) * 100), y: round4((at.y / scene.height) * 100), anchor };
}

/**
 * Where a booth flag stands on a tree: in the soil mound, left of the trunk.
 * Over a short tree the caller's pin can reach that low; the flag then stands
 * just under the pin, still in the mound.
 */
export function boothFlagAt(tree: Pick<SceneTree, "left" | "top" | "mine">, scene: Pick<IslandScene, "marker">): { x: number; y: number } {
  const x = tree.left + PLAZA_LAYOUT.boothFlag[0];
  let y = tree.top + PLAZA_LAYOUT.boothFlag[1];
  const pin = tree.mine ? scene.marker : null;
  if (pin) {
    const flag = plazaSpriteSize("booth_flag");
    const side = 9 * pin.scale;
    const across = x < pin.x + side && pin.x < x + flag.w;
    if (across && y < pin.y + side && pin.y < y + flag.h) y = pin.y + side;
  }
  return { x, y };
}

/**
 * The plaza's actors, tap targets and label points for this scene. Actors are
 * in draw order: goal string, lit bulbs, stage, sign, notice board, notes,
 * booth flags, campfire pit, the seats behind the fire, the flame, the seats
 * in front.
 */
export function plazaWorld(scene: IslandScene, input: PlazaInput): PlazaWorld {
  const { festival, pins, campfire } = input;
  if (!festival && !pins && !campfire) return NO_PLAZA;

  const c = plazaCentre(scene);
  const at = ([dx, dy]: Point) => ({ x: c.x + dx, y: c.y + dy });
  const box = (r: SceneRect): SceneRect => ({ x: c.x + r.x, y: c.y + r.y, w: r.w, h: r.h });
  const still = (name: MotionSpriteName, p: { x: number; y: number }, flip = false): LiveActor =>
    flip ? { frames: [name], ...p, flip: true } : { frames: [name], ...p };

  const actors: LiveActor[] = [];
  const spots: PlazaSpot[] = [];
  const labels: PlazaLabel[] = [];
  const L = PLAZA_LAYOUT;

  // The island goal, over the banner (the night festoon's own spot), lit bulb by bulb.
  if (festival?.lanterns && scene.banner) {
    const string = { x: scene.banner.x, y: scene.banner.y };
    actors.push(still("goal_string", string));
    const lit = count(festival.lanterns.lit, GOAL_BULB_SPOTS.length);
    for (let i = 0; i < lit; i++) {
      const [dx, dy] = GOAL_BULB_SPOTS[i];
      actors.push(still("goal_bulb", { x: string.x + dx, y: string.y + dy }));
    }
  }

  if (festival) {
    const step = count(festival.stageStep, STAGES.length - 1);
    actors.push(still(STAGES[step], at(L.stage)));
    actors.push(still("fest_sign", at(L.sign)));
  }

  if (pins) {
    actors.push(still("notice_board", at(L.noticeBoard)));
    pins.slice(0, MAX_NOTES).forEach((kind, i) => {
      const name = NOTES[kind];
      if (name) actors.push(still(name, at(L.notes[i])));
    });
    spots.push(spotOf("notice", box(L.noticeSpot), scene));
  }

  if (festival) {
    // Only trees the viewer already sees in full: a plain plot arrives as stage 0.
    const trees = new Map(scene.trees.filter((t) => t.stage > 0).map((t) => [t.slot, t]));
    for (const booth of festival.booths) {
      const tree = trees.get(booth.slot);
      if (!tree) continue;
      actors.push(still(booth.kind === "stage" ? "star_flag" : "booth_flag", boothFlagAt(tree, scene)));
    }
    spots.push(spotOf("stage", box(L.stageSpot), scene));
    labels.push(labelOf("sign", at(L.signLabel), "bottom", scene));
  }

  if (campfire) {
    const people = count(campfire.count);
    // Nobody at the fire: a cold pit (no embers, no glow at night); the lit pit only under a flame.
    actors.push(still(people > 0 ? "campfire_pit" : "campfire_pit_cold", at(L.pit)));
    if (people > 0) {
      const seated = Math.min(people, MAX_SEATS);
      const seat = (i: number): LiveActor => {
        const [dx, dy] = L.seats[i];
        const frames = SITTERS[i % SITTERS.length];
        const actor: LiveActor = { frames: i % 2 === 1 ? [...frames].reverse() : frames, ...at([dx, dy]), frameMs: SIT_MS };
        return dx > FIRE_X ? { ...actor, flip: true } : actor;
      };
      const order = Array.from({ length: seated }, (_, i) => i);
      for (const i of order) if (L.seats[i][1] < FRONT_Y) actors.push(seat(i));
      actors.push({ frames: ACTOR_FRAMES.campfireFlame, ...at(L.flame), frameMs: FLAME_MS });
      for (const i of order) if (L.seats[i][1] >= FRONT_Y) actors.push(seat(i));
      labels.push(labelOf("campfireCount", at(L.campfireCount), "bottom", scene));
      if (people > MAX_SEATS) labels.push(labelOf("campfireMore", at(L.campfireMore), "left", scene));
    }
    spots.push(spotOf("campfire", box(L.campfireSpot), scene));
  }

  return { actors, spots, labels };
}
