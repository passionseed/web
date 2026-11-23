/**
 * @jest-environment node
 */
import { MOTION_SIZES, MOTION_SPRITES, type MotionSpriteName } from "@/bot/assets/island/motion-sprites";
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";
import { buildScene, tagRect, type IslandPlot, type IslandScene, type SceneTree } from "@/bot/src/quests/island/scene";
import type { Festival } from "@/lib/shift-island/festival";

import { allSprites } from "../atlas";
import { actorFrame, motionAt, stillFrame } from "../clock";
import {
  ARRIVE_MS,
  CROWD_LAYOUT,
  MAX_GUESTS,
  MAX_TEAM,
  MAX_VISITORS,
  NO_CROWD,
  SIT_FROM,
  STEP_MS,
  crowdPlan,
  type VisitorsInput,
} from "../crowd";
import { CROWD_OUTFITS, CROWD_POSES, TEAM_SHIRTS, WALK_CYCLE, allOutfits, crowdSprite, crowdSprites, teamShirt } from "../crowdSprites";
import { actorAt, actorRect, lampRects, sceneModel } from "../draw";
import { sinceFor } from "../engine";
import { overlaps, union, type Rect } from "../geometry";
import { MAX_SEATS, NO_PLAZA, plazaCentre, plazaCrowd, plazaWorld, type PlazaInput, type PlazaLabel, type PlazaWorld } from "../plaza";
import { signpostFor, wholeUnit } from "../signposts";
import type { LiveActor } from "../types";

const SIZES = [1, 3, 8, 12, 20, 40, 80, 150];
const GLYPHS = [1, 2, 3];
const TAP = 24;
const PERSON = { w: 10, h: 14 };

function plots(n: number, mine: number, shift = 0, decorated = true): IslandPlot[] {
  return Array.from({ length: n }, (_, i) => {
    const slot = i + 1;
    return { slot, stage: ((slot + shift) % 7) + 1, visitor: decorated, key: decorated, helper: decorated, lantern: decorated, name: null, mine: slot === mine };
  });
}

function festival(scene: IslandScene): Festival {
  return {
    demoDay: "2026-11-28",
    daysToDemo: 10,
    stageStep: 3,
    tableBar: 2,
    stageBar: 3,
    lanterns: { total: 8, lit: 8, reached: true, count: 12, target: 12 },
    booths: scene.trees.map((t) => ({ slot: t.slot, kind: t.slot % 2 ? ("stage" as const) : ("table" as const) })),
  };
}

/** Everything at once, and the busiest plaza: the viewer, a full team, a crowd, guests at a half-empty fire, the deep fire lit. */
function busy(scene: IslandScene, visitors: Partial<VisitorsInput> = {}): PlazaInput {
  return {
    festival: festival(scene),
    pins: ["active", "main", "side"],
    campfire: { count: 3 },
    prizes: true,
    deepfire: { lit: true },
    visitors: { count: 40, team: 5, me: true, shirt: "l", ...visitors },
  };
}

const sprites = allSprites();
const sizeOf = (name: string) => ({ w: sprites[name][0].length, h: sprites[name].length });
const isCrowd = (a: LiveActor) => a.frames[0].startsWith("crowd_");

/** Every rect an actor covers over its whole loop. */
function actorRects(a: LiveActor): Rect[] {
  return a.frames.map((name, i) => {
    const at = actorAt(a, i);
    return { x: at.x, y: at.y, ...sizeOf(name) };
  });
}

function grow(r: Rect, min: number): Rect {
  const w = Math.max(min, r.w);
  const h = Math.max(min, r.h);
  return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
}

interface Obstacle {
  what: string;
  rect: Rect;
}

/** The web's signpost for a tree in every view (close up, plain and with a board; the whole island), with its shadow at every lean. */
function webSignposts(scene: IslandScene, tree: SceneTree): Rect[] {
  return [signpostFor(tree, 1, false), signpostFor(tree, 1, true), signpostFor(tree, wholeUnit(scene), false)].flatMap((post) => [
    post.rect,
    { ...post.shadow, x: post.shadow.x - 2 * post.unit, w: post.shadow.w + 4 * post.unit },
  ]);
}

/** What a person in the plaza must never stand on: the island's trees and their marks, the fixtures, the plaza's own pieces. */
function obstacles(scene: IslandScene, world: PlazaWorld): Obstacle[] {
  const out: Obstacle[] = [];
  const model = sceneModel(scene);
  for (const m of model.trees) {
    const { tree } = m;
    const slot = tree.slot;
    const tags = [scene.tags.find((t) => t.slot === slot)!, ...GLYPHS.map((g) => tagRect(slot, tree.left + Math.floor(tree.w / 2), tree.top + tree.h, g))];
    out.push({ what: `tree ${slot}`, rect: m.rect });
    tags.forEach((rect, i) => out.push({ what: `tag ${slot}.${i}`, rect }));
    webSignposts(scene, tree).forEach((rect, i) => out.push({ what: `signpost ${slot}.${i}`, rect }));
    if (tree.key) out.push({ what: `key ${slot}`, rect: { x: tree.key.x, y: tree.key.y, w: 10, h: 16 } });
    if (tree.visitor) out.push({ what: `visitor ${slot}`, rect: { x: tree.visitor.x, y: tree.visitor.y, w: 10, h: 14 } });
    if (tree.lantern) out.push({ what: `lantern ${slot}`, rect: { x: tree.lantern.x, y: tree.lantern.y, w: 8, h: 14 } });
    if (m.glow) out.push({ what: `glow ${slot}`, rect: m.glow });
    out.push({ what: `hotspot ${slot}`, rect: grow(tags.reduce<Rect>((acc, t) => union(acc, t), m.rect), TAP) });
  }
  if (scene.marker) {
    const side = SPRITES.marker.length * scene.marker.scale;
    out.push({ what: "pin", rect: { x: scene.marker.x, y: scene.marker.y, w: side, h: side } });
  }
  out.push({ what: "well", rect: { x: scene.well.x, y: scene.well.y, w: 24, h: 24 } });
  lampRects(model).forEach((rect, i) => out.push({ what: `lamp ${i}`, rect }));
  if (scene.banner) out.push({ what: "banner", rect: { x: scene.banner.x, y: scene.banner.y, w: 48, h: 20 } });
  // The plaza's own pieces (board, notes, countdown, stage, prize board, campfire, its seats and flame, the deep fire).
  for (const a of world.actors) {
    if (isCrowd(a)) continue;
    const [w, h] = MOTION_SIZES[a.frames[0] as MotionSpriteName];
    out.push({ what: a.frames[0], rect: { x: a.x, y: a.y, w, h } });
  }
  return out;
}

const WATER = new Set(["a", "b", "N", "S", "E", "W"]);
function onLand(scene: IslandScene, r: Rect): boolean {
  for (let row = Math.floor(r.y / scene.tile); row < Math.ceil((r.y + r.h) / scene.tile); row++) {
    for (let col = Math.floor(r.x / scene.tile); col < Math.ceil((r.x + r.w) / scene.tile); col++) {
      if (row < 0 || col < 0 || row >= scene.rows || col >= scene.cols) return false;
      if (WATER.has(scene.tiles[row * scene.cols + col])) return false;
    }
  }
  return true;
}

/**
/**
 * A label's text box in native px (CSS px / 2 at the usual 2x), as drawn at
 * 375px with room to spare: the viewer's small คุณ tag (11px text, about
 * 32 x 17 CSS px). Nothing else is printed over the plaza.
 */
const LABEL_SIZE: Record<PlazaLabel["id"], { w: number; h: number }> = {
  me: { w: 20, h: 10 },
};
function labelBox(scene: IslandScene, label: PlazaLabel): Rect {
  const { w, h } = LABEL_SIZE[label.id];
  const x = (label.x / 100) * scene.width;
  const y = (label.y / 100) * scene.height;
  return label.anchor === "bottom" ? { x: x - w / 2, y: y - h, w, h } : { x, y: y - h / 2, w, h };
}

describe("crowdPlan", () => {
  const plan = (count: number, team = 0, me = false, free = MAX_SEATS) => crowdPlan({ count, team, me }, free);

  it("draws nobody with no visitors, no count, or a count that is not a number", () => {
    expect(crowdPlan(null, 8)).toBe(NO_CROWD);
    expect(crowdPlan(undefined, 8)).toBe(NO_CROWD);
    for (const count of [0, -2, Number.NaN, Infinity]) expect(crowdPlan({ count, team: 3, me: true }, 8)).toBe(NO_CROWD);
  });

  it("draws one figure per person up to eight, the rest only counted (more)", () => {
    for (let count = 1; count <= 60; count++) {
      const p = plan(count);
      const drawn = p.team + p.strollers + p.sitters + (p.me ? 1 : 0);
      expect(drawn).toBe(Math.min(count, MAX_VISITORS - 1));
      expect(drawn + p.more).toBe(count);
    }
    // With the viewer and a team, all eight places can fill.
    const full = plan(30, 6, true);
    expect([full.me, full.team, full.strollers, full.sitters, full.more]).toEqual([true, MAX_TEAM, 2, MAX_GUESTS, 22]);
  });

  it("puts the viewer first, then up to three teammates, then everyone else", () => {
    expect(plan(1, 0, true)).toEqual({ me: true, team: 0, strollers: 0, sitters: 0, more: 0 });
    expect(plan(3, 2, true)).toEqual({ me: true, team: 2, strollers: 0, sitters: 0, more: 0 });
    expect(plan(4, 2, false)).toEqual({ me: false, team: 2, strollers: 2, sitters: 0, more: 0 });
    // Teammates past three are only counted (more), they never become strangers.
    expect(plan(6, 5, true)).toEqual({ me: true, team: 3, strollers: 0, sitters: 0, more: 2 });
    // A team bigger than the island is cut to it.
    expect(plan(2, 9, true)).toEqual({ me: true, team: 1, strollers: 0, sitters: 0, more: 0 });
  });

  it("sits a few by the fire only when there are many, and only in empty seats", () => {
    expect(plan(SIT_FROM - 1).sitters).toBe(0);
    expect(plan(SIT_FROM).sitters).toBe(MAX_GUESTS);
    expect(plan(20, 0, false, 1).sitters).toBe(1);
    expect(plan(20, 0, false, 0)).toMatchObject({ sitters: 0, strollers: CROWD_LAYOUT.routes.length });
  });

  it("lends the campfire's empty seats only (none without a campfire)", () => {
    const visitors = { count: 20, team: 0, me: false };
    expect(plazaCrowd({ campfire: null, visitors }).sitters).toBe(0);
    expect(plazaCrowd({ campfire: { count: 7 }, visitors }).sitters).toBe(1);
    expect(plazaCrowd({ campfire: { count: 12 }, visitors }).sitters).toBe(0);
    expect(plazaCrowd({ campfire: { count: 0 }, visitors }).sitters).toBe(MAX_GUESTS);
  });
});

describe("the plaza's people in the world", () => {
  const scene = buildScene(plots(12, 1), { markMine: true, festival: true });
  const c = plazaCentre(scene);
  const crowd = (world: PlazaWorld) => world.actors.filter(isCrowd);

  it("draws nothing for zero visitors, and keeps NO_PLAZA when nothing else stands there", () => {
    const quiet: PlazaInput = { festival: null, pins: null, campfire: null, visitors: { count: 0, team: 0, me: false } };
    expect(plazaWorld(scene, quiet)).toBe(NO_PLAZA);
    expect(plazaWorld(scene, { ...quiet, visitors: null })).toBe(NO_PLAZA);
    const world = plazaWorld(scene, { ...busy(scene), visitors: { count: 0, team: 0, me: false } });
    expect(crowd(world)).toEqual([]);
    expect(world.figures).toEqual([]);
  });

  it("draws one stroller for one visitor on an otherwise empty plaza, with no words: a tap on them says the day's count", () => {
    const world = plazaWorld(scene, { festival: null, pins: null, campfire: null, visitors: { count: 1, team: 0, me: false } });
    expect(world).not.toBe(NO_PLAZA);
    expect(crowd(world)).toHaveLength(1);
    expect(world.figures.map((f) => f.kind)).toEqual(["crowd"]);
    expect(world.labels).toEqual([]);
    expect(world.spots).toEqual([]);
  });

  it("matches the plan: strollers, teammates, the viewer, guests in the campfire's empty seats, and only the viewer's tag in words", () => {
    const input = busy(scene);
    const world = plazaWorld(scene, input);
    const plan = plazaCrowd(input);
    expect(crowd(world)).toHaveLength(plan.strollers + plan.team + 1);
    // Three coworkers and two guests sit at the fire.
    expect(world.actors.filter((a) => a.frames[0].startsWith("sit_"))).toHaveLength(3 + plan.sitters);
    // No count anywhere (the day's, the campfire's, "+N"), no name over the notice board, no sign over the stage.
    expect(world.labels.map((l) => l.id)).toEqual(["me"]);
  });

  it("lights the fire's seats for guests even when the coworking room is empty", () => {
    const world = plazaWorld(scene, { festival: null, pins: null, campfire: { count: 0 }, visitors: { count: 9, team: 0, me: false } });
    const order = world.actors.map((a) => a.frames[0]);
    expect(order.filter((n) => n.startsWith("sit_"))).toHaveLength(MAX_GUESTS);
    expect(order.filter((n) => n.startsWith("campfire_flame"))).toHaveLength(1);
    expect(world.labels).toEqual([]);
  });

  it("dresses teammates and the viewer in the team's shirt, and nobody else in it", () => {
    for (const shirt of Object.values(TEAM_SHIRTS)) {
      const world = plazaWorld(scene, busy(scene, { shirt }));
      const people = crowd(world);
      const team = people.slice(-(MAX_TEAM + 1));
      const others = people.slice(0, -(MAX_TEAM + 1));
      for (const a of team) for (const f of a.frames) expect(f.endsWith(shirt)).toBe(true);
      for (const a of others) for (const f of a.frames) expect(f.endsWith(shirt)).toBe(false);
    }
  });

  it("varies the crowd: no two strollers dressed alike", () => {
    const world = plazaWorld(scene, { ...busy(scene), visitors: { count: 40, team: 0, me: false, shirt: "l" }, campfire: null });
    const outfits = crowd(world).map((a) => a.frames[0].slice(-2));
    expect(outfits).toHaveLength(CROWD_LAYOUT.routes.length);
    expect(new Set(outfits).size).toBe(outfits.length);
  });

  it("knows nobody: the same counts give the same figures, whatever else the page holds", () => {
    const a = plazaWorld(scene, busy(scene));
    const b = plazaWorld(scene, JSON.parse(JSON.stringify(busy(scene))));
    expect(a).toEqual(b);
    // The input itself is counts, a flag and a colour: nothing to name a person with.
    expect(Object.keys(busy(scene).visitors!).sort()).toEqual(["count", "me", "shirt", "team"]);
  });

  it("puts the viewer's tag over their head at home, and holds it back while they walk in", () => {
    const home = plazaWorld(scene, busy(scene));
    const tag = home.labels.find((l) => l.id === "me")!;
    const me = crowd(home).at(-1)!;
    const at = actorAt(me, 0);
    expect([at.x - c.x, at.y - c.y]).toEqual([...CROWD_LAYOUT.home]);
    expect(tag.delayMs).toBeUndefined();
    expect((tag.x / 100) * scene.width).toBeCloseTo(at.x + PERSON.w / 2, 3);
    expect((tag.y / 100) * scene.height).toBeCloseTo(at.y - 1, 3);
    const arriving = plazaWorld(scene, busy(scene, { arriving: true }));
    expect(arriving.labels.find((l) => l.id === "me")!.delayMs).toBe(ARRIVE_MS);
  });

  it("walks the viewer in once, up the path to home, then holds still there", () => {
    const world = plazaWorld(scene, busy(scene, { arriving: true }));
    const me = crowd(world).at(-1)!;
    expect(me.once).toBe(true);
    const first = actorAt(me, 0);
    const last = actorAt(me, me.frames.length - 1);
    expect([first.x - c.x, first.y - c.y]).toEqual([...CROWD_LAYOUT.enter]);
    expect([last.x - c.x, last.y - c.y]).toEqual([...CROWD_LAYOUT.home]);
    expect(me.frames.at(-1)).toMatch(/^crowd_stand_/);
    expect(ARRIVE_MS).toBe(me.frames.length * STEP_MS);
    // Played from the tick it appeared, then held; still (reduced motion) is already home.
    const since = 40;
    expect(actorFrame(since, me, since)).toBe(0);
    expect(actorFrame(since + 10, me, since)).toBe(10);
    expect(actorFrame(since + 10_000, me, since)).toBe(me.frames.length - 1);
    expect(stillFrame(me)).toBe(me.frames.length - 1);
    const motion = motionAt(since + 3, { scene, swaying: [], actors: [me], actorsSince: [since], ambient: false, still: true, lowDetail: false, night: false });
    expect(motion.actors[0]).toBe(me.frames.length - 1);
  });

  it("keeps an arrival from replaying when other actors change", () => {
    const one = plazaWorld(scene, busy(scene, { arriving: true })).actors;
    const since = one.map(() => 5);
    // The campfire count changes: the plaza's actors change, the viewer's arrival does not.
    const two = plazaWorld(scene, { ...busy(scene, { arriving: true }), campfire: { count: 4 } }).actors;
    const next = sinceFor(one, since, two, 90);
    const me = two.findIndex((a) => a.once);
    expect(next[me]).toBe(5);
    // A newly seated coworker starts now.
    expect(next.filter((t) => t === 90).length).toBeGreaterThan(0);
  });
});

describe("the plaza's people: placement on every island", () => {
  const cases: { n: number; mine: number; shift: number; decorated: boolean }[] = [];
  for (const n of SIZES) {
    for (let mine = 1; mine <= Math.min(n, 4); mine++) cases.push({ n, mine, shift: mine, decorated: true });
    cases.push({ n, mine: 0, shift: 0, decorated: false });
  }

  it.each(cases)("every step of every figure stays on land and clear ($n plots, mine $mine, decorated $decorated)", ({ n, mine, shift, decorated }) => {
    const scene = buildScene(plots(n, mine, shift, decorated), { markMine: true, festival: true });
    const problems: string[] = [];
    for (const arriving of [false, true]) {
      const world = plazaWorld(scene, busy(scene, { arriving }));
      const list = obstacles(scene, world);
      for (const actor of world.actors.filter(isCrowd)) {
        for (const rect of new Set(actorRects(actor).map((r) => JSON.stringify(r)))) {
          const r = JSON.parse(rect) as Rect;
          const hit = list.filter((o) => overlaps(r, o.rect)).map((o) => o.what);
          if (hit.length) problems.push(`${actor.frames[0]} at ${r.x},${r.y}: ${hit.join(", ")}`);
          if (!onLand(scene, r)) problems.push(`${actor.frames[0]} at ${r.x},${r.y} is over water`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(cases)("the viewer's tag stays off trees and tags ($n plots, mine $mine)", ({ n, mine, shift, decorated }) => {
    const scene = buildScene(plots(n, mine, shift, decorated), { markMine: true, festival: true });
    const world = plazaWorld(scene, busy(scene));
    const model = sceneModel(scene);
    const blocked: Obstacle[] = [];
    for (const m of model.trees) {
      const { tree } = m;
      blocked.push({ what: `tree ${tree.slot}`, rect: m.rect });
      for (const g of [0, ...GLYPHS]) {
        const rect = g ? tagRect(tree.slot, tree.left + Math.floor(tree.w / 2), tree.top + tree.h, g) : scene.tags.find((t) => t.slot === tree.slot)!;
        blocked.push({ what: `tag ${tree.slot}`, rect });
      }
    }
    const ours = world.labels.filter((l) => l.id === "me");
    expect(ours).toHaveLength(1);
    const problems: string[] = [];
    for (const label of ours) {
      const box = labelBox(scene, label);
      const hit = blocked.filter((o) => overlaps(box, o.rect)).map((o) => o.what);
      if (hit.length) problems.push(`${label.id}: ${hit.join(", ")}`);
      // As plaza.test.ts: the point keeps about 40 native px from any tag.
      const px = (label.x / 100) * scene.width;
      const py = (label.y / 100) * scene.height;
      for (const tag of blocked.filter((o) => o.what.startsWith("tag "))) {
        const dx = Math.max(tag.rect.x - px, 0, px - (tag.rect.x + tag.rect.w));
        const dy = Math.max(tag.rect.y - py, 0, py - (tag.rect.y + tag.rect.h));
        if (Math.hypot(dx, dy) < 40) problems.push(`${label.id} ${Math.round(Math.hypot(dx, dy))} px from ${tag.what}`);
      }
      for (const other of world.labels) {
        if (other !== label && overlaps(box, labelBox(scene, other))) problems.push(`${label.id} over ${other.id}`);
      }
      // A tag over a teammate or stroller at home would hide them: the viewer's tag sits over their own head only.
      if (label.id === "me") {
        const others = world.actors.filter(isCrowd).slice(0, -1).flatMap(actorRects);
        if (others.some((r) => overlaps(box, r))) problems.push("the viewer's tag covers another figure");
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(cases)("no figure ever walks under a plaza label ($n plots, mine $mine)", ({ n, mine, shift, decorated }) => {
    const scene = buildScene(plots(n, mine, shift, decorated), { markMine: true, festival: true });
    const problems: string[] = [];
    // A full campfire too: more people than seats.
    for (const campfire of [{ count: 3 }, { count: 12 }]) {
      const world = plazaWorld(scene, { ...busy(scene), campfire });
      const people = world.actors.filter(isCrowd);
      for (const label of world.labels) {
        const box = labelBox(scene, label);
        // The viewer's tag floats over the viewer's own head: it may touch only them.
        const under = label.id === "me" ? people.slice(0, -1) : people;
        for (const actor of under) {
          if (actorRects(actor).some((r) => overlaps(r, box))) problems.push(`${actor.frames[0]} under ${label.id}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("the plaza's people: sprites and frames", () => {
  const scene = buildScene(plots(20, 2), { markMine: true, festival: true });

  it("makes every pose for every outfit at the visitor's size, in the island's palette", () => {
    const all = crowdSprites();
    expect(Object.keys(all)).toHaveLength(allOutfits().length * CROWD_POSES.length);
    for (const [name, rows] of Object.entries(all)) {
      expect(rows).toHaveLength(PERSON.h);
      for (const row of rows) {
        expect(row).toHaveLength(PERSON.w);
        for (const ch of row) if (ch !== ".") expect(PALETTE[ch]).toBeDefined();
      }
      // In the atlas, never shadowing the island's own sprites.
      expect(allSprites()[name]).toBe(rows);
    }
    // The standing pose is the plot visitor itself, only recoloured (its b hair and a shirt).
    const outfit = CROWD_OUTFITS[0];
    const stand = all[crowdSprite("stand", outfit)];
    expect(stand).toEqual(SPRITES.visitor.map((row) => row.replace(/b/g, outfit.hair).replace(/a/g, outfit.shirt)));
    // The phone poses are the story's tester, recoloured the same way (its c hair and v shirt).
    expect(all[crowdSprite("phone0", outfit)]).toEqual(
      MOTION_SPRITES.tester_0.map((row) => row.replace(/c/g, outfit.hair).replace(/v/g, outfit.shirt)),
    );
  });

  it("keeps every outfit's colours apart from its skin and outline, and no crowd shirt green", () => {
    for (const o of allOutfits()) {
      expect(["k", "o"]).not.toContain(o.shirt);
      expect(o.hair).not.toBe("k");
    }
    for (const o of CROWD_OUTFITS) expect(["g", "h", "j", "l", "m", "n"]).not.toContain(o.shirt);
    expect(teamShirt("leaf:dusk")).toBe("w");
    expect(teamShirt(null)).toBe("l");
    expect(teamShirt("leaf:unknown")).toBe("l");
  });

  it("names only frames the atlas has, steps in whole px, one step per frame, under 256 frames, at one tick a frame", () => {
    for (const arriving of [false, true]) {
      const world = plazaWorld(scene, busy(scene, { arriving }));
      for (const actor of world.actors.filter(isCrowd)) {
        for (const f of actor.frames) expect(sprites[f]).toBeDefined();
        expect(actor.steps).toHaveLength(actor.frames.length);
        expect(actor.frames.length).toBeLessThan(256);
        expect(actor.frameMs).toBe(STEP_MS);
        for (const s of actor.steps!) expect(Number.isInteger(s.dx) && Number.isInteger(s.dy)).toBe(true);
        // A step moves at most one native px from the one before: a walk, never a jump (the loop closes too).
        actor.steps!.forEach((s, i) => {
          const next = actor.steps![(i + 1) % actor.steps!.length];
          if (actor.once && i === actor.steps!.length - 1) return;
          expect(Math.abs(next.dx - s.dx) + Math.abs(next.dy - s.dy)).toBeLessThanOrEqual(1);
        });
      }
    }
  });

  it("walks out of step: no two strollers on the same frame of the same route shape", () => {
    const world = plazaWorld(scene, { ...busy(scene), visitors: { count: 40, team: 0, me: false } });
    const starts = world.actors.filter(isCrowd).map((a) => `${a.frames[0].split("_")[1]}:${JSON.stringify(a.steps![0])}`);
    expect(new Set(starts).size).toBe(starts.length);
  });

  it("faces the way it walks", () => {
    const world = plazaWorld(scene, { ...busy(scene), visitors: { count: 1, team: 0, me: false } });
    const walker = world.actors.find(isCrowd)!;
    walker.steps!.forEach((s, i) => {
      const next = walker.steps![(i + 1) % walker.steps!.length];
      if (next.dx > s.dx) expect(next.flip).toBe(true);
      if (next.dx < s.dx) expect(next.flip).toBe(false);
    });
  });

  it("makes its walk from the visitor itself: the same head and shirt, the body a pixel lower on each step", () => {
    const all = crowdSprites();
    const outfit = CROWD_OUTFITS[2];
    const visitor = SPRITES.visitor.map((row) => row.replace(/b/g, outfit.hair).replace(/a/g, outfit.shirt));
    for (const pose of WALK_CYCLE) {
      const rows = all[crowdSprite(pose, outfit)];
      // Feet on the ground: the last row is the feet, where the shadow goes.
      expect(rows[PERSON.h - 1]).toMatch(/o/);
      if (pose === "walk0" || pose === "walk2") {
        expect(rows[0]).toBe(".".repeat(PERSON.w));
        expect(rows.slice(1, 8)).toEqual(visitor.slice(0, 7));
      } else expect(rows.slice(0, 10)).toEqual(visitor.slice(0, 10));
    }
    // A breath is the standing figure settled a pixel; a blink closes its eye.
    expect(all[crowdSprite("rest", outfit)].slice(1, 10)).toEqual(visitor.slice(0, 9));
    expect(all[crowdSprite("rest", outfit)].slice(10)).toEqual(visitor.slice(10));
    expect(all[crowdSprite("blink", outfit)][4]).toBe(visitor[4].slice(0, 4) + "k" + visitor[4].slice(5));
  });

  it("steps through the four walking frames in order, two ticks each, and never stands mid-walk", () => {
    for (const arriving of [false, true]) {
      const world = plazaWorld(scene, busy(scene, { arriving }));
      for (const actor of world.actors.filter(isCrowd)) {
        const n = actor.frames.length;
        const steps = actor.steps!;
        const moves = (i: number) => {
          const a = steps[(i - 1 + n) % n];
          const b = steps[i];
          return a.dx !== b.dx || a.dy !== b.dy;
        };
        let walks = 0;
        for (let i = 0; i < n; i++) {
          // Where a walk begins (an arrival's first frame has no frame before it).
          if (!moves(i) || moves((i - 1 + n) % n) || (actor.once && i === 0)) continue;
          for (let k = 0; moves((i + k) % n) && k < n; k++) {
            expect(actor.frames[(i + k) % n]).toBe(actor.frames[(i + k) % n].replace(/walk\d/, WALK_CYCLE[Math.floor(k / 2) % 4]));
            expect(actor.frames[(i + k) % n]).toMatch(/^crowd_walk\d_/);
          }
          walks++;
        }
        // Everyone who goes anywhere walks there (teammates and the viewer at home stay put).
        if (steps.some((s) => s.dx !== steps[0].dx || s.dy !== steps[0].dy)) expect(walks).toBeGreaterThan(0);
      }
    }
  });

  it("breathes and blinks only standing in place, and a still island shows everyone plain", () => {
    for (const arriving of [false, true]) {
      const world = plazaWorld(scene, busy(scene, { arriving }));
      for (const [k, actor] of world.actors.filter(isCrowd).entries()) {
        const n = actor.frames.length;
        expect(actor.frames[stillFrame(actor)]).not.toMatch(/^crowd_(rest|blink)_/);
        actor.frames.forEach((name, i) => {
          if (!/^crowd_(rest|blink)_/.test(name)) return;
          // The arrival stands plain: it ends on one held frame.
          expect(actor.once).toBeFalsy();
          // Standing where the frame before it stood: never a step.
          const before = actor.steps![(i - 1 + n) % n];
          expect([k, before.dx, before.dy]).toEqual([k, actor.steps![i].dx, actor.steps![i].dy]);
        });
        // Breathing runs are a breath long, never a one-tick twitch.
        const rest = actor.frames.map((f) => f.startsWith("crowd_rest_"));
        rest.forEach((r, i) => {
          if (!r || rest[(i - 1 + n) % n]) return;
          let len = 0;
          while (rest[(i + len) % n] && len < n) len++;
          expect(len).toBeGreaterThanOrEqual(4);
        });
      }
    }
  });
});

describe("a walker in the draw code", () => {
  it("is drawn where its step puts it, mirrored as its step says", () => {
    const rects = new Map([["crowd_stand_of", { x: 0, y: 0, w: 10, h: 14 }]]);
    const walker: LiveActor = { frames: ["crowd_stand_of", "crowd_stand_of"], x: 100, y: 50, steps: [{ dx: 0, dy: 0, flip: false }, { dx: 3, dy: -2, flip: true }] };
    expect(actorRect(walker, 0, rects)).toEqual({ x: 100, y: 50, w: 10, h: 14 });
    expect(actorRect(walker, 1, rects)).toEqual({ x: 103, y: 48, w: 10, h: 14 });
    expect(actorAt(walker, 1).flip).toBe(true);
    // Without steps an actor stays put and keeps its own flip, as the story's actors do.
    expect(actorAt({ frames: ["builder_0"], x: 4, y: 5, flip: true }, 0)).toEqual({ x: 4, y: 5, flip: true });
  });
});
