"use client";

import { memo, useEffect, useSyncExternalStore } from "react";

/**
 * Grain: the board chrome's only colour. One bloom of indigo and ultramarine
 * with a navy core, running into vermilion and cream, that breaks up into dots
 * at its edges (feTurbulence, thresholded into an alpha mask) instead of
 * blurring.
 *
 * feTurbulence is expensive and the board repaints all the time, so the filter
 * runs once per variant: each bloom is drawn off screen as a small standalone
 * SVG, rasterised to a PNG, and from then on it is a plain image.
 *  - `<GrainDefs />` (once, in WhiteboardCanvas) holds the shared filters and
 *    publishes the small blooms as CSS variables (`--wb-grain-chip`,
 *    `--wb-grain-share`, `--wb-grain-tile-a`...) that whiteboard.css uses as
 *    background images.
 *  - `<GrainBloom variant />` fills its parent with one bloom (`fixed`: at its natural size, cropped). Until its
 *    bitmap is ready it draws the same layers live through the shared filters.
 * Bitmaps are always shown at their natural size and cropped, never scaled: resampling softens
 * the dots. Nothing animates, and nothing that moves with the canvas carries a filter.
 */

const P = "wb-grain-";

/** Stipple: soft alpha plus noise, hard threshold, so dots thin out with distance. Three seeds. */
const stipple = (id: number, frequency: number, octaves: number, seed: number, channel: string) =>
  `<filter id="${P}st${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">` +
  `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}" stitchTiles="stitch" result="n"/>` +
  `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${channel} -0.8" result="na"/>` +
  `<feComposite in="SourceAlpha" in2="na" operator="arithmetic" k1="0" k2="13" k3="10" k4="-11.5" result="d"/>` +
  `<feColorMatrix in="d" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/>` +
  `</filter>`;

const stop = (offset: number, opacity = 1, color = "#fff") =>
  `<stop offset="${offset}" stop-color="${color}"${opacity === 1 ? "" : ` stop-opacity="${opacity}"`}/>`;

/** Filters, density falloffs (alpha is the chance of a dot) and colour ramps, shared by every bloom. */
const SHARED_DEFS =
  stipple(1, 0.86, 2, 4, "2.6 0 0 0") +
  stipple(2, 0.92, 2, 19, "0 2.6 0 0") +
  stipple(3, 0.8, 3, 52, "0 0 2.6 0") +
  `<radialGradient id="${P}fall">${stop(0)}${stop(0.34)}${stop(0.56, 0.62)}${stop(0.78, 0.3)}${stop(1, 0)}</radialGradient>` +
  `<radialGradient id="${P}fallS">${stop(0, 0.8)}${stop(0.3, 0.58)}${stop(0.65, 0.3)}${stop(1, 0)}</radialGradient>` +
  // Firmer core, for blooms that carry a white icon.
  `<radialGradient id="${P}fallC">${stop(0)}${stop(0.5)}${stop(0.68, 0.66)}${stop(0.84, 0.3)}${stop(1, 0)}</radialGradient>` +
  `<linearGradient id="${P}fallX">${stop(0)}${stop(0.5)}${stop(0.75, 0.5)}${stop(1, 0.08)}</linearGradient>` +
  `<linearGradient id="${P}ind" x1="0" y1="0" x2="1" y2="1">${stop(0, 1, "#2A2E9B")}${stop(1, 1, "#3D4BD8")}</linearGradient>` +
  `<linearGradient id="${P}verm" x1="0" y1="0" x2="1" y2="1">${stop(0, 1, "#FF4B1F")}${stop(1, 1, "#FF6A3D")}</linearGradient>` +
  // The leading end of a progress strip: it picks up where the solid body (navy to ultramarine, in CSS) stops.
  `<linearGradient id="${P}strip" x1="0" y1="0" x2="1" y2="0">${stop(0, 1, "#3D4BD8")}${stop(0.45, 1, "#FF4B1F")}${stop(1, 1, "#FF6A3D")}</linearGradient>`;

const NAVY = "#14143C";
const INDIGO = "#2A2E9B";
const ULTRA = "#3D4BD8";
const VERM = "#FF4B1F";
const VERM2 = "#FF6A3D";
const CREAM = "#FBE6CF";
const RAMP_IND = `url(#${P}ind)`;
const RAMP_VERM = `url(#${P}verm)`;
const RAMP_STRIP = `url(#${P}strip)`;

type Layer = {
  fill: string;
  /** The mask shape, without fill or filter: `ellipse cx="1" cy="2" rx="3" ry="4"`. */
  shape: string;
  /** A falloff gradient, or a flat density from 0 to 1. */
  fall: "fall" | "fallS" | "fallC" | "fallX" | number;
  st: 1 | 2 | 3;
  transform?: string;
};
type Recipe = { w: number; h: number; base?: string; layers: Layer[] };

const ellipse = (cx: number, cy: number, rx: number, ry: number) => `ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"`;
const circle = (cx: number, cy: number, r: number) => `circle cx="${cx}" cy="${cy}" r="${r}"`;
const rect = (x: number, y: number, w: number, h: number) => `rect x="${x}" y="${y}" width="${w}" height="${h}"`;

// Corner blooms for the 32px icon tiles: the same bloom, cropped differently. The icon sits in
// the middle 18px (7 to 25), so a corner that would fail 3:1 against the icon stays outside it
// (TILE_BR_OUT, TILE_TL_OUT).
const TILE_TL = { shape: circle(2, 2, 22), fall: "fall", st: 2 } as const;
const TILE_BR = { shape: circle(31, 31, 24), fall: "fall", st: 1 } as const;
const TILE_TR = { shape: circle(31, 1, 26), fall: "fall", st: 3 } as const;
const TILE_B = { shape: ellipse(16, 34, 26, 18), fall: "fall", st: 2 } as const;
const TILE_BR_OUT = { shape: circle(34, 34, 16), fall: "fall", st: 1 } as const;
const TILE_TL_OUT = { shape: circle(-1, -1, 14), fall: "fall", st: 2 } as const;
const TILE_FLAT = { shape: rect(-4, -4, 40, 40), fall: 0.34, st: 3 } as const;
const tile = (base: string, ...layers: Layer[]): Recipe => ({ w: 32, h: 32, base, layers });

const RECIPES = {
  /** The full bloom: Spyfall's face-down card. */
  mix: {
    w: 350,
    h: 168,
    layers: [
      { fill: CREAM, shape: ellipse(188, 118, 158, 56), fall: "fallS", st: 3 },
      { fill: VERM, shape: ellipse(180, 110, 112, 48), fall: "fall", st: 2 },
      { fill: VERM2, shape: ellipse(206, 122, 70, 26), fall: "fallS", st: 1 },
      { fill: INDIGO, shape: ellipse(160, 72, 96, 60), fall: "fall", st: 1 },
      { fill: ULTRA, shape: ellipse(186, 82, 62, 40), fall: "fallS", st: 3 },
      { fill: NAVY, shape: ellipse(146, 62, 58, 36), fall: "fall", st: 2 },
    ],
  },
  indigo: {
    w: 200,
    h: 120,
    layers: [
      { fill: INDIGO, shape: ellipse(100, 60, 90, 52), fall: "fall", st: 1 },
      { fill: ULTRA, shape: ellipse(118, 66, 56, 34), fall: "fallS", st: 3 },
      { fill: NAVY, shape: ellipse(80, 48, 48, 28), fall: "fall", st: 2 },
    ],
  },
  vermilion: {
    w: 200,
    h: 120,
    layers: [
      { fill: CREAM, shape: ellipse(104, 70, 92, 44), fall: "fallS", st: 3 },
      { fill: VERM, shape: ellipse(100, 60, 80, 40), fall: "fall", st: 2 },
      { fill: VERM2, shape: ellipse(118, 68, 50, 22), fall: "fallS", st: 1 },
    ],
  },
  cream: {
    w: 200,
    h: 120,
    layers: [
      { fill: CREAM, shape: ellipse(100, 60, 92, 50), fall: "fall", st: 3 },
      { fill: VERM2, shape: ellipse(130, 78, 40, 18), fall: "fallS", st: 1 },
    ],
  },
  /** The active tool: a round bloom a little larger than the button, dark where the white icon sits. */
  chip: {
    w: 54,
    h: 54,
    layers: [
      { fill: CREAM, shape: ellipse(31, 41, 22, 10), fall: "fall", st: 3, transform: "translate(4 5)" },
      { fill: VERM, shape: ellipse(31, 41, 22, 10), fall: "fall", st: 3 },
      { fill: RAMP_IND, shape: circle(27, 26, 27), fall: "fallC", st: 1 },
      { fill: NAVY, shape: circle(23, 22, 17), fall: "fall", st: 2 },
    ],
  },
  /** The active tool on dark paper, where a navy core would read as a hole: ultramarine with an indigo core. */
  chipDark: {
    w: 54,
    h: 54,
    layers: [
      { fill: CREAM, shape: ellipse(31, 41, 22, 10), fall: "fall", st: 3, transform: "translate(4 5)" },
      { fill: VERM, shape: ellipse(31, 41, 22, 10), fall: "fall", st: 3 },
      { fill: ULTRA, shape: circle(27, 26, 27), fall: "fallC", st: 1 },
      { fill: INDIGO, shape: circle(23, 22, 17), fall: "fall", st: 2 },
    ],
  },
  /** Share: solid indigo under the label, vermilion only in the bottom-right corner. */
  share: {
    w: 148,
    h: 36,
    base: INDIGO,
    layers: [
      { fill: ULTRA, shape: rect(0, 0, 148, 36), fall: 0.3, st: 3 },
      { fill: NAVY, shape: ellipse(26, 6, 62, 26), fall: "fall", st: 2 },
      { fill: RAMP_VERM, shape: ellipse(154, 34, 34, 24), fall: "fall", st: 1 },
      { fill: CREAM, shape: ellipse(154, 40, 16, 10), fall: "fallS", st: 2 },
    ],
  },
  /** A screen's one primary action: the Share bloom, wide. */
  primary: {
    w: 420,
    h: 44,
    base: INDIGO,
    layers: [
      { fill: ULTRA, shape: rect(0, 0, 420, 44), fall: 0.3, st: 3 },
      { fill: NAVY, shape: ellipse(150, 6, 110, 30), fall: "fall", st: 2 },
      { fill: RAMP_VERM, shape: ellipse(420, 44, 36, 22), fall: "fall", st: 1 },
      { fill: CREAM, shape: ellipse(420, 49, 16, 9), fall: "fallS", st: 2 },
    ],
  },
  /**
   * Progress: only the leading end of the fill, ultramarine into vermilion, solid for its first
   * half and dissolving after. The body behind it is a plain gradient in whiteboard.css, so a
   * short fill is still a solid mark and not a few stray dots.
   */
  strip: { w: 14, h: 5, layers: [{ fill: RAMP_STRIP, shape: rect(0, 0, 14, 5), fall: "fallX", st: 1 }] },
  tileA: tile(INDIGO, { fill: NAVY, ...TILE_TL }, { fill: VERM, ...TILE_BR }),
  // White icon: cream is 1.2:1 against it, so the cream corner stays clear of the icon.
  tileB: tile(ULTRA, { fill: INDIGO, ...TILE_FLAT }, { fill: CREAM, ...TILE_BR_OUT }),
  tileC: tile(VERM, { fill: INDIGO, ...TILE_TL }),
  tileD: tile(CREAM, { fill: VERM2, ...TILE_BR }),
  tileE: tile(NAVY, { fill: ULTRA, ...TILE_B }),
  tileF: tile(INDIGO, { fill: VERM, ...TILE_TR }, { fill: NAVY, ...TILE_B }),
  // Ink icon: ultramarine is 2.5:1 against it, so the ultramarine corner stays clear of the icon.
  tileG: tile(CREAM, { fill: ULTRA, ...TILE_TL_OUT }),
} satisfies Record<string, Recipe>;

export type GrainVariant = keyof typeof RECIPES;
/** The icon tiles: a to g. Cream ones (d, g) take ink icons, the rest white. */
export type GrainTile = "a" | "b" | "c" | "d" | "e" | "f" | "g";

/** Blooms whiteboard.css uses as backgrounds, pre-rendered as soon as the board mounts. */
const CSS_VARIANTS: GrainVariant[] = ["chip", "chipDark", "share", "strip", "primary", "tileA", "tileB", "tileC", "tileD", "tileE", "tileF", "tileG"];

const cssName = (variant: GrainVariant) => `--${P}${variant.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** A bloom's layers as SVG markup; they reference the shared defs by id. */
function layersOf(variant: GrainVariant): string {
  const { w, h, base, layers }: Recipe = RECIPES[variant];
  const box = `width="${w}" height="${h}"`;
  let out = base ? `<rect ${box} fill="${base}"/>` : "";
  layers.forEach((l, i) => {
    const id = `${P}m-${variant}-${i}`;
    const density = typeof l.fall === "number" ? `fill="#fff" fill-opacity="${l.fall}"` : `fill="url(#${P}${l.fall})"`;
    out +=
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${w + 80}" height="${h + 80}">` +
      `<${l.shape} ${density} filter="url(#${P}st${l.st})"/></mask>` +
      `<rect ${box} fill="${l.fill}" mask="url(#${id})"${l.transform ? ` transform="${l.transform}"` : ""}/>`;
  });
  return out;
}

const svgOf = (w: number, h: number, scale: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}"><defs>${SHARED_DEFS}</defs>${body}</svg>`;
const dataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * The bloom as its own SVG document, sized in device pixels. Some engines rasterise an SVG image
 * at its intrinsic size before drawing it, so the intrinsic size is the bitmap size: nothing is
 * scaled up afterwards and the dots stay hard.
 */
const standalone = (variant: GrainVariant, scale = 1) => {
  const { w, h } = RECIPES[variant];
  return svgOf(w, h, scale, layersOf(variant));
};

// ---- One bitmap per variant, for the life of the page ----

const ready = new Map<GrainVariant, string>();
const pending = new Map<GrainVariant, Promise<void>>();
const listeners = new Set<() => void>();

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

/** Whole device pixels per CSS pixel, up to 3 (phones), so a dot is never resampled on 1x, 2x or 3x screens. */
const bitmapScale = () => Math.min(3, Math.max(1, Math.ceil(window.devicePixelRatio || 1)));

async function drawSvg(svg: string, width: number, height: number): Promise<HTMLCanvasElement | null> {
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("grain: svg did not load"));
    img.src = dataUrl(svg);
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * Does this browser keep SVG filters when it draws an SVG image to a canvas? Without them a bloom
 * comes out as a smooth blurred gradient, the one thing it must never be, and nothing throws.
 * Checked once with a flat half-density square: stippled, its pixels are a mix of on and off;
 * unfiltered (or dropped altogether), they are all the same.
 */
let canvasKeepsFilters: Promise<boolean> | null = null;
function canvasStipples(): Promise<boolean> {
  canvasKeepsFilters ??= (async () => {
    try {
      const size = 24;
      const probe =
        `<mask id="${P}probe" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">` +
        `<rect width="${size}" height="${size}" fill="#fff" fill-opacity="0.5" filter="url(#${P}st1)"/></mask>` +
        `<rect width="${size}" height="${size}" fill="#000" mask="url(#${P}probe)"/>`;
      const canvas = await drawSvg(svgOf(size, size, 1, probe), size, size);
      const data = canvas?.getContext("2d")?.getImageData(0, 0, size, size).data;
      if (!data) return false;
      let on = 0;
      let off = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 200) on++;
        else if (data[i] < 55) off++;
      }
      const total = size * size;
      return on > total * 0.1 && off > total * 0.1;
    } catch {
      return false;
    }
  })();
  return canvasKeepsFilters;
}

/**
 * Draws the bloom once and returns a PNG blob URL. Where a canvas can't take it, or would drop
 * the stipple, the SVG itself is the image: the browser still caches its raster.
 */
async function rasterise(variant: GrainVariant): Promise<string> {
  const { w, h } = RECIPES[variant];
  const scale = bitmapScale();
  const svg = standalone(variant, scale);
  try {
    if (!(await canvasStipples())) return dataUrl(svg);
    const canvas = await drawSvg(svg, w * scale, h * scale);
    if (!canvas) return dataUrl(svg);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ? URL.createObjectURL(blob) : dataUrl(svg);
  } catch {
    // A tainted canvas or a browser that won't decode it: the SVG still looks the same.
    return dataUrl(svg);
  }
}

/** Makes a bloom's bitmap if it is not there yet, and publishes it as `--wb-grain-<name>`. */
export function ensureGrain(variant: GrainVariant): Promise<void> {
  if (typeof window === "undefined" || ready.has(variant)) return Promise.resolve();
  let job = pending.get(variant);
  if (!job) {
    job = rasterise(variant).then((url) => {
      ready.set(variant, url);
      pending.delete(variant);
      // On the root, so dialogs and popovers portalled out of the board get them too.
      document.documentElement.style.setProperty(cssName(variant), `url("${url}")`);
      listeners.forEach((fn) => fn());
    });
    pending.set(variant, job);
  }
  return job;
}

function useGrainUrl(variant: GrainVariant) {
  return useSyncExternalStore(
    subscribe,
    () => ready.get(variant) ?? null,
    () => null,
  );
}

/**
 * Rendered once near the root of the board: the shared filters, falloffs and
 * ramps (ids start with "wb-grain-"), and the pre-rendering of the blooms the
 * stylesheet uses.
 */
export const GrainDefs = memo(function GrainDefs() {
  useEffect(() => {
    let cancelled = false;
    // One after another, so no single task holds the main thread while the board loads.
    void (async () => {
      for (const variant of CSS_VARIANTS) {
        if (cancelled) return;
        await ensureGrain(variant);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <svg className="wb-grain-defs" width="0" height="0" aria-hidden focusable="false">
      <defs dangerouslySetInnerHTML={{ __html: SHARED_DEFS }} />
    </svg>
  );
});

/**
 * One stippled bloom in its parent (which must be positioned and clip its
 * overflow). Static, decorative, and never takes pointer events.
 *
 * By default it scales to cover the parent. `fixed` keeps it at its natural
 * size, centred, so the bitmap is cropped and never resampled: scaling it
 * turns hard dots into soft mush.
 */
export const GrainBloom = memo(function GrainBloom({
  variant = "mix",
  fixed = false,
  className = "",
}: {
  variant?: GrainVariant;
  fixed?: boolean;
  className?: string;
}) {
  const url = useGrainUrl(variant);
  useEffect(() => void ensureGrain(variant), [variant]);
  const { w, h } = RECIPES[variant];
  return (
    <svg
      className={`wb-grain ${className}`}
      // left/top, not a transform: layout snaps to device pixels, a transform would not.
      style={fixed ? { inset: "auto", left: `calc(50% - ${w / 2}px)`, top: `calc(50% - ${h / 2}px)`, width: w, height: h } : undefined}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
    >
      {url ? <image href={url} width={w} height={h} /> : <g dangerouslySetInnerHTML={{ __html: layersOf(variant) }} />}
    </svg>
  );
});

/** Class names for an icon tile: `<span className={grainTile("a")}>{icon}</span>`. */
export const grainTile = (tile: GrainTile = "a") => `wb-tile-icon wb-tile-icon--${tile}`;
