/**
 * The living island's atmosphere (web only, browser only): warm pools of
 * light, contact shadows, campfire smoke, fireflies and glints on the sea,
 * painted by the engine over each rectangle it repaints, inside that
 * rectangle's clip.
 *
 * Cheap like the engine: every sprite (pools, shadows, the firefly) is made
 * once per phase with putImageData; a frame only draws small sprites and a
 * few 1 px rectangles. The pools use colour-dodge on their own few hundred
 * pixels, never on the whole canvas; no filters, shadows or getImageData.
 * The bot's PNG and GIF never come here.
 */
import { glintFrame, glintsIn, firefliesAt, fireflyAnchors, flyRect, smokeAt, smokeBounds, smokeOrigin, smokeStep, FLY_SIZE, GLINTS, SMOKE_RGB, type Firefly } from "./ambience";
import type { AtlasRect } from "./atlas";
import type { Motion } from "./clock";
import { actorRect, type SceneModel } from "./draw";
import { overlaps, union, type Rect } from "./geometry";
import { boatLight, flickerVariant, haloBox, haloSprite, lightSources, poolBounds, poolBox, poolSprite, type LightKind, type LightSource } from "./glow";
import { actorShadow, lampShadow, propShadows, shadowSprite, treeShadow } from "./shadows";
import { coastDistance, shallowsPixels } from "./shallows";
import type { LightPhase, LiveActor } from "./types";

type Ctx = CanvasRenderingContext2D;

/** What the atmosphere shows at one tick. */
export interface FxFrame {
  /** Per light source, its flicker variant. */
  variants: Uint8Array;
  /** The smoke's step, or null for no smoke. */
  smoke: number | null;
  flies: Firefly[];
  glint: number;
  /** The boat's lamp at night, where the boat is now. */
  boat: LightSource | null;
}

const sameLight = (a: LightSource | null, b: LightSource | null) => (a && b ? a.x === b.x && a.y === b.y && a.hx === b.hx : a === b);

const rgba = (rgb: readonly number[], a = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

/** The flicker variants a light can show (flickerVariant): the fire all three, a lantern two, the rest one. */
function variantsOf(source: LightSource): number[] {
  if (!source.flicker) return [1];
  return "actor" in source.flicker ? [0, 1, 2] : [1, 2];
}

/**
 * Sprites shared by every island on the page (the viewport and the story
 * panels), keyed by phase: made once with putImageData, never drawn into
 * afterwards. A few hundred tiny canvases at most.
 */
const sharedSprites = new Map<string, HTMLCanvasElement | null>();

export class IslandFx {
  private phase: LightPhase = "day";
  private model: SceneModel | null = null;
  private sources: LightSource[] = [];
  private smokeFrom: { x: number; y: number } | null = null;
  private anchors: { x: number; y: number }[] = [];
  /** The coast's distance field, once per scene. */
  private coast: { model: SceneModel; distance: Uint8Array } | null = null;
  /** A scene-size canvas for the shallows, reused on each bake. */
  private shallowsCanvas: HTMLCanvasElement | null = null;

  constructor(private readonly make: (w: number, h: number) => HTMLCanvasElement) {}

  /** The scene, its plaza and the light: rebuilt on a scene, actor or phase change (never per frame). */
  set(model: SceneModel, actors: readonly LiveActor[], phase: LightPhase): void {
    this.phase = phase;
    this.model = model;
    this.sources = lightSources(model, actors, phase);
    this.smokeFrom = smokeOrigin(actors);
    this.anchors = phase === "night" ? fireflyAnchors(model) : [];
    // Every pool and halo the lights can show, now, so the loop never makes a sprite.
    for (const s of this.sources) {
      for (const variant of variantsOf(s)) {
        this.pool(s.kind, variant);
        this.halo(s.kind, variant);
      }
    }
    if (phase === "night") {
      this.pool("boat", 1);
      this.halo("boat", 1);
    }
  }

  /** The atmosphere at a tick; frozen (still, reduced motion, a tiny whole island) shows no smoke or fireflies and steady light. */
  frame(tick: number, motion: Motion, frozen: boolean): FxFrame {
    const variants = new Uint8Array(this.sources.length);
    this.sources.forEach((s, i) => (variants[i] = flickerVariant(s, motion.actors, motion.glow, frozen)));
    return {
      variants,
      smoke: !frozen && this.smokeFrom ? smokeStep(tick) : null,
      flies: frozen ? [] : firefliesAt(tick, this.anchors),
      glint: frozen ? 0 : glintFrame(tick),
      boat: boatLight(motion.boat, this.phase),
    };
  }

  /** What changed between two frames; "all" when the glints moved (the sea stepped, so the view repaints anyway). */
  dirty(prev: FxFrame | null, next: FxFrame): Rect[] | "all" {
    if (!prev || prev.glint !== next.glint || prev.variants.length !== next.variants.length) return "all";
    const out: Rect[] = [];
    this.sources.forEach((s, i) => {
      if (prev.variants[i] !== next.variants[i]) out.push(poolBounds(s));
    });
    if (prev.smoke !== next.smoke && this.smokeFrom) out.push(smokeBounds(this.smokeFrom));
    if (!sameLight(prev.boat, next.boat)) for (const b of [prev.boat, next.boat]) if (b) out.push(poolBounds(b));
    for (let i = 0; i < Math.max(prev.flies.length, next.flies.length); i++) {
      const a = prev.flies[i];
      const b = next.flies[i];
      if (a && b && a.x === b.x && a.y === b.y && a.level === b.level) continue;
      if (a && b) out.push(union(flyRect(a), flyRect(b)));
      else if (a || b) out.push(flyRect((a ?? b)!));
    }
    return out;
  }

  /** Bakes the land layer's shadows: trees, the well, the bunting's posts and the night lamps. Re-blits the well and bunting over theirs. */
  bakeLand(land: Ctx, model: SceneModel, atlas: CanvasImageSource, rects: ReadonlyMap<string, AtlasRect>): void {
    const { scene } = model;
    // The shallows first: the land layer is clear over the sea, so they land on the water only.
    if (this.coast?.model !== model) this.coast = { model, distance: coastDistance(model) };
    const pixels = shallowsPixels(this.coast.distance, scene.width, scene.height, this.phase);
    const shallows = this.shallowsCanvas ?? this.make(scene.width, scene.height);
    if (shallows.width !== scene.width) shallows.width = scene.width;
    if (shallows.height !== scene.height) shallows.height = scene.height;
    this.shallowsCanvas = shallows;
    shallows.getContext("2d")?.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, scene.width, scene.height), 0, 0);
    land.drawImage(shallows, 0, 0, scene.width, scene.height, 0, 0, scene.width, scene.height);
    const ovals: Rect[] = [...model.trees.map((m) => treeShadow(m.tree, this.phase)), ...propShadows(scene, this.phase)];
    if (this.phase === "night") ovals.push(...model.lamps.map(lampShadow));
    for (const r of ovals) this.oval(land, r);
    const reblit = (name: string, at: { x: number; y: number } | null) => {
      const a = rects.get(name);
      if (a && at) land.drawImage(atlas, a.x, a.y, a.w, a.h, at.x, at.y, a.w, a.h);
    };
    reblit("well", scene.well);
    reblit("banner", scene.banner);
  }

  /** The ovals under the plaza's people and props at a frame: worked out once per paint, drawn per rectangle. */
  actorOvals(actors: readonly LiveActor[], motion: Motion, rects: ReadonlyMap<string, AtlasRect>): Rect[] {
    const out: Rect[] = [];
    actors.forEach((actor, i) => {
      const frame = motion.actors[i] ?? 0;
      const rect = actorRect(actor, frame, rects);
      const oval = rect ? actorShadow(actor, actor.frames[frame] ?? actor.frames[0], rect, this.phase) : null;
      if (oval) out.push(oval);
    });
    return out;
  }

  /** The plaza's people and props: an oval under each, before any of them is drawn. */
  underActors(ctx: Ctx, r: Rect, ovals: readonly Rect[]): void {
    for (const oval of ovals) if (overlaps(oval, r)) this.oval(ctx, oval);
  }

  /** Glints, smoke, light pools and fireflies over rect r of a finished frame. */
  paint(ctx: Ctx, r: Rect, f: FxFrame, boat: Rect | null): void {
    const model = this.model;
    if (!model) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    const look = GLINTS[this.phase];
    ctx.fillStyle = rgba(look.rgb, look.alpha);
    for (const g of glintsIn(r, model, this.phase, f.glint)) {
      if (boat && overlaps({ x: g.x, y: g.y, w: g.w, h: 1 }, boat)) continue;
      ctx.fillRect(g.x, g.y, g.w, 1);
    }

    if (f.smoke != null && this.smokeFrom && overlaps(smokeBounds(this.smokeFrom), r)) {
      ctx.fillStyle = rgba(SMOKE_RGB[this.phase]);
      for (const p of smokeAt(f.smoke, this.smokeFrom)) {
        ctx.globalAlpha = p.alpha;
        if (p.w < 3) ctx.fillRect(p.x, p.y, p.w, p.h);
        else {
          ctx.fillRect(p.x + 1, p.y, p.w - 2, p.h);
          ctx.fillRect(p.x, p.y + 1, p.w, Math.max(1, p.h - 2));
        }
      }
      ctx.globalAlpha = 1;
    }

    const lights: [LightSource, number][] = this.sources.map((s, i) => [s, f.variants[i] ?? 1]);
    if (f.boat) lights.push([f.boat, 1]);
    if (lights.length) {
      // Pools first (they relight everything under them), then the halos round the lights themselves.
      ctx.globalCompositeOperation = "color-dodge";
      for (const [s, variant] of lights) {
        const box = poolBox(s, variant);
        if (overlaps(box, r)) ctx.drawImage(this.pool(s.kind, variant), 0, 0, box.w, box.h, box.x, box.y, box.w, box.h);
      }
      ctx.globalCompositeOperation = "lighter";
      for (const [s, variant] of lights) {
        const box = haloBox(s);
        if (box.w <= 0 || !overlaps(box, r)) continue;
        const halo = this.halo(s.kind, variant);
        if (halo) ctx.drawImage(halo, 0, 0, box.w, box.h, box.x, box.y, box.w, box.h);
      }
    }

    if (f.flies.length) {
      ctx.globalCompositeOperation = "lighter";
      for (const fly of f.flies) {
        if (fly.level <= 0) continue;
        const box = flyRect(fly);
        if (overlaps(box, r)) ctx.drawImage(this.fly(fly.level), 0, 0, FLY_SIZE, FLY_SIZE, box.x, box.y, FLY_SIZE, FLY_SIZE);
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ------------------------------------------------------------- sprites (made once per phase)

  private sprite(w: number, h: number, data: Uint8ClampedArray): HTMLCanvasElement {
    const c = this.make(w, h);
    const ctx = c.getContext("2d");
    if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
    return c;
  }

  /** A shared sprite by key, made on first use from its pixels (null pixels: none). */
  private shared(key: string, pixels: () => { w: number; h: number; data: Uint8ClampedArray } | null): HTMLCanvasElement | null {
    if (!sharedSprites.has(key)) {
      const p = pixels();
      sharedSprites.set(key, p ? this.sprite(p.w, p.h, p.data) : null);
    }
    return sharedSprites.get(key) ?? null;
  }

  private pool(kind: LightKind, variant: number): HTMLCanvasElement {
    return this.shared(`pool:${this.phase}:${kind}:${variant}`, () => poolSprite(kind, this.phase, variant))!;
  }

  private halo(kind: LightKind, variant: number): HTMLCanvasElement | null {
    return this.shared(`halo:${this.phase}:${kind}:${variant}`, () => haloSprite(kind, this.phase, variant));
  }

  private oval(ctx: Ctx, r: Rect): void {
    if (r.w <= 0 || r.h <= 0) return;
    const c = this.shared(`oval:${this.phase}:${r.w}x${r.h}`, () => ({ w: r.w, h: r.h, data: shadowSprite(r.w, r.h, this.phase) }));
    if (c) ctx.drawImage(c, 0, 0, r.w, r.h, r.x, r.y, r.w, r.h);
  }

  /** A firefly at brightness 1..3: a bright core and four dim neighbours, added to the frame. */
  private fly(level: number): HTMLCanvasElement {
    const l = Math.min(3, Math.max(1, level));
    return this.shared(`fly:${l}`, () => {
      const k = l / 3;
      const data = new Uint8ClampedArray(FLY_SIZE * FLY_SIZE * 4);
      const put = (i: number, rgb: readonly number[]) => {
        data.set([Math.round(rgb[0] * k), Math.round(rgb[1] * k), Math.round(rgb[2] * k), 255], i * 4);
      };
      put(4, [214, 236, 120]);
      for (const i of [1, 3, 5, 7]) put(i, [70, 84, 30]);
      return { w: FLY_SIZE, h: FLY_SIZE, data };
    })!;
  }
}
