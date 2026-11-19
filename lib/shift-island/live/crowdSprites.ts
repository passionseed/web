/**
 * The plaza's people, made from the island's own figures: the plot visitor
 * (SPRITES.visitor) standing, breathing, blinking, walking (four frames) and
 * waving, and the story's tester (MOTION_SPRITES.tester_0/1) looking at a
 * phone. Each outfit swaps two palette keys (hair and shirt), so a crowd is a
 * crowd and not clones, and the picture stays in the island's palette in
 * every light. The bot's sprites are never changed: these exist only in the
 * web's atlas (allSprites), and the bot never draws them.
 *
 * Pure and client-safe. Names: crowd_<pose>_<hair><shirt>, e.g. crowd_stand_of.
 */
import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { SPRITES } from "@/bot/assets/island/sprites";

import { blinkRows, settleRows } from "./people";

export type CrowdPose = "stand" | "rest" | "blink" | WalkPose | "wave0" | "wave1" | "phone0" | "phone1";
/** The walk cycle in order: a step (body down a pixel), passing (a foot up), the other step, passing again. */
export type WalkPose = "walk0" | "walk1" | "walk2" | "walk3";
export const WALK_CYCLE: readonly WalkPose[] = ["walk0", "walk1", "walk2", "walk3"];
export const CROWD_POSES: readonly CrowdPose[] = ["stand", "rest", "blink", ...WALK_CYCLE, "wave0", "wave1", "phone0", "phone1"];

/** Two palette keys: hair and shirt. */
export interface Outfit {
  hair: string;
  shirt: string;
}

/**
 * The crowd's outfits, in the order figures take them (by figure, never by
 * person). Nine, so dropping the viewer's team colour still leaves eight.
 * No green shirts: most of the crowd stands on grass.
 */
export const CROWD_OUTFITS: readonly Outfit[] = [
  { hair: "o", shirt: "f" },
  { hair: "b", shirt: "y" },
  { hair: "o", shirt: "v" },
  { hair: "z", shirt: "r" },
  { hair: "o", shirt: "a" },
  { hair: "b", shirt: "p" },
  { hair: "o", shirt: "w" },
  { hair: "c", shirt: "e" },
  { hair: "z", shirt: "u" },
];

/**
 * A team's shirt: the palette key nearest its tree's leaf colour (the colour
 * the team already chose for its tree). Forest is the darker green so it
 * still reads on grass.
 */
export const TEAM_SHIRTS: Readonly<Record<string, string>> = {
  "leaf:forest": "l",
  "leaf:autumn": "r",
  "leaf:mint": "v",
  "leaf:gold": "y",
  "leaf:dusk": "w",
  "leaf:sky": "u",
};
export const DEFAULT_TEAM_SHIRT = TEAM_SHIRTS["leaf:forest"];
/** Hair for the viewer and their teammates, in figure order. */
export const TEAM_HAIRS: readonly string[] = ["o", "b"];

/** The team's shirt for a leaf item id (the tree's equipped leaf); the default green for anything else. */
export function teamShirt(leaf: string | null | undefined): string {
  return (leaf && TEAM_SHIRTS[leaf]) || DEFAULT_TEAM_SHIRT;
}

/** The atlas name of a pose in an outfit. */
export function crowdSprite(pose: CrowdPose, outfit: Outfit): string {
  return `crowd_${pose}_${outfit.hair}${outfit.shirt}`;
}

/**
 * The visitor's legs (rows 10 to 13) through a walk, facing left as it does:
 * the near foot out in front, passing with the back foot lifted, the other
 * foot out in front, passing with the near foot lifted.
 */
const WALK_LEGS: Record<WalkPose, readonly string[]> = {
  walk0: ["...ozzo...", "..ozzzzo..", "..oz.ozo..", ".oo..oo..."],
  walk1: ["...ozzo...", "..ozzzo...", "..oz.zoo..", "..oo..o..."],
  walk2: ["...ozzo...", "...ozzzo..", "..ozo.zo..", "..oo..oo.."],
  walk3: ["...ozzo...", "..ozzzo...", "..oo.zo...", ".....oo..."],
};

/** The arms (rows 7 and 8) on each step: the hand on the side of the leading foot swings back out of sight. */
const WALK_ARMS: Partial<Record<WalkPose, readonly string[]>> = {
  walk0: [".okaaaao..", ".okaaaako."],
  walk2: ["..oaaaako.", ".okaaaako."],
};

/** On a step (walk0, walk2) the body is a pixel lower: the shirt's hem (row 9) gives way. */
const HEM = 9;
/** The visitor's eye, which a blink closes. */
const EYE = [4, 4] as const;

function walkFrame(pose: WalkPose): string[] {
  const rows = [...SPRITES.visitor.slice(0, 10), ...WALK_LEGS[pose]];
  const arms = WALK_ARMS[pose];
  if (!arms) return rows;
  rows.splice(7, 2, ...arms);
  return settleRows(rows, HEM);
}

/** The visitor's far arm raised, hand high (wave0) and a pixel lower (wave1), rows 0 to 9. */
const WAVE_TOP: Record<"wave0" | "wave1", readonly string[]> = {
  wave0: [
    "...oooo...",
    "..obbbbo..",
    "..obbbbooo",
    "..okkkkoko",
    "..okokkoko",
    "...okkooko",
    "..oaaaaoko",
    ".okaaaaao.",
    ".okaaaao..",
    "..oaaaao..",
  ],
  wave1: [
    "...oooo...",
    "..obbbbo..",
    "..obbbbo..",
    "..okkkkooo",
    "..okokkoko",
    "...okkooko",
    "..oaaaaoko",
    ".okaaaaao.",
    ".okaaaao..",
    "..oaaaao..",
  ],
};

/** Each pose's grid in the visitor's own keys (b hair, a shirt) or the tester's (c hair, v shirt). */
function baseGrids(): Record<CrowdPose, { rows: string[]; hair: string; shirt: string }> {
  const visitor = SPRITES.visitor;
  return {
    stand: { rows: visitor, hair: "b", shirt: "a" },
    rest: { rows: settleRows(visitor, HEM), hair: "b", shirt: "a" },
    blink: { rows: blinkRows(visitor, EYE), hair: "b", shirt: "a" },
    ...(Object.fromEntries(WALK_CYCLE.map((pose) => [pose, { rows: walkFrame(pose), hair: "b", shirt: "a" }])) as Record<
      WalkPose,
      { rows: string[]; hair: string; shirt: string }
    >),
    wave0: { rows: [...WAVE_TOP.wave0, ...visitor.slice(10)], hair: "b", shirt: "a" },
    wave1: { rows: [...WAVE_TOP.wave1, ...visitor.slice(10)], hair: "b", shirt: "a" },
    phone0: { rows: MOTION_SPRITES.tester_0, hair: "c", shirt: "v" },
    phone1: { rows: MOTION_SPRITES.tester_1, hair: "c", shirt: "v" },
  };
}

function recolour(rows: readonly string[], from: { hair: string; shirt: string }, to: Outfit): string[] {
  return rows.map((row) =>
    Array.from(row, (ch) => (ch === from.hair ? to.hair : ch === from.shirt ? to.shirt : ch)).join(""),
  );
}

/** Every outfit the plaza can draw: the crowd's, and the viewer's team's in every team colour. */
export function allOutfits(): Outfit[] {
  const seen = new Map<string, Outfit>();
  const add = (o: Outfit) => seen.set(`${o.hair}${o.shirt}`, o);
  CROWD_OUTFITS.forEach(add);
  for (const shirt of new Set(Object.values(TEAM_SHIRTS))) for (const hair of TEAM_HAIRS) add({ hair, shirt });
  return [...seen.values()];
}

let cached: Record<string, string[]> | null = null;

/** Every crowd sprite by atlas name (computed once). All are 10 x 14, the visitor's size. */
export function crowdSprites(): Record<string, string[]> {
  if (cached) return cached;
  const out: Record<string, string[]> = {};
  const bases = baseGrids();
  for (const outfit of allOutfits()) {
    for (const pose of CROWD_POSES) {
      const base = bases[pose];
      out[crowdSprite(pose, outfit)] = recolour(base.rows, base, outfit);
    }
  }
  cached = out;
  return out;
}
