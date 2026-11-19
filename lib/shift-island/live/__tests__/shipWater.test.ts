/** @jest-environment node */
import { ACTOR_FRAMES, MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE } from "@/bot/assets/island/sprites";
import { buildScene, TILE_CODES, type IslandPlot } from "@/bot/src/quests/island/scene";

import { buildAtlasData } from "../atlas";
import { castsShadow, catchesLight, webSprites } from "../atmosphere";
import { motionAt } from "../clock";
import { sceneModel } from "../draw";
import { IslandFx, type FxCanvasKit } from "../fx";
import { plazaWorld } from "../plaza";
import { SHIP_HULL_TOP, SHIP_SIZE } from "../ship";
import {
  SHIP_DIP,
  SHIP_FOAM_AT,
  SHIP_FOAM_FRAMES,
  SHIP_FOAM_SIZE,
  SHIP_HALO,
  SHIP_LANTERN,
  SHIP_POOL,
  SHIP_SHADOW,
  SHIP_WATERLINE,
  SHIP_WATER_SPRITES,
  isShipSprite,
  shipFoamFrame,
  shipGlints,
  shipGlowSteps,
  shipOf,
  shipPoolBox,
  shipPoolWords,
} from "../shipWater";
import type { LightPhase } from "../types";

const SHIP = { x: 100, y: 60 };
/** The part of the ship's box that ship.ts keeps on open water: the hull's rows down. */
const WATER = { x: SHIP.x, y: SHIP.y + SHIP_HULL_TOP, w: SHIP_SIZE.w, h: SHIP_SIZE.h - SHIP_HULL_TOP };
const inWater = (r: { x: number; y: number; w: number; h: number }) =>
  r.x >= WATER.x && r.y >= WATER.y && r.x + r.w <= WATER.x + WATER.w && r.y + r.h <= WATER.y + WATER.h;

describe("the merchant ship in the water", () => {
  it("finds the ship among the actors, by its sprite", () => {
    expect(shipOf([])).toBeNull();
    expect(shipOf([{ frames: ["sit_a_0"], x: 1, y: 2 }])).toBeNull();
    expect(shipOf([{ frames: ["sit_a_0"], x: 1, y: 2 }, { frames: ACTOR_FRAMES.merchantShip, x: 10.4, y: 20.6 }])).toEqual({ x: 10, y: 21 });
    expect(isShipSprite("merchant_ship_1")).toBe(true);
    expect(isShipSprite("ship_foam_0")).toBe(false);
  });

  it("floats: no footprint shadow and no firelight on it, its own shadow on the water instead", () => {
    for (const name of ACTOR_FRAMES.merchantShip) {
      expect(castsShadow(name)).toBe(false);
      expect(catchesLight(name)).toBe(false);
    }
    expect(inWater({ x: SHIP.x + SHIP_SHADOW.x - 2, y: SHIP.y + SHIP_SHADOW.y, w: SHIP_SHADOW.w + 4, h: SHIP_SHADOW.h })).toBe(true);
  });

  it("draws its foam in the hour's palette, inside the water round the hull", () => {
    for (const name of SHIP_FOAM_FRAMES) {
      const rows = SHIP_WATER_SPRITES[name];
      expect(rows).toHaveLength(SHIP_FOAM_SIZE.h);
      for (const row of rows) {
        expect(row).toHaveLength(SHIP_FOAM_SIZE.w);
        for (const ch of row) if (ch !== ".") expect(["i", "u", "v"]).toContain(ch);
      }
      expect(webSprites()[name]).toBe(rows);
    }
    expect(inWater({ x: SHIP.x + SHIP_FOAM_AT.x, y: SHIP.y + SHIP_FOAM_AT.y, ...SHIP_FOAM_SIZE })).toBe(true);
    expect(Object.keys(PALETTE)).toEqual(expect.arrayContaining(["i", "u", "v"]));
  });

  it("sits the hull in the sea: both frames stop at the waterline, and the foam laps the length of the hull there", () => {
    for (const name of ACTOR_FRAMES.merchantShip) {
      const rows = MOTION_SPRITES[name as keyof typeof MOTION_SPRITES];
      rows.forEach((row, y) => expect([name, y, y >= SHIP_WATERLINE ? /^\.+$/.test(row) : true]).toEqual([name, y, true]));
      // Its last plank, just over the water.
      expect(rows[SHIP_WATERLINE - 1]).toMatch(/[^.]{40}/);
    }
    // The foam's first row lies over that plank, its second is the waterline: lapped all along, broken, never a ruled line.
    expect(SHIP_FOAM_AT.y).toBe(SHIP_WATERLINE - 1);
    const hull = MOTION_SPRITES.merchant_ship_0[SHIP_WATERLINE - 1];
    const first = hull.search(/[^.]/);
    const last = hull.length - 1 - [...hull].reverse().join("").search(/[^.]/);
    for (const name of SHIP_FOAM_FRAMES) {
      const lap = SHIP_WATER_SPRITES[name][1];
      for (let x = first; x <= last; x += 6) expect([name, x, /[iu]/.test(lap.slice(x, x + 6))]).toEqual([name, x, true]);
      expect(lap.slice(first, last + 1)).toMatch(/\./);
      expect(lap).toMatch(/i/);
    }
  });

  it("laps on the sea's beat, 0-1-2-1, and holds still on step 0", () => {
    expect([0, 1, 2, 3, 4].map(shipFoamFrame)).toEqual(["ship_foam_0", "ship_foam_1", "ship_foam_2", "ship_foam_1", "ship_foam_0"]);
  });

  it("puts the lantern's glints under the waterline, in its pool, the same for the same step", () => {
    const pool = shipPoolBox(SHIP);
    for (let step = 0; step < 40; step++) {
      const glints = shipGlints(step, SHIP);
      expect(glints).toEqual(shipGlints(step, SHIP));
      for (const g of glints) {
        const box = { x: g.x, y: g.y, w: g.w, h: 1 };
        expect(inWater(box)).toBe(true);
        expect(box.y).toBeGreaterThan(SHIP.y + SHIP_WATERLINE);
        expect(box.x).toBeGreaterThanOrEqual(pool.x);
        expect(box.x + box.w).toBeLessThanOrEqual(pool.x + pool.w);
      }
    }
    // Under the stall's lantern.
    expect(pool.x + pool.w / 2).toBe(SHIP.x + SHIP_POOL.x);
    expect(SHIP_POOL.x).toBe(SHIP_LANTERN.x);
  });
});

describe("the lantern's light on the ship", () => {
  const frames = ACTOR_FRAMES.merchantShip.map((name) => ({ name, rows: MOTION_SPRITES[name as keyof typeof MOTION_SPRITES], dip: SHIP_DIP[name] }));

  it("warms the ship round the lantern in soft steps, the stall most, nothing far off, never the lights themselves", () => {
    const { rows } = frames[0];
    const steps = shipGlowSteps(rows, 0);
    const w = rows[0].length;
    const at = (x: number, y: number) => steps[y * w + x];
    // The stall's counter by the lantern: the heart. The bow and the masthead: dark.
    expect(at(48, 27)).toBe(3);
    expect(at(2, 30)).toBe(0);
    expect(at(27, 0)).toBe(0);
    // The main sail's foot nearest the lantern catches some of it; the hull under the stall too.
    expect(Math.max(...[30, 32, 34, 36, 38].map((x) => at(x, 24)))).toBeGreaterThan(0);
    expect(at(40, 33)).toBeGreaterThan(0);
    for (let k = 0; k < steps.length; k++) {
      const ch = rows[Math.floor(k / w)][k % w];
      if (ch === "." || ch === "y") expect(steps[k]).toBe(0);
    }
  });

  it("keeps its dither on the ship as it rocks: frame 1 is frame 0 a row lower", () => {
    const [a, b] = frames.map((f) => shipGlowSteps(f.rows, f.dip));
    const w = frames[0].rows[0].length;
    for (let y = 4; y < SHIP_WATERLINE - 1; y++) {
      for (let x = 0; x < w; x++) {
        if (frames[1].rows[y + 1][x] === frames[0].rows[y][x]) expect(b[(y + 1) * w + x]).toBe(a[y * w + x]);
      }
    }
  });
});

describe("the lantern's pool on the water", () => {
  const plot = (slot: number): IslandPlot => ({ slot, stage: 4, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false });
  const scene = buildScene([plot(1), plot(2), plot(3)], { festival: true });
  const model = sceneModel(scene);
  const water = { sea: model.sea, cols: scene.cols, rows: scene.rows, tile: scene.tile };
  const t = scene.tile;
  /** A spot where the pool's box reaches over the beach: the box's middle on a shore tile's top row. */
  const shoreCell = [...scene.tiles].findIndex((c) => c === TILE_CODES.shore_n);
  const onShore = { x: (shoreCell % scene.cols) * t + 8 - SHIP_POOL.x, y: Math.floor(shoreCell / scene.cols) * t + 2 - SHIP_POOL.y };

  it("is dark by day", () => {
    expect(shipPoolWords(water, onShore, 0)).toBeNull();
  });

  it("lights only open water, inside its box, and never the beach or the shore's foam", () => {
    const pool = shipPoolWords(water, onShore, 0.85)!;
    expect(pool.box).toEqual(shipPoolBox(onShore));
    let lit = 0;
    for (let j = 0; j < pool.box.h; j++) {
      for (let i = 0; i < pool.box.w; i++) {
        if (!(pool.words[j * pool.box.w + i] >>> 24)) continue;
        lit++;
        const col = Math.floor((pool.box.x + i) / t);
        const row = Math.floor((pool.box.y + j) / t);
        const inside = col >= 0 && col < scene.cols && row >= 0 && row < scene.rows;
        if (inside) expect([col, row, [0, 1].includes(model.sea[row * scene.cols + col])]).toEqual([col, row, true]);
      }
    }
    expect(lit).toBeGreaterThan(20);
    // And some of its box was beach, left dark.
    let beach = 0;
    for (let j = 0; j < pool.box.h; j++) {
      for (let i = 0; i < pool.box.w; i++) {
        const col = Math.floor((pool.box.x + i) / t);
        const row = Math.floor((pool.box.y + j) / t);
        if (col >= 0 && col < scene.cols && row >= 0 && row < scene.rows && model.sea[row * scene.cols + col] > 1) beach++;
      }
    }
    expect(beach).toBeGreaterThan(0);
  });

  it("is a pool, not a stroke: warm over many rows, brightest in its heart, dimmer with the hour", () => {
    // Out on the open sea, past the island's edge.
    const far = { x: -400, y: -400 };
    const night = shipPoolWords(water, far, 0.85)!;
    const dusk = shipPoolWords(water, far, 0.3)!;
    const rows = new Set<number>();
    night.words.forEach((v, k) => v >>> 24 && rows.add(Math.floor(k / night.box.w)));
    expect(rows.size).toBeGreaterThanOrEqual(2 * SHIP_POOL.ry - 4);
    const alphaAt = (p: typeof night, dx: number, dy: number) => p.words[(SHIP_POOL.ry + dy) * p.box.w + SHIP_POOL.rx + dx] >>> 24;
    expect(alphaAt(night, 1, 1)).toBeGreaterThan(alphaAt(night, SHIP_POOL.rx - 3, 1));
    expect(alphaAt(dusk, 1, 1)).toBeLessThan(alphaAt(night, 1, 1));
  });
});

// ------------------------------------------------------------------ drawn

/** A context that records what is drawn, with the alpha and blend it was drawn with. */
interface Call {
  op: string;
  args: unknown[];
  alpha: number;
  blend: string;
}
function recorder(calls: Call[] = []) {
  const state: Record<string, unknown> = { globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "", imageSmoothingEnabled: false };
  const ctx = new Proxy(state, {
    get: (s, key) =>
      key in s ? s[key as string] : (...args: unknown[]) => calls.push({ op: String(key), args, alpha: s.globalAlpha as number, blend: s.globalCompositeOperation as string }),
    set: (s, key, value) => {
      s[key as string] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe("IslandFx draws the ship in the water", () => {
  const RealImageData = (globalThis as { ImageData?: unknown }).ImageData;
  beforeAll(() => {
    (globalThis as { ImageData?: unknown }).ImageData = class {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    };
  });
  afterAll(() => {
    (globalThis as { ImageData?: unknown }).ImageData = RealImageData;
  });

  const plot = (slot: number): IslandPlot => ({ slot, stage: 4, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false });
  const scene = buildScene([plot(1), plot(2), plot(3)], { festival: true });
  const model = sceneModel(scene);
  const plaza = plazaWorld(scene, { festival: null, pins: null, campfire: null, ship: true });
  const actors = plaza.actors;
  const index = actors.findIndex((a) => isShipSprite(a.frames[0]));
  const ship = shipOf(actors)!;
  const kit: FxCanvasKit = {
    canvas: (w, h) => ({ width: w, height: h }) as HTMLCanvasElement,
    context: () => recorder().ctx,
  };

  function drawn(phase: LightPhase, tick: number, frozen: boolean, frame: string) {
    const data = buildAtlasData(phase, webSprites());
    const atlas = { width: data.width, height: data.height } as HTMLCanvasElement;
    const fx = new IslandFx(kit);
    // The shallows and the terrain are left for later (prepare()): this is about the ship.
    fx.defer = true;
    fx.bakeLand(recorder().ctx, model, phase, actors, atlas, data.rects);
    const { ctx, calls } = recorder();
    const motion = Object.assign(motionAt(tick, { scene, swaying: [], actors, ambient: false, still: frozen, lowDetail: false, night: phase === "night" }), { tick });
    const layers = { atlas, rects: data.rects, flipped: data.flipped, seaRects: [], land: atlas, overlay: atlas };
    const hooks = fx.hooks(ctx, model, layers, motion, actors, { frozen, lowDetail: false, span: { x: 0, w: scene.width } });
    hooks.afterActor!(index, frame, ship.x, ship.y, false);
    const foams = calls
      .filter((c) => c.op === "drawImage" && c.args[0] === atlas)
      .map((c) => ({ name: SHIP_FOAM_FRAMES.find((n) => data.rects.get(n)!.x === c.args[1] && data.rects.get(n)!.y === c.args[2]), at: { x: c.args[5], y: c.args[6] } }));
    return { calls, foams, atlas, hooks };
  }

  it("by day: only the water at its waterline over the hull, on the sea's beat 0-1-2-1, the foam's place fixed while the ship rocks", () => {
    expect(index).toBeGreaterThanOrEqual(0);
    const at = { x: ship.x + SHIP_FOAM_AT.x, y: ship.y + SHIP_FOAM_AT.y };
    const seen = [0, 3, 6, 9].map((tick) => drawn("day", tick, false, ACTOR_FRAMES.merchantShip[tick % 2]));
    expect(seen.map((s) => s.foams)).toEqual(["ship_foam_0", "ship_foam_1", "ship_foam_2", "ship_foam_1"].map((name) => [{ name, at }]));
    // Nothing else over the ship by day: no warm copy, no glow.
    for (const s of seen) expect(s.calls.filter((c) => c.op === "drawImage")).toHaveLength(1);
    // And no glints under it.
    const { hooks } = seen[0];
    expect(hooks.afterLand).toBeUndefined();
  });

  it("holds the first frame of foam on a still island", () => {
    for (const tick of [0, 3, 6, 9]) expect(drawn("day", tick, true, "merchant_ship_0").foams.map((f) => f.name)).toEqual(["ship_foam_0"]);
  });

  it("at night: the ship warmed round its lantern, the lantern's glow added round it (following the rock), then the foam", () => {
    for (const frame of ACTOR_FRAMES.merchantShip) {
      const { calls, atlas } = drawn("night", 0, false, frame);
      const images = calls.filter((c) => c.op === "drawImage");
      expect(images).toHaveLength(3);
      const [warm, glow, foam] = images;
      // The warm copy: its own canvas over the ship's box, at the lantern's strength of the night.
      expect(warm.args[0]).not.toBe(atlas);
      expect(warm.args.slice(5, 7)).toEqual([ship.x, ship.y]);
      expect(warm.alpha).toBeCloseTo(0.85);
      expect(warm.blend).toBe("source-over");
      // The glow: added, round the lantern, a row lower when the ship dips.
      expect(glow.blend).toBe("lighter");
      expect(glow.args.slice(1, 3)).toEqual([ship.x + SHIP_LANTERN.x - SHIP_HALO, ship.y + SHIP_LANTERN.y + SHIP_DIP[frame] - SHIP_HALO]);
      // The foam last, over both, at the mooring's own place.
      expect(foam.args[0]).toBe(atlas);
      expect(foam.blend).toBe("source-over");
      expect(foam.alpha).toBe(1);
      expect(foam.args.slice(5, 7)).toEqual([ship.x + SHIP_FOAM_AT.x, ship.y + SHIP_FOAM_AT.y]);
    }
  });

  it("at night lays the lantern's glints on the water under the ship, in gold", () => {
    const { hooks, calls } = drawn("night", 0, false, "merchant_ship_0");
    calls.length = 0;
    hooks.afterLand!({ x: 0, y: 0, w: scene.width, h: scene.height });
    const glints = calls.filter((c) => c.op === "fillRect");
    expect(glints.length).toBeGreaterThan(0);
    for (const g of glints) expect((g.args[1] as number) > ship.y + SHIP_WATERLINE).toBe(true);
  });
});
