/**
 * @jest-environment node
 */
import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";
import type { Festival } from "@/lib/shift-island/festival";

import { hitSlop, treeFigures, type Figure } from "../figures";
import type { Rect } from "../geometry";
import {
  REACH_PX,
  figureKey,
  gapTo,
  hotspotKey,
  interactTargets,
  mapCentre,
  nearestTarget,
  plotKey,
  spotKey,
  toNative,
  type Aim,
  type InteractTarget,
} from "../interact";
import { plazaWorld } from "../plaza";
import { HUD_RESERVE } from "../world";

const plot = (slot: number, extra: Partial<IslandPlot> = {}): IslandPlot => ({
  slot,
  stage: 4,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: false,
  ...extra,
});

const scene = buildScene([plot(1, { visitor: true }), plot(2, { mine: true }), plot(3), plot(4, { visitor: true })], { markMine: true, festival: true });
/** Each plot's button as the picture gives it: the tree's own box, in percent. */
const hotspots = scene.trees.map((t) => ({
  slot: t.slot,
  x: (t.left / scene.width) * 100,
  y: (t.top / scene.height) * 100,
  w: (t.w / scene.width) * 100,
  h: (t.h / scene.height) * 100,
}));
const festival: Festival = { demoDay: "2026-11-28", daysToDemo: 9, stageStep: 2, tableBar: 3, stageBar: 5, booths: [], lanterns: null };
const plaza = plazaWorld(scene, {
  festival,
  pins: ["active", "main"],
  campfire: { count: 3 },
  prizes: true,
  visitors: { count: 4, team: 1, me: true },
});
const near = (x: number, y: number, reach = 4): Aim => ({ x, y, reach });
const box = (target: InteractTarget): Rect | null => target.box ?? null;

describe("interactTargets", () => {
  const figures: Figure[] = [...plaza.figures, ...treeFigures(scene)];
  const targets = interactTargets({ scene, hotspots, spots: plaza.spots, figures, scale: 2, whole: false });

  it("lists every plot, every plaza button and every person, each once", () => {
    const keys = targets.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((k) => k.startsWith("plot:"))).toEqual(scene.trees.map((t) => plotKey(t.slot)));
    expect(keys.filter((k) => k.startsWith("spot:")).sort()).toEqual(["campfire", "notice", "prizes", "stage"].map((id) => spotKey(id as never)).sort());
    expect(keys.filter((k) => k.startsWith("figure:"))).toEqual(figures.map((_, i) => figureKey(i)));
  });

  it("outlines a plot's tree, measured on its button with the 48px floor close up and none on the whole island", () => {
    const own = scene.trees.findIndex((t) => t.slot === 2);
    const target = targets.find((t) => t.key === plotKey(2))!;
    expect(target.shape).toEqual({ kind: "tree", tree: own });
    const tree = scene.trees[own];
    // At 2 CSS px per native px the floor is 24 native px; the tree's own box is bigger, so it is the box.
    expect(target.box!.w).toBeCloseTo(Math.max(24, tree.w), 6);
    expect(target.box!.x + target.box!.w / 2).toBeCloseTo(tree.left + tree.w / 2, 6);
    // A small plot box grows round its middle to 48 CSS px.
    const tiny = interactTargets({ scene, hotspots: [{ slot: 2, x: 50, y: 50, w: 0.5, h: 0.5 }], spots: [], figures: [], scale: 2, whole: false })[0];
    expect(tiny.box!.w).toBeCloseTo(24, 6);
    expect(tiny.box!.h).toBeCloseTo(24, 6);
    expect(tiny.box!.x + tiny.box!.w / 2).toBeCloseTo(0.5025 * scene.width, 6);
    const whole = interactTargets({ scene, hotspots: [{ slot: 2, x: 50, y: 50, w: 0.5, h: 0.5 }], spots: [], figures: [], scale: 2, whole: true })[0];
    expect(whole.box!.w).toBeCloseTo(0.005 * scene.width, 6);
  });

  it("skips a plot the scene does not draw", () => {
    expect(interactTargets({ scene, hotspots: [{ slot: 99, x: 1, y: 1, w: 1, h: 1 }], spots: [], figures: [], scale: 2, whole: false })).toEqual([]);
  });

  it("outlines each plaza piece by the actors that draw it, and the campfire without the people round it", () => {
    const names = (id: string) => {
      const target = targets.find((t) => t.key === `spot:${id}`)!;
      const shape = target.shape as { kind: "actors"; actors: number[] };
      return shape.actors.map((i) => plaza.actors[i].frames[0]);
    };
    expect(names("notice")).toEqual(["notice_board", "notice_note_active", "notice_note_main"]);
    expect(names("stage")[0]).toBe("fest_count");
    expect(names("stage").at(-1)).toBe("fest_stage_2");
    expect(names("stage").slice(1, -1).every((n) => n.startsWith("count_"))).toBe(true);
    expect(names("prizes")).toEqual(["prize_board"]);
    expect(names("campfire")).toEqual(["campfire_pit", "campfire_flame_0"]);
  });

  it("leaves out a plaza button with no actors, and reaches a walker by its own box and tap slop", () => {
    const none = interactTargets({ scene, hotspots: [], spots: [{ id: "notice", x: 1, y: 1, w: 1, h: 1, actors: [] }], figures: [], scale: 2, whole: false });
    expect(none).toEqual([]);
    const walker = targets.find((t) => t.key === figureKey(0))!;
    expect(walker.box).toBeUndefined();
    expect(walker.slop).toEqual(hitSlop(2, false));
    expect(walker.shape).toEqual({ kind: "actors", actors: [plaza.figures[0].actor] });
  });

  it("reaches a tree's partner by its fixed box and slop, outlining the partner beside that tree", () => {
    const index = figures.findIndex((f) => f.kind === "partner" && f.n === 4);
    const target = targets.find((t) => t.key === figureKey(index))!;
    const tree = scene.trees.findIndex((t) => t.slot === 4);
    expect(target.shape).toEqual({ kind: "partner", tree });
    const v = scene.trees[tree].visitor!;
    const slop = hitSlop(2, false);
    expect(target.box).toEqual({ x: v.x - slop.x, y: v.y - slop.y, w: 10 + 2 * slop.x, h: 14 + 2 * slop.y });
  });
});

describe("nearestTarget", () => {
  const a: InteractTarget = { key: "a", box: { x: 0, y: 0, w: 10, h: 10 }, shape: { kind: "tree", tree: 0 } };
  const b: InteractTarget = { key: "b", box: { x: 30, y: 0, w: 10, h: 10 }, shape: { kind: "tree", tree: 1 } };
  const big: InteractTarget = { key: "big", box: { x: 0, y: 0, w: 60, h: 40 }, shape: { kind: "actors", actors: [0] } };
  const person: InteractTarget = { key: "person", box: { x: 40, y: 20, w: 10, h: 14 }, shape: { kind: "actors", actors: [1] } };

  it("picks the one whose box is nearest the aim, within the reach", () => {
    expect(nearestTarget([a, b], box, near(5, 5))).toBe(0);
    expect(nearestTarget([a, b], box, near(28, 5))).toBe(1);
    expect(nearestTarget([a, b], box, near(13, 5))).toBe(0);
  });

  it("picks nothing when nothing is within the reach", () => {
    expect(nearestTarget([a, b], box, near(20, 5, 4))).toBe(-1);
    expect(nearestTarget([a, b], box, near(20, 60, 40))).toBe(-1);
    expect(nearestTarget([], box, near(0, 0, 100))).toBe(-1);
  });

  it("between two the aim is inside of, picks the one whose middle is nearer: a person in front of the board", () => {
    expect(nearestTarget([big, person], box, near(45, 27))).toBe(1);
    expect(nearestTarget([big, person], box, near(10, 10))).toBe(0);
  });

  it("skips a target that is not drawn now", () => {
    expect(nearestTarget([a, b], (t) => (t.key === "a" ? null : t.box!), near(5, 5, 30))).toBe(1);
  });

  it("measures the gap to a box's edge, nothing inside it", () => {
    expect(gapTo({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5 })).toBe(0);
    expect(gapTo({ x: 0, y: 0, w: 10, h: 10 }, { x: 13, y: 14 })).toBe(5);
  });
});

describe("the aim", () => {
  it("is the middle of the room between the HUD bars, where the student's own plot starts", () => {
    const world = { left: 0, top: 0, width: 375, height: 812 };
    const mid = mapCentre(world, { top: HUD_RESERVE.top, bottom: HUD_RESERVE.bottom });
    expect(mid).toEqual({ x: 187.5, y: (HUD_RESERVE.top + 812 - HUD_RESERVE.bottom) / 2 });
    // A room with no height left: the world's own middle.
    expect(mapCentre({ left: 0, top: 0, width: 100, height: 100 }, { top: 80, bottom: 80 })).toEqual({ x: 50, y: 50 });
  });

  it("turns a client point into the scene's native px through the picture's box", () => {
    expect(toNative({ x: 110, y: 70 }, { left: 10, top: 20, width: 200, height: 100 }, { width: 100, height: 50 })).toEqual({ x: 50, y: 25 });
    expect(toNative({ x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 0 }, { width: 1, height: 1 })).toBeNull();
  });

  it("reaches further round the middle of a touch screen than round a mouse pointer", () => {
    expect(REACH_PX.centre).toBeGreaterThan(REACH_PX.pointer);
  });
});

describe("hotspotKey", () => {
  const el = (attrs: Record<string, string>) => ({ getAttribute: (name: string) => attrs[name] ?? null });

  it("names a plot's and a plaza spot's button, and nothing else", () => {
    expect(hotspotKey(el({ "data-slot": "7" }))).toBe(plotKey(7));
    expect(hotspotKey(el({ "data-spot": "campfire" }))).toBe(spotKey("campfire"));
    expect(hotspotKey(el({}))).toBeNull();
    expect(hotspotKey(el({ "data-slot": "" }))).toBeNull();
    expect(hotspotKey(null)).toBeNull();
  });
});
