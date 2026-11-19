/**
 * @jest-environment node
 */
import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";

import { FakeContext, FakeImage } from "../__fixtures__/fakeCanvas";
import { buildAtlasData, type AtlasRect } from "../atlas";
import { motionAt, seaFrame } from "../clock";
import { dirtyRects, paintLand, paintOverlay, redrawRect, sceneModel, seaRectsFor, type DrawFx, type Layers } from "../draw";
import { treeFigures } from "../figures";
import type { Rect } from "../geometry";
import { interactTargets, nearestTarget, plotKey, spotKey, type InteractTarget } from "../interact";
import {
  OUTLINE_LIT_RGB,
  OUTLINE_RGB,
  OutlineLayer,
  PULSE,
  PULSE_TICKS,
  STILL_GLOW,
  pulseAt,
  ringDirty,
  ringMask,
  ringTickDirty,
  shapeVariants,
  silhouette,
  targetBox,
  withRing,
  type AlphaAtlas,
  type OutlineFrame,
  type Part,
  type Ring,
} from "../outline";
import { plazaWorld } from "../plaza";
import type { LiveActor } from "../types";

const plot = (slot: number, extra: Partial<IslandPlot> = {}): IslandPlot => ({
  slot,
  stage: 5,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: false,
  ...extra,
});

/** A tiny atlas from rows: "#" opaque, "." clear. */
function alphaAtlas(sprites: Record<string, string[]>): AlphaAtlas {
  const rects = new Map<string, AtlasRect>();
  let x = 0;
  let height = 0;
  for (const [name, rows] of Object.entries(sprites)) {
    rects.set(name, { x, y: 0, w: rows[0].length, h: rows.length });
    x += rows[0].length + 1;
    height = Math.max(height, rows.length);
  }
  const data = new Uint8ClampedArray(x * height * 4);
  for (const [name, rows] of Object.entries(sprites)) {
    const a = rects.get(name)!;
    rows.forEach((row, j) => [...row].forEach((ch, i) => (data[((a.y + j) * x + a.x + i) * 4 + 3] = ch === "#" ? 255 : 0)));
  }
  return { width: x, height, data, rects, flipped: new Map() };
}

const bitsOf = (mask: { w: number; h: number; bits: Uint8Array }) =>
  Array.from({ length: mask.h }, (_, j) => Array.from({ length: mask.w }, (_, i) => (mask.bits[j * mask.w + i] ? "o" : ".")).join(""));

describe("ringMask", () => {
  it("traces one pixel outside the shape, side on only, and leaves a hole inside it empty", () => {
    const atlas = alphaAtlas({ donut: ["###", "#.#", "###"] });
    const mask = ringMask([{ name: "donut", x: 10, y: 20, flip: false }], atlas)!;
    expect({ x: mask.x, y: mask.y, w: mask.w, h: mask.h }).toEqual({ x: 9, y: 19, w: 5, h: 5 });
    expect(bitsOf(mask)).toEqual([".ooo.", "o...o", "o...o", "o...o", ".ooo."]);
  });

  it("follows a gap that opens to the outside, and joins several parts into one silhouette", () => {
    const atlas = alphaAtlas({ cup: ["#.#", "#.#", "###"], dot: ["#"] });
    expect(bitsOf(ringMask([{ name: "cup", x: 0, y: 0, flip: false }], atlas)!)).toEqual([".o.o.", "o#o#o".replace(/#/g, "."), "o.o.o", "o...o", ".ooo."]);
    // A dot right of the cup, touching it: one shape, so no ring between the two.
    const joined = bitsOf(ringMask([{ name: "cup", x: 0, y: 0, flip: false }, { name: "dot", x: 3, y: 2, flip: false }], atlas)!);
    expect(joined).toEqual([".o.o..", "o.o.o.", "o.o.o.", "o....o", ".oooo."]);
  });

  it("is null when no part is in the atlas", () => {
    expect(ringMask([{ name: "nothing", x: 0, y: 0, flip: false }], alphaAtlas({ a: ["#"] }))).toBeNull();
  });
});

describe("pulse", () => {
  it("brightens and dims a step at a time without reduced motion, and holds halfway when still", () => {
    const steps = Array.from({ length: PULSE.length * PULSE_TICKS }, (_, t) => pulseAt(t, false));
    expect(new Set(steps)).toEqual(new Set(PULSE));
    for (let t = 1; t < steps.length; t++) expect(Math.abs(steps[t] - steps[t - 1])).toBeLessThanOrEqual(0.25 + 1e-9);
    expect(pulseAt(PULSE.length * PULSE_TICKS, false)).toBe(PULSE[0]);
    for (const t of [0, 5, 77]) expect(pulseAt(t, true)).toBe(STILL_GLOW);
  });

  it("steps only on the sea's beat, when the whole view repaints anyway", () => {
    let steps = 0;
    for (let t = 1; t < 400; t++) {
      if (pulseAt(t, false) === pulseAt(t - 1, false)) continue;
      steps++;
      expect(seaFrame(t)).not.toBe(seaFrame(t - 1));
    }
    expect(steps).toBeGreaterThan(100);
  });

  it("is a warm light: the gold and the cream it brightens to are both light and warm", () => {
    for (const [r, g, b] of [OUTLINE_RGB, OUTLINE_LIT_RGB]) {
      expect(r).toBe(255);
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeGreaterThan(200);
    }
  });
});

// ------------------------------------------------------------------ drawing

const scene = buildScene([plot(1, { visitor: true, lantern: true, key: true }), plot(2, { mine: true }), plot(3)], { markMine: true, festival: true });
const data = buildAtlasData("day");
const atlas = new FakeImage(data.width, data.height, data.data);
const model = sceneModel(scene);
const land = new FakeImage(scene.width, scene.height);
paintLand(new FakeContext(land), model, atlas, data.rects);
const overlay = new FakeImage(scene.width, scene.height);
paintOverlay(new FakeContext(overlay), model, atlas, data.rects);
const layers: Layers<FakeImage> = { atlas, rects: data.rects, flipped: data.flipped, seaRects: seaRectsFor(data.rects), land, overlay };
const swaying = model.trees.map((t) => t.b != null);
const festival = { demoDay: "2026-11-28", daysToDemo: 9, stageStep: 1 as const, tableBar: 3, stageBar: 5, booths: [], lanterns: null };
const plaza = plazaWorld(scene, { festival, pins: ["main"], campfire: { count: 2 }, prizes: true, visitors: { count: 3, team: 0, me: true } });
const actors: readonly LiveActor[] = plaza.actors;
const motion = (tick: number, still = false) =>
  Object.assign(motionAt(tick, { scene, swaying, actors, ambient: false, still, lowDetail: false, night: false }), { tick });
const frameAt = (tick: number, still = false): OutlineFrame => ({ model, actors, motion: motion(tick, still), atlas: data, still });

function layer(targets: InteractTarget[]) {
  const made: { w: number; h: number }[] = [];
  const outline = new OutlineLayer<FakeImage>((words, w, h) => {
    made.push({ w, h });
    return new FakeImage(w, h, new Uint8ClampedArray(words.buffer));
  });
  outline.targets = targets;
  return { outline, made };
}

/** The scene drawn into rect `r` (scene px), with the ring or without it. */
function paint(ring: Ring<FakeImage> | null, r: Rect, base?: FakeImage, cast: readonly LiveActor[] = actors): FakeImage {
  const img = base ?? FakeImage.opaque(scene.width, scene.height);
  const ctx = new FakeContext(img);
  const fx: DrawFx = withRing({}, ctx, ring);
  redrawRect(ctx, r, model, layers, { motion: motion(0, true), night: false, actors: cast, fx });
  return img;
}

const whole: Rect = { x: 0, y: 0, w: scene.width, h: scene.height };
const treeIndex = scene.trees.findIndex((t) => t.slot === 1);
const plotTarget: InteractTarget = { key: plotKey(1), box: { x: scene.trees[treeIndex].left, y: scene.trees[treeIndex].top, w: 32, h: 40 }, shape: { kind: "tree", tree: treeIndex } };

/** Where two pictures differ, as pixel indexes. */
function diff(a: FakeImage, b: FakeImage): number[] {
  const wa = a.words();
  const wb = b.words();
  const out: number[] = [];
  for (let k = 0; k < wa.length; k++) if (wa[k] !== wb[k]) out.push(k);
  return out;
}

/** The pixels a shape's sprites cover, as indexes into the scene. */
function covered(parts: readonly Part[]): Set<number> {
  const out = new Set<number>();
  for (const p of parts) {
    const a = (p.flip ? data.flipped : data.rects).get(p.name)!;
    for (let j = 0; j < a.h; j++) {
      for (let i = 0; i < a.w; i++) if (data.data[((a.y + j) * data.width + a.x + i) * 4 + 3] > 0) out.add((p.y + j) * scene.width + p.x + i);
    }
  }
  return out;
}

describe("the ring on the island", () => {
  it("traces a plot's tree with its key flag and lantern, just outside it, and never paints over it", () => {
    const { outline } = layer([plotTarget]);
    outline.focused = plotKey(1);
    const ring = outline.ring(frameAt(0, true))!;
    expect(ring.key).toBe(plotKey(1));
    expect(ring.slot).toEqual({ hook: "beforeTree", index: treeIndex });
    const shape = silhouette(plotTarget.shape, frameAt(0, true))!;
    expect(shape.parts.map((p) => p.name)).toEqual(expect.arrayContaining(["stage_5", "key_flag", "lantern"]));
    const without = paint(null, whole);
    const withIt = paint(ring, whole);
    const changed = diff(without, withIt);
    expect(changed.length).toBeGreaterThan(40);
    const mask = ringMask(shape.parts, data)!;
    const inside = covered(shape.parts);
    for (const k of changed) {
      const x = k % scene.width;
      const y = Math.floor(k / scene.width);
      // Only ring pixels change, and none of the tree's own.
      expect(mask.bits[(y - mask.y) * mask.w + (x - mask.x)]).toBe(1);
      expect(inside.has(k)).toBe(false);
    }
    // Still: the gold with the cream half over it.
    const k = changed[0];
    const [r, g, b] = [withIt.data[k * 4], withIt.data[k * 4 + 1], withIt.data[k * 4 + 2]];
    expect(r).toBe(255);
    expect(g).toBeCloseTo((OUTLINE_RGB[1] + OUTLINE_LIT_RGB[1]) / 2, -1);
    expect(b).toBeCloseTo((OUTLINE_RGB[2] + OUTLINE_LIT_RGB[2]) / 2, -1);
  });

  it("lies under whatever stands in front: a person on its edge covers it", () => {
    const { outline } = layer([plotTarget]);
    outline.focused = plotKey(1);
    const ring = outline.ring(frameAt(0, true))!;
    const shape = silhouette(plotTarget.shape, frameAt(0, true))!;
    const mask = ringMask(shape.parts, data)!;
    const t = scene.trees[treeIndex];
    // Someone standing over the tree's left edge, drawn after it.
    const person: LiveActor = { frames: ["visitor"], x: t.left - 6, y: t.top + 22 };
    const front = covered([{ name: "visitor", x: person.x, y: person.y, flip: false }]);
    const changed = new Set(diff(paint(null, whole, undefined, [person]), paint(ring, whole, undefined, [person])));
    let hidden = 0;
    for (let j = 0; j < mask.h; j++) {
      for (let i = 0; i < mask.w; i++) {
        const k = (mask.y + j) * scene.width + mask.x + i;
        if (mask.bits[j * mask.w + i] && front.has(k)) {
          hidden++;
          expect(changed.has(k)).toBe(false);
        }
      }
    }
    expect(hidden).toBeGreaterThan(0);
  });

  it("is drawn in a repaint that meets only its edge, outside every sprite it traces", () => {
    const fire = plaza.spots.find((s) => s.id === "campfire")!;
    const target: InteractTarget = { key: spotKey("campfire"), box: { x: 0, y: 0, w: 1, h: 1 }, shape: { kind: "actors", actors: fire.actors } };
    const { outline } = layer([target]);
    outline.focused = target.key;
    const ring = outline.ring(frameAt(0, true))!;
    const full = paint(ring, whole);
    const without = paint(null, whole);
    // A ring pixel outside the boxes of the pit and the flame (the pit's stones reach its box's edge).
    const parts = silhouette(target.shape, frameAt(0, true))!.parts.map((p) => {
      const a = data.rects.get(p.name)!;
      return { x: p.x, y: p.y, w: a.w, h: a.h };
    });
    const outside = diff(without, full).filter((k) => {
      const x = k % scene.width;
      const y = Math.floor(k / scene.width);
      return parts.every((b) => x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h);
    });
    expect(outside.length).toBeGreaterThan(0);
    // Repaint just that pixel over a picture without the ring: the ring comes back there, and nowhere else.
    const k = outside[0];
    const pixel: Rect = { x: k % scene.width, y: Math.floor(k / scene.width), w: 1, h: 1 };
    const patched = paint(ring, pixel, paint(null, whole));
    expect(diff(without, patched)).toEqual([k]);
    expect(diff(full, patched)).not.toContain(k);
  });

  it("traces a plaza piece from its actors, slotted before the first, and a tree's partner after its tree", () => {
    const stageSpot = plaza.spots.find((s) => s.id === "stage")!;
    const stage = silhouette({ kind: "actors", actors: stageSpot.actors }, frameAt(0, true))!;
    expect(stage.slot).toEqual({ hook: "beforeActor", index: Math.min(...stageSpot.actors) });
    expect(stage.parts.map((p) => p.name)[0]).toBe("fest_count");
    const partner = silhouette({ kind: "partner", tree: treeIndex }, { ...frameAt(0, true), partner: () => "visitor_blink" })!;
    expect(partner.slot).toEqual({ hook: "afterTree", index: treeIndex });
    expect(partner.parts).toEqual([{ name: "visitor_blink", x: scene.trees[treeIndex].visitor!.x, y: scene.trees[treeIndex].visitor!.y, flip: false }]);
    // A plot with no partner has no partner shape.
    expect(silhouette({ kind: "partner", tree: scene.trees.findIndex((t) => t.slot === 3) }, frameAt(0))).toBeNull();
  });

  it("changes the picture only inside the ring's box when the plaza's campfire is picked", () => {
    const fire = plaza.spots.find((s) => s.id === "campfire")!;
    const target: InteractTarget = { key: spotKey("campfire"), box: { x: 0, y: 0, w: 1, h: 1 }, shape: { kind: "actors", actors: fire.actors } };
    const { outline } = layer([target]);
    outline.focused = target.key;
    const ring = outline.ring(frameAt(0, true))!;
    const changed = diff(paint(null, whole), paint(ring, whole));
    expect(changed.length).toBeGreaterThan(20);
    for (const k of changed) {
      const x = k % scene.width;
      const y = Math.floor(k / scene.width);
      expect(x >= ring.box.x && x < ring.box.x + ring.box.w && y >= ring.box.y && y < ring.box.y + ring.box.h).toBe(true);
    }
  });
});

describe("a tick's repaint", () => {
  /** The engine's padding round each dirty rect (engine.ts SHADOW_PAD). */
  const PAD = 4;
  const at = (ring: Ring<FakeImage> | null, rects: Rect[], tick: number, base?: FakeImage) => {
    const img = base ?? FakeImage.opaque(scene.width, scene.height);
    const ctx = new FakeContext(img);
    const m = motion(tick);
    for (const r of rects) redrawRect(ctx, r, model, layers, { motion: m, night: false, actors, fx: withRing({}, ctx, ring) });
    return img;
  };

  it("keeps the ring right while its walker or the fire's flame moves, repainting only what moved", () => {
    const fire = plaza.spots.find((s) => s.id === "campfire")!;
    const cases: InteractTarget[] = [
      { key: spotKey("campfire"), box: { x: 0, y: 0, w: 1, h: 1 }, shape: { kind: "actors", actors: fire.actors } },
      { key: "figure:0", slop: { x: 2, y: 2 }, shape: { kind: "actors", actors: [plaza.figures[0].actor!] } },
    ];
    let checked = 0;
    for (const target of cases) {
      const { outline } = layer([target]);
      outline.focused = target.key;
      // Ticks where the sea and the foam stay, so a tick repaints only what moved.
      for (let t0 = 0; t0 < 160; t0++) {
        const t1 = t0 + 1;
        const moved = dirtyRects(motion(t0), motion(t1), model, data.rects, actors);
        if (moved === "all") continue;
        const r0 = outline.ring(frameAt(t0))!;
        const r1 = outline.ring(frameAt(t1))!;
        const dirty = [...moved, ...ringTickDirty(r0, r1)].map((r) => ({ x: r.x - PAD, y: r.y - PAD, w: r.w + 2 * PAD, h: r.h + 2 * PAD }));
        const ticked = at(r1, dirty, t1, at(r0, [whole], t0));
        expect(diff(ticked, at(r1, [whole], t1))).toEqual([]);
        if (r0.sig !== r1.sig || r0.box.x !== r1.box.x) checked++;
      }
    }
    // The ring really changed on many of those ticks.
    expect(checked).toBeGreaterThan(20);
  });

  it("repaints where the ring was and where it is when another thing takes it, or its pulse steps off the sea's beat", () => {
    const { outline } = layer([plotTarget]);
    outline.focused = plotKey(1);
    const a = outline.ring(frameAt(0))!;
    expect(ringTickDirty(a, a)).toEqual([]);
    expect(ringTickDirty(a, null)).toEqual([a.box]);
    expect(ringTickDirty(a, { ...a, glow: a.glow + 0.25 })).toEqual([a.box, a.box]);
    expect(ringTickDirty(a, { ...a, key: "spot:campfire" })).toEqual([a.box, a.box]);
  });
});

describe("OutlineLayer", () => {
  const walker = plaza.figures[0].actor!;
  const walkerTarget: InteractTarget = { key: "figure:0", slop: { x: 2, y: 2 }, shape: { kind: "actors", actors: [walker] } };

  it("shows nothing without targets, an aim or a focus, and nothing when the aim is far from everything", () => {
    const { outline } = layer([]);
    outline.aim = { x: 0, y: 0, reach: 1000 };
    expect(outline.ring(frameAt(0))).toBeNull();
    const far = layer([plotTarget]).outline;
    expect(far.ring(frameAt(0))).toBeNull();
    far.aim = { x: -500, y: -500, reach: 4 };
    expect(far.ring(frameAt(0))).toBeNull();
  });

  it("picks the nearest within reach, one at a time, and the keyboard's focus wins over the aim", () => {
    const fire = plaza.spots.find((s) => s.id === "campfire")!;
    const fireBox = { x: 0, y: 0, w: 1, h: 1 };
    const fireTarget: InteractTarget = { key: spotKey("campfire"), box: fireBox, shape: { kind: "actors", actors: fire.actors } };
    const { outline } = layer([plotTarget, fireTarget]);
    const tree = scene.trees[treeIndex];
    outline.aim = { x: tree.left + 4, y: tree.top + 4, reach: 6 };
    expect(outline.ring(frameAt(0))!.key).toBe(plotKey(1));
    outline.aim = { x: 0.5, y: 0.5, reach: 6 };
    expect(outline.ring(frameAt(0))!.key).toBe(spotKey("campfire"));
    outline.focused = plotKey(1);
    expect(outline.ring(frameAt(0))!.key).toBe(plotKey(1));
    // A focus on something that is not a target (the people button) leaves the aim in charge.
    outline.focused = "people";
    expect(outline.ring(frameAt(0))!.key).toBe(spotKey("campfire"));
  });

  it("follows a walker by its box where it stands now", () => {
    const { outline } = layer([walkerTarget]);
    const frames = [0, 40, 80, 120].map((t) => frameAt(t));
    for (const frame of frames) {
      const at = actors[walker];
      const f = frame.motion.actors[walker] ?? 0;
      const step = at.steps?.[f] ?? { dx: 0, dy: 0 };
      outline.aim = { x: at.x + step.dx + 5, y: at.y + step.dy + 7, reach: 2 };
      const ring = outline.ring(frame)!;
      expect(ring.key).toBe("figure:0");
      expect(ring.box.x).toBe(Math.round(at.x + step.dx) - 1);
    }
  });

  it("picks what a search of every target would, tick after tick, while walkers come and go round the aim", () => {
    const targets = interactTargets({ scene, hotspots: scene.trees.map((t) => ({ slot: t.slot, x: (t.left / scene.width) * 100, y: (t.top / scene.height) * 100, w: (t.w / scene.width) * 100, h: (t.h / scene.height) * 100 })), spots: plaza.spots, figures: [...plaza.figures, ...treeFigures(scene)], scale: 2, whole: false });
    const { outline } = layer(targets);
    // Aims round the plaza's walkers, and one off on open sea.
    const aims = plaza.figures.map((f) => ({ x: actors[f.actor!].x + 4, y: actors[f.actor!].y + 30, reach: 14 }));
    aims.push({ x: -300, y: -300, reach: 14 });
    let picked = 0;
    for (const aim of aims) {
      outline.aim = aim;
      for (let t = 0; t < 600; t += 7) {
        const frame = frameAt(t);
        const full = nearestTarget(targets, (target) => targetBox(target, frame), aim);
        expect(outline.pick(frame)).toBe(full);
        if (full >= 0) picked++;
      }
    }
    expect(picked).toBeGreaterThan(20);
  });

  it("makes every shape a picked thing can take when it is picked, and none on the frames after", () => {
    const { outline, made } = layer([walkerTarget]);
    outline.focused = "figure:0";
    outline.ring(frameAt(0));
    const atPick = made.length;
    const variants = shapeVariants(walkerTarget.shape, frameAt(0));
    expect(atPick).toBe(new Set(variants.map((parts) => parts.map((p) => `${p.name}${p.flip}`).join())).size);
    expect(atPick).toBeGreaterThan(1);
    for (let t = 1; t < 400; t += 3) outline.ring(frameAt(t));
    expect(made.length).toBe(atPick);
    // Each ring holds the gold over the cream: twice its own height.
    for (const m of made) expect(m.h % 2).toBe(0);
  });

  it("makes a tree's still and swaying shapes, and a partner's plain, settled and blinking ones", () => {
    expect(shapeVariants(plotTarget.shape, frameAt(0)).map((parts) => parts[0].name)).toEqual(["stage_5", "stage_5_b"]);
    expect(shapeVariants({ kind: "partner", tree: treeIndex }, frameAt(0)).map((parts) => parts[0].name)).toEqual(["visitor", "visitor_rest", "visitor_blink"]);
  });

  it("repaints the old ring and the new one when the pick moves, and nothing when it stays", () => {
    const { outline } = layer([plotTarget]);
    outline.focused = plotKey(1);
    const a = outline.ring(frameAt(0, true));
    const b = outline.ring(frameAt(5, true));
    expect(ringDirty(a, b)).toEqual([]);
    expect(ringDirty(a, null)).toEqual([a!.box]);
    expect(ringDirty(null, a)).toEqual([a!.box]);
    // A pulse step repaints the ring's own box.
    const pulsing = [0, PULSE_TICKS].map((t) => outline.ring(frameAt(t)));
    expect(ringDirty(pulsing[0], pulsing[1])).toEqual([pulsing[0]!.box, pulsing[1]!.box]);
  });
});
