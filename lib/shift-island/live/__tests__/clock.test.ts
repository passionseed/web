/**
 * @jest-environment node
 */
import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import {
  BOAT_W,
  GUST,
  TICK_MS,
  actorFrame,
  boatAt,
  cloudsAt,
  foamFrame,
  gullsAt,
  gustStart,
  motionAt,
  nextTickAt,
  seaFrame,
  swayB,
  swayDelay,
} from "../clock";

const plot = (slot: number, stage: number, extra: Partial<IslandPlot> = {}): IslandPlot => ({
  slot,
  stage,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: false,
  ...extra,
});

const scene = buildScene([plot(1, 0), plot(2, 1), plot(3, 5, { lantern: true }), plot(4, 7)]);
const swaying = scene.trees.map((t) => t.stage >= 2);

describe("sea and foam", () => {
  it("ping-pongs the sea 0-1-2-1 every 3 ticks and the foam every 4", () => {
    expect(Array.from({ length: 15 }, (_, t) => seaFrame(t)).join("")).toBe("000111222111000");
    expect(Array.from({ length: 20 }, (_, t) => foamFrame(t)).join("")).toBe("00001111222211110000");
  });
});

describe("the boat", () => {
  it("starts where the PNG anchors it, bow first (left, unmirrored), and moves 1 px every 2 ticks", () => {
    const at0 = boatAt(0, scene);
    // Exactly where the still picture has it: no jump when the canvas takes over from the PNG.
    expect(at0).toMatchObject({ x: scene.boatStill.x, y: scene.boatStill.y, flip: false });
    // Then it eases into its lane, 1 px at a time, and stays there.
    const dy = scene.lanes.boatY - scene.boatStill.y;
    expect(Math.abs(boatAt(4, scene).y - scene.boatStill.y)).toBe(Math.min(1, Math.abs(dy)));
    expect(boatAt(4 * Math.abs(dy), scene).y).toBe(scene.lanes.boatY);
    expect(boatAt(10_000, scene).y).toBe(scene.lanes.boatY);
    expect(boatAt(1, scene).x).toBe(at0.x);
    expect(boatAt(2, scene).x).toBe(at0.x - 1);
    expect(boatAt(60, scene).x).toBe(at0.x - 30);
    // It bobs between its two frames every 4 ticks.
    expect([0, 3, 4, 7, 8].map((t) => boatAt(t, scene).name)).toEqual(["boat", "boat", "boat_1", "boat_1", "boat"]);
  });

  it("turns round out of sight, sails back mirrored, and loops", () => {
    let maxX = -Infinity;
    let minX = Infinity;
    let leftward = 0;
    let rightward = 0;
    let prev = boatAt(0, scene);
    const loop = 4 * (scene.width + BOAT_W + 80);
    for (let t = 1; t <= loop; t++) {
      const b = boatAt(t, scene);
      expect(Math.abs(b.x - prev.x)).toBeLessThanOrEqual(1);
      // The sprite's bow points left: unmirrored sailing left, mirrored sailing right.
      if (b.x < prev.x) {
        leftward++;
        expect(b.flip).toBe(false);
      }
      if (b.x > prev.x) {
        rightward++;
        expect(b.flip).toBe(true);
      }
      maxX = Math.max(maxX, b.x);
      minX = Math.min(minX, b.x);
      prev = b;
    }
    expect(leftward).toBeGreaterThan(0);
    expect(rightward).toBeGreaterThan(0);
    // Both turns happen fully off the island.
    expect(maxX).toBeGreaterThanOrEqual(scene.width);
    expect(minX + BOAT_W).toBeLessThanOrEqual(0);
    // Back where it started, in its lane (only the very first pass starts on the PNG's row).
    expect(boatAt(loop, scene)).toEqual({ ...boatAt(0, scene), y: scene.lanes.boatY });
  });
});

describe("gulls and clouds", () => {
  it("flies two gulls 1 px per tick in the gull lane, flapping every 2 ticks", () => {
    const a = gullsAt(10, scene);
    const b = gullsAt(11, scene);
    expect(a).toHaveLength(2);
    expect(b[0].x - a[0].x).toBe(1);
    expect(a[0].y).toBe(scene.lanes.gullY);
    expect(a[1].y).toBeLessThan(32 - 5);
    expect([12, 13, 14, 15].map((t) => gullsAt(t, scene)[0].name)).toEqual(["gull_0", "gull_0", "gull_1", "gull_1"]);
  });

  it("drifts cloud shadows 1 px every 4 ticks", () => {
    const a = cloudsAt(0, scene);
    expect(cloudsAt(3, scene).map((c) => c.x)).toEqual(a.map((c) => c.x));
    expect(cloudsAt(4, scene).map((c) => c.x - 1)).toEqual(a.map((c) => c.x));
  });
});

describe("sway", () => {
  it("comes in gusts 6 to 8 s apart", () => {
    for (let k = 1; k < 50; k++) {
      const gap = gustStart(k) - gustStart(k - 1);
      expect(gap).toBeGreaterThanOrEqual(6000);
      expect(gap).toBeLessThanOrEqual(8000);
    }
  });

  it("flips A/B every 400 ms for 1.6 s, later for trees further right", () => {
    const start = gustStart(0);
    expect(swayB(start - 1, 0)).toBe(false);
    expect([0, 399, 400, 799, 800, 1200, 1599, 1600].map((d) => swayB(start + d, 0))).toEqual([true, true, false, false, true, false, false, false]);
    const delay = swayDelay(400, 800);
    expect(delay).toBe(GUST.spread / 2);
    expect(swayB(start + 10, delay)).toBe(false);
    expect(swayB(start + delay + 10, delay)).toBe(true);
    // Between gusts, every tree stands still.
    expect(swayB(start + 4000, 0)).toBe(false);
  });

  it("never sways stage 0 or 1, and sways nothing when still or tiny", () => {
    const input = { scene, swaying, actors: [], ambient: true, still: false, lowDetail: false, night: false };
    const first = Math.floor(gustStart(0) / TICK_MS);
    const ticks = Array.from({ length: Math.ceil((GUST.length + GUST.spread) / TICK_MS) + 2 }, (_, k) => first + k);
    const swayed = [0, 1, 2, 3].map((i) => ticks.some((t) => motionAt(t, input).sway[i] === 1));
    expect(swayed).toEqual([false, false, true, true]);
    for (const t of ticks) {
      expect(Array.from(motionAt(t, { ...input, still: true }).sway)).toEqual([0, 0, 0, 0]);
      expect(Array.from(motionAt(t, { ...input, lowDetail: true }).sway)).toEqual([0, 0, 0, 0]);
    }
  });
});

describe("motionAt", () => {
  const input = { scene, swaying, actors: [{ frames: ["builder_0", "builder_1"], x: 10, y: 10, frameMs: 500 }], ambient: true, still: false, lowDetail: false, night: false };

  it("draws one still frame: frame 0, sway A, the boat at its anchor, no gulls or clouds", () => {
    const m = motionAt(57, { ...input, still: true });
    expect([m.sea, m.foam]).toEqual([0, 0]);
    expect(m.boat).toEqual({ name: "boat", x: scene.boatStill.x, y: scene.boatStill.y, flip: false });
    expect([m.gulls, m.clouds]).toEqual([[], []]);
    expect(Array.from(m.actors)).toEqual([0]);
  });

  it("freezes the sea when tiny but keeps the boat, gulls and clouds moving", () => {
    const a = motionAt(9, { ...input, lowDetail: true });
    const b = motionAt(13, { ...input, lowDetail: true });
    expect([a.sea, a.foam, b.sea, b.foam]).toEqual([0, 0, 0, 0]);
    expect(b.boat!.x).not.toBe(a.boat!.x);
    expect(b.gulls[0].x).not.toBe(a.gulls[0].x);
    expect(b.clouds[0].x).toBe(a.clouds[0].x + 1);
  });

  it("drops the boat, gulls and clouds without ambient life, and gulls and clouds at night", () => {
    const quiet = motionAt(40, { ...input, ambient: false });
    expect([quiet.boat, quiet.gulls, quiet.clouds]).toEqual([null, [], []]);
    const night = motionAt(40, { ...input, night: true });
    expect(night.boat).not.toBeNull();
    expect([night.gulls, night.clouds]).toEqual([[], []]);
  });

  it("flickers earned lanterns only at night", () => {
    const lit = scene.trees.findIndex((t) => t.lantern);
    const frames = Array.from({ length: 24 }, (_, t) => motionAt(t, { ...input, night: true }).glow[lit]);
    expect(new Set(frames).size).toBe(2);
    expect(Array.from({ length: 24 }, (_, t) => motionAt(t, input).glow[lit]).every((g) => g === 0)).toBe(true);
  });

  it("steps story actors by their own frame time", () => {
    expect([0, 3, 4, 7, 8].map((t) => actorFrame(t, { frames: ["a", "b"], frameMs: 500 }))).toEqual([0, 0, 1, 1, 0]);
    expect(actorFrame(99, { frames: ["a"] })).toBe(0);
  });
});

describe("nextTickAt", () => {
  it("names the next due tick, every tick zoomed and every other one fitted", () => {
    expect(nextTickAt(0, 1)).toBe(1);
    expect(nextTickAt(124, 1)).toBe(1);
    expect(nextTickAt(125, 1)).toBe(2);
    expect(nextTickAt(0, 2)).toBe(2);
    expect(nextTickAt(260, 2)).toBe(4);
  });
});
