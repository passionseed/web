/**
 * The web island's atmosphere, drawn: the colour of the hour, shallow water
 * and wet sand, soft blue contact shadows, pools of lamplight at night, the
 * sea's glints and the breeze's petals. Browser only (it makes canvases);
 * the engine owns one per island.
 *
 * Same contract as the engine: everything static is baked once per phase,
 * scene or light change (into the land layer, or small sprite canvases);
 * per frame there are only small drawImage calls, inside the rect being
 * repainted. No getImageData, no filters or shadows, and the one blend
 * ("lighter", for the glow on faces near a light) covers only the lights'
 * own small boxes.
 */
import { SPRITES } from "@/bot/assets/island/sprites";
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { buildAtlasData, type AtlasRect } from "./atlas";
import {
  FIRE_FLICKER,
  LIGHT_SIZE,
  SHADOW_LEAN,
  breezeAt,
  castsShadow,
  ellipseMask,
  glintAt,
  glintPath,
  hash3,
  lightSources,
  lightStrength,
  shadowBox,
  WET,
  waterField,
  type Drift,
  type GlintFrame,
  type LightSource,
  type WaterField,
} from "./atmosphere";
import type { Motion, Span } from "./clock";
import { actorAt, paintLand, type DrawContext, type DrawFx, type Layers, type SceneModel } from "./draw";
import { cellSpan, overlaps, union, type Rect } from "./geometry";
import { gradeKey } from "./grade";
import type { RGB } from "./lighting";
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

/** Shallows over the sea: [palette key, alpha] per band 1..3. */
const SHALLOW_INK: readonly (readonly [string, number])[] = [
  ["v", 0],
  ["v", 0.22],
  ["v", 0.42],
  ["u", 0.4],
];
const WET_ALPHA = 0.42;

/**
 * Lamplight on the ground: the land's daytime colours under a warm lamp,
 * half its own hue and half the lamp's amber, so lit grass reads warm
 * instead of olive.
 */
const LAMP_HUE: RGB = [1.06, 0.78, 0.47];
const LAMP_TINT: RGB = [1, 0.74, 0.44];
const lamplight = (rgb: RGB): RGB => {
  const luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return rgb.map((v, i) => Math.min(255, Math.round(0.6 * luma * LAMP_HUE[i] + 0.4 * v * LAMP_TINT[i]))) as RGB;
};
/** The glow on sprites near a light, added ("lighter"). */
const HALO_RGB: RGB = [255, 168, 80];
const HALO_PEAK = 0.24;

/** What paintLand draws: the lamplight atlas needs only these. */
const GROUND_SPRITES = ["grass_a", "grass_b", "grass_c", "sand", "sand_b", "plaza", "path", "well", "banner"];

/** The tree's soil mound, shared by every stage sprite: its contact shadow, relative to the tree's corner. */
const MOUND_SHADOW = { x: 0, y: 29, w: 32, h: 12 } as const;

/** Banded ellipse alpha (pixel-art light: three hard steps, no smooth gradient). */
function bandAlpha(nx: number, ny: number): number {
  const r = nx * nx + ny * ny;
  if (r < 0.28) return 1;
  if (r < 0.6) return 0.6;
  if (r < 1) return 0.26;
  return 0;
}

/** One shared lamplight atlas (ground tiles only, a few KB): built on the first night. */
let lampAtlas: { rects: ReadonlyMap<string, AtlasRect>; image: HTMLCanvasElement } | null = null;

export class IslandFx {
  private water: { scene: IslandScene; field: WaterField } | null = null;
  private phase: LightPhase = "day";
  private lights: LightSource[] = [];
  private readonly shadows = new Map<string, HTMLCanvasElement>();
  private readonly halos = new Map<string, HTMLCanvasElement>();
  private glintSheet: HTMLCanvasElement | null = null;
  /** Per actor frame name and mirror: its shadow's box relative to where the actor stands. */
  private readonly feet = new Map<string, Rect | null>();
  /** The flame's actor index, for its flicker; -1 without a campfire. */
  private flame = -1;
  /** While set, a scene's first bake leaves the water out (the engine's build frame); waterPending then says so. */
  deferWater = false;
  waterPending = false;

  constructor(private readonly kit: FxCanvasKit) {}

  // ----------------------------------------------------------- baking

  /**
   * Everything static, into the land layer (already painted with the phase's
   * atlas): shallows and wet sand over the sea's edge, contact shadows under
   * trees, lanterns, flags and the well, and at dusk and night the pools of
   * lamplight. Once per phase, scene or set of lights.
   */
  bakeLand(land: Ctx, model: SceneModel, phase: LightPhase, actors: readonly LiveActor[], atlas: Img, rects: ReadonlyMap<string, AtlasRect>): void {
    this.phase = phase;
    this.lights = lightSources(model, actors, phase);
    this.flame = actors.findIndex((a) => (a.frames[0] ?? "").startsWith("campfire_flame"));
    this.glintSheet = null;
    this.shadows.clear();
    this.halos.clear();
    this.bakeWater(land, model, phase);
    this.bakeShadows(land, model, phase, atlas, rects);
    this.bakePools(land, model, phase);
  }

  private bakeWater(land: Ctx, model: SceneModel, phase: LightPhase): void {
    if (!this.water || this.water.scene !== model.scene) {
      // The first build of a scene leaves the water for the next frame (waterPending), so no frame does it all.
      if (this.deferWater) {
        this.waterPending = true;
        return;
      }
      this.water = { scene: model.scene, field: waterField(model.scene, model.sea) };
    }
    this.waterPending = false;
    const { rect, gw, gh, blocks, edge, shoreCells } = this.water.field;
    if (rect.w <= 0 || rect.h <= 0) return;
    const colour = SHALLOW_INK.map(([key, a]) => word(gradeKey(key, phase), a));
    colour[WET] = word(gradeKey("d", phase), WET_ALPHA);
    // Open water: one block per 2 x 2 px, stretched back to size (crisp: smoothing is off).
    const half = new Uint32Array(gw * gh);
    for (let i = 0; i < half.length; i++) if (blocks[i]) half[i] = colour[blocks[i]];
    land.drawImage(this.upload(half, gw, gh), 0, 0, gw, gh, rect.x, rect.y, rect.w, rect.h);
    // Shore cells pixel by pixel (the wash moves there): packed in a strip, then stamped in place.
    if (shoreCells.length === 0) return;
    const t = model.scene.tile;
    const perRow = Math.min(shoreCells.length, 64);
    const sheetW = perRow * t;
    const sheetH = Math.ceil(shoreCells.length / perRow) * t;
    const words = new Uint32Array(sheetW * sheetH);
    shoreCells.forEach((base, k) => {
      const sx = (k % perRow) * t;
      const sy = Math.floor(k / perRow) * t;
      for (let py = 0; py < t; py++) {
        for (let px = 0; px < t; px++) {
          const v = edge[base + py * rect.w + px];
          if (v) words[(sy + py) * sheetW + sx + px] = colour[v];
        }
      }
    });
    const sheet = this.upload(words, sheetW, sheetH);
    shoreCells.forEach((base, k) => {
      const x = rect.x + (base % rect.w);
      const y = rect.y + Math.floor(base / rect.w);
      land.drawImage(sheet, (k % perRow) * t, Math.floor(k / perRow) * t, t, t, x, y, t, t);
    });
  }

  private bakeShadows(land: Ctx, model: SceneModel, phase: LightPhase, atlas: Img, rects: ReadonlyMap<string, AtlasRect>): void {
    const lean = SHADOW_LEAN[phase];
    const stamp = (box: Rect | null) => {
      if (box) land.drawImage(this.shadow(box.w, box.h), box.x, box.y);
    };
    const { scene } = model;
    for (const m of model.trees) {
      const t = m.tree;
      stamp({ x: t.left + MOUND_SHADOW.x + lean, y: t.top + MOUND_SHADOW.y, w: MOUND_SHADOW.w, h: MOUND_SHADOW.h });
      if (t.lantern) stamp(shadowBox("lantern", t.lantern.x, t.lantern.y, false, lean));
      if (t.key) stamp(shadowBox("key_flag", t.key.x, t.key.y, false, lean));
      if (t.visitor) stamp(shadowBox("visitor", t.visitor.x, t.visitor.y, false, lean));
    }
    stamp(shadowBox("well", scene.well.x, scene.well.y, false, lean));
    // The well (and the bunting over its row) back on top of their shadow.
    const well = rects.get("well");
    if (well) land.drawImage(atlas, well.x, well.y, well.w, well.h, scene.well.x, scene.well.y, well.w, well.h);
    const banner = scene.banner ? rects.get("banner") : undefined;
    if (banner && scene.banner) land.drawImage(atlas, banner.x, banner.y, banner.w, banner.h, scene.banner.x, scene.banner.y, banner.w, banner.h);
  }

  /** Lamplit ground: the land in a warm lamp's colours, through banded pools round each light. */
  private bakePools(land: Ctx, model: SceneModel, phase: LightPhase): void {
    const pools = this.lights.filter((l) => LIGHT_SIZE[l.kind].pool && l.gx != null && l.gy != null);
    if (pools.length === 0) return;
    const boxes = pools.map((l) => {
      const [rx, ry] = LIGHT_SIZE[l.kind].pool!;
      return { light: l, rx, ry, box: { x: l.gx! - rx, y: l.gy! - ry, w: 2 * rx, h: 2 * ry } };
    });
    let bbox = boxes[0].box;
    for (const b of boxes) bbox = union(bbox, b.box);
    bbox = {
      x: Math.max(0, bbox.x),
      y: Math.max(0, bbox.y),
      w: Math.min(model.scene.width, bbox.x + bbox.w) - Math.max(0, bbox.x),
      h: Math.min(model.scene.height, bbox.y + bbox.h) - Math.max(0, bbox.y),
    };
    if (bbox.w <= 0 || bbox.h <= 0) return;
    // The mask: per pixel, the strongest pool there.
    const alpha = new Float32Array(bbox.w * bbox.h);
    for (const { light, rx, ry, box } of boxes) {
      const strength = lightStrength(phase, light.kind);
      for (let y = Math.max(box.y, bbox.y); y < Math.min(box.y + box.h, bbox.y + bbox.h); y++) {
        for (let x = Math.max(box.x, bbox.x); x < Math.min(box.x + box.w, bbox.x + bbox.w); x++) {
          const a = bandAlpha((x + 0.5 - light.gx!) / rx, (y + 0.5 - light.gy!) / ry) * strength;
          const i = (y - bbox.y) * bbox.w + (x - bbox.x);
          if (a > alpha[i]) alpha[i] = a;
        }
      }
    }
    const words = new Uint32Array(alpha.length);
    for (let i = 0; i < alpha.length; i++) if (alpha[i] > 0) words[i] = word([255, 255, 255], alpha[i]);
    const mask = this.upload(words, bbox.w, bbox.h);
    const lamp = this.lampAtlas();
    const lit = this.kit.canvas(bbox.w, bbox.h);
    const ctx = this.kit.context(lit);
    ctx.setTransform(1, 0, 0, 1, -bbox.x, -bbox.y);
    paintLand(ctx as DrawContext<Img>, model, lamp.image, lamp.rects);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    land.drawImage(lit, bbox.x, bbox.y);
  }

  private lampAtlas(): { rects: ReadonlyMap<string, AtlasRect>; image: HTMLCanvasElement } {
    if (lampAtlas) return lampAtlas;
    const all: Record<string, string[]> = {};
    for (const name of GROUND_SPRITES) if (SPRITES[name]) all[name] = SPRITES[name];
    const data = buildAtlasData("day", all, [], (rgb) => lamplight(rgb));
    const image = this.kit.canvas(data.width, data.height);
    this.kit.context(image).putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
    lampAtlas = { rects: data.rects, image };
    return lampAtlas;
  }

  // ----------------------------------------------------------- sprites

  /** RGBA words to a canvas: once, while baking. */
  private upload(words: Uint32Array, w: number, h: number): HTMLCanvasElement {
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

  private halo(radius: number, strength: number): HTMLCanvasElement {
    const key = `${radius}|${strength}`;
    let c = this.halos.get(key);
    if (!c) {
      const size = radius * 2;
      const words = new Uint32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const a = bandAlpha((x + 0.5 - radius) / radius, (y + 0.5 - radius) / (radius * 0.8)) * HALO_PEAK * strength;
          if (a > 0) words[y * size + x] = word(HALO_RGB, a);
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

  /** An actor's shadow box relative to where it stands, cached by frame name and mirror. */
  private foot(name: string, flip: boolean, lean: number): Rect | null {
    const key = `${name}|${flip ? 1 : 0}|${lean}`;
    if (!this.feet.has(key)) this.feet.set(key, castsShadow(name) ? shadowBox(name, 0, 0, flip, lean) : null);
    return this.feet.get(key) ?? null;
  }

  // ----------------------------------------------------------- per frame

  /**
   * The hooks for one paint. `frozen`: still or too small to move (sea frame
   * 0 everywhere, nothing drifting, lights steady); `lowDetail` also drops
   * the glints, too small to read.
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
    // The figures' shadows for this frame, once (each repainted rect only checks which it meets).
    const shadows: Rect[] = [];
    actors.forEach((actor, i) => {
      const frame = motion.actors[i] ?? 0;
      const at = actorAt(actor, frame);
      const foot = this.foot(actor.frames[frame] ?? actor.frames[0], at.flip, lean);
      if (foot) shadows.push({ x: at.x + foot.x, y: at.y + foot.y, w: foot.w, h: foot.h });
    });
    return {
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
      beforeActors: (r) => {
        for (const box of shadows) if (overlaps(box, r)) ctx.drawImage(this.shadow(box.w, box.h), box.x, box.y);
      },
      last: (r) => {
        for (const d of breeze) {
          const a = layers.rects.get(d.name);
          if (!a || !overlaps({ x: d.x, y: d.y, w: a.w, h: a.h }, r)) continue;
          ctx.drawImage(layers.atlas, a.x, a.y, a.w, a.h, d.x, d.y, a.w, a.h);
        }
        if (this.lights.length === 0) return;
        const flicker = !frozen && this.flame >= 0 ? FIRE_FLICKER[motion.actors[this.flame] % FIRE_FLICKER.length] : 0;
        ctx.globalCompositeOperation = "lighter";
        for (const l of this.lights) {
          const base = LIGHT_SIZE[l.kind].halo;
          if (base <= 0) continue;
          const radius = l.kind === "fire" ? base + flicker : base;
          const box = { x: l.hx - radius, y: l.hy - radius, w: radius * 2, h: radius * 2 };
          if (!overlaps(box, r)) continue;
          ctx.drawImage(this.halo(radius, lightStrength(phase, l.kind)), box.x, box.y);
        }
        ctx.globalCompositeOperation = "source-over";
      },
    };
  }

  /**
   * What the atmosphere changes between two frames that redrawRect's own
   * dirty list does not know about: the drifting petals, and the fire's
   * flickering glow. (Glints and the sea's frames change only on the sea's
   * beat, when the whole view repaints anyway; shadows move inside their
   * actors' padded boxes.)
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
    const a = breezeAt(prev.tick, scene, opts.span, this.phase);
    const b = breezeAt(next.tick, scene, opts.span, this.phase);
    for (let k = 0; k < Math.min(a.length, b.length); k++) {
      const ra = layers.rects.get(a[k].name);
      const rb = layers.rects.get(b[k].name);
      if (!ra || !rb) continue;
      if (a[k].x === b[k].x && a[k].y === b[k].y && a[k].name === b[k].name) continue;
      out.push(union({ x: a[k].x, y: a[k].y, w: ra.w, h: ra.h }, { x: b[k].x, y: b[k].y, w: rb.w, h: rb.h }));
    }
    if (this.flame >= 0 && prev.actors[this.flame] !== next.actors[this.flame]) {
      for (const l of this.lights) {
        if (l.kind !== "fire") continue;
        const radius = LIGHT_SIZE.fire.halo + Math.max(...FIRE_FLICKER);
        out.push({ x: l.hx - radius, y: l.hy - radius, w: radius * 2, h: radius * 2 });
      }
    }
    return out;
  }
}

/** A gull's shadow on the water: a small soft dash well below it. */
function gullShadow(g: { x: number; y: number }): Rect {
  return { x: Math.round(g.x) + 1, y: Math.round(g.y) + 12, w: 6, h: 2 };
}

/** RGBA as a little-endian word (as the atlas stores it), alpha 0..1. */
function word(rgb: RGB, a: number): number {
  const alpha = Math.round(Math.min(1, Math.max(0, a)) * 255);
  return ((alpha << 24) | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]) >>> 0;
}

