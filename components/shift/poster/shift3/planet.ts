import PLANETS from "./planets.json";

/**
 * Planet geometry for the SHIFT[3] posters, shared with
 * scripts/render-shift3-planet.mjs (which pre-renders the globe PNGs).
 */

export type PlanetLayout = "feed" | "story" | "banner";

export interface PlanetSpec {
  canvas: [number, number];
  cx: number;
  cy: number;
  r: number;
  /** Where Bangkok lands on the poster. */
  bangkok: [number, number];
}

export function planetSpec(layout: PlanetLayout): PlanetSpec {
  return PLANETS[layout] as PlanetSpec;
}

/** The PNG's crop box in poster pixels: the disc plus its halo, clipped to the canvas. */
export function planetBox(p: PlanetSpec) {
  const [W, H] = p.canvas;
  const reach = p.r * (1 + PLANETS.pad);
  const x = Math.max(0, Math.floor(p.cx - reach));
  const y = Math.max(0, Math.floor(p.cy - reach));
  return { x, y, w: Math.min(W, Math.ceil(p.cx + reach)) - x, h: Math.min(H, Math.ceil(p.cy + reach)) - y };
}

export const planetSrc = (layout: PlanetLayout) => `/shift/poster/shift3/planet-${layout}.png`;
