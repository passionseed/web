import type { ShiftCohort } from "@/lib/content/shift-cohort";

import { LATIN } from "../../shift3/parts";
import { PIXEL_FONT, Rects } from "../PixelRects";
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
  lanternGlow,
  latinDateRange,
  spire,
  stars,
  tombstone,
  witchStudent,
} from "./halloweenKit";

/**
 * Register page header in the Halloween pixel poster's style: the title on
 * the night sky, then a wide pixel strip (moon, haunted skyline, graveyard,
 * the lit student) that ends in the page's dark ink. The strip is cropped
 * around its centre, so phones keep the student and desktops get the moon.
 */

/** Strip grid in cells; the student sits on its centre line. */
const W = 300;
const H = 50;
const GROUND = 32;
const BAND = 42;
const CX = W / 2;

function skyline(): Rect[] {
  const out: Rect[] = [[0, 0, W, GROUND, HX.sky], ...stars(0, 16, 36, W)];
  out.push(
    ...disc(CX + 56, 10, 9, HX.moonGlow),
    ...disc(CX + 56, 10, 7, HX.moon),
    ...craters(CX + 56, 10).filter(([, y]) => y > 4 && y < 16),
    ...sprite(BAT, BAT_PALETTE, CX + 48, 6),
    ...sprite(BAT, BAT_PALETTE, CX + 60, 12),
    ...sprite(GHOST, GHOST_DIM_PALETTE, CX - 52, 4),
  );
  let x = 0;
  let i = 0;
  while (x < W) {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, 16 + ((i * 5) % 8), w, GROUND, { body: HX.far }));
    x += w;
    i++;
  }
  const mid = { body: HX.mid, window: HX.windowDark, lit: 0.25 };
  const near = { body: HX.near, window: HX.windowDark, lit: 0.3 };
  out.push(
    ...building(CX - 32, 8, 8, GROUND, { body: HX.far }),
    ...spire(CX - 34, 8, 12, HX.far),
    ...building(CX - 46, 18, 12, GROUND, mid),
    ...building(CX + 18, 16, 18, GROUND, mid),
    ...spire(CX + 18, 16, 10, HX.mid),
    ...spire(CX + 26, 16, 10, HX.mid),
    ...building(CX - 104, 6, 16, GROUND, { ...near, roof: "antenna" }),
    ...building(CX + 86, 4, 18, GROUND, { ...near, roof: "tank" }),
  );
  return out;
}

function graveyard(): Rect[] {
  return [
    ...bands(0, W, [
      [GROUND, HX.groundTop],
      [GROUND + 3, HX.ground],
      [BAND + 3, HX.ground],
    ]),
    ...lanternGlow(CX, 28, 12, HX.ground, HX.screen),
    ...lanternGlow(CX - 26, 38, 6, HX.ground),
    ...lanternGlow(CX + 26, 38, 6, HX.ground),
    ...tombstone(CX - 44, 41, 6, 7),
    ...tombstone(CX + 36, 41, 8, 8),
    ...tombstone(CX + 62, 40, 7, 7),
    ...sprite(CAT, CAT_PALETTE, CX + 36, 25),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, CX - 30, 35),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, CX + 22, 35),
    ...witchStudent(CX - 12, 41, 2),
  ];
}

function NightStrip() {
  return (
    <svg
      className="block h-[150px] w-full sm:h-[190px]"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={skyline()} />
      <Rects rects={graveyard()} />
      <Rects rects={waveBand(BAND, HX.ink, 12, W, H)} />
    </svg>
  );
}

export function HalloweenApplyHeader({ cohort }: { cohort: ShiftCohort }) {
  return (
    <div style={{ backgroundColor: HX.sky }}>
      {/* Top padding clears the floating ShiftTopBar. */}
      <div className="flex flex-col items-center px-5 pb-2 pt-20 text-center sm:pt-24">
        <p
          className="text-sm font-semibold tracking-[0.14em] sm:text-base"
          style={{ fontFamily: LATIN, color: HX.lavender }}
        >
          {latinDateRange(cohort.startDate, cohort.endDate)} · ONLINE
        </p>
        <p className="mt-3 font-kodchasan text-lg font-bold" style={{ color: HX.pumpkin }}>
          สมัคร
        </p>
        <h1 className="leading-[0.9]" style={{ ...PIXEL_FONT, color: HX.cream, fontSize: "clamp(64px, 14vw, 128px)" }}>
          {cohort.name}
        </h1>
        <p className="mt-2 font-kodchasan text-lg font-bold sm:text-xl" style={{ color: HX.cream }}>
          7 วัน ปั้น 1 โปรเจกต์จริง
        </p>
      </div>
      <NightStrip />
    </div>
  );
}

/** Page background under the header: the poster's footer ink, so the strip runs into it. */
export const HALLOWEEN_PAGE_BG = HX.ink;
