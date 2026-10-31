import { Rects } from "../PixelRects";
import { GULL, bands, disc, sprite, type Rect } from "../pixelKit";
import { CAT, DAWN, HX, PUMPKIN, SPROUT, SPROUT_PALETTE, bigSprite } from "./halloweenKit";

/**
 * The end of the Halloween page: the night lifts into PassionSeed's Dawn.
 * Dark overhead, warmth only in a narrow band at the horizon, the sun
 * rising over the graveyard hill, and seedlings where the lanterns stood.
 * The top row is the page's ink, so the art grows out of the page.
 */

const W = 240;
const H = 48;
const HORIZON = 38;
const SUN = { cx: 120, r: 11 };

/** Deterministic rolling hill line, a cell or two either side of the horizon. */
function hillTop(x: number): number {
  return HORIZON + Math.round(1.4 * Math.sin(x / 17) + Math.sin(x / 7.3 + 1));
}

function sky(): Rect[] {
  return [
    ...bands(0, W, [
      [0, DAWN.night],
      [9, DAWN.deep],
      [17, DAWN.indigo],
      [23, DAWN.haze],
      [28, DAWN.rose],
      [32, DAWN.ember],
      [35, DAWN.glow],
      [38, DAWN.gold],
      [H, DAWN.gold],
    ]),
    ...disc(SUN.cx, HORIZON, SUN.r + 4, DAWN.glow),
    ...disc(SUN.cx, HORIZON, SUN.r, DAWN.sun),
    ...sprite(GULL, { W: DAWN.deep }, 84, 18),
    ...sprite(GULL, { W: DAWN.deep }, 92, 22),
    ...sprite(GULL, { W: DAWN.indigo }, 160, 14),
  ];
}

/** Hill, headstones and the cat, all one silhouette against the sunrise. */
function hill(): Rect[] {
  const out: Rect[] = [];
  for (let x = 0; x < W; x++) {
    const top = hillTop(x);
    out.push([x, top, 1, H - top, DAWN.hill]);
  }
  for (const [x, w, h] of [[30, 6, 6], [64, 8, 8], [176, 7, 7], [214, 6, 5]]) {
    const top = hillTop(x) - h;
    out.push([x + 1, top, w - 2, 1, DAWN.hill], [x, top + 1, w, h, DAWN.hill]);
  }
  out.push(...sprite(CAT, { K: DAWN.hill, Y: DAWN.gold }, 148, hillTop(148) - 8));
  // Lanterns burnt out by morning: the pumpkins keep their colour, not their light.
  const spent = { O: HX.pumpkinDark, D: HX.woodDark, Y: HX.woodDark, G: DAWN.leafDark };
  out.push(...sprite(PUMPKIN, spent, 44, hillTop(44) - 4), ...sprite(PUMPKIN, spent, 194, hillTop(194) - 4));
  return out;
}

/** Seedlings along the hill: what PassionSeed plants, up with the sun. */
function sprouts(): Rect[] {
  const out: Rect[] = [];
  for (const x of [14, 52, 78, 100, 138, 164, 186, 204, 228]) {
    out.push(...sprite(SPROUT, SPROUT_PALETTE, x, hillTop(x + 2) - 4));
  }
  for (const x of [22, 222]) {
    out.push(...bigSprite(SPROUT, SPROUT_PALETTE, x, hillTop(x + 4) - 8, 2));
  }
  return out;
}

export function HalloweenDawn() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[240px] w-full sm:h-[280px]"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={hill()} />
      <g className="hx-grow">
        <Rects rects={sprouts()} />
      </g>
    </svg>
  );
}
