/**
 * @jest-environment node
 */
import { buildScene, plotBoxes, tagRect, TILE_BY_CODE, type IslandPlot, type IslandScene } from "@/bot/src/quests/island/scene";
import { MOTION_SIZES, type MotionSpriteName } from "@/bot/assets/island/motion-sprites";
import type { Festival } from "@/lib/shift-island/festival";

import { actorAt, lampRects, sceneModel } from "../draw";
import { FIGURE_H, FIGURE_W, hitSlop, treeFigures } from "../figures";
import { gradeKey, gradeRgb } from "../grade";
import { overlaps, type Rect } from "../geometry";
import { plazaWorld } from "../plaza";
import { BOARD, signpostFor } from "../signposts";
import { inkColours, plotRoom, SLOP, TERRAIN_INK, terrainFor, terrainSteps, type Terrain } from "../terrain";
import type { LightPhase } from "../types";

const SIZES = [1, 3, 8, 14, 20, 40, 80];
/** The smallest close-up scale the terrain keeps tap slop for (a phone at any ratio, or a desktop at 120%). */
const MIN_SCALE = 1.6;
/** A 48 CSS px tap target at that scale, native px. */
const TAP = 48 / MIN_SCALE;

function plots(n: number, shift = 0, decorated = true, mine = 3): IslandPlot[] {
  return Array.from({ length: n }, (_, i) => {
    const slot = i + 1;
    return {
      slot,
      stage: ((slot + shift) % 8) as IslandPlot["stage"],
      visitor: decorated && slot % 2 === 1,
      key: decorated && slot % 3 === 0,
      helper: slot % 5 === 0,
      lantern: decorated && slot % 4 === 1,
      name: null,
      mine: slot === mine,
    };
  });
}

function festival(scene: IslandScene): Festival {
  const booths = scene.trees.map((t) => ({ slot: t.slot, kind: t.slot % 2 ? ("stage" as const) : ("table" as const) }));
  return {
    demoDay: "2026-11-28",
    daysToDemo: 9,
    stageStep: 3,
    tableBar: 2,
    stageBar: 3,
    lanterns: { total: 8, lit: 8, reached: true, count: 12, target: 12 },
    booths,
  };
}

const terrainOf = (scene: IslandScene) => terrainFor(sceneModel(scene));

/** Builds a layout's terrain afresh: two other layouts first push it out of the cache (it keeps two). */
function fresh(scene: IslandScene): Terrain {
  terrainOf(buildScene(plots(2)));
  terrainOf(buildScene(plots(4)));
  return terrainOf(scene);
}

const grown = (r: Rect, x: number, y = x): Rect => ({ x: r.x - x, y: r.y - y, w: r.w + 2 * x, h: r.h + 2 * y });

/** A box at least `min` px square round its centre (a 48px floor). */
const floor = (r: Rect, min: number): Rect => {
  const w = Math.max(min, r.w);
  const h = Math.max(min, r.h);
  return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h };
};

/** Everything a piece must keep off, from the island's own sources (not terrain.ts's). */
function keepOut(scene: IslandScene, n: number): { what: string; rect: Rect }[] {
  const out: { what: string; rect: Rect }[] = [];
  const model = sceneModel(scene);
  const slop = hitSlop(MIN_SCALE, false);
  // Plot tap targets (the picture's hotspots), with their 48px floor.
  for (const box of plotBoxes(plots(n)).boxes) out.push({ what: `plot ${box.slot}`, rect: floor({ x: box.left, y: box.top, w: box.width, h: box.height }, TAP) });
  for (const tree of scene.trees) {
    out.push({ what: `tree ${tree.slot}`, rect: { x: tree.left, y: tree.top, w: tree.w, h: tree.h } });
    out.push({ what: `tag ${tree.slot}`, rect: tagRect(tree.slot, tree.left + Math.floor(tree.w / 2), tree.top + tree.h, scene.glyph) });
    for (const hung of [false, true]) {
      const post = signpostFor(tree, 1, hung);
      out.push({ what: `post ${tree.slot}`, rect: post.rect });
      if (post.hang) out.push({ what: `board ${tree.slot}`, rect: { x: post.hang.cx - BOARD.maxW / 2, y: post.hang.y, w: BOARD.maxW, h: BOARD.h } });
    }
  }
  // The partners beside the trees, with a fingertip's slop.
  for (const figure of treeFigures(scene)) if (figure.box) out.push({ what: `partner ${figure.n}`, rect: grown(figure.box, slop.x, slop.y) });
  // The plaza's tap targets and every place its people stand or walk, on every frame.
  const world = plazaWorld(scene, {
    festival: festival(scene),
    pins: ["active", "main", "side"],
    campfire: { count: 12 },
    prizes: true,
    visitors: { count: 20, team: 3, me: true },
  });
  for (const spot of world.spots) {
    const rect = { x: (spot.x / 100) * scene.width, y: (spot.y / 100) * scene.height, w: (spot.w / 100) * scene.width, h: (spot.h / 100) * scene.height };
    out.push({ what: `spot ${spot.id}`, rect: floor(rect, TAP) });
  }
  const people = new Set(world.figures.map((f) => f.actor));
  world.actors.forEach((actor, i) => {
    const frames = Math.max(1, actor.steps?.length ?? 0, actor.frames.length);
    for (let f = 0; f < frames; f++) {
      const at = actorAt(actor, f);
      const name = actor.frames[f % actor.frames.length] as MotionSpriteName;
      // A person with a fingertip's slop round them; a prop (the fire, the bulbs, the countdown's digits) as drawn.
      if (people.has(i)) out.push({ what: `person ${name}`, rect: grown({ x: at.x, y: at.y, w: FIGURE_W, h: FIGURE_H }, slop.x, slop.y) });
      else out.push({ what: `prop ${name}`, rect: { x: at.x, y: at.y, w: MOTION_SIZES[name][0], h: MOTION_SIZES[name][1] } });
    }
  });
  for (const lamp of lampRects(model)) out.push({ what: "lamp", rect: lamp });
  return out;
}

describe("terrain", () => {
  it("keeps a figure's whole tap slop at the smallest close-up scale", () => {
    expect(SLOP).toEqual(hitSlop(MIN_SCALE, false));
    for (const dpr of [1, 1.5, 2, 2.625, 2.75, 3, 3.5, 4]) {
      const scale = Math.max(1, Math.round(2 * dpr)) / dpr;
      const slop = hitSlop(scale, false);
      expect(slop.x).toBeLessThanOrEqual(SLOP.x);
      expect(slop.y).toBeLessThanOrEqual(SLOP.y);
    }
  });

  it("is the same ground for a layout, whatever the stages, flags, viewer, festival or hour", () => {
    for (const n of [3, 14, 40]) {
      const a = fresh(buildScene(plots(n, 0, true, 3), { markMine: true, festival: true }));
      const b = fresh(buildScene(plots(n, 5, false, 1), { markMine: false, festival: false }));
      expect(b).not.toBe(a);
      expect(Buffer.from(b.ground).equals(Buffer.from(a.ground))).toBe(true);
      expect(Buffer.from(b.props).equals(Buffer.from(a.props))).toBe(true);
      expect(b.pieces).toEqual(a.pieces);
      expect(b.trails).toEqual(a.trails);
    }
  });

  it("shares one build between islands of the same layout", () => {
    const scene = buildScene(plots(14));
    expect(terrainOf(buildScene(plots(14, 3)))).toBe(terrainOf(scene));
  });

  it("builds in short slices that end in the same terrain", () => {
    const scene = buildScene(plots(20, 1));
    const whole = fresh(scene);
    terrainOf(buildScene(plots(2)));
    terrainOf(buildScene(plots(4)));
    const steps = terrainSteps(sceneModel(scene));
    let slices = 0;
    let done: Terrain | null = null;
    while (!done) {
      const step = steps.next();
      slices++;
      if (step.done) done = step.value;
    }
    expect(slices).toBeGreaterThanOrEqual(6);
    expect(Buffer.from(done.ground).equals(Buffer.from(whole.ground))).toBe(true);
    expect(done.pieces).toEqual(whole.pieces);
  });

  it.each(SIZES)("keeps every piece off plots, tap targets, plaza spots, lamps and people (%i plots)", (n) => {
    const scene = buildScene(plots(n), { markMine: true, festival: true });
    const terrain = terrainOf(scene);
    const keep = keepOut(scene, n);
    const clashes: string[] = [];
    for (const piece of terrain.pieces) for (const k of keep) if (overlaps(piece.rect, k.rect)) clashes.push(`${piece.kind} ${JSON.stringify(piece.rect)} on ${k.what}`);
    expect(clashes).toEqual([]);
  });

  it.each(SIZES)("keeps pieces on their own ground, off the paths and apart (%i plots)", (n) => {
    const scene = buildScene(plots(n));
    const terrain = terrainOf(scene);
    const { width: W, cols, tile } = scene;
    const tileAt = (x: number, y: number) => TILE_BY_CODE[scene.tiles[Math.floor(y / tile) * cols + Math.floor(x / tile)]];
    const helper = new Set(scene.paths);
    terrain.pieces.forEach((piece, i) => {
      const { x, y, w, h } = piece.rect;
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
          const name = tileAt(px, py);
          expect(name).not.toBe("plaza");
          expect(name).not.toMatch(/^water/);
          expect(helper.has(Math.floor(py / tile) * cols + Math.floor(px / tile))).toBe(false);
          expect(terrain.paths[py * W + px]).toBe(0);
        }
      }
      for (const other of terrain.pieces.slice(i + 1)) expect(overlaps(piece.rect, other.rect)).toBe(false);
    });
  });

  it.each(SIZES)("lays footpaths on grass and sand only, never under another plot (%i plots)", (n) => {
    const scene = buildScene(plots(n));
    const terrain = terrainOf(scene);
    const { width: W, cols, tile } = scene;
    for (let i = 0; i < terrain.paths.length; i++) {
      if (!terrain.paths[i]) continue;
      const x = i % W;
      const y = Math.floor(i / W);
      expect(TILE_BY_CODE[scene.tiles[Math.floor(y / tile) * cols + Math.floor(x / tile)]]).toMatch(/^(grass|sand|shore)/);
    }
    // No path's earth reaches what another plot draws (its tree's rows, its soil's shadow, its tag, its signpost in
    // either size), nor its own tree; a plot's own path starts at the foot of its own signpost, which stands on it.
    const earth = (x: number, y: number) => terrain.paths[y * W + x] === 1 && "PQR".includes(String.fromCharCode(terrain.ground[y * W + x]));
    for (const tree of scene.trees) {
      const room = plotRoom(tree, scene.glyph);
      // Its own path: the line that starts at its signpost's foot.
      const line = terrain.trails.find((l) => Math.hypot(l[0].x - room.door.x, l[0].y - (room.door.y - 1)) < 1) ?? [];
      const onOwn = (x: number, y: number) => line.some((p) => Math.hypot(p.x - x - 0.5, p.y - y - 0.5) < 5);
      const posts = [false, true].map((hung) => signpostFor(tree, 1, hung).rect);
      const below = tree.top + tree.h;
      for (const r of room.body) {
        // Under the tree's line, the signpost and the tag: only its own path, from the post's foot.
        const sign = r.y >= below || posts.some((p) => overlaps(p, r) && r.y >= p.y);
        for (let y = Math.max(0, r.y); y < Math.min(scene.height, r.y + r.h); y++) {
          for (let x = Math.max(0, r.x); x < Math.min(W, r.x + r.w); x++) {
            if (earth(x, y) && !(sign && onOwn(x, y))) throw new Error(`a path under plot ${tree.slot} at ${x},${y}`);
          }
        }
      }
    }
  });

  it.each([3, 8, 14, 20, 40])("leads most plots to the plaza (%i plots)", (n) => {
    const terrain = terrainOf(buildScene(plots(n)));
    expect(terrain.trails.length).toBeGreaterThanOrEqual(Math.ceil(n * 0.6));
  });

  it.each(SIZES)("stays sparse, so the island breathes (%i plots)", (n) => {
    const scene = buildScene(plots(n));
    const terrain = terrainOf(scene);
    let land = 0;
    for (const code of scene.tiles) if (!/^water/.test(TILE_BY_CODE[code])) land += scene.tile * scene.tile;
    const pieces = terrain.pieces.reduce((sum, p) => sum + p.rect.w * p.rect.h, 0);
    const paths = terrain.paths.reduce((sum, v) => sum + v, 0);
    expect(pieces / land).toBeLessThan(0.03);
    expect(paths / land).toBeLessThan(0.12);
    // A few hedges or fences, not a maze.
    const standing = terrain.pieces.filter((p) => p.kind === "hedge" || p.kind === "fence").length;
    expect(standing).toBeLessThanOrEqual(Math.max(4, Math.ceil(land / 20_000)));
  });

  it("inks only its own palette, coloured in every light", () => {
    const terrain = terrainOf(buildScene(plots(14)));
    const codes = new Set<number>();
    for (const layer of [terrain.ground, terrain.props]) for (const v of layer) if (v) codes.add(v);
    const known = new Set(Object.keys(TERRAIN_INK).map((k) => k.charCodeAt(0)));
    for (const v of codes) expect(known.has(v)).toBe(true);
    for (const phase of ["dawn", "day", "dusk", "night"] as LightPhase[]) {
      const colours = inkColours(
        (key) => gradeKey(key, phase),
        (rgb) => gradeRgb(rgb, phase)
      );
      for (const v of codes) {
        const rgb = colours.get(v);
        expect(rgb).toBeDefined();
        for (const c of rgb!) expect(Number.isInteger(c) && c >= 0 && c <= 255).toBe(true);
      }
    }
  });

  it("follows the hour: the same ink is darker and bluer at night than by day", () => {
    const day = inkColours((key) => gradeKey(key, "day"), (rgb) => gradeRgb(rgb, "day"));
    const night = inkColours((key) => gradeKey(key, "night"), (rgb) => gradeRgb(rgb, "night"));
    for (const [code, rgb] of day) {
      const dark = night.get(code)!;
      expect(dark[0] + dark[1] + dark[2]).toBeLessThan(rgb[0] + rgb[1] + rgb[2]);
    }
  });
});
