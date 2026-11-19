/**
 * The plaza as a place to gather: the quest notice board, the Demo Day
 * festival (the stage under its D-10 countdown, lantern string, booth flags and stars), the Demo
 * Day prize board, the voice campfire and the merchant ship moored offshore (ship.ts), as LiveActors the existing engine draws above the trees, plus
 * where the DOM tap targets go and the one label the island still prints
 * (the viewer's small คุณ tag; the countdown board draws its own days). Pure
 * and client-safe.
 *
 * Opt-in: with nothing to show it returns NO_PLAZA, so the canvas stays the
 * bot's PNG by day. Everything sits at fixed offsets from the plaza centre,
 * which never moves as the island grows; plaza.test.ts proves every piece
 * stays clear of trees, tags, decorations, paths, pins, lamps and other plots'
 * tap targets for islands of every size.
 *
 * Privacy: people sit only at the campfire, one figure per seat, the variant
 * chosen by seat order (never by person). Booths carry a slot and a kind only.
 * Today's visitors (crowd.ts) are anonymous figures except the viewer's own
 * and, for the viewer's team only, their teammates; when the plaza is busy a
 * few of them sit in the campfire seats the coworking room leaves empty.
 *
 * Plan: docs/designs/shift-high-island-web.md, "Festival, notice board, voice
 * campfire, canvas link", and docs/designs/shift-island-plaza-visitors.md.
 */
import { ACTOR_FRAMES, GOAL_BULB_SPOTS, MOTION_SIZES, type MotionSpriteName } from "@/bot/assets/island/motion-sprites";
import type { IslandScene, SceneRect, SceneTree } from "@/bot/src/quests/island/scene";
import type { Festival } from "@/lib/shift-island/festival";
import type { NoticeKind } from "@/lib/shift-island/notice";

import { ARRIVE_MS, CROWD_LAYOUT, crowdActors, crowdPlan, type CrowdPlan, type VisitorsInput } from "./crowd";
import type { Figure } from "./figures";
import { shipAnchor, SHIP_SIZE } from "./ship";
import type { LiveActor } from "./types";

/** Seats drawn round the campfire; the campfire's sheet counts everyone in the room. */
export const MAX_SEATS = 8;

export interface PlazaInput {
  festival: Festival | null;
  /** The pinned notes, in pin order (at most 3 are drawn); null = no notice board. */
  pins: NoticeKind[] | null;
  /** null = no campfire (no coworking channel, or no data). */
  campfire: { count: number } | null;
  /** true draws the Demo Day prize board and its tap target; it carries no data. */
  prizes?: boolean;
  /** Today's visitors (crowd.ts); null, absent or a count of 0 draws nobody. */
  visitors?: VisitorsInput | null;
  /** true moors the merchant ship (the shop, ship.ts) off the coast nearest the plaza; it carries no data. */
  ship?: boolean;
}

export type PlazaSpotId = "notice" | "stage" | "campfire" | "prizes" | "ship";

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
  /**
   * The actors that draw it, by index into PlazaWorld.actors: the shape the
   * interact outline traces (interact.ts). The campfire's are its pit and
   * flame, not the people sitting round it.
   */
  actors: number[];
}

/**
 * The only word always on the island: the viewer's small คุณ tag (the Demo
 * Day stage's countdown board is pixel art, with the days on its face).
 * Everything else is said on a tap (founder, 2026-11-18, "dont clutter"): the
 * notice board opens the board, the campfire its sheet with the count, and a
 * person says the day's count.
 */
export type PlazaLabelId = "me";

/**
 * Labels out of sight while anyone's speech bubble is open (FigureBubble):
 * the viewer's คุณ tag stands over their head, where a bubble opens, so a
 * bubble never overlaps it. It comes back when the bubble closes.
 */
export const QUIET_WHILE_TALKING: ReadonlySet<PlazaLabelId> = new Set<PlazaLabelId>(["me"]);

/** A DOM label's anchor point, percent of the picture. bottom = translate(-50%, -100%), left = translate(0, -50%). */
export interface PlazaLabel {
  id: PlazaLabelId;
  x: number;
  y: number;
  anchor: "bottom" | "left";
  /** Shown only after this long (the viewer's tag waits for their arrival walk); absent shows at once. */
  delayMs?: number;
}

export interface PlazaWorld {
  actors: LiveActor[];
  spots: PlazaSpot[];
  labels: PlazaLabel[];
  /** The people among the actors, each with its actor's index: what a tap on one says (figures.ts). */
  figures: Figure[];
}

/** Nothing on the plaza: one shared value, so the engine's actors never change. */
export const NO_PLAZA: PlazaWorld = { actors: [], spots: [], labels: [], figures: [] };

type Point = readonly [number, number];

/**
 * Where everything goes, in native px from the plaza centre (top-left corners
 * and sizes). The plaza is 160 x 80 px (x -80..80, y -32..48) with the well in
 * its middle: the everyday pieces stand left of the well (notice board at the
 * back, campfire at the front), Demo Day's right of it (the stage under its
 * countdown at the back, the prize board at the front). Spot boxes keep off
 * the corner lamp posts, the well and each other.
 */
export const PLAZA_LAYOUT = {
  noticeBoard: [-68, -26] as Point,
  notes: [[-65, -23], [-59, -24], [-52, -23]] as readonly Point[],
  noticeSpot: { x: -70, y: -30, w: 28, h: 30 },
  /** The countdown board stands behind the stage; its posts go down behind the stage's back. */
  countdown: [24, -40] as Point,
  stage: [24, -22] as Point,
  stageSpot: { x: 24, y: -40, w: 44, h: 50 },
  /** The goal string's bulbs sit on the festival banner (the festoon spot); booth flags from each tree's corner. */
  boothFlag: [4, 22] as Point,
  pit: [-42, 26] as Point,
  flame: [-40, 18] as Point,
  /** In fill order: front pair, back pair, outer front pair, outer back pair. */
  seats: [[-52, 34], [-26, 34], [-50, 14], [-28, 14], [-66, 32], [-12, 32], [-64, 16], [-14, 16]] as readonly Point[],
  campfireSpot: { x: -71, y: 12, w: 72, h: 32 },
  /** Front right of the plaza, under the stage, off the bottom right lamp. */
  prizeBoard: [50, 14] as Point,
  prizeSpot: { x: 47, y: 12, w: 24, h: 24 },
} as const;

/** The countdown's glyphs stand on the board's dark face: 40 x 12 px from (2, 2), glyphs 6 x 10 with 2 px between. */
const COUNT_FACE = { x: 2, y: 2, w: 40, h: 12 } as const;
const GLYPH_W = 6;
const GLYPH_GAP = 2;
const GLYPH_H = 10;
/** The most days the board shows; a longer wait reads 999. */
const MAX_COUNT = 999;

/**
 * The countdown board's text as glyph sprites: "D-10" before Demo Day,
 * "D-DAY" on it, nothing after it (or for a count that is not a number).
 */
export function countdownGlyphs(daysToDemo: number): MotionSpriteName[] {
  if (!Number.isFinite(daysToDemo) || daysToDemo < 0) return [];
  if (Math.floor(daysToDemo) === 0) return ["count_d", "count_dash", "count_d", "count_a", "count_y"];
  const digits = String(Math.min(MAX_COUNT, Math.floor(daysToDemo))).split("");
  return ["count_d", "count_dash", ...digits.map((d) => `count_${d}` as MotionSpriteName)];
}

/** Seats right of this (native px from the plaza centre) face left, towards the fire. */
const FIRE_X = -35;
/** Seats with their top above this sit behind the fire (drawn before the flame). */
const FRONT_Y = 25;
const FLAME_MS = 250;
const SIT_MS = 1100;
/** The merchant ship rocks on its mooring: one frame each way. */
const SHIP_MS = 900;
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
function spotOf(id: PlazaSpotId, box: SceneRect, scene: IslandScene, actors: number[]): PlazaSpot {
  const x0 = Math.max(0, box.x);
  const y0 = Math.max(0, box.y);
  const x1 = Math.min(scene.width, box.x + box.w);
  const y1 = Math.min(scene.height, box.y + box.h);
  const left = round4((x0 / scene.width) * 100);
  const right = round4((x1 / scene.width) * 100);
  const top = round4((y0 / scene.height) * 100);
  const bottom = round4((y1 / scene.height) * 100);
  return { id, x: left, y: top, w: round4(right - left), h: round4(bottom - top), actors };
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
 * in draw order: the merchant ship, goal string, lit bulbs, countdown board and its glyphs, stage, notice board, notes,
 * booth flags, prize board, campfire pit, the seats behind the fire, the
 * flame, the seats in front, then today's visitors (crowd.ts: strollers,
 * teammates, the viewer). Spots: ship, notice, stage, prizes, campfire (no
 * word floats over the ship: its button's name says it is the shop, and the
 * interact outline traces its sprite). Labels: the viewer's tag only (PlazaLabelId).
 * Figures: today's visitors standing or walking (the campfire's sitters
 * belong to the campfire's own tap target).
 */
export function plazaWorld(scene: IslandScene, input: PlazaInput): PlazaWorld {
  const { festival, pins, campfire } = input;
  const prizes = input.prizes === true;
  const crowd = plazaCrowd(input);
  const visitors = crowd.me || crowd.team + crowd.strollers + crowd.sitters + crowd.more > 0;
  const ship = input.ship === true ? shipAnchor(scene, plazaCentre(scene)) : null;
  if (!festival && !pins && !campfire && !prizes && !visitors && !ship) return NO_PLAZA;

  const c = plazaCentre(scene);
  const at = ([dx, dy]: Point) => ({ x: c.x + dx, y: c.y + dy });
  const box = (r: SceneRect): SceneRect => ({ x: c.x + r.x, y: c.y + r.y, w: r.w, h: r.h });
  const still = (name: MotionSpriteName, p: { x: number; y: number }, flip = false): LiveActor =>
    flip ? { frames: [name], ...p, flip: true } : { frames: [name], ...p };

  const actors: LiveActor[] = [];
  const spots: PlazaSpot[] = [];
  const labels: PlazaLabel[] = [];
  const figures: Figure[] = [];
  const L = PLAZA_LAYOUT;

  // The merchant ship first: it floats on the sea, under everything on land.
  if (ship) {
    spots.push(spotOf("ship", { ...ship, ...SHIP_SIZE }, scene, [actors.length]));
    actors.push({ frames: ACTOR_FRAMES.merchantShip, ...ship, frameMs: SHIP_MS });
  }

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

  /** The stage's actors: the countdown board, its glyphs and the stage. */
  const stageParts: number[] = [];
  if (festival) {
    // The countdown first: the stage covers the foot of its posts.
    const board = at(L.countdown);
    stageParts.push(actors.length);
    actors.push(still("fest_count", board));
    const glyphs = countdownGlyphs(festival.daysToDemo);
    const width = glyphs.length * GLYPH_W + Math.max(0, glyphs.length - 1) * GLYPH_GAP;
    const left = board.x + COUNT_FACE.x + Math.floor((COUNT_FACE.w - width) / 2);
    const top = board.y + COUNT_FACE.y + Math.floor((COUNT_FACE.h - GLYPH_H) / 2);
    glyphs.forEach((glyph, i) => {
      stageParts.push(actors.length);
      actors.push(still(glyph, { x: left + i * (GLYPH_W + GLYPH_GAP), y: top }));
    });
    const step = count(festival.stageStep, STAGES.length - 1);
    stageParts.push(actors.length);
    actors.push(still(STAGES[step], at(L.stage)));
  }

  if (pins) {
    const board = [actors.length];
    actors.push(still("notice_board", at(L.noticeBoard)));
    pins.slice(0, MAX_NOTES).forEach((kind, i) => {
      const name = NOTES[kind];
      if (!name) return;
      board.push(actors.length);
      actors.push(still(name, at(L.notes[i])));
    });
    spots.push(spotOf("notice", box(L.noticeSpot), scene, board));
  }

  if (festival) {
    // Only trees the viewer already sees in full: a plain plot arrives as stage 0.
    const trees = new Map(scene.trees.filter((t) => t.stage > 0).map((t) => [t.slot, t]));
    for (const booth of festival.booths) {
      const tree = trees.get(booth.slot);
      if (!tree) continue;
      actors.push(still(booth.kind === "stage" ? "star_flag" : "booth_flag", boothFlagAt(tree, scene)));
    }
    spots.push(spotOf("stage", box(L.stageSpot), scene, stageParts));
  }

  if (prizes) {
    spots.push(spotOf("prizes", box(L.prizeSpot), scene, [actors.length]));
    actors.push(still("prize_board", at(L.prizeBoard)));
  }

  if (campfire) {
    const people = count(campfire.count);
    // The fire welcomes visitors even when Discord has no seated coworkers.
    const fire = [actors.length];
    actors.push(still("campfire_pit", at(L.pit)));
    // Seats the coworking room leaves empty may take a few of today's visitors (crowd.sitters).
    const seated = Math.min(people, MAX_SEATS) + crowd.sitters;
    if (seated > 0) {
      const seat = (i: number): LiveActor => {
        const [dx, dy] = L.seats[i];
        const frames = SITTERS[i % SITTERS.length];
        const actor: LiveActor = { frames: i % 2 === 1 ? [...frames].reverse() : frames, ...at([dx, dy]), frameMs: SIT_MS };
        return dx > FIRE_X ? { ...actor, flip: true } : actor;
      };
      const order = Array.from({ length: seated }, (_, i) => i);
      for (const i of order) if (L.seats[i][1] < FRONT_Y) actors.push(seat(i));
      fire.push(actors.length);
      actors.push({ frames: ACTOR_FRAMES.campfireFlame, ...at(L.flame), frameMs: FLAME_MS });
      for (const i of order) if (L.seats[i][1] >= FRONT_Y) actors.push(seat(i));
    } else {
      fire.push(actors.length);
      actors.push({ frames: ACTOR_FRAMES.campfireFlame, ...at(L.flame), frameMs: FLAME_MS });
    }
    spots.push(spotOf("campfire", box(L.campfireSpot), scene, fire));
  }

  if (visitors) {
    const cast = crowdActors(c, input.visitors!, crowd);
    const first = actors.length;
    actors.push(...cast.actors);
    figures.push(...cast.figures.map((f) => ({ ...f, actor: first + f.actor! })));
    // The day's count is no label: a tap on anyone says it (figureLine.ts), and the people button names it.
    if (crowd.me) {
      const tag = labelOf("me", at(CROWD_LAYOUT.meTag), "bottom", scene);
      labels.push(input.visitors?.arriving ? { ...tag, delayMs: ARRIVE_MS } : tag);
    }
  }

  return { actors, spots, labels, figures };
}

/**
 * Who of today's visitors the plaza draws for this input: the campfire lends
 * its empty seats (none without a campfire). The page uses it too, to know
 * whether teammates stand in the plaza.
 */
export function plazaCrowd(input: Pick<PlazaInput, "campfire" | "visitors">): CrowdPlan {
  const free = input.campfire ? MAX_SEATS - Math.min(count(input.campfire.count), MAX_SEATS) : 0;
  return crowdPlan(input.visitors, free);
}
