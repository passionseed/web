/**
 * @jest-environment node
 */
import { PNG } from "pngjs";

import { DIGITS, buildScene, renderIsland, type IslandPlot, type IslandScene } from "@/bot/src/quests/island/render";

import { FakeContext, FakeImage } from "../__fixtures__/fakeCanvas";
import { buildAtlasData, type AtlasRect } from "../atlas";
import { motionAt, type Motion } from "../clock";
import { dirtyRects, paintLand, paintOverlay, redrawRect, sceneModel, seaRectsFor, type Layers, type SceneModel } from "../draw";
import { intersect } from "../geometry";
import type { LightPhase, LiveActor } from "../types";

function plots(n: number): IslandPlot[] {
  return Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    stage: k % 8,
    visitor: k % 8 >= 3,
    key: k % 5 === 0,
    helper: k % 4 === 0,
    lantern: k % 7 === 0,
    name: null,
    mine: k === 2,
  }));
}

/** Roots 0..3 by slot, so every level is on the island. */
function withRootLevels(input: IslandPlot[]): IslandPlot[] {
  return input.map((p) => ({ ...p, roots: p.slot % 4 }));
}

interface Setup {
  scene: IslandScene;
  model: SceneModel;
  layers: Layers<FakeImage>;
  motion: (tick: number, opts?: { still?: boolean; actors?: LiveActor[] }) => Motion;
  night: boolean;
}

function setup(scene: IslandScene, phase: LightPhase): Setup {
  const data = buildAtlasData(phase);
  const atlas = new FakeImage(data.width, data.height, data.data);
  const model = sceneModel(scene);
  const land = new FakeImage(scene.width, scene.height);
  paintLand(new FakeContext(land), model, atlas, data.rects);
  const overlay = new FakeImage(scene.width, scene.height);
  paintOverlay(new FakeContext(overlay), model, atlas, data.rects);
  const swaying = model.trees.map((t) => t.b != null);
  const night = phase === "night";
  return {
    scene,
    model,
    night,
    layers: { atlas, rects: data.rects, flipped: data.flipped, seaRects: seaRectsFor(data.rects), land, overlay },
    motion: (tick, opts = {}) =>
      motionAt(tick, { scene, swaying, actors: opts.actors ?? [], ambient: true, still: opts.still ?? false, lowDetail: false, night }),
  };
}

function paintFull(s: Setup, motion: Motion, actors: LiveActor[] = []): FakeImage {
  const frame = FakeImage.opaque(s.scene.width, s.scene.height);
  redrawRect(new FakeContext(frame), { x: 0, y: 0, w: s.scene.width, h: s.scene.height }, s.model, s.layers, { motion, night: s.night, actors });
  return frame;
}

/** Decoded RGB of the bot's scale-1 PNG. */
function pngRgb(input: IslandPlot[], options: { markMine?: boolean; festival?: boolean }): Uint8Array {
  const png = PNG.sync.read(renderIsland(input, { ...options, scale: 1 }).png);
  const out = new Uint8Array(png.width * png.height * 3);
  for (let i = 0, o = 0; i < png.data.length; i += 4) {
    out[o++] = png.data[i];
    out[o++] = png.data[i + 1];
    out[o++] = png.data[i + 2];
  }
  return out;
}

function differingFrames(a: FakeImage, b: FakeImage): number {
  const x = a.words();
  const y = b.words();
  let n = 0;
  for (let i = 0; i < x.length; i++) if ((x[i] & 0xffffff) !== (y[i] & 0xffffff)) n++;
  return n;
}

function differing(a: Uint8Array, b: Uint8Array): number {
  expect(a.length).toBe(b.length);
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

describe("the living island's still daytime frame", () => {
  it("is the bot's PNG, pixel for pixel", () => {
    for (const [n, options] of [
      [0, { markMine: true, festival: true }],
      [6, { markMine: true, festival: true }],
      [24, { markMine: true, festival: false }],
    ] as const) {
      const input = plots(n);
      const s = setup(buildScene(input, options), "day");
      const frame = paintFull(s, s.motion(0, { still: true }));
      expect([n, differing(frame.rgb(), pngRgb(input, options))]).toEqual([n, 0]);
    }
  });

  it("draws roots exactly where the PNG does", () => {
    const input = withRootLevels(plots(12));
    const options = { markMine: true, festival: false };
    const s = setup(buildScene(input, options), "day");
    const frame = paintFull(s, s.motion(0, { still: true }));
    expect(differing(frame.rgb(), pngRgb(input, options))).toBe(0);
    // And the roots are really there: the picture differs from the same island without them.
    expect(differing(frame.rgb(), pngRgb(plots(12), options))).toBeGreaterThan(0);
  });
});

describe("incremental painting", () => {
  /** Repaints only the dirty rectangles each tick and checks the result against a fresh full paint. */
  function replay(s: Setup, ticks: number[], actors: LiveActor[] = []) {
    const full = { x: 0, y: 0, w: s.scene.width, h: s.scene.height };
    const frame = FakeImage.opaque(s.scene.width, s.scene.height);
    const ctx = new FakeContext(frame);
    let prev: Motion | null = null;
    let partial = 0;
    for (const tick of ticks) {
      const motion = s.motion(tick, { actors });
      const dirty = dirtyRects(prev, motion, s.model, s.layers.rects, actors);
      const state = { motion, night: s.night, actors };
      if (dirty === "all") redrawRect(ctx, full, s.model, s.layers, state);
      else {
        partial++;
        for (const r of dirty) {
          const part = intersect(r, full);
          if (part) redrawRect(ctx, part, s.model, s.layers, state);
        }
      }
      prev = motion;
      if (dirty !== "all") expect([tick, differingFrames(frame, paintFull(s, motion, actors))]).toEqual([tick, 0]);
    }
    return partial;
  }

  it("repaints only what moved, and the result equals a full repaint (day, through a gust)", () => {
    const s = setup(buildScene(plots(6), { markMine: true, festival: true }), "day");
    const ticks = Array.from({ length: 70 }, (_, k) => k + 10);
    expect(replay(s, ticks)).toBeGreaterThan(20);
  });

  it("keeps roots through a gust: a swaying tree's repaint redraws its roots", () => {
    const s = setup(buildScene(withRootLevels(plots(8)), { markMine: false, festival: false }), "day");
    expect(replay(s, Array.from({ length: 70 }, (_, k) => k + 10))).toBeGreaterThan(20);
  });

  it("does the same at night, with lantern glows, lamps, the festoon and a story actor", () => {
    const s = setup(buildScene(plots(8), { markMine: false, festival: true }), "night");
    const actors: LiveActor[] = [{ frames: ["builder_0", "builder_1"], x: 120, y: 90, frameMs: 600, flip: true }];
    expect(replay(s, Array.from({ length: 40 }, (_, k) => k), actors)).toBeGreaterThan(5);
  });
});

describe("what each light draws", () => {
  /** The atlas rects drawn during one full paint. */
  function drawn(s: Setup, motion: Motion): AtlasRect[] {
    const frame = FakeImage.opaque(s.scene.width, s.scene.height);
    const ctx = new FakeContext(frame);
    const seen: AtlasRect[] = [];
    const original = ctx.drawImage.bind(ctx);
    ctx.drawImage = (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
      if (img === s.layers.atlas) seen.push({ x: sx, y: sy, w: sw, h: sh });
      original(img, sx, sy, sw, sh, dx, dy, dw, dh);
    };
    redrawRect(ctx, { x: 0, y: 0, w: s.scene.width, h: s.scene.height }, s.model, s.layers, { motion, night: s.night, actors: [] });
    return seen;
  }
  const uses = (seen: AtlasRect[], s: Setup, name: string) => {
    const r = s.layers.rects.get(name)!;
    return seen.filter((a) => a.x === r.x && a.y === r.y).length;
  };

  it("lights earned lanterns, plaza lamps and the festival festoon only at night", () => {
    const scene = buildScene(plots(8), { festival: true });
    const lanterns = scene.trees.filter((t) => t.lantern).length;
    expect(lanterns).toBeGreaterThan(0);
    const night = setup(scene, "night");
    const nightSeen = drawn(night, night.motion(0, { still: true }));
    expect(uses(nightSeen, night, "lantern_glow_0") + uses(nightSeen, night, "lantern_glow_1")).toBe(lanterns);
    expect(uses(nightSeen, night, "lamp_post")).toBe(4);
    expect(uses(nightSeen, night, "festoon")).toBe(1);
    for (const phase of ["dawn", "day", "dusk"] as const) {
      const s = setup(scene, phase);
      const seen = drawn(s, s.motion(0, { still: true }));
      expect([phase, uses(seen, s, "lantern_glow_0"), uses(seen, s, "lamp_post"), uses(seen, s, "festoon")]).toEqual([phase, 0, 0, 0]);
    }
    // No season, no festoon, even at night.
    const quiet = setup(buildScene(plots(8)), "night");
    expect(uses(drawn(quiet, quiet.motion(0, { still: true })), quiet, "festoon")).toBe(0);
  });

  it("keeps tags and the pin untinted at night", () => {
    const scene = buildScene(plots(6), { markMine: true });
    const day = paintFull(setup(scene, "day"), setup(scene, "day").motion(0, { still: true }));
    const nightSetup = setup(scene, "night");
    const night = paintFull(nightSetup, nightSetup.motion(0, { still: true }));
    const at = (img: FakeImage, x: number, y: number) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3));
    // The first lit pixel of every tag's first digit is the same white.
    for (const tag of scene.tags) {
      const g = scene.glyph;
      const lit = DIGITS[Number(String(tag.slot)[0])].indexOf("1");
      const x = tag.x + (2 + (lit % 3)) * g;
      const y = tag.y + (2 + Math.floor(lit / 3)) * g;
      expect(at(night, x, y)).toEqual([255, 255, 255]);
      expect(at(day, x, y)).toEqual([255, 255, 255]);
    }
    const pin = scene.marker!;
    const cx = pin.x + 4 * pin.scale;
    const cy = pin.y + 3 * pin.scale;
    expect(at(night, cx, cy)).toEqual(at(day, cx, cy));
    // The sea is darker at night.
    expect(at(night, 2, 2)[0]).toBeLessThan(at(day, 2, 2)[0]);
  });
});

describe("the open sea past the picture", () => {
  /** Paints `frame` (scene px, may reach past the scene) into its own image. */
  function paintFrame(s: Setup, frame: { x: number; y: number; w: number; h: number }, motion: Motion): FakeImage {
    const img = FakeImage.opaque(frame.w, frame.h);
    redrawRect(new FakeContext(img, frame), frame, s.model, s.layers, { motion, night: s.night, actors: [] });
    return img;
  }
  const px = (img: FakeImage, x: number, y: number) => img.words()[y * img.width + x] & 0xffffff;

  it("draws the scene unchanged and water tiles all around it, in every direction", () => {
    const s = setup(buildScene(plots(6), { markMine: true }), "day");
    const motion = s.motion(0, { still: true });
    const pad = 40;
    const frame = { x: -pad, y: -pad, w: s.scene.width + 2 * pad, h: s.scene.height + 2 * pad };
    const wide = paintFrame(s, frame, motion);
    const inside = paintFull(s, motion);
    let diff = 0;
    for (let y = 0; y < s.scene.height; y++) for (let x = 0; x < s.scene.width; x++) if (px(wide, x + pad, y + pad) !== px(inside, x, y)) diff++;
    expect(diff).toBe(0);
    // Outside: painted everywhere (an opaque black start shows any gap).
    for (const [x, y] of [[0, 0], [frame.w - 1, 0], [0, frame.h - 1], [frame.w - 1, frame.h - 1], [5, pad + 20], [frame.w - 3, pad + 40]]) {
      expect(px(wide, x, y)).not.toBe(0);
    }
    let unpainted = 0;
    for (let k = 0; k < wide.words().length; k++) if ((wide.words()[k] & 0xffffff) === 0) unpainted++;
    expect(unpainted).toBe(0);
  });

  it("moves the open sea with the island's own sea frames", () => {
    const s = setup(buildScene(plots(2)), "day");
    const frame = { x: -64, y: -32, w: 48, h: 24 };
    const a = paintFrame(s, frame, s.motion(0));
    const b = paintFrame(s, frame, s.motion(3));
    expect(differingFrames(a, b)).toBeGreaterThan(0);
  });

  it("lets the boat, gulls and clouds cross the whole frame", () => {
    const scene = buildScene(plots(2));
    const span = { x: -300, w: scene.width + 600 };
    const base = { scene, swaying: [], actors: [], ambient: true, still: false, lowDetail: false, night: false };
    const xs = Array.from({ length: 4000 }, (_, t) => motionAt(t, { ...base, span }).boat!.x);
    expect(Math.min(...xs)).toBeLessThan(-300);
    expect(Math.max(...xs)).toBeGreaterThan(scene.width + 300 - 20);
    const gulls = Array.from({ length: 4000 }, (_, t) => motionAt(t, { ...base, span }).gulls[0].x);
    expect(Math.min(...gulls)).toBeLessThan(-300);
    // Without a span they stay with the scene, as before.
    expect(Math.min(...Array.from({ length: 4000 }, (_, t) => motionAt(t, base).boat!.x))).toBeGreaterThan(-100);
  });
});
