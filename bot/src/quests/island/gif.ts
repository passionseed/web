/**
 * The island as a looping GIF: the same scene the PNG shows (buildScene), drawn
 * with the website's living-island code (lib/shift-island/live) on a software
 * canvas, so the sea, the foam, the trees and the lanterns move the way they do
 * on the web. Used by the live post and the /start door card.
 *
 * One seamless 6 second loop (48 ticks of 125 ms): sea frames repeat every 12
 * ticks, foam every 16, lantern glow every 12 and the moored boat's bob every
 * 8, so all of them meet again at tick 48. Trees catch one gust per loop. The
 * boat stays moored where the PNG draws it, and there are no gulls or cloud
 * shadows: things that cross the island cannot loop in 6 seconds.
 *
 * A frame is written only when something changed, with the time until the next
 * change as its delay (about 24 to 32 frames), and after the first only its
 * changed pixels are encoded. Colours: the island's palette, tinted for the
 * light phase, plus the few blends of the lantern glow; when that is ever more
 * than 255, the frames are quantized instead.
 *
 * Pure and deterministic: the same plots, options and phase give the same bytes.
 */
import { GIFEncoder, applyPalette, quantize, type Palette } from "gifenc";

import { buildAtlasData } from "@/lib/shift-island/live/atlas";
import { TICK_MS, actorFrame, foamFrame, glowFrame, seaFrame, swayDelay, type Motion } from "@/lib/shift-island/live/clock";
import { paintLand, paintOverlay, redrawRect, sceneModel, seaRectsFor, type Layers, type SceneModel } from "@/lib/shift-island/live/draw";
import { PixelContext, PixelImage } from "@/lib/shift-island/live/pixelCanvas";
import type { Rect } from "@/lib/shift-island/live/geometry";
import type { LightPhase, LiveActor } from "@/lib/shift-island/live/types";

import { MAX_WIDTH, RenderError, buildScene, type IslandPlot, type IslandScene } from "./scene";

/** Ticks in one loop: 6 seconds. */
export const LOOP_TICKS = 48;

/** The one gust per loop: when it reaches the leftmost tree, how long it lasts, and how fast trees flip. */
const GUST = { at: 1500, length: 1600, flip: 400 } as const;

/** The moored boat bobs between its two frames every 4 ticks, like the sailing one on the web. */
const BOAT_FRAMES = ["boat", "boat_1"] as const;

export interface GifOptions {
  /** Largest integer upscale to use (default 2); big islands drop to 1 to stay under the width cap. */
  scale?: number;
  /** Festival bunting over the plaza while a season runs. */
  festival?: boolean;
  /** Draw a pin over the caller's plot. */
  markMine?: boolean;
  /** Light over the island (default day). */
  phase?: LightPhase;
}

export interface SceneGifOptions {
  /** Largest integer upscale to use (default 2). */
  scale?: number;
  /** The widest the GIF may be, in pixels (default the island's width cap). The scale drops to fit. */
  maxWidth?: number;
  phase?: LightPhase;
  /** People drawn above the trees (the story's builder and tester), with their idle frames. */
  actors?: readonly LiveActor[];
  /** The part of the scene to show, in native pixels (default all of it). */
  view?: Rect;
}

export interface RenderedGif {
  gif: Buffer;
  width: number;
  height: number;
  /** The upscale actually used. */
  scale: number;
  /** Frames written (consecutive identical ticks share one). */
  frames: number;
}

/** True while a tree shows its sway frame B: one gust per loop, trees further right a little later. */
export function loopSway(ms: number, delay: number): boolean {
  const local = ms - delay - GUST.at;
  return local >= 0 && local < GUST.length && Math.floor(local / GUST.flip) % 2 === 0;
}

/** Everything that moves, at one tick of the loop. */
export function loopMotion(tick: number, scene: IslandScene, swaying: readonly boolean[], night: boolean, people: readonly LiveActor[] = []): Motion {
  const t = ((tick % LOOP_TICKS) + LOOP_TICKS) % LOOP_TICKS;
  const ms = t * TICK_MS;
  const sway = new Uint8Array(scene.trees.length);
  const glow = new Uint8Array(scene.trees.length);
  scene.trees.forEach((tree, i) => {
    if (swaying[i] && loopSway(ms, swayDelay(tree.left, scene.width))) sway[i] = 1;
    if (night && tree.lantern) glow[i] = glowFrame(t, tree.slot);
  });
  return {
    sea: seaFrame(t),
    foam: foamFrame(t),
    boat: { name: BOAT_FRAMES[Math.floor(t / 4) % 2], x: scene.boatStill.x, y: scene.boatStill.y, flip: false },
    gulls: [],
    clouds: [],
    sway,
    glow,
    actors: Uint8Array.from(people, (a) => actorFrame(t, a)),
  };
}

/** What a frame shows, as a string: equal keys draw equal pixels. */
function motionKey(m: Motion): string {
  return `${m.sea}${m.foam}${m.boat?.name ?? ""}${m.sway.join("")}${m.glow.join("")}|${m.actors.join("")}`;
}

function scaleFor(width: number, requested: number | undefined, maxWidth: number = MAX_WIDTH): number {
  let scale = Math.min(Math.max(Math.floor(requested ?? 2), 1), 4);
  while (scale > 1 && width * scale > maxWidth) scale--;
  return scale;
}

interface Painter {
  scene: IslandScene;
  model: SceneModel;
  layers: Layers<PixelImage>;
  swaying: boolean[];
  night: boolean;
}

function painter(scene: IslandScene, phase: LightPhase): Painter {
  const data = buildAtlasData(phase);
  const atlas = new PixelImage(data.width, data.height, data.data);
  const model = sceneModel(scene);
  const land = new PixelImage(scene.width, scene.height);
  paintLand(new PixelContext(land), model, atlas, data.rects);
  const overlay = new PixelImage(scene.width, scene.height);
  paintOverlay(new PixelContext(overlay), model, atlas, data.rects);
  return {
    scene,
    model,
    layers: { atlas, rects: data.rects, flipped: data.flipped, seaRects: seaRectsFor(data.rects), land, overlay },
    swaying: model.trees.map((t) => t.b != null),
    night: phase === "night",
  };
}

/** One frame of the view at native size, RGBA. */
function paint(p: Painter, motion: Motion, view: Rect, actors: readonly LiveActor[]): PixelImage {
  const frame = PixelImage.opaque(view.w, view.h);
  // The context's origin is the view's corner, like the web's crop.
  redrawRect(new PixelContext(frame, { x: view.x, y: view.y }), view, p.model, p.layers, { motion, night: p.night, actors });
  return frame;
}

/** Nearest-neighbour upscale of a native frame's RGBA words. */
function upscale(img: PixelImage, k: number): Uint32Array {
  const src = img.words();
  if (k === 1) return src;
  const w = img.width * k;
  const out = new Uint32Array(w * img.height * k);
  for (let y = 0; y < img.height; y++) {
    const row = new Uint32Array(w);
    for (let x = 0; x < img.width; x++) row.fill(src[y * img.width + x], x * k, x * k + k);
    for (let j = 0; j < k; j++) out.set(row, (y * k + j) * w);
  }
  return out;
}

/** Palette colours for the island: one index is kept free for "unchanged since the last frame". */
const MAX_COLOURS = 255;

/**
 * The exact palette when the frames use at most 255 colours (always so far:
 * the island is pixel art), else one quantized from the first frame.
 */
function paletteFor(frames: Uint32Array[]): { palette: Palette; indexOf: (word: number) => number } {
  const lookup = new Map<number, number>();
  const palette: Palette = [];
  for (const words of frames) {
    for (let i = 0; i < words.length; i++) {
      const rgb = words[i] & 0xffffff;
      if (lookup.has(rgb)) continue;
      if (palette.length === MAX_COLOURS) {
        const bytes = new Uint8Array(frames[0].buffer, frames[0].byteOffset, frames[0].byteLength);
        const q = quantize(bytes, MAX_COLOURS);
        const cache = new Map<number, number>();
        return {
          palette: q,
          indexOf: (word) => {
            const rgb = word & 0xffffff;
            let k = cache.get(rgb);
            if (k === undefined) {
              k = applyPalette(new Uint8Array([rgb & 0xff, (rgb >>> 8) & 0xff, (rgb >>> 16) & 0xff, 255]), q)[0];
              cache.set(rgb, k);
            }
            return k;
          },
        };
      }
      lookup.set(rgb, palette.length);
      palette.push([rgb & 0xff, (rgb >>> 8) & 0xff, (rgb >>> 16) & 0xff]);
    }
  }
  return { palette, indexOf: (word) => lookup.get(word & 0xffffff)! };
}

/**
 * Frames as palette indices. After the first, a pixel that did not change is
 * the transparent index, so only what moved is encoded (the sea's shimmer is a
 * few pixels a tile); each frame is kept under the next (dispose 1).
 */
function indexFrames(frames: Uint32Array[], indexOf: (word: number) => number, clear: number): Uint8Array[] {
  return frames.map((words, n) => {
    const prev = n > 0 ? frames[n - 1] : null;
    const out = new Uint8Array(words.length);
    for (let i = 0; i < words.length; i++) {
      out[i] = prev && (prev[i] & 0xffffff) === (words[i] & 0xffffff) ? clear : indexOf(words[i]);
    }
    return out;
  });
}

/**
 * Renders the island as a looping GIF. Throws RenderError when the scene
 * cannot be built (the same refusals as renderIsland).
 */
export function renderIslandGif(plots: IslandPlot[], options: GifOptions = {}): RenderedGif {
  const scene = buildScene(plots, { markMine: options.markMine, festival: options.festival });
  return renderSceneGif(scene, { scale: options.scale, phase: options.phase });
}

/** A built scene (or part of it, with people in it) as a looping GIF: the story pages use this directly. */
export function renderSceneGif(scene: IslandScene, options: SceneGifOptions = {}): RenderedGif {
  const view = options.view ?? { x: 0, y: 0, w: scene.width, h: scene.height };
  if (view.w < 1 || view.h < 1) throw new RenderError("bad_plot", `empty view ${view.w}x${view.h}`);
  const actors = options.actors ?? [];
  const p = painter(scene, options.phase ?? "day");
  const k = scaleFor(view.w, options.scale, options.maxWidth);

  // Ticks grouped into frames: a new frame only where something changed.
  const runs: { motion: Motion; ticks: number }[] = [];
  let lastKey = "";
  for (let t = 0; t < LOOP_TICKS; t++) {
    const motion = loopMotion(t, scene, p.swaying, p.night, actors);
    const key = motionKey(motion);
    if (runs.length && key === lastKey) runs[runs.length - 1].ticks++;
    else runs.push({ motion, ticks: 1 });
    lastKey = key;
  }

  const frames = runs.map((r) => upscale(paint(p, r.motion, view, actors), k));
  const { palette, indexOf } = paletteFor(frames);
  // The free index after the island's colours; its own colour is never shown.
  const clear = palette.length;
  const indexed = indexFrames(frames, indexOf, clear);
  const width = view.w * k;
  const height = view.h * k;
  const gif = GIFEncoder();
  // GIF delays are whole centiseconds and a tick is 12.5: rounding where each frame
  // starts and ends (not each delay) keeps the loop exactly 6 seconds.
  const at = (ticks: number) => Math.round((ticks * TICK_MS) / 10) * 10;
  let start = 0;
  indexed.forEach((index, n) => {
    const delay = at(start + runs[n].ticks) - at(start);
    start += runs[n].ticks;
    if (n === 0) gif.writeFrame(index, width, height, { palette: [...palette, [0, 0, 0]], delay, repeat: 0 });
    else gif.writeFrame(index, width, height, { delay, transparent: true, transparentIndex: clear, dispose: 1 });
  });
  gif.finish();
  return { gif: Buffer.from(gif.bytes()), width, height, scale: k, frames: runs.length };
}
