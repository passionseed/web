import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import {
  BREEZE_SPRITES,
  breezeAt,
  castsShadow,
  ellipseMask,
  footprint,
  glintAt,
  glintPath,
  lightSources,
  shadowBox,
  shallowLevel,
  waterField,
  webSprites,
} from "../atmosphere";
import { sceneModel } from "../draw";
import type { LiveActor } from "../types";

const plots = (n: number): IslandPlot[] =>
  Array.from({ length: n }, (_, k) => ({ slot: k + 1, stage: k % 8, visitor: false, key: false, helper: false, lantern: k % 3 === 0, name: null, mine: false }));

const scene = buildScene(plots(14), { festival: true });
const model = sceneModel(scene);

describe("the water round the island", () => {
  const field = waterField(scene, model.sea);
  const { rect, shallow, wet } = field;
  const at = (x: number, y: number) => (y - rect.y) * rect.w + (x - rect.x);

  it("tints only water: never a land cell", () => {
    for (let k = 0; k < model.sea.length; k++) {
      if (model.sea[k] !== -1) continue;
      const x = (k % scene.cols) * scene.tile;
      const y = Math.floor(k / scene.cols) * scene.tile;
      if (x < rect.x || y < rect.y || x >= rect.x + rect.w || y >= rect.y + rect.h) continue;
      for (let dy = 0; dy < scene.tile; dy++) for (let dx = 0; dx < scene.tile; dx++) expect(shallow[at(x + dx, y + dy)]).toBe(0);
    }
  });

  it("is shallowest at the waterline and fades out with the reach", () => {
    expect(shallowLevel(0)).toBe(3);
    expect(shallowLevel(10)).toBe(2);
    expect(shallowLevel(20)).toBe(1);
    expect(shallowLevel(40)).toBe(0);
    expect(shallow.some((v) => v === 3)).toBe(true);
    expect(shallow.some((v) => v === 1)).toBe(true);
    expect(wet.some((v) => v === 1)).toBe(true);
  });

  it("is the same for the same scene", () => {
    expect(waterField(scene, model.sea).shallow).toEqual(shallow);
  });
});

describe("contact shadows", () => {
  it("sit under a sprite's feet, centred on its last inked rows", () => {
    expect(footprint(["....", ".oo.", "o..o"])).toEqual({ x0: 0, x1: 3, bottom: 3 });
    const box = shadowBox("visitor", 100, 50, false, 0)!;
    expect(box.y + box.h).toBeGreaterThan(50 + 13);
    expect(box.x).toBeLessThanOrEqual(100 + 2);
    // Glyphs, bulbs and the breeze cast none.
    expect(castsShadow("count_9")).toBe(false);
    expect(castsShadow("goal_bulb")).toBe(false);
    expect(castsShadow("petal_0")).toBe(false);
    expect(castsShadow("notice_board")).toBe(true);
  });

  it("are a dark core in a lighter rim", () => {
    const mask = ellipseMask(10, 4);
    expect(mask[1 * 10 + 5]).toBe(2);
    expect(mask[0]).toBe(0);
    expect(mask.some((v) => v === 1)).toBe(true);
  });
});

describe("light of the hour", () => {
  const fire: LiveActor = { frames: ["campfire_flame_0", "campfire_flame_1"], x: 200, y: 100 };

  it("lights lamps, lanterns and the fire at night, only the fire and lanterns at dusk, nothing by day", () => {
    const night = lightSources(model, [fire], "night");
    expect(night.some((l) => l.kind === "lamp")).toBe(true);
    expect(night.some((l) => l.kind === "lantern")).toBe(true);
    expect(night.some((l) => l.kind === "fire")).toBe(true);
    const dusk = lightSources(model, [fire], "dusk");
    expect(dusk.every((l) => l.kind === "fire" || l.kind === "lantern")).toBe(true);
    expect(lightSources(model, [fire], "day")).toEqual([]);
    expect(lightSources(model, [fire], "dawn")).toEqual([]);
  });
});

describe("the breeze", () => {
  const span = { x: 0, w: scene.width };

  it("carries a few petals and leaves, the same at the same tick, and none at night", () => {
    const a = breezeAt(40, scene, span, "day");
    expect(a.length).toBeGreaterThanOrEqual(3);
    expect(a.length).toBeLessThanOrEqual(12);
    expect(breezeAt(40, scene, span, "day")).toEqual(a);
    expect(breezeAt(41, scene, span, "day")).not.toEqual(a);
    expect(breezeAt(40, scene, span, "night")).toEqual([]);
    for (const d of a) expect(BREEZE_SPRITES[d.name]).toBeDefined();
  });

  it("draws from the web's sprite set, which blanks the lantern's dotted ring", () => {
    const sprites = webSprites();
    expect(sprites.petal_0).toBeDefined();
    expect(sprites.lantern_glow_0.every((row) => /^\.+$/.test(row))).toBe(true);
    // The bot's own sprites are untouched.
    expect(sprites.lantern).toBeDefined();
  });
});

describe("glints on the sea", () => {
  it("are fixed for a cell and a sea step, and thicker on the sun's path", () => {
    const path = glintPath(scene);
    expect(glintAt(3, 4, 10, "dusk", path, 16)).toEqual(glintAt(3, 4, 10, "dusk", path, 16));
    let onPath = 0;
    let off = 0;
    const pathCol = Math.floor(path.x / 16);
    for (let row = 0; row < 200; row++) {
      for (let step = 0; step < 4; step++) {
        if (glintAt(pathCol, row, step, "dusk", path, 16)) onPath++;
        if (glintAt(pathCol + 20, row, step, "dusk", path, 16)) off++;
      }
    }
    expect(onPath).toBeGreaterThan(off * 3);
  });
});
