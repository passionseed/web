import { SHIFT_COHORT_3, formatThaiDate, formatThaiDateRange } from "@/lib/content/shift-cohort";

import { MarkerHighlight, REFUND_PROMISE } from "../../riso";
import { LATIN } from "../../shift3/parts";
import { PIXEL_FONT, Rects } from "../PixelRects";
import { CELL, bands, building, disc, sprite, waveBand, type Rect } from "../pixelKit";
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
  latinDateRange,
  spire,
  stars,
  tombstone,
  witchStudent,
} from "./halloweenKit";

/**
 * SHIFT[3] listing banner (1200x630), Halloween pixel version of the SHIFT[1]
 * pixel banner: same elements and info (date line, title, tracks, then date,
 * deadline, price, terms and refund promise in the footer band) with SHIFT[3]
 * facts from SHIFT_COHORT_3. Same night as the Halloween cover, laid out
 * wide: title on the open sky at left, moon, haunted skyline and the lit
 * student on the right.
 * Export: screenshot #shift3-halloween-banner (1200x630). The PNG is also the
 * register link preview: copy it to public/shift/banners/shift-3-apply-halloween.png
 * (SHIFT_COHORT_3.applyPreviewSrc) after a change.
 */

export const SHIFT3_HALLOWEEN_BANNER_ID = "shift3-halloween-banner";
export const HALLOWEEN_BANNER_W = 1200;
export const HALLOWEEN_BANNER_H = 630;

const COHORT = SHIFT_COHORT_3;
const W = HALLOWEEN_BANNER_W / CELL;
const H = HALLOWEEN_BANNER_H / CELL;
/** Ground line and top of the dark footer band, in grid rows. */
const GROUND = 70;
const BAND = 82;
const MOON = { cx: 152, cy: 24, r: 11 };
/** The student at 2x in the gap between the haunted house and the near towers. */
const HERO = { x: 128, bottom: 80, scale: 2 };

function sky(): Rect[] {
  return [
    [0, 0, W, GROUND, HX.sky],
    // No stars behind the title copy, where a dot reads as punctuation.
    ...stars(0, 56, 44, W).filter(([x, y]) => !(x < 82 && y > 4 && y < 54)),
    ...disc(MOON.cx, MOON.cy, MOON.r + 2, HX.moonGlow),
    ...disc(MOON.cx, MOON.cy, MOON.r, HX.moon),
    ...craters(MOON.cx, MOON.cy),
    ...sprite(BAT, BAT_PALETTE, 142, 18),
    ...sprite(BAT, BAT_PALETTE, 156, 26),
    ...sprite(GHOST, GHOST_DIM_PALETTE, 116, 26),
  ];
}

/** Far skyline across the full width, a church spire as the landmark. */
function farCity(): Rect[] {
  const tops = [60, 56, 62, 54, 58, 52, 60, 56, 62, 54, 58, 56, 60, 54];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, GROUND, { body: HX.far }));
    x += w;
  });
  out.push(...building(102, 40, 8, GROUND, { body: HX.far }), ...spire(100, 40, 12, HX.far));
  return out;
}

/** Haunted house and near towers frame the student instead of sitting behind them. */
function nearCity(): Rect[] {
  const midOpts = { body: HX.mid, window: HX.windowDark, lit: 0.25 };
  const nearOpts = { body: HX.near, window: HX.windowDark, lit: 0.3 };
  return [
    ...building(68, 58, 12, GROUND, midOpts),
    ...building(108, 52, 18, GROUND, midOpts),
    ...spire(108, 52, 10, HX.mid),
    ...spire(116, 52, 10, HX.mid),
    ...deadTree(166, GROUND + 1, HX.near),
    ...building(176, 40, 10, GROUND, nearOpts),
    ...building(186, 20, 14, GROUND, { ...nearOpts, roof: "antenna" }),
  ];
}

function graveyard(): Rect[] {
  return [
    ...bands(0, W, [
      [GROUND, HX.groundTop],
      [GROUND + 3, HX.ground],
      [BAND + 3, HX.ground],
    ]),
    ...fogWisps(GROUND + 1, GROUND + 8, 10, W),
    ...lanternGlow(140, 66, 12, HX.ground, HX.screen),
    ...lanternGlow(117, 77, 6, HX.ground),
    ...lanternGlow(171, 77, 6, HX.ground),
    ...tombstone(98, 79, 6, 7),
    ...tombstone(156, 80, 9, 8),
    ...tombstone(184, 80, 7, 8),
    ...sprite(CAT, CAT_PALETTE, 156, 64),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 113, 74),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 167, 74),
  ];
}

function Scene() {
  return (
    <svg
      className="absolute inset-0"
      width={HALLOWEEN_BANNER_W}
      height={HALLOWEEN_BANNER_H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={[...farCity(), ...nearCity()]} />
      <Rects rects={graveyard()} />
      <Rects rects={witchStudent(HERO.x, HERO.bottom, HERO.scale)} />
      <Rects rects={waveBand(BAND, HX.ink, 12, W, H)} />
    </svg>
  );
}

function Title() {
  return (
    <div className="absolute left-[56px] top-[40px]">
      {/* Latin font for the date and tracks: Tiny5's 9, N and V misread. */}
      <p className="text-[24px] font-semibold leading-none tracking-[0.12em]" style={{ fontFamily: LATIN, color: HX.cream }}>
        {latinDateRange(COHORT.startDate, COHORT.endDate)} · ONLINE
      </p>
      <h1 className="mt-3 text-[136px] leading-[0.9]" style={{ ...PIXEL_FONT, color: HX.cream }}>
        {COHORT.name}
      </h1>
      <p className="mt-2 font-kodchasan text-[36px] font-bold leading-[1.3]" style={{ color: HX.cream }}>
        7 วัน ปั้น 1 โปรเจกต์จริง
      </p>
      <div
        className="mt-2 text-[19px] font-semibold leading-[1.5] tracking-[0.12em]"
        style={{ fontFamily: LATIN, color: HX.lavender }}
      >
        <p>TECH · BUSINESS · INNOVATION</p>
        <p>CEDT · CS · CE · BBA · BAScii</p>
      </div>
    </div>
  );
}

/** Two rows in the footer band: when and deadline, then price and terms. */
function Facts() {
  const price = `฿${COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col justify-center gap-2 px-[56px]"
      style={{ top: (BAND + 3) * CELL }}
    >
      <div className="flex items-baseline justify-between gap-6">
        <p className="font-kodchasan text-[30px] font-bold leading-none" style={{ color: HX.cream }}>
          {formatThaiDateRange(COHORT.startDate, COHORT.endDate)}
        </p>
        <p className="shrink-0 font-kodchasan text-[22px] font-semibold leading-none" style={{ color: HX.pumpkin }}>
          ■ ปิดรับสมัคร {formatThaiDate(COHORT.applyDeadline)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-6 text-[18px]" style={{ color: `${HX.cream}bf` }}>
        <p className="leading-none">
          <span className="font-kodchasan text-[26px] font-bold" style={{ color: HX.flame }}>
            {price}
          </span>{" "}
          · ม.4-ม.6 · รับ {COHORT.seats} คน · Discord ทุกวัน {COHORT.sessionTime} น.
        </p>
        <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
      </div>
    </div>
  );
}

export function ShiftPixelHalloweenBanner() {
  return (
    <div
      id={SHIFT3_HALLOWEEN_BANNER_ID}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: HALLOWEEN_BANNER_W, height: HALLOWEEN_BANNER_H, backgroundColor: HX.sky }}
    >
      <Scene />
      <Title />
      <Facts />
    </div>
  );
}
