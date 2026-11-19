/**
 * Draws the living island into a 2D context, one rectangle at a time, in the
 * PNG's own order with the motion layers slotted in:
 *
 *   sea and shore cells (animated frames) -> land layer (one blit) -> boat ->
 *   trees with roots, key, visitor, night glow and lantern -> night lamp posts ->
 *   festival festoon -> cloud shadows -> tags and pin (one blit, untinted) ->
 *   story actors -> gulls
 *
 * Every call is clipped to its rectangle and repaints all of it, so any part
 * can be redrawn alone. Integer coordinates only, smoothing off. No
 * getImageData, filters or shadows. Works with any context that has these few
 * methods (a canvas in the browser, a pixel buffer in tests).
 */
import { SHORE_FRAMES, SWAY_FRAMES, WATER_FRAMES } from "@/bot/assets/island/motion-sprites";
import { DIGITS, TILE_BY_CODE, openWaterTile, type IslandScene, type ScenePoint, type SceneTree } from "@/bot/src/quests/island/scene";

import { treeSpriteKey, type AtlasRect } from "./atlas";
import type { Motion, Mover } from "./clock";
import { cellSpan, intersect, overlaps, union, type Rect } from "./geometry";
import type { LiveActor } from "./types";

/** The few context members the island uses. CanvasRenderingContext2D fits it. */
export interface DrawContext<Img> {
  imageSmoothingEnabled: boolean;
  globalAlpha: number;
  fillStyle: unknown;
  save(): void;
  restore(): void;
  beginPath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  clip(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: Img, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
}

/** Sea cell kinds, in the order of SceneModel.sea. Water kinds first. */
const SEA_KINDS = ["water_a", "water_b", "shore_n", "shore_s", "shore_e", "shore_w"] as const;
const WATER_KINDS = 2;

/** The sea kind of any cell: the island's own tile inside it, open water (water_a or water_b) outside. */
function seaKindAt(model: SceneModel, col: number, row: number): number {
  const { scene, sea } = model;
  if (col >= 0 && col < scene.cols && row >= 0 && row < scene.rows) return sea[row * scene.cols + col];
  return openWaterTile(scene, col, row) === "water_b" ? 1 : 0;
}

/** The frame sprite names for a sea kind: [frame 0, 1, 2]. */
function seaFrames(kind: (typeof SEA_KINDS)[number]): readonly string[] {
  return kind === "water_a" || kind === "water_b" ? WATER_FRAMES[kind] : SHORE_FRAMES[kind];
}

/** Lamp post and lantern glow sizes. */
const LAMP = { w: 6, h: 16 } as const;
const GLOW = { w: 16, h: 16 } as const;
const CLOUD_ALPHA = 0.14;
const TAG_FILL = `rgba(24,28,38,${230 / 255})`;

export interface TreeModel {
  tree: SceneTree;
  /** Sway frame B, or null for stages that do not sway. */
  b: string | null;
  /** The tree sprite. */
  rect: Rect;
  /** Where its lantern's night glow goes. */
  glow: Rect | null;
  /** Everything the tree and its decorations can touch. */
  bounds: Rect;
}

/** A scene prepared for drawing: built once per scene. */
export interface SceneModel {
  scene: IslandScene;
  /** The whole scene. */
  bounds: Rect;
  /** Per cell: -1 for land, else an index into SEA_KINDS. */
  sea: Int8Array;
  trees: TreeModel[];
  /** Night lamp posts at the plaza corners. */
  lamps: ScenePoint[];
  /** String lights over the bunting on festival nights. */
  festoon: ScenePoint | null;
}

/** The plaza's rectangle in pixels, from its tiles. */
function plazaRect(scene: IslandScene): Rect | null {
  let c0 = Infinity;
  let r0 = Infinity;
  let c1 = -1;
  let r1 = -1;
  for (let k = 0; k < scene.tiles.length; k++) {
    if (scene.tiles[k] !== "p") continue;
    const c = k % scene.cols;
    const r = Math.floor(k / scene.cols);
    c0 = Math.min(c0, c);
    r0 = Math.min(r0, r);
    c1 = Math.max(c1, c);
    r1 = Math.max(r1, r);
  }
  if (c1 < 0) return null;
  return { x: c0 * scene.tile, y: r0 * scene.tile, w: (c1 - c0 + 1) * scene.tile, h: (r1 - r0 + 1) * scene.tile };
}

export function sceneModel(scene: IslandScene): SceneModel {
  const kinds = new Map<string, number>(SEA_KINDS.map((name, k) => [name, k]));
  const sea = new Int8Array(scene.cols * scene.rows).fill(-1);
  for (let k = 0; k < sea.length; k++) sea[k] = kinds.get(TILE_BY_CODE[scene.tiles[k]]) ?? -1;
  const trees = scene.trees.map((tree): TreeModel => {
    const rect = { x: tree.left, y: tree.top, w: tree.w, h: tree.h };
    const glow = tree.lantern ? { x: tree.lantern.x - 4, y: tree.lantern.y - 1, w: GLOW.w, h: GLOW.h } : null;
    let bounds = rect;
    if (tree.key) bounds = union(bounds, { x: tree.key.x, y: tree.key.y, w: 10, h: 16 });
    if (tree.visitor) bounds = union(bounds, { x: tree.visitor.x, y: tree.visitor.y, w: 10, h: 14 });
    if (tree.lantern) bounds = union(bounds, { x: tree.lantern.x, y: tree.lantern.y, w: 8, h: 14 });
    if (glow) bounds = union(bounds, glow);
    return { tree, b: SWAY_FRAMES[tree.sprite] ?? null, rect, glow, bounds };
  });
  const plaza = plazaRect(scene);
  const lamps = plaza
    ? [
        { x: plaza.x + 2, y: plaza.y - 10 },
        { x: plaza.x + plaza.w - 2 - LAMP.w, y: plaza.y - 10 },
        { x: plaza.x + 2, y: plaza.y + plaza.h - 1 - LAMP.h },
        { x: plaza.x + plaza.w - 2 - LAMP.w, y: plaza.y + plaza.h - 1 - LAMP.h },
      ]
    : [];
  return {
    scene,
    bounds: { x: 0, y: 0, w: scene.width, h: scene.height },
    sea,
    trees,
    lamps,
    festoon: scene.banner ? { x: scene.banner.x, y: scene.banner.y } : null,
  };
}

/** Lamp post rectangles (for dirty checks). */
export function lampRects(model: SceneModel): Rect[] {
  return model.lamps.map((p) => ({ x: p.x, y: p.y, w: LAMP.w, h: LAMP.h }));
}

/** An atlas uploaded to an image, with the land and overlay layers for one scene and phase. */
export interface Layers<Img> {
  atlas: Img;
  rects: ReadonlyMap<string, AtlasRect>;
  flipped: ReadonlyMap<string, AtlasRect>;
  /** [kind][frame] atlas rects of the sea cells. */
  seaRects: (AtlasRect | undefined)[][];
  /** Land, paths, well and bunting at scene size, transparent over the sea and shore. */
  land: Img;
  /** Tags and the pin at scene size, untinted, transparent elsewhere. */
  overlay: Img;
}

export function seaRectsFor(rects: ReadonlyMap<string, AtlasRect>): (AtlasRect | undefined)[][] {
  return SEA_KINDS.map((kind) => seaFrames(kind).map((name) => rects.get(name)));
}

function blit<Img>(ctx: DrawContext<Img>, atlas: Img, a: AtlasRect | undefined, x: number, y: number, scale = 1): void {
  if (!a) return;
  ctx.drawImage(atlas, a.x, a.y, a.w, a.h, Math.round(x), Math.round(y), a.w * scale, a.h * scale);
}

/**
 * Paints the land layer: every land tile, then helper paths, the well and the
 * bunting, as the PNG does. `within` (web only) paints just the cells that
 * meet that rect, for a small lit copy of the ground; the bot never passes it.
 */
export function paintLand<Img>(ctx: DrawContext<Img>, model: SceneModel, atlas: Img, rects: ReadonlyMap<string, AtlasRect>, within?: Rect): void {
  const { scene, sea } = model;
  const t = scene.tile;
  ctx.imageSmoothingEnabled = false;
  const span = within ? cellSpan(within, t) : { c0: 0, r0: 0, c1: scene.cols, r1: scene.rows };
  const c0 = Math.max(0, span.c0);
  const c1 = Math.min(scene.cols, span.c1);
  for (let row = Math.max(0, span.r0); row < Math.min(scene.rows, span.r1); row++) {
    for (let col = c0; col < c1; col++) {
      const k = row * scene.cols + col;
      if (sea[k] >= 0) continue;
      blit(ctx, atlas, rects.get(TILE_BY_CODE[scene.tiles[k]]), col * t, row * t);
    }
  }
  // A path over a shore cell lands here too, above the animated foam.
  for (const cell of scene.paths) {
    const x = (cell % scene.cols) * t;
    const y = Math.floor(cell / scene.cols) * t;
    if (!within || overlaps({ x, y, w: t, h: t }, within)) blit(ctx, atlas, rects.get("path"), x, y);
  }
  blit(ctx, atlas, rects.get("well"), scene.well.x, scene.well.y);
  if (scene.banner) blit(ctx, atlas, rects.get("banner"), scene.banner.x, scene.banner.y);
}

/** A tag's box and digit colours; the PNG's own by default. */
export interface TagInk {
  fill: string;
  digit: string;
}

const PNG_INK: TagInk = { fill: TAG_FILL, digit: "#ffffff" };

/**
 * Paints the tags (dark box, white pixel digits) and the caller's pin, as the
 * PNG does. `ink` recolours the tags (the web's light of the hour); the bot
 * never passes it.
 */
export function paintOverlay<Img>(
  ctx: DrawContext<Img>,
  model: SceneModel,
  atlas: Img,
  rects: ReadonlyMap<string, AtlasRect>,
  ink: TagInk = PNG_INK
): void {
  const { scene } = model;
  const g = scene.glyph;
  ctx.imageSmoothingEnabled = false;
  for (const tag of scene.tags) {
    ctx.fillStyle = ink.fill;
    ctx.fillRect(tag.x, tag.y, tag.w, tag.h);
    ctx.fillStyle = ink.digit;
    [...String(tag.slot)].forEach((d, k) => {
      const bits = DIGITS[Number(d)];
      for (let j = 0; j < 5; j++) {
        for (let i = 0; i < 3; i++) if (bits[j * 3 + i] === "1") ctx.fillRect(tag.x + (2 + k * 4 + i) * g, tag.y + (2 + j) * g, g, g);
      }
    });
  }
  if (scene.marker) blit(ctx, atlas, rects.get("marker"), scene.marker.x, scene.marker.y, scene.marker.scale);
}

/**
 * The web's extra layers (water light, contact shadows, light pools, the
 * breeze), slotted into redrawRect's order. Each is called inside the rect's
 * clip, with the same rect. The bot's GIF and the parity tests pass none, so
 * their pixels never change.
 */
export interface DrawFx {
  /** A sea cell's frame (0..2) instead of the island-wide one: ripples that roll instead of pulsing. */
  seaFrame?: (col: number, row: number, kind: number) => number;
  /** Over the sea and foam, under the land layer. */
  afterSea?: (r: Rect) => void;
  /** Over the land layer, under everything that stands on it (light that moves on the ground). */
  afterLand?: (r: Rect) => void;
  /** Over the trees, lamps and clouds, under the tags and the plaza's actors (the glow round a light). */
  beforeTags?: (r: Rect) => void;
  /** Under the plaza's actors, over everything before them. */
  beforeActors?: (r: Rect) => void;
  /** Just after actor `index` is drawn at (x, y) with sprite `name`, before the next one (light on that actor alone). */
  afterActor?: (index: number, name: string, x: number, y: number, flip: boolean) => void;
  /** Over everything. */
  last?: (r: Rect) => void;
}

/** What the frame shows, besides the scene. */
export interface DrawState {
  motion: Motion;
  night: boolean;
  actors: readonly LiveActor[];
  fx?: DrawFx;
}

/** A moving sprite's rectangle, from its atlas size. */
export function moverRect(m: Mover, rects: ReadonlyMap<string, AtlasRect>): Rect | null {
  const a = rects.get(m.name);
  return a ? { x: Math.round(m.x), y: Math.round(m.y), w: a.w, h: a.h } : null;
}

/** Where an actor stands on a frame: its x and y plus that frame's step, and whether that frame is mirrored. */
export function actorAt(actor: LiveActor, frame: number): { x: number; y: number; flip: boolean } {
  const step = actor.steps?.[frame];
  if (!step) return { x: Math.round(actor.x), y: Math.round(actor.y), flip: actor.flip === true };
  return { x: Math.round(actor.x + step.dx), y: Math.round(actor.y + step.dy), flip: step.flip ?? actor.flip === true };
}

/** An actor's rectangle at its current frame (a walker's moves with its step). */
export function actorRect(actor: LiveActor, frame: number, rects: ReadonlyMap<string, AtlasRect>): Rect | null {
  const a = rects.get(actor.frames[frame] ?? actor.frames[0]);
  if (!a) return null;
  const at = actorAt(actor, frame);
  return { x: at.x, y: at.y, w: a.w, h: a.h };
}

function drawMover<Img>(ctx: DrawContext<Img>, layers: Layers<Img>, m: Mover, r: Rect): void {
  const rect = moverRect(m, layers.rects);
  if (!rect || !overlaps(rect, r)) return;
  blit(ctx, layers.atlas, (m.flip ? layers.flipped : layers.rects).get(m.name), m.x, m.y);
}

/**
 * Repaints rectangle r (scene pixels) completely, clipped to it. r may reach
 * past the scene: there the open sea goes on, with the same animated frames
 * and no shore.
 */
export function redrawRect<Img>(ctx: DrawContext<Img>, r: Rect, model: SceneModel, layers: Layers<Img>, state: DrawState): void {
  const { scene } = model;
  const { motion, night, fx } = state;
  const { atlas, rects } = layers;
  const t = scene.tile;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();

  // Sea and shore cells, then the land layer over them (only where the scene is).
  const cells = cellSpan(r, t);
  const cellFrame = fx?.seaFrame;
  for (let row = cells.r0; row < cells.r1; row++) {
    for (let col = cells.c0; col < cells.c1; col++) {
      const kind = seaKindAt(model, col, row);
      if (kind < 0) continue;
      const frame = cellFrame ? cellFrame(col, row, kind) : kind < WATER_KINDS ? motion.sea : motion.foam;
      blit(ctx, atlas, layers.seaRects[kind][frame], col * t, row * t);
    }
  }
  fx?.afterSea?.(r);
  const inScene = intersect(r, model.bounds);
  if (inScene) ctx.drawImage(layers.land, inScene.x, inScene.y, inScene.w, inScene.h, inScene.x, inScene.y, inScene.w, inScene.h);
  fx?.afterLand?.(r);

  if (motion.boat) drawMover(ctx, layers, motion.boat, r);

  model.trees.forEach((m, i) => {
    if (!overlaps(m.bounds, r)) return;
    const { tree } = m;
    blit(ctx, atlas, rects.get(treeSpriteKey(motion.sway[i] && m.b ? m.b : tree.sprite, tree.style)), tree.left, tree.top);
    // Roots sit on the soil, inside the tree's rect: a sway repaint redraws them too.
    if (tree.roots) blit(ctx, atlas, rects.get(tree.roots.sprite), tree.roots.x, tree.roots.y);
    if (tree.key) blit(ctx, atlas, rects.get("key_flag"), tree.key.x, tree.key.y);
    if (tree.visitor) blit(ctx, atlas, rects.get("visitor"), tree.visitor.x, tree.visitor.y);
    // Only an earned lantern glows, and only at night: behind the lantern, over the tree.
    if (night && m.glow) blit(ctx, atlas, rects.get(motion.glow[i] ? "lantern_glow_1" : "lantern_glow_0"), m.glow.x, m.glow.y);
    if (tree.lantern) blit(ctx, atlas, rects.get("lantern"), tree.lantern.x, tree.lantern.y);
  });

  if (night) {
    for (const p of model.lamps) blit(ctx, atlas, rects.get("lamp_post"), p.x, p.y);
    if (model.festoon) blit(ctx, atlas, rects.get("festoon"), model.festoon.x, model.festoon.y);
  }

  if (motion.clouds.length) {
    ctx.globalAlpha = CLOUD_ALPHA;
    for (const c of motion.clouds) drawMover(ctx, layers, c, r);
    ctx.globalAlpha = 1;
  }

  fx?.beforeTags?.(r);
  if (inScene) ctx.drawImage(layers.overlay, inScene.x, inScene.y, inScene.w, inScene.h, inScene.x, inScene.y, inScene.w, inScene.h);

  fx?.beforeActors?.(r);
  const afterActor = fx?.afterActor;
  state.actors.forEach((actor, i) => {
    const frame = motion.actors[i] ?? 0;
    const rect = actorRect(actor, frame, rects);
    if (!rect || !overlaps(rect, r)) return;
    const name = actor.frames[frame] ?? actor.frames[0];
    const flip = actorAt(actor, frame).flip;
    blit(ctx, atlas, (flip ? layers.flipped : rects).get(name), rect.x, rect.y);
    afterActor?.(i, name, rect.x, rect.y, flip);
  });

  for (const g of motion.gulls) drawMover(ctx, layers, g, r);
  fx?.last?.(r);
  ctx.restore();
}

/**
 * The rectangles that differ between two motions (prev null: everything).
 * Returns "all" when the sea or foam frame changed: the whole view repaints.
 */
export function dirtyRects(
  prev: Motion | null,
  next: Motion,
  model: SceneModel,
  rects: ReadonlyMap<string, AtlasRect>,
  actors: readonly LiveActor[]
): Rect[] | "all" {
  if (!prev || prev.sea !== next.sea || prev.foam !== next.foam) return "all";
  const out: Rect[] = [];
  const moved = (a: Mover | null | undefined, b: Mover | null | undefined) => {
    if (a && b && a.name === b.name && a.x === b.x && a.y === b.y && a.flip === b.flip) return;
    const ra = a ? moverRect(a, rects) : null;
    const rb = b ? moverRect(b, rects) : null;
    if (ra && rb) out.push(union(ra, rb));
    else if (ra || rb) out.push((ra ?? rb)!);
  };
  moved(prev.boat, next.boat);
  for (let i = 0; i < Math.max(prev.gulls.length, next.gulls.length); i++) moved(prev.gulls[i], next.gulls[i]);
  for (let i = 0; i < Math.max(prev.clouds.length, next.clouds.length); i++) moved(prev.clouds[i], next.clouds[i]);
  model.trees.forEach((m, i) => {
    if (prev.sway[i] !== next.sway[i]) out.push(m.rect);
    if (m.glow && prev.glow[i] !== next.glow[i]) out.push(m.glow);
  });
  actors.forEach((actor, i) => {
    if (prev.actors[i] === next.actors[i]) return;
    const a = actorRect(actor, prev.actors[i] ?? 0, rects);
    const b = actorRect(actor, next.actors[i] ?? 0, rects);
    if (a && b) out.push(union(a, b));
  });
  return out;
}
