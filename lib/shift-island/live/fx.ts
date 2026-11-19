/**
 * The web island's atmosphere, drawn: the colour of the hour, shallow water
 * and wet sand, soft blue contact shadows, pools of warm light at dawn, dusk
 * and night, the faces the fire lights, its smoke, the sea's glints, the
 * breeze's petals and the island's small life (ambient.ts: birds,
 * butterflies, the grass the gusts bend). Browser only (it makes canvases);
 * the engine owns one per island.
 *
 * Same contract as the engine: everything static is baked once per phase,
 * scene or light change (into the land layer, or small sprite canvases);
 * per frame there are only small drawImage and fillRect calls, inside the
 * rect being repainted. No getImageData, no filters or shadows; the one
 * blend ("lighter", for the small glow round a lamp's or lantern's head)
 * covers only those lights' own boxes, under the signposts and the plaza's people.
 *
 * Light never paints over an object: the pools lie on the ground under every
 * sprite (baked into the land, or the fire's drawn just after it), and the
 * fire's warmth on the people round it is a recoloured copy of their own
 * sprite, so it touches only their pixels. Every dither is fixed in world
 * space; the fire breathes by stepping its brightness, never its shape.
 *
 * A bent tuft or flower patch is a small baked patch (the tiles under it and
 * its leaning ink) drawn over the land while it leans; a piece under a
 * shadow or a pool of light stays still, so a patch never paints over either.
 *
 * The merchant ship (shipWater.ts) sits in the water the same way: its
 * shadow and its lantern's pool on the sea are baked into the land layer
 * (transparent there, so the sea moves under them), and its foam and the
 * pool's glints step on the sea's beat, when the whole view repaints anyway.
 */
import { SPRITES } from "@/bot/assets/island/sprites";
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { BIRD, BUTTERFLY, bentAt, birdsAt, butterfliesAt, critterDirty, lifePlan, type Critter, type LifePlan } from "./ambient";
import { buildAtlasData, type AtlasRect } from "./atlas";
import {
  BREATH,
  FIRE_WARM,
  LAMP_WARM,
  LIGHT_SIZE,
  POOL_ALPHA,
  SHADOW_LEAN,
  SHALLOW_LEVELS,
  SMOKE_RGB,
  WET,
  bayer,
  breathAt,
  breezeAt,
  castsShadow,
  catchesLight,
  ellipseMask,
  firelight,
  glintAt,
  glintPath,
  hash3,
  lamplight,
  lightSources,
  lightStrength,
  poolStep,
  shadowBox,
  smokeAt,
  smokeBounds,
  smokeOrigin,
  smokeStep,
  waterField,
  webSprites,
  type Drift,
  type GlintFrame,
  type LightSource,
  type WaterField,
} from "./atmosphere";
import type { Motion, Span } from "./clock";
import { actorAt, actorRect, paintLand, type DrawContext, type DrawFx, type Layers, type SceneModel } from "./draw";
import { cellSpan, overlaps, union, type Rect } from "./geometry";
import { gradeKey, gradeRgb } from "./grade";
import { paletteRgb, type RGB } from "./lighting";
import { partnerRects, partnerSprite } from "./people";
import {
  SHIP_DIP,
  SHIP_FOAM_AT,
  SHIP_GLINT_RGB,
  SHIP_LAMPLIT,
  SHIP_LAMPLIT_ALPHA,
  SHIP_POOL,
  SHIP_SHADOW,
  isShipSprite,
  shipFoamFrame,
  shipGlints,
  shipOf,
  shipPoolInk,
} from "./shipWater";
import type { Signpost } from "./signposts";
import { inkColours, terrainFor, terrainSteps, type Terrain } from "./terrain";
import type { LightPhase, LiveActor } from "./types";

type Ctx = CanvasRenderingContext2D;
type Img = CanvasImageSource;

/** A motion with the tick it was taken at (the sea's per-cell frames and the glints need it). */
export type FxMotion = Motion & { tick: number };

export interface FxCanvasKit {
  canvas: (w: number, h: number) => HTMLCanvasElement;
  context: (c: HTMLCanvasElement) => Ctx;
}

/** What the atmosphere needs to know about a frame. */
export interface FxOptions {
  /** Still, or too small to move: sea frame 0 everywhere, nothing drifting, lights steady. */
  frozen: boolean;
  /** Too small to read glints, petals or gull shadows. */
  lowDetail: boolean;
  /** Where the breeze crosses (the engine's span). */
  span: Span;
  /** The whole island fitted to the screen: fewer glints, so the wide sea does not fizz. */
  sparse?: boolean;
}

/** Sea and foam play their three frames as 0-1-2-1 (clock.ts). */
const PING_PONG = [0, 1, 2, 1] as const;
/** Glints left on the whole-island view. */
const SPARSE_GLINTS = 0.3;

/** Soft shadows: blue by day, lavender at dawn, violet at dusk, faint at night. */
const SHADOW_INK: Readonly<Record<LightPhase, { rgb: RGB; core: number; rim: number }>> = {
  dawn: { rgb: [58, 62, 150], core: 0.34, rim: 0.17 },
  day: { rgb: [30, 60, 124], core: 0.34, rim: 0.17 },
  dusk: { rgb: [84, 40, 114], core: 0.32, rim: 0.16 },
  night: { rgb: [4, 8, 32], core: 0.3, rim: 0.15 },
};

/** Glint colours: [core, arms]. */
const GLINT_INK: Readonly<Record<LightPhase, [RGB, RGB]>> = {
  dawn: [
    [255, 248, 232],
    [250, 204, 186],
  ],
  day: [
    [255, 255, 255],
    [178, 228, 236],
  ],
  dusk: [
    [255, 232, 168],
    [244, 160, 96],
  ],
  night: [
    [232, 240, 255],
    [130, 162, 214],
  ],
};

/** The glints' frames in their little sheet: [x, y, w, h]. */
const GLINT_RECTS: Readonly<Record<GlintFrame, [number, number, number, number]>> = {
  dot: [0, 1, 1, 1],
  dash: [2, 1, 3, 1],
  cross: [6, 0, 3, 3],
};

/**
 * Shallows over the sea, per level 1..SHALLOW_LEVELS (deep to shallow): the
 * colour by day, the sea's own lighter blue in the other hours (so dusk's
 * shallows are violet, not green), and the alpha. Never near white, so the
 * whole island never wears a pale ring.
 */
const SHALLOW_INK: readonly { day: RGB; key: string; alpha: number }[] = [
  { day: [0, 0, 0], key: "v", alpha: 0 },
  { day: [89, 169, 190], key: "v", alpha: 0.16 },
  { day: [96, 186, 194], key: "v", alpha: 0.26 },
  { day: [108, 200, 198], key: "u", alpha: 0.3 },
  { day: [126, 210, 204], key: "u", alpha: 0.38 },
];
/** The shallows' strength in each light: clearest by day, a hint at night, so the dark sea never wears a pale ring. */
const SHALLOW_PHASE: Readonly<Record<LightPhase, number>> = { day: 1, dawn: 0.9, dusk: 0.8, night: 0.5 };
const WET_ALPHA = 0.42;

/** The fire's warmth on a sprite near it, per step of its pool (0 none). */
const FACE_ALPHA = [0, 0.3, 0.44, 0.58] as const;
/** The glow round a lamp's or lantern's head: added ("lighter"), its heart at this much, in two dithered steps. */
const HALO_RGB: RGB = [255, 196, 120];
const HALO_PEAK = 0.2;

/** What paintLand draws: the lamplight atlas needs only these. */
const GROUND_SPRITES = ["grass_a", "grass_b", "grass_c", "sand", "sand_b", "plaza", "path", "well", "banner"];

/** The tree's soil mound, shared by every stage sprite: its contact shadow, relative to the tree's corner. */
const MOUND_SHADOW = { x: 0, y: 29, w: 32, h: 12 } as const;

/** The ground in a lamp's and in the fire's light (ground tiles only, a few KB each): built on the first evening, shared. */
const lampAtlases = new Map<"lamp" | "fire", { rects: ReadonlyMap<string, AtlasRect>; image: HTMLCanvasElement }>();

interface LitAtlas {
  image: HTMLCanvasElement;
  rects: ReadonlyMap<string, AtlasRect>;
  flipped: ReadonlyMap<string, AtlasRect>;
}

/** Firelit copies of the plaza's people, shared by every island on the page: a few, keyed by their sprite names. */
const litAtlases = new Map<string, LitAtlas>();

/** The merchant ship in its lantern's light (its stall and its board are drawn from it), shared, built on the first evening. */
let shipLitAtlas: LitAtlas | null = null;

/** The fire's pool, one canvas per breath step (BREATH): the same pixels, brighter or dimmer. */
interface FirePool {
  light: LightSource;
  rx: number;
  ry: number;
  strength: number;
  box: Rect;
  steps: HTMLCanvasElement[];
}

export class IslandFx {
  private water: { scene: IslandScene; field: WaterField } | null = null;
  private phase: LightPhase = "day";
  private lights: LightSource[] = [];
  private actors: readonly LiveActor[] = [];
  private readonly shadows = new Map<string, HTMLCanvasElement>();
  private readonly halos = new Map<string, HTMLCanvasElement>();
  private glintSheet: HTMLCanvasElement | null = null;
  /** Per actor frame name and mirror: its shadow's box relative to where the actor stands. */
  private readonly feet = new Map<string, [Rect | null, Rect | null]>();
  private fire: FirePool | null = null;
  private lit: LitAtlas | null = null;
  private smokeFrom: { x: number; y: number } | null = null;
  /** The merchant ship's mooring (shipWater.ts), and its lantern's strength in this hour (0: no pool, no glints). */
  private ship: { x: number; y: number } | null = null;
  private shipLight = 0;
  /** The ship in its lantern's light, while the lantern is lit. */
  private shipLit: LitAtlas | null = null;
  /** The scene's terrain (terrain.ts), and its ink baked in the colours of one hour: the ground, and the pieces that stand. */
  private terrain: BakedTerrain | null = null;
  /** A new layout's terrain while prepare() builds it, a step per call. */
  private building: { scene: IslandScene; steps: Generator<void, Terrain, void> } | null = null;
  /** The island's small life (ambient.ts), worked out from the terrain it rests on. */
  private life: { data: Terrain; plan: LifePlan } | null = null;
  /**
   * The breeze's bent tufts and flowers for the terrain and the hour baked
   * last: one small sheet, and each piece's place in it (null: the piece
   * lies in a shadow or a pool of light, so it stays still).
   */
  private sway: { data: Terrain; sheet: HTMLCanvasElement; slots: ({ sx: number; sy: number } | null)[] } | null = null;
  /** The life at the last few ticks: a tick's paint and its repaint list ask for the same ones. */
  private readonly lifeFrames: LifeFrame[] = [];
  /**
   * While set, a new scene's bake leaves out the shallows and the terrain
   * (the heavy part); `pending` then says so, and prepare() builds them a
   * slice per frame before the next bake (the engine's first frames).
   */
  defer = false;
  pending = false;

  constructor(private readonly kit: FxCanvasKit) {}

  // ----------------------------------------------------------- baking

  /**
   * Everything static, into the land layer (already painted with the phase's
   * atlas): shallows and wet sand over the sea's edge, the terrain's ground
   * (terrain.ts: the grass's tones, footpaths, flowers, pebbles), contact
   * shadows under trees, lanterns, flags, signposts, the well and the
   * terrain's hedges, fences, rocks and driftwood, those pieces over their
   * shadows, and the pools of warm light that do not move; plus the fire's
   * breathing pool and its firelit sprites, ready for the loop. Once per
   * phase, scene, view or set of lights.
   */
  bakeLand(
    land: Ctx,
    model: SceneModel,
    phase: LightPhase,
    actors: readonly LiveActor[],
    atlas: Img,
    rects: ReadonlyMap<string, AtlasRect>,
    posts: readonly Signpost[] = []
  ): void {
    // The figures' shadows lean with the sun of the hour.
    if (phase !== this.phase) this.feet.clear();
    this.phase = phase;
    this.actors = actors;
    this.lights = lightSources(model, actors, phase);
    this.smokeFrom = smokeOrigin(actors);
    this.ship = shipOf(actors);
    this.shipLight = this.ship ? lightStrength(phase, "lantern") : 0;
    this.shipLit = this.shipLight > 0 ? this.shipLitAtlas(actors) : null;
    this.glintSheet = null;
    this.shadows.clear();
    this.halos.clear();
    this.pending = false;
    this.bakeWater(land, model, phase);
    // The terrain: its ground under every shadow, its hedges, fences, rocks and driftwood over their own.
    const terrain = this.terrainOf(model, phase);
    // The breeze's bent grass and flowers, over the land as it lies before the terrain's ground goes on it.
    const sway = terrain ? this.bakeSway(land, terrain.data, phase) : null;
    if (terrain?.ground) land.drawImage(terrain.ground.canvas, terrain.ground.box.x, terrain.ground.box.y);
    // Whatever darkens or lights the ground over a piece keeps that piece still (its bent frame would paint over it).
    const covered: Rect[] = [];
    this.bakeShadows(land, model, phase, atlas, rects, posts, terrain?.data.shadows ?? [], covered);
    if (terrain?.props) land.drawImage(terrain.props.canvas, terrain.props.box.x, terrain.props.box.y);
    this.bakePools(land, model, covered);
    this.bakeShipPool(land, model);
    this.sway =
      terrain && sway
        ? { data: terrain.data, sheet: sway.sheet, slots: terrain.data.sway.map((p, i) => (covered.some((r) => overlaps(r, p.box)) ? null : sway.slots[i])) }
        : null;
  }

  /**
   * The breeze's bent tufts and flower patches (terrain.ts SwayPiece), each
   * over a copy of the land under it (the tiles, before the terrain is laid
   * on them), packed in one small sheet in the hour's colours. Once per bake;
   * none at night, when the grass is still.
   */
  private bakeSway(land: Ctx, data: Terrain, phase: LightPhase): { sheet: HTMLCanvasElement; slots: { sx: number; sy: number }[] } | null {
    const pieces = data.sway;
    if (phase === "night" || pieces.length === 0) return null;
    let cellW = 1;
    let cellH = 1;
    for (const p of pieces) {
      cellW = Math.max(cellW, p.box.w);
      cellH = Math.max(cellH, p.box.h);
    }
    const perRow = Math.min(pieces.length, 32);
    const sheetW = perRow * cellW;
    const sheetH = Math.ceil(pieces.length / perRow) * cellH;
    const sheet = this.kit.canvas(sheetW, sheetH);
    const ctx = this.kit.context(sheet);
    const table = inkTable(
      inkColours(
        (key) => gradeKey(key, phase),
        (rgb) => gradeRgb(rgb, phase)
      )
    );
    const words = new Uint32Array(sheetW * sheetH);
    const slots = pieces.map((p, k) => {
      const sx = (k % perRow) * cellW;
      const sy = Math.floor(k / perRow) * cellH;
      const { box } = p;
      ctx.drawImage(land.canvas, box.x, box.y, box.w, box.h, sx, sy, box.w, box.h);
      for (let j = 0; j < box.h; j++) {
        for (let i = 0; i < box.w; i++) {
          const v = p.bent[j * box.w + i];
          if (v) words[(sy + j) * sheetW + sx + i] = table[v];
        }
      }
      return { sx, sy };
    });
    ctx.drawImage(this.upload(words, sheetW, sheetH), 0, 0);
    return { sheet, slots };
  }

  /** The island's small life for this scene, from its terrain (null until the terrain is built). */
  private lifeOf(scene: IslandScene): LifePlan | null {
    const t = this.terrain;
    if (!t || t.scene !== scene) return null;
    if (this.life?.data !== t.data) this.life = { data: t.data, plan: lifePlan(t.data, scene) };
    return this.life.plan;
  }

  /**
   * One slice of what a deferred bake left out: the shallows' distance
   * field, then the terrain a step at a time, then its ink in the hour's
   * colours. True when it did a slice (call again next frame); false when
   * nothing was left, so the next bakeLand has everything and builds none of it.
   */
  prepare(model: SceneModel, phase: LightPhase): boolean {
    const { scene } = model;
    if (!this.water || this.water.scene !== scene) {
      this.water = { scene, field: waterField(scene, model.sea) };
      return true;
    }
    if (!this.terrain || this.terrain.scene !== scene) {
      if (!this.building || this.building.scene !== scene) this.building = { scene, steps: terrainSteps(model) };
      const step = this.building.steps.next();
      if (step.done) {
        this.building = null;
        this.keepTerrain(scene, step.value);
      }
      return true;
    }
    if (this.terrain.phase !== phase) {
      this.inkTerrain(this.terrain, phase);
      return true;
    }
    return false;
  }

  /**
   * The scene's terrain with its ink in this hour's colours: built once per
   * layout, baked once per phase. Left out (pending) while deferred.
   */
  private terrainOf(model: SceneModel, phase: LightPhase): BakedTerrain | null {
    if (!this.terrain || this.terrain.scene !== model.scene) {
      if (this.defer) {
        this.pending = true;
        return null;
      }
      // A scene after the first (a plot joins while the page is open): its terrain at once, in this bake.
      this.keepTerrain(model.scene, terrainFor(model));
    }
    const t = this.terrain!;
    if (t.phase !== phase) this.inkTerrain(t, phase);
    return t;
  }

  /** The terrain for a scene: the ink already baked carries over when only the plots' stages or flags changed. */
  private keepTerrain(scene: IslandScene, data: Terrain): void {
    if (this.terrain?.data === data) this.terrain.scene = scene;
    else this.terrain = { scene, data, phase: null, ground: null, props: null };
  }

  /** The terrain's two layers in a phase's colours, each a canvas over just its box. */
  private inkTerrain(t: BakedTerrain, phase: LightPhase): void {
    const colours = inkColours(
      (key) => gradeKey(key, phase),
      (rgb) => gradeRgb(rgb, phase)
    );
    const bake = (layer: "ground" | "props", box: Rect | null) => (box ? { canvas: this.upload(inkWords(t.data, [layer], box, colours), box.w, box.h), box } : null);
    t.ground = bake("ground", t.data.groundBox);
    t.props = bake("props", t.data.propsBox);
    t.phase = phase;
  }

  private bakeWater(land: Ctx, model: SceneModel, phase: LightPhase): void {
    if (!this.water || this.water.scene !== model.scene) {
      // A new scene's first bake leaves the water for prepare(), so no frame does it all.
      if (this.defer) {
        this.pending = true;
        return;
      }
      this.water = { scene: model.scene, field: waterField(model.scene, model.sea) };
    }
    const { rect, level, cells } = this.water.field;
    if (cells.length === 0) return;
    const colour = new Uint32Array(WET + 1);
    for (let k = 1; k <= SHALLOW_LEVELS; k++) {
      const ink = SHALLOW_INK[k];
      colour[k] = word(phase === "day" ? ink.day : gradeKey(ink.key, phase), ink.alpha * SHALLOW_PHASE[phase]);
    }
    colour[WET] = word(gradeKey("d", phase), WET_ALPHA);
    // Only the cells that hold any: packed in a strip, then stamped in place.
    const t = model.scene.tile;
    const perRow = Math.min(cells.length, 64);
    const sheetW = perRow * t;
    const sheetH = Math.ceil(cells.length / perRow) * t;
    const words = new Uint32Array(sheetW * sheetH);
    cells.forEach((base, k) => {
      const sx = (k % perRow) * t;
      const sy = Math.floor(k / perRow) * t;
      for (let py = 0; py < t; py++) {
        const from = base + py * rect.w;
        const to = (sy + py) * sheetW + sx;
        for (let px = 0; px < t; px++) {
          const v = level[from + px];
          if (v) words[to + px] = colour[v];
        }
      }
    });
    const sheet = this.upload(words, sheetW, sheetH);
    cells.forEach((base, k) => {
      const x = rect.x + (base % rect.w);
      const y = rect.y + Math.floor(base / rect.w);
      land.drawImage(sheet, (k % perRow) * t, Math.floor(k / perRow) * t, t, t, x, y, t, t);
    });
  }

  private bakeShadows(
    land: Ctx,
    model: SceneModel,
    phase: LightPhase,
    atlas: Img,
    rects: ReadonlyMap<string, AtlasRect>,
    posts: readonly Signpost[],
    pieces: readonly Rect[],
    covered: Rect[]
  ): void {
    const lean = SHADOW_LEAN[phase];
    const stamp = (box: Rect | null) => {
      if (!box) return;
      land.drawImage(this.shadow(box.w, box.h), box.x, box.y);
      covered.push(box);
    };
    const { scene } = model;
    for (const m of model.trees) {
      const t = m.tree;
      stamp({ x: t.left + MOUND_SHADOW.x + lean, y: t.top + MOUND_SHADOW.y, w: MOUND_SHADOW.w, h: MOUND_SHADOW.h });
      if (t.lantern) stamp(shadowBox("lantern", t.lantern.x, t.lantern.y, false, lean));
      if (t.key) stamp(shadowBox("key_flag", t.key.x, t.key.y, false, lean));
      if (t.visitor) stamp(shadowBox("visitor", t.visitor.x, t.visitor.y, false, lean));
    }
    for (const post of posts) stamp({ ...post.shadow, x: post.shadow.x + lean * post.unit });
    // The merchant ship's on the water, under its hull (it floats: the generic footprint would sit on its wake).
    if (this.ship) stamp({ x: this.ship.x + SHIP_SHADOW.x + lean, y: this.ship.y + SHIP_SHADOW.y, w: SHIP_SHADOW.w, h: SHIP_SHADOW.h });
    // The terrain's standing pieces (drawn over their shadows after this).
    for (const box of pieces) stamp({ ...box, x: box.x + lean });
    stamp(shadowBox("well", scene.well.x, scene.well.y, false, lean));
    // The plaza's props and seated people never move: their shadows go in the land too, and only walkers' are drawn per frame.
    for (const actor of this.actors) {
      if (actor.steps) continue;
      const at = actorAt(actor, 0);
      const foot = this.foot(actor.frames[0], at.flip, lean);
      if (foot) stamp({ x: at.x + foot.x, y: at.y + foot.y, w: foot.w, h: foot.h });
    }
    // The well (and the bunting over its row) back on top of their shadow.
    const well = rects.get("well");
    if (well) land.drawImage(atlas, well.x, well.y, well.w, well.h, scene.well.x, scene.well.y, well.w, well.h);
    const banner = scene.banner ? rects.get("banner") : undefined;
    if (banner && scene.banner) land.drawImage(atlas, banner.x, banner.y, banner.w, banner.h, scene.banner.x, scene.banner.y, banner.w, banner.h);
  }

  /**
   * The pools of warm light: every light but the fire baked into the land
   * (they never change), the fire's made once per breath step for the loop,
   * and the firelit copies of the sprites that can sit in its light.
   */
  private bakePools(land: Ctx, model: SceneModel, covered: Rect[]): void {
    for (const l of this.lights) {
      const pool = LIGHT_SIZE[l.kind].pool;
      if (pool && l.gx != null && l.gy != null) covered.push({ x: l.gx - pool[0], y: l.gy - pool[1], w: 2 * pool[0], h: 2 * pool[1] });
    }
    const still = this.lights.filter((l) => l.kind !== "fire");
    const baked = this.poolSprites(model, still, [1]);
    if (baked) land.drawImage(baked.canvases[0], baked.box.x, baked.box.y);
    const fire = this.lights.find((l) => l.kind === "fire" && l.gx != null && l.gy != null);
    this.fire = null;
    this.lit = null;
    if (!fire) return;
    const [rx, ry] = LIGHT_SIZE.fire.pool!;
    const sprites = this.poolSprites(model, [fire], BREATH);
    if (!sprites) return;
    this.fire = { light: fire, rx, ry, strength: lightStrength(this.phase, "fire"), box: sprites.box, steps: sprites.canvases };
    this.lit = this.litAtlas();
  }

  /**
   * Lamplit ground for a set of lights, one canvas per gain: the land in a
   * warm lamp's colours (painted once), through each pool's soft steps (the
   * strongest pool wins where two meet) at that brightness. Null when none of
   * them has a pool.
   */
  private poolSprites(model: SceneModel, lights: readonly LightSource[], gains: readonly number[]): { canvases: HTMLCanvasElement[]; box: Rect } | null {
    const pools = lights
      .filter((l) => LIGHT_SIZE[l.kind].pool && l.gx != null && l.gy != null)
      .map((light) => {
        const [rx, ry] = LIGHT_SIZE[light.kind].pool!;
        return { light, rx, ry, strength: lightStrength(this.phase, light.kind), box: { x: light.gx! - rx, y: light.gy! - ry, w: 2 * rx, h: 2 * ry } };
      });
    if (pools.length === 0) return null;
    let bbox = pools[0].box;
    for (const p of pools) bbox = union(bbox, p.box);
    const x0 = Math.max(0, bbox.x);
    const y0 = Math.max(0, bbox.y);
    const box = { x: x0, y: y0, w: Math.min(model.scene.width, bbox.x + bbox.w) - x0, h: Math.min(model.scene.height, bbox.y + bbox.h) - y0 };
    if (box.w <= 0 || box.h <= 0) return null;
    // The mask: per pixel, the strongest pool there.
    const alpha = new Float32Array(box.w * box.h);
    for (const { light, rx, ry, strength, box: b } of pools) {
      for (let y = Math.max(b.y, box.y); y < Math.min(b.y + b.h, box.y + box.h); y++) {
        for (let x = Math.max(b.x, box.x); x < Math.min(b.x + b.w, box.x + box.w); x++) {
          const a = POOL_ALPHA[poolStep(x, y, light.gx!, light.gy!, rx, ry)] * strength;
          const i = (y - box.y) * box.w + (x - box.x);
          if (a > alpha[i]) alpha[i] = a;
        }
      }
    }
    // The ground in the lamp's light, just the cells the pools touch.
    const light = pools.some((p) => p.light.kind === "fire") ? "fire" : "lamp";
    const lamp = this.lampAtlas(light);
    const ground = this.kit.canvas(box.w, box.h);
    const gctx = this.kit.context(ground);
    gctx.setTransform(1, 0, 0, 1, -box.x, -box.y);
    paintLand(gctx as DrawContext<Img>, model, lamp.image, lamp.rects, box);
    // The terrain in the same light, so a path or a hedge never drops out where a lamp falls on it.
    const terrain = this.terrain?.scene === model.scene ? this.terrain.data : null;
    if (terrain) {
      const warm = light === "fire" ? FIRE_WARM : LAMP_WARM;
      const colours = inkColours(
        (key) => lamplight(paletteRgb(key) ?? [0, 0, 0], warm),
        (rgb) => lamplight(rgb, warm)
      );
      gctx.drawImage(this.upload(inkWords(terrain, ["ground", "props"], box, colours), box.w, box.h), box.x, box.y);
    }
    const canvases = gains.map((gain) => {
      const words = new Uint32Array(alpha.length);
      for (let i = 0; i < alpha.length; i++) if (alpha[i] > 0) words[i] = word([255, 255, 255], alpha[i] * gain);
      const canvas = this.kit.canvas(box.w, box.h);
      const ctx = this.kit.context(canvas);
      ctx.drawImage(ground, 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(this.upload(words, box.w, box.h), 0, 0);
      ctx.globalCompositeOperation = "source-over";
      return canvas;
    });
    return { canvases, box };
  }

  /**
   * The ship's lantern on the water: the plaza pools' soft steps (poolStep)
   * at the lantern's strength of the hour, as warm streaks laid over the sea
   * (shipWater.ts shipPoolInk), on open water only (never the beach or what
   * stands on it).
   * Into the land layer, which is transparent over the sea, so the sea's
   * ripples still move under it. None by day.
   */
  private bakeShipPool(land: Ctx, model: SceneModel): void {
    const ship = this.ship;
    const strength = this.shipLight;
    if (!ship || strength <= 0) return;
    const { scene } = model;
    const cx = ship.x + SHIP_POOL.x;
    const cy = ship.y + SHIP_POOL.y;
    const { rx, ry } = SHIP_POOL;
    const box = { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry };
    const words = new Uint32Array(box.w * box.h);
    let any = false;
    for (let j = 0; j < box.h; j++) {
      const y = box.y + j;
      for (let i = 0; i < box.w; i++) {
        const x = box.x + i;
        const col = Math.floor(x / scene.tile);
        const row = Math.floor(y / scene.tile);
        const inside = col >= 0 && col < scene.cols && row >= 0 && row < scene.rows;
        // Open water only (sea kinds 0 and 1); off the scene the open sea goes on.
        if (inside && !(model.sea[row * scene.cols + col] >= 0 && model.sea[row * scene.cols + col] < 2)) continue;
        const ink = shipPoolInk(x, y, cy, poolStep(x, y, cx, cy, rx, ry));
        if (!ink) continue;
        words[j * box.w + i] = word(ink.rgb, ink.alpha * strength);
        any = true;
      }
    }
    if (any) land.drawImage(this.upload(words, box.w, box.h), box.x, box.y);
  }

  private lampAtlas(light: "lamp" | "fire"): { rects: ReadonlyMap<string, AtlasRect>; image: HTMLCanvasElement } {
    let entry = lampAtlases.get(light);
    if (entry) return entry;
    const all: Record<string, string[]> = {};
    for (const name of GROUND_SPRITES) if (SPRITES[name]) all[name] = SPRITES[name];
    const warm = light === "fire" ? FIRE_WARM : LAMP_WARM;
    const data = buildAtlasData("day", all, [], (rgb) => lamplight(rgb, warm));
    const image = this.kit.canvas(data.width, data.height);
    this.kit.context(image).putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
    entry = { rects: data.rects, image };
    lampAtlases.set(light, entry);
    return entry;
  }

  /** The ship's frames in its lantern's warm light (firelight's colours), once per page. */
  private shipLitAtlas(actors: readonly LiveActor[]): LitAtlas | null {
    if (shipLitAtlas) return shipLitAtlas;
    const ship = actors.find((a) => isShipSprite(a.frames[0] ?? ""));
    if (!ship) return null;
    const all = webSprites();
    const sprites: Record<string, string[]> = {};
    for (const name of ship.frames) if (all[name]) sprites[name] = all[name];
    const data = buildAtlasData("night", sprites, [], (rgb) => firelight(rgb));
    const image = this.kit.canvas(data.width, data.height);
    this.kit.context(image).putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
    shipLitAtlas = { image, rects: data.rects, flipped: data.flipped };
    return shipLitAtlas;
  }

  /** Firelit copies of every sprite the plaza's actors show that can catch the light. */
  private litAtlas(): LitAtlas | null {
    const names = new Set<string>();
    for (const a of this.actors) for (const name of a.frames) if (catchesLight(name)) names.add(name);
    if (names.size === 0) return null;
    const key = [...names].sort().join(",");
    let entry = litAtlases.get(key);
    if (!entry) {
      const all = webSprites();
      const sprites: Record<string, string[]> = {};
      for (const name of names) if (all[name]) sprites[name] = all[name];
      const data = buildAtlasData("night", sprites, [], (rgb) => firelight(rgb));
      const image = this.kit.canvas(data.width, data.height);
      this.kit.context(image).putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
      entry = { image, rects: data.rects, flipped: data.flipped };
      if (litAtlases.size >= 4) litAtlases.delete(litAtlases.keys().next().value as string);
      litAtlases.set(key, entry);
    }
    return entry;
  }

  // ----------------------------------------------------------- sprites

  /** RGBA words to a canvas: once, while baking. The words always own a plain ArrayBuffer (never shared). */
  private upload(words: Uint32Array<ArrayBuffer>, w: number, h: number): HTMLCanvasElement {
    const c = this.kit.canvas(w, h);
    this.kit.context(c).putImageData(new ImageData(new Uint8ClampedArray(words.buffer, words.byteOffset, words.byteLength), w, h), 0, 0);
    return c;
  }

  private shadow(w: number, h: number): HTMLCanvasElement {
    const key = `${w}x${h}`;
    let c = this.shadows.get(key);
    if (!c) {
      const ink = SHADOW_INK[this.phase];
      const mask = ellipseMask(w, h);
      const words = new Uint32Array(w * h);
      for (let i = 0; i < mask.length; i++) if (mask[i]) words[i] = word(ink.rgb, mask[i] === 2 ? ink.core : ink.rim);
      c = this.upload(words, w, h);
      this.shadows.set(key, c);
    }
    return c;
  }

  /** A light's small glow, its dither keyed to where it stands so the pattern sits still in the world. */
  private halo(radius: number, strength: number, x: number, y: number): HTMLCanvasElement {
    const key = `${radius}|${strength}|${x & 3}|${y & 3}`;
    let c = this.halos.get(key);
    if (!c) {
      const size = radius * 2;
      const words = new Uint32Array(size * size);
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const nx = (i + 0.5 - radius) / radius;
          const ny = (j + 0.5 - radius) / (radius * 0.85);
          const r = Math.sqrt(nx * nx + ny * ny);
          if (r >= 1) continue;
          const step = Math.min(2, Math.floor((1 - r) * 2 + 0.4 + (bayer(x + i, y + j) - 0.5) * 0.6));
          if (step <= 0) continue;
          words[j * size + i] = word(HALO_RGB, (step / 2) * HALO_PEAK * strength);
        }
      }
      c = this.upload(words, size, size);
      this.halos.set(key, c);
    }
    return c;
  }

  private glints(): HTMLCanvasElement {
    if (!this.glintSheet) {
      const [core, arm] = GLINT_INK[this.phase];
      const words = new Uint32Array(9 * 3);
      const put = (x: number, y: number, rgb: RGB, a = 1) => (words[y * 9 + x] = word(rgb, a));
      put(0, 1, core); // dot
      put(2, 1, arm, 0.8); // dash
      put(3, 1, core);
      put(4, 1, arm, 0.8);
      put(7, 0, arm, 0.7); // cross
      put(6, 1, arm, 0.7);
      put(7, 1, core);
      put(8, 1, arm, 0.7);
      put(7, 2, arm, 0.7);
      this.glintSheet = this.upload(words, 9, 3);
    }
    return this.glintSheet;
  }

  /** An actor's shadow box relative to where it stands, cached by frame name and mirror (the sun's lean is the phase's). */
  private foot(name: string, flip: boolean, lean: number): Rect | null {
    let pair = this.feet.get(name);
    if (!pair) {
      pair = castsShadow(name) ? [shadowBox(name, 0, 0, false, lean), shadowBox(name, 0, 0, true, lean)] : [null, null];
      this.feet.set(name, pair);
    }
    return pair[flip ? 1 : 0];
  }

  /** The fire's warmth on actor sprite `name` standing at (x, y): an alpha for its firelit copy, 0 for none. */
  private warmth(name: string, x: number, y: number, breath: number): number {
    const fire = this.fire;
    const lit = this.lit;
    if (!fire || !lit || !catchesLight(name)) return 0;
    const a = lit.rects.get(name);
    if (!a) return 0;
    // Where the light meets the figure: a little below its middle (a face and a lap, round the fire).
    const step = poolStep(x + (a.w >> 1), y + Math.round(a.h * 0.6), fire.light.gx!, fire.light.gy!, fire.rx, fire.ry);
    return FACE_ALPHA[step] * fire.strength * BREATH[breath];
  }

  // ----------------------------------------------------------- per frame

  /**
   * The hooks for one paint. `frozen`: still or too small to move (sea frame
   * 0 everywhere, nothing drifting, the fire's light steady, no smoke);
   * `lowDetail` also drops the glints, too small to read.
   */
  hooks(
    ctx: Ctx,
    model: SceneModel,
    layers: Layers<Img>,
    motion: FxMotion,
    actors: readonly LiveActor[],
    opts: FxOptions
  ): DrawFx {
    const { frozen, lowDetail, span, sparse } = opts;
    const { scene } = model;
    const phase = this.phase;
    const tick = motion.tick;
    const lean = SHADOW_LEAN[phase];
    const seaStep = Math.floor(tick / 3);
    const foamStep = Math.floor(tick / 4);
    const path = glintPath(scene);
    const breeze: Drift[] = frozen || lowDetail ? [] : breezeAt(tick, scene, span, phase);
    const breath = frozen ? 1 : breathAt(tick);
    const fire = this.fire;
    const lit = this.lit;
    const smoke = !frozen && this.smokeFrom ? smokeAt(smokeStep(tick), this.smokeFrom) : null;
    const smokeBox = this.smokeFrom ? smokeBounds(this.smokeFrom) : null;
    // The walkers' shadows for this frame, once (each repainted rect only checks which it meets); the still ones are in the land.
    const shadows: Rect[] = [];
    actors.forEach((actor, i) => {
      if (!actor.steps) return;
      const frame = motion.actors[i] ?? 0;
      const at = actorAt(actor, frame);
      const foot = this.foot(actor.frames[frame] ?? actor.frames[0], at.flip, lean);
      if (foot) shadows.push({ x: at.x + foot.x, y: at.y + foot.y, w: foot.w, h: foot.h });
    });
    const halos = this.lights.filter((l) => LIGHT_SIZE[l.kind].halo > 0);
    // Each actor's warmth from the fire this frame, worked out the first time a rect draws it (NaN: not yet).
    const warm = fire && lit ? new Float32Array(actors.length).fill(NaN) : null;
    // The island's small life (ambient.ts): none on a still or tiny island.
    const life = frozen || lowDetail ? null : this.lifeOf(scene);
    const now = life ? this.lifeFrame(tick, life, span) : NO_LIFE;
    const sway = life && this.sway?.data === this.life?.data ? this.sway : null;
    const bent = sway ? now.bent : NO_LIFE.bent;
    const { birds, butterflies } = now;
    // The merchant ship's foam and its lantern's glints, on the sea's beat (none moving on a still island).
    const ship = this.ship;
    const shipStep = frozen ? 0 : seaStep;
    const foam = ship ? layers.rects.get(shipFoamFrame(shipStep)) : undefined;
    const foamAt = ship ? { x: ship.x + SHIP_FOAM_AT.x, y: ship.y + SHIP_FOAM_AT.y } : null;
    const glints = ship && this.shipLight > 0 ? shipGlints(shipStep, ship) : [];
    const glintAlpha = Math.min(1, 0.9 * this.shipLight);
    const shipLit = this.shipLit;
    const shipGlow = Math.min(1, SHIP_LAMPLIT_ALPHA * this.shipLight);
    const drawCritter = (c: Critter | null, size: { w: number; h: number }, r: Rect) => {
      if (!c || c.x >= r.x + r.w || c.y >= r.y + r.h || c.x + size.w <= r.x || c.y + size.h <= r.y) return;
      const a = (c.flip ? layers.flipped : layers.rects).get(c.name);
      if (a) ctx.drawImage(layers.atlas, a.x, a.y, a.w, a.h, c.x, c.y, a.w, a.h);
    };
    return {
      // The interact outline's slots (outline.ts withRing fills one): always here, so every paint's hooks have one shape.
      beforeTree: undefined,
      afterTree: undefined,
      beforeActor: undefined,
      // A tree's partner breathes and blinks on its own clock (people.ts); still, the visitor as drawn.
      partner: frozen ? undefined : (i) => partnerSprite(tick, model.trees[i]?.tree.slot ?? i),
      seaFrame: frozen
        ? undefined
        : (col, row, kind) =>
            kind < 2 ? PING_PONG[(seaStep + Math.floor(hash3(col, row, 0) * 4)) & 3] : PING_PONG[(foamStep + ((col + row) & 3)) & 3],
      afterSea: lowDetail
        ? undefined
        : (r) => {
            const sheet = this.glints();
            const cells = cellSpan(r, scene.tile);
            const step = frozen ? 0 : seaStep;
            for (let row = cells.r0; row < cells.r1; row++) {
              for (let col = cells.c0; col < cells.c1; col++) {
                const inside = col >= 0 && col < scene.cols && row >= 0 && row < scene.rows;
                const kind = inside ? model.sea[row * scene.cols + col] : 0;
                if (kind < 0 || kind > 1) continue;
                const g = glintAt(col, row, step, phase, path, scene.tile, sparse ? SPARSE_GLINTS : 1);
                if (!g) continue;
                const [sx, sy, w, h] = GLINT_RECTS[g.frame];
                const dx = g.x - (w >> 1);
                const dy = g.y - (h >> 1);
                if (dx + w <= r.x || dy + h <= r.y || dx >= r.x + r.w || dy >= r.y + r.h) continue;
                ctx.drawImage(sheet, sx, sy, w, h, dx, dy, w, h);
              }
            }
            // The gulls' shadows skim the water below them.
            for (const g of motion.gulls) {
              const box = gullShadow(g);
              if (overlaps(box, r)) ctx.drawImage(this.shadow(box.w, box.h), box.x, box.y);
            }
          },
      // The grass the gust bends; then the fire's pool, on the ground under everything, at this moment's breath;
      // then the water lapping at the merchant ship and its lantern's glints, under the ship.
      afterLand:
        fire || bent.length || foam
          ? (r) => {
              if (sway) {
                for (const i of bent) {
                  const slot = sway.slots[i];
                  const box = sway.data.sway[i].box;
                  if (slot && overlaps(box, r)) ctx.drawImage(sway.sheet, slot.sx, slot.sy, box.w, box.h, box.x, box.y, box.w, box.h);
                }
              }
              if (fire && overlaps(fire.box, r)) ctx.drawImage(fire.steps[breath], fire.box.x, fire.box.y);
              if (foam && foamAt && overlaps({ x: foamAt.x, y: foamAt.y, w: foam.w, h: foam.h }, r)) {
                ctx.drawImage(layers.atlas, foam.x, foam.y, foam.w, foam.h, foamAt.x, foamAt.y, foam.w, foam.h);
              }
              if (glints.length) {
                ctx.fillStyle = `rgb(${SHIP_GLINT_RGB[0]},${SHIP_GLINT_RGB[1]},${SHIP_GLINT_RGB[2]})`;
                ctx.globalAlpha = glintAlpha;
                for (const g of glints) if (overlaps({ x: g.x, y: g.y, w: g.w, h: 1 }, r)) ctx.fillRect(g.x, g.y, g.w, 1);
                ctx.globalAlpha = 1;
              }
            }
          : undefined,
      beforeTags: halos.length
        ? (r) => {
            ctx.globalCompositeOperation = "lighter";
            for (const l of halos) {
              const radius = LIGHT_SIZE[l.kind].halo;
              const box = { x: l.hx - radius, y: l.hy - radius, w: radius * 2, h: radius * 2 };
              if (overlaps(box, r)) ctx.drawImage(this.halo(radius, lightStrength(phase, l.kind), box.x, box.y), box.x, box.y);
            }
            ctx.globalCompositeOperation = "source-over";
          }
        : undefined,
      beforeActors: (r) => {
        for (const box of shadows) if (overlaps(box, r)) ctx.drawImage(this.shadow(box.w, box.h), box.x, box.y);
      },
      // The fire's warmth on whoever sits by it: their own sprite, recoloured, over them alone.
      afterActor:
        (fire && lit && warm) || shipLit
          ? (i, name, x, y, flip) => {
              // The ship's stall and painted board in its lantern's light: its own pixels, warmed.
              if (shipLit && isShipSprite(name)) {
                const a = shipLit.rects.get(name);
                if (!a) return;
                const dip = SHIP_DIP[name] ?? 0;
                ctx.globalAlpha = shipGlow;
                for (const p of SHIP_LAMPLIT) ctx.drawImage(shipLit.image, a.x + p.x, a.y + p.y + dip, p.w, p.h, x + p.x, y + p.y + dip, p.w, p.h);
                ctx.globalAlpha = 1;
                return;
              }
              if (!fire || !lit || !warm) return;
              let alpha = warm[i];
              if (Number.isNaN(alpha)) alpha = warm[i] = this.warmth(name, x, y, breath);
              const a = alpha > 0 ? (flip ? lit.flipped : lit.rects).get(name) : undefined;
              if (!a) return;
              ctx.globalAlpha = alpha;
              ctx.drawImage(lit.image, a.x, a.y, a.w, a.h, x, y, a.w, a.h);
              ctx.globalAlpha = 1;
            }
          : undefined,
      last: (r) => {
        // The birds over their shadows (on the ground, or below them in flight), then the butterflies.
        for (const b of birds) if (b?.shadow && overlaps(b.shadow, r)) ctx.drawImage(this.shadow(b.shadow.w, b.shadow.h), b.shadow.x, b.shadow.y);
        for (const b of birds) drawCritter(b, BIRD, r);
        for (const b of butterflies) drawCritter(b, BUTTERFLY, r);
        for (const d of breeze) {
          const a = layers.rects.get(d.name);
          if (!a || !overlaps({ x: d.x, y: d.y, w: a.w, h: a.h }, r)) continue;
          ctx.drawImage(layers.atlas, a.x, a.y, a.w, a.h, d.x, d.y, a.w, a.h);
        }
        if (smoke && smokeBox && overlaps(smokeBox, r)) {
          const [sr, sg, sb] = SMOKE_RGB[phase];
          ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
          for (const p of smoke) {
            ctx.globalAlpha = p.alpha;
            // A soft square: its corners left out once it is 3 px or more.
            if (p.w < 3) ctx.fillRect(p.x, p.y, p.w, p.h);
            else {
              ctx.fillRect(p.x + 1, p.y, p.w - 2, p.h);
              ctx.fillRect(p.x, p.y + 1, p.w, Math.max(1, p.h - 2));
            }
          }
          ctx.globalAlpha = 1;
        }
      },
    };
  }

  /**
   * What the atmosphere changes between two frames that redrawRect's own
   * dirty list does not know about: the drifting petals, the gulls' shadows,
   * a tree partner's breath or blink, the fire's breath (its pool and the
   * people it lights) and its smoke.
   * (Glints and the sea's frames change only on the sea's beat, when the
   * whole view repaints anyway; shadows move inside their actors' padded
   * boxes.)
   */
  dirty(prev: FxMotion, next: FxMotion, scene: IslandScene, layers: Layers<Img>, opts: FxOptions): Rect[] {
    const out: Rect[] = [];
    if (opts.lowDetail) return out;
    for (let i = 0; i < Math.max(prev.gulls.length, next.gulls.length); i++) {
      const a = prev.gulls[i];
      const b = next.gulls[i];
      if (a && b && a.x === b.x && a.y === b.y) continue;
      const boxes = [a, b].filter((g) => g != null).map((g) => gullShadow(g!));
      if (boxes.length) out.push(boxes.reduce(union));
    }
    if (opts.frozen) return out;
    out.push(...partnerRects(prev.tick, next.tick, scene.trees));
    const a = breezeAt(prev.tick, scene, opts.span, this.phase);
    const b = breezeAt(next.tick, scene, opts.span, this.phase);
    for (let k = 0; k < Math.min(a.length, b.length); k++) {
      const ra = layers.rects.get(a[k].name);
      const rb = layers.rects.get(b[k].name);
      if (!ra || !rb) continue;
      if (a[k].x === b[k].x && a[k].y === b[k].y && a[k].name === b[k].name) continue;
      out.push(union({ x: a[k].x, y: a[k].y, w: ra.w, h: ra.h }, { x: b[k].x, y: b[k].y, w: rb.w, h: rb.h }));
    }
    const fire = this.fire;
    if (fire && breathAt(prev.tick) !== breathAt(next.tick)) {
      // One rect: the pool and the people it lights (they reach above it).
      let box = fire.box;
      this.actors.forEach((actor, i) => {
        const rect = actorRect(actor, next.actors[i] ?? 0, layers.rects);
        if (rect && overlaps(rect, fire.box)) box = union(box, rect);
      });
      out.push(box);
    }
    if (this.smokeFrom && smokeStep(prev.tick) !== smokeStep(next.tick)) out.push(smokeBounds(this.smokeFrom));
    this.lifeDirty(prev, next, scene, opts, out);
    return out;
  }

  /** The island's small life between two frames: each bent piece that rose or fell, and each bird and butterfly that moved. */
  private lifeDirty(prev: FxMotion, next: FxMotion, scene: IslandScene, opts: FxOptions, out: Rect[]): void {
    const life = this.lifeOf(scene);
    if (!life) return;
    const a = this.lifeFrame(prev.tick, life, opts.span);
    const b = this.lifeFrame(next.tick, life, opts.span);
    const sway = this.sway?.data === this.life?.data ? this.sway : null;
    if (sway) {
      // Both lists are in index order: walk them together, and repaint what is in only one.
      let i = 0;
      let j = 0;
      while (i < a.bent.length || j < b.bent.length) {
        const x = i < a.bent.length ? a.bent[i] : Infinity;
        const y = j < b.bent.length ? b.bent[j] : Infinity;
        if (x === y) {
          i++;
          j++;
          continue;
        }
        const k = Math.min(x, y);
        if (x === k) i++;
        else j++;
        if (sway.slots[k]) out.push(sway.data.sway[k].box);
      }
    }
    critterDirty(a.birds, b.birds, BIRD, out);
    critterDirty(a.butterflies, b.butterflies, BUTTERFLY, out);
  }

  /** The life at a tick in this hour over this span, worked out once (the last few are kept). */
  private lifeFrame(tick: number, plan: LifePlan, span: Span): LifeFrame {
    const phase = this.phase;
    for (const f of this.lifeFrames) if (f.tick === tick && f.plan === plan && f.phase === phase && f.spanX === span.x && f.spanW === span.w) return f;
    const frame: LifeFrame = {
      tick,
      plan,
      phase,
      spanX: span.x,
      spanW: span.w,
      bent: bentAt(tick, plan, phase),
      birds: birdsAt(tick, plan, span, phase),
      butterflies: butterfliesAt(tick, plan, phase),
    };
    if (this.lifeFrames.length >= 3) this.lifeFrames.shift();
    this.lifeFrames.push(frame);
    return frame;
  }
}

/** The island's small life at one tick (ambient.ts), with what it was worked out for. */
interface LifeFrame {
  tick: number;
  plan: LifePlan | null;
  phase: LightPhase;
  spanX: number;
  spanW: number;
  bent: readonly number[];
  birds: readonly (Critter | null)[];
  butterflies: readonly (Critter | null)[];
}

const NO_LIFE: LifeFrame = { tick: -1, plan: null, phase: "day", spanX: 0, spanW: 0, bent: [], birds: [], butterflies: [] };

/** The terrain of a scene, with its ink baked for one phase (each layer null when it has none). */
interface BakedTerrain {
  scene: IslandScene;
  data: Terrain;
  phase: LightPhase | null;
  ground: { canvas: HTMLCanvasElement; box: Rect } | null;
  props: { canvas: HTMLCanvasElement; box: Rect } | null;
}

/** The terrain's colours as RGBA words, by ink code. */
function inkTable(colours: ReadonlyMap<number, RGB>): Uint32Array {
  const table = new Uint32Array(128);
  for (const [code, rgb] of colours) if (code < 128) table[code] = word(rgb, 1);
  return table;
}

/** RGBA words for the terrain's ink inside `box` (later layers over earlier ones), in these colours. */
function inkWords(data: Terrain, layers: readonly ("ground" | "props")[], box: Rect, colours: ReadonlyMap<number, RGB>): Uint32Array<ArrayBuffer> {
  const table = inkTable(colours);
  const words = new Uint32Array(box.w * box.h);
  const W = data.width;
  for (const layer of layers) {
    const ink = data[layer];
    for (let y = Math.max(0, box.y); y < Math.min(data.height, box.y + box.h); y++) {
      const from = y * W;
      const to = (y - box.y) * box.w - box.x;
      for (let x = Math.max(0, box.x); x < Math.min(W, box.x + box.w); x++) {
        const v = ink[from + x];
        if (v) words[to + x] = table[v];
      }
    }
  }
  return words;
}

/** A gull's shadow on the water: a small soft dash well below it. */
function gullShadow(g: { x: number; y: number }): Rect {
  return { x: Math.round(g.x) + 1, y: Math.round(g.y) + 12, w: 6, h: 2 };
}

/** RGBA as a little-endian word (as the atlas stores it), alpha 0..1. */
function word(rgb: readonly number[], a: number): number {
  const alpha = Math.round(Math.min(1, Math.max(0, a)) * 255);
  return ((alpha << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]) >>> 0;
}
