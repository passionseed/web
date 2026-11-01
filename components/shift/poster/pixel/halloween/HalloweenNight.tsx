import type { ReactNode } from "react";

import { Rects } from "../PixelRects";
import { bands, building, disc, sprite, waveBand, type Rect } from "../pixelKit";
import {
  BAT,
  BAT_PALETTE,
  CAT,
  CAT_PALETTE,
  GHOST,
  GHOST_DIM_PALETTE,
  HX,
  PUMPKIN,
  PUMPKIN_PALETTE,
  craters,
  deadTree,
  fogWisps,
  lanternGlow,
  spire,
  stars,
  tombstone,
  witchStudent,
} from "./halloweenKit";

/**
 * The Halloween poster's night as a full-bleed web hero. The copy sits on
 * a flat starry sky; the scene (moon, haunted skyline, graveyard, the lit
 * student) runs as a band under it and ends in a wave of `floor`, the page
 * colour below the hero. Stacked, not layered, so the copy never lands on
 * the moon or the skyline at any screen size.
 *
 * The band slices to fill and is pinned to its bottom-right corner, so
 * phones keep the moon and the student, and wide screens add the city and
 * graveyard to the left.
 */

/** Scene grid in cells. */
const W = 240;
const H = 110;
const GROUND = 92;
const FLOOR = 104;
/** Where the band starts: just above the highest bat. */
const BAND_TOP = 34;
const BAND_HEIGHT = "clamp(240px, 32vw, 420px)";
const MOON = { cx: 214, cy: 54, r: 9 };
const STUDENT_X = 184;

function moon(): Rect[] {
  return [
    ...disc(MOON.cx, MOON.cy, MOON.r + 3, HX.moonGlow),
    ...disc(MOON.cx, MOON.cy, MOON.r, HX.moon),
    ...craters(MOON.cx, MOON.cy),
  ];
}

/** Stars split in two, so a third can twinkle while the rest hold still. */
function starField(): [Rect[], Rect[]] {
  const all = stars(0, H, 110, W);
  return [all.filter((_, i) => i % 3 !== 0), all.filter((_, i) => i % 3 === 0)];
}

function city(): Rect[] {
  const tops = [72, 68, 76, 70, 74, 66, 72, 78, 70, 74, 68, 76, 72, 70, 74, 68, 72, 76];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, GROUND, { body: HX.far }));
    x += w;
  });
  const mid = { body: HX.mid, window: HX.windowDark, lit: 0.25 };
  const near = { body: HX.near, window: HX.windowDark, lit: 0.3 };
  out.push(
    // Church spire, the far landmark.
    ...building(118, 60, 10, GROUND, { body: HX.far }),
    ...spire(116, 60, 14, HX.far),
    // Haunted house with two gables.
    ...building(64, 72, 22, GROUND, mid),
    ...spire(64, 72, 12, HX.mid),
    ...spire(74, 72, 12, HX.mid),
    ...building(140, 74, 14, GROUND, mid),
    ...building(158, 76, 12, GROUND, mid),
    ...building(0, 54, 20, GROUND, { ...near, roof: "antenna" }),
    ...building(20, 68, 12, GROUND, near),
    // A bare tree crossing the bottom of the moon.
    ...deadTree(228, GROUND + 1, HX.near),
  );
  return out;
}

function graveyard(): Rect[] {
  return [
    ...bands(0, W, [
      [GROUND, HX.groundTop],
      [GROUND + 3, HX.ground],
      [H, HX.ground],
    ]),
    ...fogWisps(GROUND + 1, GROUND + 9, 16, W),
    // Laptop light: the one cool glow, so the eye lands on the student.
    ...lanternGlow(STUDENT_X + 12, 99, 12, HX.ground, HX.screen),
    ...tombstone(48, 101, 7, 8),
    ...tombstone(108, 102, 9, 10),
    ...tombstone(150, 100, 7, 8),
    ...tombstone(232, 101, 6, 7),
    ...sprite(CAT, CAT_PALETTE, 109, 84),
  ];
}

const PUMPKINS = [88, 164, 220];

/** Jack-o'-lantern light on the ground, flickering on its own layer under the pumpkins. */
function lanternLight(): Rect[] {
  return PUMPKINS.flatMap((x) => lanternGlow(x + 4, 100, 6, HX.ground));
}

/** The starry sky behind everything: copy above, band below (its sky is see-through). */
function NightSky() {
  const [still, twinkle] = starField();
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMaxYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={still} />
      <g className="hx-twinkle">
        <Rects rects={twinkle} />
      </g>
    </svg>
  );
}

function NightBand({ floor }: { floor: string }) {
  return (
    <svg
      className="relative block w-full"
      style={{ height: BAND_HEIGHT }}
      viewBox={`0 ${BAND_TOP} ${W} ${H - BAND_TOP}`}
      preserveAspectRatio="xMaxYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={moon()} />
      <g className="shift-float shift-float-c">
        <Rects rects={sprite(GHOST, GHOST_DIM_PALETTE, 34, 46)} />
      </g>
      <g className="shift-float">
        <Rects rects={[...sprite(BAT, BAT_PALETTE, 196, 42), ...sprite(BAT, BAT_PALETTE, 224, 36)]} />
      </g>
      <g className="shift-float shift-float-b">
        <Rects rects={sprite(BAT, BAT_PALETTE, 186, 56)} />
      </g>
      <Rects rects={city()} />
      <Rects rects={graveyard()} />
      <g className="hx-flicker">
        <Rects rects={lanternLight()} />
      </g>
      <Rects rects={PUMPKINS.flatMap((x) => sprite(PUMPKIN, PUMPKIN_PALETTE, x, 97))} />
      <Rects rects={witchStudent(STUDENT_X, FLOOR - 1, 2)} />
      <Rects rects={waveBand(FLOOR, floor, 12, W, H)} />
    </svg>
  );
}

/** Night sky with `children` (the hero copy) on it, and the scene underneath. */
export function HalloweenNight({ floor, children }: { floor: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: HX.sky }}>
      <NightSky />
      <div className="relative">{children}</div>
      <NightBand floor={floor} />
    </div>
  );
}
