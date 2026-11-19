import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import {
  BREATH,
  BREEZE_SPRITES,
  FIRE_WARM,
  LAMP_WARM,
  LIGHT_SIZE,
  POOL_ALPHA,
  SHALLOW_LEVELS,
  SHALLOW_REACH,
  bayer,
  breathAt,
  breezeAt,
  castsShadow,
  catchesLight,
  ellipseMask,
  firelight,
  footprint,
  glintAt,
  glintPath,
  lamplight,
  lightSources,
  lightStrength,
  poolStep,
  shadowBox,
  shallowLevel,
  smokeAt,
  smokeBounds,
  smokeOrigin,
  WET,
  waterField,
  webSprites,
} from "../atmosphere";
import { overlaps } from "../geometry";
import { sceneModel } from "../draw";
import type { LiveActor } from "../types";

const plots = (n: number): IslandPlot[] =>
  Array.from({ length: n }, (_, k) => ({ slot: k + 1, stage: k % 8, visitor: false, key: false, helper: false, lantern: k % 3 === 0, name: null, mine: false }));

const scene = buildScene(plots(14), { festival: true });
const model = sceneModel(scene);

describe("the water round the island", () => {
  const field = waterField(scene, model.sea);
  const { rect, level, cells } = field;
  const at = (x: number, y: number) => (y - rect.y) * rect.w + (x - rect.x);
  const cellOf = (x: number, y: number) => at(x - (x % scene.tile), y - (y % scene.tile));

  it("tints only water: never a land cell, and on a shore cell only what stays open water or wet sand", () => {
    for (let k = 0; k < model.sea.length; k++) {
      const kind = model.sea[k];
      const x = (k % scene.cols) * scene.tile;
      const y = Math.floor(k / scene.cols) * scene.tile;
      if (x < rect.x || y < rect.y || x >= rect.x + rect.w || y >= rect.y + rect.h) continue;
      if (kind === -1) {
        for (let dy = 0; dy < scene.tile; dy++) for (let dx = 0; dx < scene.tile; dx++) expect(level[at(x + dx, y + dy)]).toBe(0);
      } else if (kind === 2) {
        // shore_n: its bottom row is sand, never tinted as water.
        expect([0, WET]).toContain(level[at(x + 8, y + 15)]);
      }
    }
    expect(level.some((v) => v === WET)).toBe(true);
  });

  it("lists exactly the cells that hold any shallows or wet sand", () => {
    const listed = new Set(cells);
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) if (level[at(x, y)]) expect(listed.has(cellOf(x, y))).toBe(true);
    }
  });

  it("fades out smoothly from the waterline: every level along the way, dithered, never in hard bands", () => {
    // Right at the waterline nearly every pixel is the shallowest; past the reach, none.
    const near = Array.from({ length: 16 }, (_, k) => shallowLevel(0, k % 4, k >> 2));
    expect(near.every((v) => v === SHALLOW_LEVELS)).toBe(true);
    expect(Array.from({ length: 16 }, (_, k) => shallowLevel(SHALLOW_REACH, k % 4, k >> 2)).every((v) => v === 0)).toBe(true);
    // Midway, neighbouring pixels differ: a dither, not a contour.
    const mid = new Set(Array.from({ length: 16 }, (_, k) => shallowLevel(SHALLOW_REACH * 0.4, k % 4, k >> 2)));
    expect(mid.size).toBeGreaterThan(1);
    // The average falls steadily with the distance.
    const mean = (d: number) => Array.from({ length: 16 }, (_, k) => shallowLevel(d, k % 4, k >> 2)).reduce((a, b) => a + b, 0) / 16;
    for (let d = 2; d < SHALLOW_REACH; d += 2) expect(mean(d)).toBeLessThanOrEqual(mean(d - 2));
    for (let v = 1; v <= SHALLOW_LEVELS; v++) expect(level.some((x) => x === v)).toBe(true);
  });

  it("keeps its dither in world space: the same pixel always gets the same level", () => {
    expect(shallowLevel(9, 101, 57)).toBe(shallowLevel(9, 101 + 4, 57 + 8));
    expect(bayer(3, 2)).toBe(bayer(7, 6));
  });

  it("is the same for the same scene", () => {
    expect(waterField(scene, model.sea).level).toEqual(level);
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

  it("lights lamps, lanterns and the fire at night, only the fire and lanterns (faintly) at dawn and dusk, nothing by day", () => {
    const night = lightSources(model, [fire], "night");
    expect(night.some((l) => l.kind === "lamp")).toBe(true);
    expect(night.some((l) => l.kind === "lantern")).toBe(true);
    expect(night.some((l) => l.kind === "fire")).toBe(true);
    for (const phase of ["dawn", "dusk"] as const) {
      const soft = lightSources(model, [fire], phase);
      expect(soft.some((l) => l.kind === "fire")).toBe(true);
      expect(soft.every((l) => l.kind === "fire" || l.kind === "lantern")).toBe(true);
      for (const l of soft) expect(lightStrength(phase, l.kind)).toBeLessThan(0.5);
    }
    expect(lightSources(model, [fire], "day")).toEqual([]);
  });

  it("gives the fire and the countdown board no glow of their own: nothing is painted over the stall or the people", () => {
    expect(LIGHT_SIZE.fire.halo).toBe(0);
    expect(LIGHT_SIZE.board.halo).toBe(0);
  });

  it("falls off in three soft steps, strongest at the heart, dithered only near each edge", () => {
    const [cx, cy, rx, ry] = [100, 60, 40, 24];
    expect(poolStep(cx, cy, cx, cy, rx, ry)).toBe(3);
    expect(poolStep(cx + rx + 1, cy, cx, cy, rx, ry)).toBe(0);
    // Walking out from the heart the step never rises.
    for (let y = cy; y < cy + 4; y++) {
      let prev = 3;
      for (let x = cx; x <= cx + rx; x += 4) {
        const s = poolStep(x, y, cx, cy, rx, ry);
        expect(s).toBeLessThanOrEqual(prev);
        prev = s;
      }
    }
    // Halfway out it is one step, not a mix of all of them.
    const half = new Set(Array.from({ length: 16 }, (_, k) => poolStep(cx + rx / 2 + (k % 4), cy + (k >> 2), cx, cy, rx, ry)));
    expect(half.size).toBeLessThanOrEqual(2);
    // Never opaque: even the heart, at the fire's brightest breath, lets the ground's own colour through.
    expect(POOL_ALPHA[0]).toBe(0);
    expect(POOL_ALPHA[3] * Math.max(...BREATH)).toBeLessThan(0.75);
  });

  it("keeps the pool's dither still in the world: a moved pool keeps each pixel's threshold", () => {
    // The same offset from the centre, the centre moved by a multiple of the 4 px pattern: the same step.
    for (let k = 0; k < 64; k++) {
      const dx = (k % 8) * 3 - 12;
      const dy = Math.floor(k / 8) * 2 - 8;
      expect(poolStep(200 + dx, 120 + dy, 200, 120, 30, 18)).toBe(poolStep(204 + dx, 128 + dy, 204, 128, 30, 18));
    }
  });

  it("lights the ground warm but softer than paint: warm enough to show over the moonlit blue, never mustard", () => {
    const sat = ([r, g, b]: readonly number[]) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
    const grass: [number, number, number] = [145, 183, 107];
    const stone: [number, number, number] = [184, 199, 191];
    const lit = lamplight(grass);
    expect(lit[0]).toBeGreaterThan(lit[2]);
    // The old flat mustard (half the lamp's amber over grass) was about 0.6.
    expect(sat(lit)).toBeLessThan(0.55);
    expect(lit.reduce((a, b) => a + b)).toBeLessThanOrEqual(grass.reduce((a, b) => a + b));
    // Grey plaza stone turns a warm tan under a lamp, red well above blue, and deeper still by the fire.
    const warmStone = lamplight(stone);
    expect(warmStone[0] - warmStone[2]).toBeGreaterThan(45);
    expect(sat(warmStone)).toBeLessThan(0.45);
    const fireStone = lamplight(stone, FIRE_WARM);
    expect(fireStone[0] - fireStone[2]).toBeGreaterThan(warmStone[0] - warmStone[2] + 30);
    expect(lamplight(stone, LAMP_WARM)).toEqual(warmStone);
    const face = firelight([255, 214, 180]);
    expect(face[0]).toBeGreaterThan(face[1]);
    expect(face[1]).toBeGreaterThan(face[2]);
  });

  it("breathes in a few steps at a slow rate, and only the people catch the fire's light", () => {
    const steps = Array.from({ length: 400 }, (_, t) => breathAt(t));
    expect(new Set(steps).size).toBe(BREATH.length);
    let changes = 0;
    for (let t = 1; t < steps.length; t++) if (steps[t] !== steps[t - 1]) changes++;
    // At most one change every three ticks (375 ms).
    expect(changes).toBeLessThanOrEqual(steps.length / 3);
    for (let t = 1; t < steps.length; t++) expect(Math.abs(steps[t] - steps[t - 1])).toBeLessThanOrEqual(1);
    expect(catchesLight("campfire_flame_0")).toBe(false);
    expect(catchesLight("count_9")).toBe(false);
    expect(catchesLight("fest_count")).toBe(false);
    expect(catchesLight("visitor")).toBe(true);
  });
});

describe("the campfire's smoke", () => {
  const flame: LiveActor = { frames: ["campfire_flame_0", "campfire_flame_1"], x: 200, y: 100 };

  it("rises from the flame inside its own small box, the same at the same step", () => {
    const origin = smokeOrigin([{ frames: ["visitor"], x: 0, y: 0 }, flame])!;
    expect(origin).toEqual({ x: 205, y: 100 });
    expect(smokeOrigin([{ frames: ["visitor"], x: 0, y: 0 }])).toBeNull();
    const box = smokeBounds(origin);
    for (let step = 0; step < 60; step++) {
      const puffs = smokeAt(step, origin);
      expect(puffs).toEqual(smokeAt(step, origin));
      for (const p of puffs) {
        expect(overlaps(p, box)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(box.x);
        expect(p.x + p.w).toBeLessThanOrEqual(box.x + box.w);
        expect(p.y).toBeGreaterThanOrEqual(box.y);
        expect(p.alpha).toBeLessThanOrEqual(0.5);
      }
    }
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
