/**
 * @jest-environment node
 *
 * The web's lantern-glow look: the colour grade, warm light pools, contact
 * shadows, smoke, fireflies, sea glints and shallows. All web only: the
 * bot's atlas (no grade) stays exactly as it was.
 */
import { PALETTE } from "@/bot/assets/island/sprites";
import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import { firefliesAt, fireflyAnchors, flyRect, glintsIn, smokeAt, smokeBounds, smokeOrigin } from "../ambience";
import { allSprites, buildAtlasData } from "../atlas";
import { GUST, SLOW_GUST, swayB } from "../clock";
import { sceneModel } from "../draw";
import type { Rect } from "../geometry";
import { FLICKER, boatLight, flickerVariant, haloSprite, lightSources, poolBounds, poolBox, poolSprite } from "../glow";
import { atlasGrade, gradeKey, gradedWater } from "../grade";
import { paletteRgb } from "../lighting";
import { plazaWorld } from "../plaza";
import { actorShadow, treeShadow } from "../shadows";
import { SHALLOW_REACH, coastDistance, shallowsPixels } from "../shallows";
import type { LightPhase, LiveActor } from "../types";

const PHASES: LightPhase[] = ["dawn", "day", "dusk", "night"];
/** Rectangle b lies inside rectangle a. */
const contains = (a: Rect, b: Rect) => b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h;
const luma = ([r, g, b]: readonly number[]) => 0.299 * r + 0.587 * g + 0.114 * b;

function plots(n: number): IslandPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: false,
    key: false,
    helper: false,
    lantern: k % 3 === 0,
    name: null,
    mine: k === 2,
  }));
}

const scene = buildScene(plots(12), { markMine: true, festival: true });
const model = sceneModel(scene);
const plaza = plazaWorld(scene, {
  festival: { daysToDemo: 9, stageStep: 3, booths: [], lanterns: { lit: 5 } } as never,
  pins: ["active"],
  campfire: { count: 3 },
  visitors: { count: 4, team: 1, me: true, arriving: false, shirt: "w" } as never,
});

describe("grade", () => {
  it("gives every palette key a colour in every light, night darker than day and dusk warmer", () => {
    for (const key of Object.keys(PALETTE)) {
      const day = gradeKey(key, "day")!;
      const night = gradeKey(key, "night")!;
      expect(day).toHaveLength(3);
      expect(luma(night)).toBeLessThan(luma(day));
    }
    for (const key of ["s", "g", "a"]) {
      const day = gradeKey(key, "day")!;
      const dusk = gradeKey(key, "dusk")!;
      expect(dusk[0] / Math.max(1, dusk[2])).toBeGreaterThan(day[0] / Math.max(1, day[2]));
    }
  });

  it("keeps the bot's atlas untouched without a grade, and lit keys untinted with one", () => {
    const sprites = allSprites();
    const plain = buildAtlasData("day", sprites);
    const graded = buildAtlasData("night", sprites, [], atlasGrade("night"));
    const at = (atlas: typeof plain, name: string, x: number, y: number) => {
      const r = atlas.rects.get(name)!;
      const o = ((r.y + y) * atlas.width + r.x + x) * 4;
      return Array.from(atlas.data.slice(o, o + 3));
    };
    // The day sand tile is the palette's own sand without a grade.
    expect(at(plain, "sand", 1, 1)).toEqual(paletteRgb("s"));
    // The lantern's flame ('f' at row 6, col 4) stays lit at night under the grade.
    expect(at(graded, "lantern", 4, 6)).toEqual(paletteRgb("f"));
  });

  it("colours the open sea round the picture from the graded water", () => {
    for (const phase of PHASES) expect(gradedWater(phase)).toMatch(/^#[0-9a-f]{6}$/);
    expect(gradedWater("night")).not.toBe(gradedWater("day"));
  });
});

describe("light pools", () => {
  it("lights nothing by day, the fire at dawn, and the fire, lamps, lanterns and bulbs at night", () => {
    expect(lightSources(model, plaza.actors, "day")).toEqual([]);
    const dawn = lightSources(model, plaza.actors, "dawn").map((s) => s.kind);
    expect(dawn).toContain("fire");
    expect(dawn).not.toContain("lamp");
    const night = new Set(lightSources(model, plaza.actors, "night").map((s) => s.kind));
    for (const kind of ["fire", "lamp", "lantern", "bulb", "board", "stage"]) expect(night.has(kind as never)).toBe(true);
  });

  it("draws a banded pool that is clear at its corners and warmest in the middle, every variant inside its bounds", () => {
    for (const variant of [0, 1, 2]) {
      const p = poolSprite("fire", "night", variant);
      const at = (x: number, y: number) => Array.from(p.data.slice((y * p.w + x) * 4, (y * p.w + x) * 4 + 4));
      expect(at(0, 0)[3]).toBe(0);
      const mid = at((p.w - 1) / 2, (p.h - 1) / 2);
      expect(mid[3]).toBe(255);
      // Colour dodge: red lifted most (warm), blue least.
      expect(mid[0]).toBeGreaterThan(mid[2]);
      expect(contains(poolBounds({ kind: "fire", x: 100, y: 100 }), poolBox({ kind: "fire", x: 100, y: 100 }, variant))).toBe(true);
    }
    expect(FLICKER).toHaveLength(3);
    expect(haloSprite("board", "night", 1)).toBeNull();
    expect(haloSprite("lamp", "day", 1)!.data.every((v, i) => i % 4 === 3 || v === 0)).toBe(true);
  });

  it("flickers the fire with its flame and holds still on a still island", () => {
    const fire = lightSources(model, plaza.actors, "night").find((s) => s.kind === "fire")!;
    const frames = new Uint8Array(plaza.actors.length);
    const seen = new Set<number>();
    for (let f = 0; f < 4; f++) {
      frames[(fire.flicker as { actor: number }).actor] = f;
      seen.add(flickerVariant(fire, frames, new Uint8Array(0), false));
    }
    expect(seen.size).toBe(3);
    expect(flickerVariant(fire, frames, new Uint8Array(0), true)).toBe(1);
  });

  it("puts a lamp on the boat at night only", () => {
    const boat = { x: 40, y: 20, flip: false };
    expect(boatLight(boat, "day")).toBeNull();
    expect(boatLight(boat, "night")).toMatchObject({ kind: "boat", x: 50, y: 28 });
    expect(boatLight(null, "night")).toBeNull();
  });
});

describe("contact shadows", () => {
  it("leans west at dawn and east at dusk under a tree", () => {
    const tree = { left: 100, top: 100 };
    const centre = (r: { x: number; w: number }) => r.x + r.w / 2;
    expect(centre(treeShadow(tree, "dawn"))).toBeLessThan(centre(treeShadow(tree, "day")));
    expect(centre(treeShadow(tree, "dusk"))).toBeGreaterThan(centre(treeShadow(tree, "day")));
  });

  it("keeps a walker's shadow inside its own box (so its repaints cover it), and casts none for glyphs", () => {
    const walker: LiveActor = { frames: ["crowd_stand_of"], x: 10, y: 10, steps: [{ dx: 0, dy: 0 }] };
    const rect = { x: 10, y: 10, w: 10, h: 14 };
    for (const phase of PHASES) {
      const oval = actorShadow(walker, "crowd_stand_of", rect, phase)!;
      expect(contains(rect, oval)).toBe(true);
    }
    expect(actorShadow({ frames: ["count_9"], x: 0, y: 0 }, "count_9", { x: 0, y: 0, w: 6, h: 10 }, "day")).toBeNull();
  });
});

describe("ambient life", () => {
  it("keeps every smoke puff inside the smoke's repaint box", () => {
    const origin = smokeOrigin(plaza.actors)!;
    expect(origin).not.toBeNull();
    const box = smokeBounds(origin);
    for (let step = 0; step < 60; step++) for (const p of smokeAt(step, origin)) expect(contains(box, p)).toBe(true);
  });

  it("flies a few fireflies near their trees, blinking", () => {
    const anchors = fireflyAnchors(model);
    expect(anchors.length).toBeGreaterThanOrEqual(4);
    expect(anchors.length).toBeLessThanOrEqual(7);
    const levels = new Set<number>();
    for (let tick = 0; tick < 200; tick++) {
      firefliesAt(tick, anchors).forEach((f, i) => {
        expect(Math.abs(f.x - anchors[i].x)).toBeLessThanOrEqual(10);
        expect(Math.abs(f.y - anchors[i].y)).toBeLessThanOrEqual(5);
        expect(flyRect(f).w).toBe(3);
        levels.add(f.level);
      });
    }
    expect([...levels].sort()).toEqual([0, 1, 2, 3]);
  });

  it("glints only on open water, the same for the same frame", () => {
    const whole = { x: -64, y: -64, w: scene.width + 128, h: scene.height + 128 };
    for (const phase of PHASES) {
      const a = glintsIn(whole, model, phase, 5);
      expect(a).toEqual(glintsIn(whole, model, phase, 5));
      for (const g of a) {
        const col = Math.floor(g.x / scene.tile);
        const row = Math.floor(g.y / scene.tile);
        const inside = col >= 0 && row >= 0 && col < scene.cols && row < scene.rows;
        if (inside) expect([0, 1]).toContain(model.sea[row * scene.cols + col]);
      }
    }
  });

  it("slows the web's wind without changing the GIF's", () => {
    expect(SLOW_GUST.flip).toBeGreaterThan(GUST.flip);
    // The default is still GUST: the GIF and the old tests see the same gusts.
    const t = 2500 + 100;
    expect(swayB(t, 0)).toBe(swayB(t, 0, GUST));
  });
});

describe("shallows", () => {
  it("lightens only the water near the coast, never the land", () => {
    const distance = coastDistance(model);
    const pixels = shallowsPixels(distance, scene.width, scene.height, "day");
    let lit = 0;
    let onLand = 0;
    let far = 0;
    for (let k = 0; k < scene.width * scene.height; k++) {
      if (pixels[k * 4 + 3] === 0) continue;
      lit++;
      const x = k % scene.width;
      const y = Math.floor(k / scene.width);
      if (model.sea[Math.floor(y / scene.tile) * scene.cols + Math.floor(x / scene.tile)] < 0) onLand++;
      if (distance[k] >= SHALLOW_REACH) far++;
    }
    expect(lit).toBeGreaterThan(0);
    expect([onLand, far]).toEqual([0, 0]);
  });
});
