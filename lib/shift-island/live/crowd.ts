/**
 * The plaza's people: one small figure for each person who checked in today
 * (the Bangkok day), as LiveActors the living island draws. Pure and
 * client-safe; plaza.ts places them with everything else on the plaza.
 *
 * Who is who: the viewer's own figure (only when they checked in, from their
 * own page data) stands at home with their tag over it, and walks in up the
 * path when their check-in lands. Their teammates (a count from the
 * database, shown only to their own team) stand beside them in the team's
 * colour. Everyone else is anonymous: outfit, route and pose go by figure
 * order, never by person, and the actors carry no id, name or team.
 *
 * Life: strollers walk a short route, pause, wave or look at a phone, and
 * walk back, each out of step with the others; when the plaza is busy a few
 * sit by the campfire in seats the coworking room leaves empty (plaza.ts).
 * Under reduced motion everyone stands still where their first frame puts
 * them, and the viewer is already home.
 *
 * Plan: docs/designs/shift-island-plaza-visitors.md.
 */
import { CROWD_OUTFITS, TEAM_HAIRS, crowdSprite, type CrowdPose, type Outfit } from "./crowdSprites";
import type { LiveActor, LiveStep } from "./types";

/** Figures drawn at most, the viewer and their teammates included; more people show as "+N". */
export const MAX_VISITORS = 8;
/** Teammates drawn beside the viewer at most. */
export const MAX_TEAM = 3;
/** Visitors who sit by the campfire at most, in seats nobody in the coworking room is using. */
export const MAX_GUESTS = 2;
/** Anonymous figures drawn before any of them sits down: "a few sit when there are many". */
export const SIT_FROM = 4;
/** One step per tick: 8 native px a second, a stroll. */
export const STEP_MS = 125;

type Point = readonly [number, number];

/**
 * Where everyone goes, in native px from the plaza centre (top-left corners
 * of 10 x 14 figures). Routes are straight lines; the tests walk every frame
 * of every route past every tree, tag, pin, lamp, path-free fixture and
 * plaza piece for islands of every size.
 */
export const CROWD_LAYOUT = {
  /** The viewer's place: the front of the plaza, where the path comes in from the island. */
  home: [2, 34] as Point,
  /** Where the viewer's arrival starts: down the path, above the trees below. */
  enter: [2, 57] as Point,
  /** Teammates, in fill order, to the viewer's right. */
  team: [[13, 34], [24, 34], [35, 34]] as readonly Point[],
  /**
   * Strollers' routes, in fill order: from, to. Clear of the plaza's labels
   * too (the campfire's count), so no figure walks under one.
   */
  routes: [
    // In front of the stage, short of the prize board.
    [[22, 12], [38, 12]],
    // The meadow below the campfire, left of the path in.
    [[-60, 52], [-30, 52]],
    // The grass right of the stage, between the two paths in.
    [[82, -12], [82, 4]],
    // Above the well, under the bunting.
    [[-12, -27], [0, -27]],
    // Beside the notice board, between it and the well.
    [[-36, -31], [-36, -17]],
  ] as readonly (readonly [Point, Point])[],
  /** The day's count (and the team's line), bottom anchored under the crowd. */
  label: [50, 70] as Point,
  /** The viewer's tag, bottom anchored over their head. */
  meTag: [7, 33] as Point,
} as const;

/** The plaza's input for the people (plaza.ts PlazaInput.visitors). */
export interface VisitorsInput {
  /** Everyone with a check-in today, the viewer included. */
  count: number;
  /** The viewer's teammates among them (the viewer's own team only). */
  team: number;
  /** The viewer checked in today: one figure is theirs. */
  me: boolean;
  /** Their check-in just landed: their figure walks in (once). */
  arriving?: boolean;
  /** The team's shirt, a palette key (teamShirt); the crowd never wears it. */
  shirt?: string | null;
}

/** How many of each kind are drawn, and how many are left over for "+N". */
export interface CrowdPlan {
  me: boolean;
  team: number;
  strollers: number;
  sitters: number;
  more: number;
}

export const NO_CROWD: CrowdPlan = { me: false, team: 0, strollers: 0, sitters: 0, more: 0 };

const whole = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

/**
 * Who is drawn for this input, with `freeSeats` empty campfire seats: the
 * viewer first, then up to three teammates, then everyone else (strolling,
 * and from the fourth of them two sit by the fire when seats are free), at
 * most eight in all; the rest is "+N". Zero people: nothing at all.
 */
export function crowdPlan(input: VisitorsInput | null | undefined, freeSeats: number): CrowdPlan {
  if (!input) return NO_CROWD;
  const count = whole(input.count);
  if (count === 0) return NO_CROWD;
  const me = input.me === true;
  const mine = me ? 1 : 0;
  const teamAll = Math.min(whole(input.team), count - mine);
  const team = Math.min(teamAll, MAX_TEAM, MAX_VISITORS - mine);
  const others = count - mine - teamAll;
  const drawn = Math.min(others, MAX_VISITORS - mine - team);
  const sitters = drawn >= SIT_FROM ? Math.min(MAX_GUESTS, whole(freeSeats)) : 0;
  const strollers = Math.min(drawn - sitters, CROWD_LAYOUT.routes.length);
  return { me, team, strollers, sitters, more: count - mine - team - strollers - sitters };
}

/** Frames and steps, built one frame at a time. */
class Script {
  frames: string[] = [];
  steps: LiveStep[] = [];
  private dx = 0;
  private dy = 0;
  constructor(
    private readonly outfit: Outfit,
    private flip: boolean,
  ) {}

  private push(pose: CrowdPose): void {
    this.frames.push(crowdSprite(pose, this.outfit));
    this.steps.push({ dx: this.dx, dy: this.dy, flip: this.flip });
  }

  stand(n: number): this {
    for (let i = 0; i < n; i++) this.push("stand");
    return this;
  }

  /** Turn to face the other way (the visitor faces left unmirrored). */
  turn(): this {
    this.flip = !this.flip;
    return this;
  }

  /** One native px a frame along a straight line, the stride every other pair of frames. */
  walkTo(dx: number, dy: number): this {
    const sx = Math.sign(dx - this.dx);
    const sy = Math.sign(dy - this.dy);
    if (sx !== 0) this.flip = sx > 0;
    let i = 0;
    while (this.dx !== dx || this.dy !== dy) {
      if (this.dx !== dx) this.dx += sx;
      if (this.dy !== dy) this.dy += sy;
      this.push(i % 4 < 2 ? "stride" : "stand");
      i++;
    }
    return this;
  }

  wave(n: number): this {
    for (let i = 0; i < n; i++) this.push(i % 4 < 2 ? "wave0" : "wave1");
    return this;
  }

  phone(n: number): this {
    for (let i = 0; i < n; i++) this.push(i % 8 < 4 ? "phone0" : "phone1");
    return this;
  }

  /** Started `by` frames later: figures on the same script stay out of step. */
  rotated(by: number): { frames: string[]; steps: LiveStep[] } {
    const n = this.frames.length;
    const k = ((by % n) + n) % n;
    return { frames: [...this.frames.slice(k), ...this.frames.slice(0, k)], steps: [...this.steps.slice(k), ...this.steps.slice(0, k)] };
  }
}

/** The anonymous crowd's outfits for this viewer: never their team's shirt, so teammates stand out. */
function crowdOutfits(teamShirt: string | null | undefined): readonly Outfit[] {
  return teamShirt ? CROWD_OUTFITS.filter((o) => o.shirt !== teamShirt) : CROWD_OUTFITS;
}

function teamOutfit(shirt: string, i: number): Outfit {
  return { hair: TEAM_HAIRS[i % TEAM_HAIRS.length], shirt };
}

/** A stroller: out and back along route i, a pause, a wave or a look at the phone, out of step with the rest. */
function stroller(i: number, outfit: Outfit, at: (p: Point) => { x: number; y: number }): LiveActor {
  const [from, to] = CROWD_LAYOUT.routes[i];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const s = new Script(outfit, false).stand(8).walkTo(dx, dy).stand(6);
  if (i % 2 === 0) s.wave(8);
  else s.phone(16);
  s.stand(6).walkTo(0, 0).stand(12);
  return { ...at(from), frameMs: STEP_MS, ...s.rotated(i * 29) };
}

/** A teammate in place: facing the viewer, a wave or a phone, a look round. */
function teammate(i: number, outfit: Outfit, at: (p: Point) => { x: number; y: number }): LiveActor {
  // Teammates stand right of the viewer: they face left (unmirrored), towards them.
  const s = new Script(outfit, false).stand(20 + i * 6);
  if (i % 2 === 0) s.phone(16);
  else s.wave(8);
  s.stand(24).turn().stand(12).turn().stand(16);
  return { ...at(CROWD_LAYOUT.team[i]), frameMs: STEP_MS, ...s.rotated(i * 17) };
}

/** The viewer at home: mostly still, a wave now and then (their tag stays over their head). */
function meAtHome(outfit: Outfit, at: (p: Point) => { x: number; y: number }): LiveActor {
  const s = new Script(outfit, true).stand(24).wave(8).stand(40).phone(16).stand(24);
  return { ...at(CROWD_LAYOUT.home), frameMs: STEP_MS, frames: s.frames, steps: s.steps };
}

/** The viewer's arrival: up the path to home, a wave, then still at home (played once). */
function meArriving(outfit: Outfit, at: (p: Point) => { x: number; y: number }): LiveActor {
  const [hx, hy] = CROWD_LAYOUT.home;
  const [ex, ey] = CROWD_LAYOUT.enter;
  const s = new Script(outfit, true).stand(2).walkTo(hx - ex, hy - ey).stand(2).wave(8).stand(1);
  return { ...at(CROWD_LAYOUT.enter), frameMs: STEP_MS, frames: s.frames, steps: s.steps, once: true };
}

/** How long the viewer's arrival walk takes, ms: when their tag shows, and when the page lets it go. */
export const ARRIVE_MS = (() => {
  const s = meArriving({ hair: "o", shirt: "l" }, () => ({ x: 0, y: 0 }));
  return s.frames.length * STEP_MS;
})();

export interface CrowdActors {
  /** Strollers, teammates and the viewer, in draw order (back to front). */
  actors: LiveActor[];
  plan: CrowdPlan;
}

/**
 * The crowd's actors for a plan, at `c` (the plaza centre, native px). The
 * campfire's sitters are plaza.ts's: they take the seats there.
 */
export function crowdActors(c: { x: number; y: number }, input: VisitorsInput, plan: CrowdPlan): LiveActor[] {
  const at = ([dx, dy]: Point) => ({ x: c.x + dx, y: c.y + dy });
  const outfits = crowdOutfits(input.shirt);
  const strollers = Array.from({ length: plan.strollers }, (_, i) => stroller(i, outfits[i % outfits.length], at));
  // Back to front: the routes behind the well and the stage first, the meadow (route 0) with the team.
  const back = strollers.slice(1);
  const front = strollers.slice(0, 1);
  const shirt = input.shirt ?? null;
  const team = Array.from({ length: plan.team }, (_, i) =>
    teammate(i, shirt ? teamOutfit(shirt, i + 1) : outfits[(plan.strollers + i) % outfits.length], at),
  );
  const own = shirt ? teamOutfit(shirt, 0) : outfits[(plan.strollers + plan.team) % outfits.length];
  const me = plan.me ? [input.arriving ? meArriving(own, at) : meAtHome(own, at)] : [];
  return [...back, ...front, ...team, ...me];
}
