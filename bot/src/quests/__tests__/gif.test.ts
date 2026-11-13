/**
 * @jest-environment node
 */
import sharp from "sharp";

import { TICK_MS } from "@/lib/shift-island/live/clock";

import { LOOP_TICKS, loopMotion, loopSway, renderIslandGif, renderSceneGif } from "../island/gif";
import { buildScene, type IslandPlot } from "../island/render";
import { STORY_PAGES, storyGif } from "../story";

function plots(n: number): IslandPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 3 === 0,
    name: `โปรเจกต์ ${k + 1}`,
    mine: false,
  }));
}

/** What the GIF says about itself: its frames, their delays and whether it loops. */
async function meta(gif: Buffer) {
  const m = await sharp(gif, { animated: true }).metadata();
  return { format: m.format, width: m.width, pages: m.pages, loop: m.loop, delay: m.delay ?? [] };
}

describe("the island GIF loop", () => {
  it("meets itself again after one loop, so it plays without a seam", () => {
    const scene = buildScene(plots(12), { festival: true });
    const swaying = scene.trees.map(() => true);
    for (const night of [false, true]) {
      expect(loopMotion(LOOP_TICKS, scene, swaying, night)).toEqual(loopMotion(0, scene, swaying, night));
      expect(loopMotion(-1, scene, swaying, night)).toEqual(loopMotion(LOOP_TICKS - 1, scene, swaying, night));
    }
  });

  it("gives each swaying tree one gust per loop, and none at the seam", () => {
    const loopMs = LOOP_TICKS * TICK_MS;
    for (const delay of [0, 300, 900]) {
      const on = Array.from({ length: LOOP_TICKS }, (_, t) => loopSway(t * TICK_MS, delay));
      expect(on.some(Boolean)).toBe(true);
      expect([on[0], on[LOOP_TICKS - 1], loopSway(loopMs, delay)]).toEqual([false, false, false]);
    }
  });

  it("lights lanterns only at night", () => {
    const scene = buildScene(plots(12), { festival: true });
    const swaying = scene.trees.map(() => false);
    const glowing = (night: boolean) => Array.from({ length: LOOP_TICKS }, (_, t) => [...loopMotion(t, scene, swaying, night).glow]).flat();
    expect(glowing(false).every((g) => g === 0)).toBe(true);
    expect(glowing(true).some((g) => g > 0)).toBe(true);
  });
});

describe("renderIslandGif", () => {
  it("is a looping GIF of the island, six seconds long, with a frame only where something moved", async () => {
    const scene = buildScene(plots(6), { festival: true });
    const out = renderIslandGif(plots(6), { scale: 2, festival: true });
    expect(out.gif.subarray(0, 6).toString("latin1")).toBe("GIF89a");
    expect([out.width, out.height, out.scale]).toEqual([scene.width * 2, scene.height * 2, 2]);
    expect(out.frames).toBeGreaterThan(1);
    expect(out.frames).toBeLessThanOrEqual(LOOP_TICKS);
    const m = await meta(out.gif);
    expect([m.format, m.width, m.pages, m.loop]).toEqual(["gif", out.width, out.frames, 0]);
    expect(m.delay.reduce((a, b) => a + b, 0)).toBe(LOOP_TICKS * TICK_MS);
  });

  it("draws the same bytes for the same island, and different light for another phase", () => {
    const a = renderIslandGif(plots(9), { phase: "night", festival: true }).gif;
    const b = renderIslandGif(plots(9), { phase: "night", festival: true }).gif;
    const day = renderIslandGif(plots(9), { phase: "day", festival: true }).gif;
    expect(a.equals(b)).toBe(true);
    expect(a.equals(day)).toBe(false);
  });

  it("stays small enough for the live post on a big island", () => {
    for (const phase of ["day", "night"] as const) {
      const out = renderIslandGif(plots(60), { scale: 2, festival: true, phase });
      expect([phase, out.gif.length < 1024 * 1024]).toEqual([phase, true]);
    }
  });

  it("refuses an empty view", () => {
    const scene = buildScene([], {});
    expect(() => renderSceneGif(scene, { view: { x: 0, y: 0, w: 0, h: 10 } })).toThrow("empty view 0x10");
  });

  it("crops to a view and drops the scale to fit the width asked for", () => {
    const scene = buildScene(plots(3), {});
    const out = renderSceneGif(scene, { scale: 4, maxWidth: 300, view: { x: 16, y: 16, w: 100, h: 60 } });
    expect([out.width, out.height, out.scale]).toEqual([300, 180, 3]);
  });
});

describe("the story pictures", () => {
  it("has a moving picture for every page, each under 400 KB, drawn once", () => {
    for (let page = 0; page < STORY_PAGES; page++) {
      const gif = storyGif(page);
      expect([page, gif?.subarray(0, 6).toString("latin1")]).toEqual([page, "GIF89a"]);
      expect([page, gif!.length < 400 * 1024]).toEqual([page, true]);
      expect(storyGif(page)).toBe(gif);
    }
    expect(storyGif(STORY_PAGES)).toBeNull();
  });
});
