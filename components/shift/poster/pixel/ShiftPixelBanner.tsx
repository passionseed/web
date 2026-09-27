import {
  SHIFT_COHORT,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

import { MarkerHighlight, REFUND_PROMISE } from "../riso";
import { PIXEL_FONT, Rects } from "./PixelRects";
import {
  BIRD,
  BIRD_PALETTE,
  CELL,
  GULL,
  PX,
  STUDENT,
  STUDENT_PALETTE,
  bands,
  boat,
  building,
  cloud,
  disc,
  glints,
  mix,
  reflect,
  sprite,
  waveBand,
  type Rect,
} from "./pixelKit";

/**
 * SHIFT[1] listing banner (1200x630), same flooded city as the pixel cover
 * laid out wide: title on the open sky at left, the city and the student's
 * boat on the right, facts in the deep-water band along the bottom.
 */

export const PIXEL_BANNER_W = 1200;
export const PIXEL_BANNER_H = 630;

const COHORT = SHIFT_COHORT;
const W = PIXEL_BANNER_W / CELL;
const H = PIXEL_BANNER_H / CELL;
/** Waterline and top of the dark footer band, in grid rows. */
const WATER = 70;
const BAND = 82;
/** Boat at 2x in the gap the skyline leaves between the mid blocks and the near towers. */
const HERO = { x: 122, scale: 2, w: 24, gunwale: 14, keel: 18, draft: 7 };
const HERO_TOP = WATER + HERO.draft - HERO.keel * HERO.scale;

function sky(): Rect[] {
  return [
    ...bands(0, W, [
      [0, PX.skyTop],
      [28, PX.sky],
      [54, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    ...disc(92, 60, 8, PX.sun),
    ...cloud(112, 30, [3, 5, 4]),
    ...cloud(158, 16, [3, 4]),
    ...sprite(GULL, { W: PX.mid }, 134, 12),
    ...sprite(GULL, { W: PX.mid }, 142, 18),
  ];
}

/** Far skyline across the full width, one stepped tower as a landmark. */
function farCity(): Rect[] {
  const tops = [60, 56, 62, 54, 58, 52, 60, 56, 62, 54, 58, 56, 60, 54];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, WATER, { body: PX.far }));
    x += w;
  });
  out.push(
    ...building(100, 32, 8, WATER, { body: PX.far, roof: "antenna" }),
    [98, 42, 2, 5, PX.far],
    [108, 38, 2, 6, PX.far],
  );
  return out;
}

/** Mid and near blocks frame the boat instead of sitting behind it. */
function nearCity(): Rect[] {
  const midOpts = { body: PX.mid, window: mix(PX.mid, PX.near, 0.5), lit: 0.12 };
  const nearOpts = { body: PX.near, window: PX.windowDark, lit: 0.3 };
  return [
    ...building(68, 58, 12, WATER, midOpts),
    ...building(110, 52, 12, WATER, midOpts),
    ...building(164, 56, 10, WATER, midOpts),
    ...building(174, 40, 12, WATER, { ...nearOpts, roof: "garden" }),
    ...building(186, 20, 14, WATER, { ...nearOpts, roof: "antenna" }),
  ];
}

function heroRects(): Rect[] {
  return [
    ...sprite(STUDENT, STUDENT_PALETTE, 6, HERO.gunwale - STUDENT.length),
    ...boat(0, HERO.gunwale, HERO.w),
    ...sprite(BIRD, BIRD_PALETTE, HERO.w - 6, HERO.gunwale - BIRD.length),
  ];
}

function heroWorld(): Rect[] {
  return heroRects().map(([x, y, w, h, fill]) => [
    HERO.x + x * HERO.scale,
    HERO_TOP + y * HERO.scale,
    w * HERO.scale,
    h * HERO.scale,
    fill,
  ]);
}

function water(above: Rect[]): Rect[] {
  const hullLine = WATER + HERO.draft;
  return [
    ...bands(0, W, [
      [WATER, PX.waterLight],
      [WATER + 6, PX.water],
      [BAND + 3, PX.water],
    ]),
    ...reflect(above, WATER, 12),
    ...reflect(heroWorld(), hullLine, 4, 0.6),
    ...glints(WATER + 1, BAND, 16, W),
    [HERO.x - 3, hullLine, 4, 1, PX.foam],
    [HERO.x + HERO.w * HERO.scale - 1, hullLine, 5, 1, PX.foam],
  ];
}

function Scene() {
  const above = [...farCity(), ...nearCity()];
  return (
    <svg
      className="absolute inset-0"
      width={PIXEL_BANNER_W}
      height={PIXEL_BANNER_H}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={above} />
      <Rects rects={water(above)} />
      <g transform={`translate(${HERO.x} ${HERO_TOP}) scale(${HERO.scale})`}>
        <Rects rects={heroRects()} />
      </g>
      <Rects rects={waveBand(BAND, PX.ink, 12, W, H)} />
    </svg>
  );
}

function Title() {
  return (
    <div className="absolute left-[56px] top-[40px]">
      <p className="text-[24px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        5-11 OCT · ONLINE
      </p>
      <h1
        className="mt-3 text-[136px] leading-[0.9]"
        style={{ ...PIXEL_FONT, color: PX.ink, textShadow: `${CELL}px ${CELL}px 0 ${PX.cloudShade}` }}
      >
        {COHORT.name}
      </h1>
      <p className="mt-2 font-kodchasan text-[36px] font-bold leading-[1.3]" style={{ color: PX.ink }}>
        7 วัน ปั้น 1 โปรเจกต์จริง
      </p>
      <div className="mt-2 text-[22px] leading-[1.35] tracking-[0.06em]" style={{ ...PIXEL_FONT, color: PX.accentDark }}>
        <p>TECH · BUSINESS · INNOVATION</p>
        <p>CEDT · CS · CE · BBA · BAScii</p>
      </div>
    </div>
  );
}

/** Two rows in the deep-water band: when and deadline, then price and terms. */
function Facts() {
  const price = `฿${COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col justify-center gap-2 px-[56px]"
      style={{ top: (BAND + 3) * CELL }}
    >
      <div className="flex items-baseline justify-between gap-6">
        <p className="font-kodchasan text-[30px] font-bold leading-none" style={{ color: PX.cream }}>
          {formatThaiDateRange(COHORT.startDate, COHORT.endDate)}
        </p>
        <p className="shrink-0 font-kodchasan text-[22px] font-semibold leading-none" style={{ color: PX.accent }}>
          ■ ปิดรับสมัคร {formatThaiDate(COHORT.applyDeadline)}
        </p>
      </div>
      <div className="flex items-center justify-between gap-6 text-[18px]" style={{ color: `${PX.cream}bf` }}>
        <p className="leading-none">
          <span className="font-kodchasan text-[26px] font-bold" style={{ color: PX.accentLight }}>
            {price}
          </span>{" "}
          · ม.4-ม.6 · รับ {COHORT.seats} คน · Discord ทุกวัน {COHORT.sessionTime} น.
        </p>
        <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
      </div>
    </div>
  );
}

export function ShiftPixelBanner() {
  return (
    <div
      id="shift1-pixel-banner"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: PIXEL_BANNER_W, height: PIXEL_BANNER_H, backgroundColor: PX.sky }}
    >
      <Scene />
      <Title />
      <Facts />
    </div>
  );
}
