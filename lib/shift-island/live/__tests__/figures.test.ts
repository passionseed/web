/**
 * @jest-environment node
 */
import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import { FIGURE_H, FIGURE_W, TIGHT, bubbleAnchor, figureBox, hitFigure, hitSlop, treeFigures, type Figure } from "../figures";
import { plazaCrowd, plazaWorld, type PlazaInput } from "../plaza";

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

describe("treeFigures", () => {
  it("stands a partner beside each tree that passed main quest 3, in slot order, at the visitor sprite's box", () => {
    const scene = buildScene([plot(5, { visitor: true }), plot(2, { visitor: true, mine: true }), plot(3)], { markMine: true });
    const figures = treeFigures(scene);
    expect(figures.map((f) => [f.kind, f.n, f.mine === true])).toEqual([
      ["partner", 2, true],
      ["partner", 5, false],
    ]);
    for (const figure of figures) {
      const tree = scene.trees.find((t) => t.slot === figure.n)!;
      expect(figure.box).toEqual({ x: tree.visitor!.x, y: tree.visitor!.y, w: FIGURE_W, h: FIGURE_H });
      expect(figure.actor).toBeUndefined();
    }
  });

  it("has nobody without a scene, and nobody beside a plot shown plain (no consent)", () => {
    expect(treeFigures(null)).toEqual([]);
    const scene = buildScene([plot(1, { visitor: true, plain: true })], { markMine: true });
    expect(treeFigures(scene)).toEqual([]);
  });
});

describe("hitFigure", () => {
  const still: Figure = { kind: "partner", n: 4, box: { x: 100, y: 100, w: FIGURE_W, h: FIGURE_H } };
  const walker: Figure = { kind: "crowd", n: 0, actor: 1 };
  const boxes = [null, { x: 140, y: 100, w: FIGURE_W, h: FIGURE_H }];

  it("finds a still figure by its box and a walker by the engine's box for it", () => {
    expect(hitFigure([still, walker], boxes, { x: 104, y: 106 }, { x: 0, y: 0 })).toEqual({ index: 0, tight: true });
    expect(hitFigure([still, walker], boxes, { x: 145, y: 110 }, { x: 0, y: 0 })).toEqual({ index: 1, tight: true });
    // A walker the engine has no box for (not drawn yet) is never hit.
    expect(hitFigure([walker], [], { x: 145, y: 110 }, { x: 20, y: 20 })).toBeNull();
  });

  it("counts the slop round a figure, marking a tap there as not tight", () => {
    const slop = { x: 7, y: 5 };
    expect(hitFigure([still], [], { x: 95, y: 98 }, slop)).toEqual({ index: 0, tight: false });
    expect(hitFigure([still], [], { x: 99, y: 99 }, slop)).toEqual({ index: 0, tight: true });
    expect(hitFigure([still], [], { x: 92, y: 106 }, slop)).toBeNull();
    expect(hitFigure([still], [], { x: 104, y: 120 }, slop)).toBeNull();
  });

  it("takes the nearest figure when two slops overlap", () => {
    const slop = { x: 20, y: 20 };
    expect(hitFigure([still, walker], boxes, { x: 118, y: 106 }, slop)?.index).toBe(0);
    expect(hitFigure([still, walker], boxes, { x: 128, y: 106 }, slop)?.index).toBe(1);
  });
});

describe("hitSlop", () => {
  it("makes a fingertip target close up, and only the figure itself on the whole island", () => {
    // At 2 CSS px per native px a 44px target is 22 native px: a 10 x 14 figure needs 6 and 4 more each side, plus a step.
    expect(hitSlop(2, false)).toEqual({ x: 7, y: 5 });
    // Bigger art needs less, never under TIGHT.
    expect(hitSlop(6, false)).toEqual({ x: TIGHT + 1, y: TIGHT + 1 });
    expect(hitSlop(1, true)).toEqual({ x: TIGHT, y: TIGHT });
    expect(hitSlop(Number.NaN, false)).toEqual({ x: TIGHT, y: TIGHT });
  });
});

describe("figureBox and bubbleAnchor", () => {
  it("points the bubble at the top middle of the head, in percent of what the box shows", () => {
    const box = { x: 95, y: 40, w: 10, h: 14 };
    expect(bubbleAnchor(box, { x: 0, y: 0, w: 400, h: 200 })).toEqual({ x: 25, y: 20 });
    // A story panel's crop.
    expect(bubbleAnchor(box, { x: 50, y: 20, w: 100, h: 80 })).toEqual({ x: 50, y: 25 });
    expect(figureBox({ kind: "me", n: 0, actor: 3 }, [])).toBeNull();
  });
});

describe("the plaza's people as figures", () => {
  const scene = buildScene(Array.from({ length: 12 }, (_, i) => plot(i + 1, { mine: i === 0 })), { markMine: true, festival: true });
  const input = (visitors: PlazaInput["visitors"], campfire: PlazaInput["campfire"] = { count: 3 }): PlazaInput => ({
    festival: null,
    pins: ["main"],
    campfire,
    prizes: true,
    visitors,
  });

  it("names each crowd actor by kind and order only: strollers, teammates, the viewer", () => {
    const visitors = { count: 9, team: 2, me: true, shirt: "l" };
    const world = plazaWorld(scene, input(visitors));
    const plan = plazaCrowd(input(visitors));
    expect(world.figures.map((f) => f.kind)).toEqual([
      ...Array(plan.strollers).fill("crowd"),
      ...Array(plan.team).fill("team"),
      "me",
    ]);
    // The figures are the last actors, in the same order: nothing else on the plaza is a figure.
    const first = world.actors.length - world.figures.length;
    expect(world.figures.map((f) => f.actor)).toEqual(world.figures.map((_, i) => first + i));
    for (const f of world.figures) expect(world.actors[f.actor!].frames[0]).toMatch(/^crowd_/);
    // Each kind numbers its own, so a figure's line stays put while the crowd changes around it.
    expect(world.figures.filter((f) => f.kind === "crowd").map((f) => f.n).sort()).toEqual([...Array(plan.strollers).keys()]);
    expect(world.figures.filter((f) => f.kind === "team").map((f) => f.n)).toEqual([0, 1]);
    // Nothing that could name a person: a kind, a number, an actor index.
    for (const f of world.figures) expect(Object.keys(f).sort()).toEqual(["actor", "kind", "n"]);
  });

  it("leaves the campfire's sitters to the campfire, and has no figures without visitors", () => {
    const world = plazaWorld(scene, input({ count: 20, team: 0, me: false }, { count: 0 }));
    expect(world.figures.every((f) => world.actors[f.actor!].frames[0].startsWith("crowd_"))).toBe(true);
    expect(world.actors.filter((a) => a.frames[0].startsWith("sit_")).length).toBeGreaterThan(0);
    expect(plazaWorld(scene, input(null)).figures).toEqual([]);
  });
});
