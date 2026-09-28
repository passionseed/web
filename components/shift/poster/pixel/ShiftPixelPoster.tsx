import QRCode from "react-qr-code";

import {
  SHIFT_COHORT,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

import { MarkerHighlight, PassionSeedMark, REFUND_PROMISE } from "../riso";
import { PIXEL_FONT, Rects } from "./PixelRects";
import {
  BIRD,
  BIRD_PALETTE,
  CELL,
  GRID_H,
  GRID_W,
  GULL,
  PX,
  RING,
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
  streetSign,
  waveBand,
  type Rect,
} from "./pixelKit";

/**
 * SHIFT[1] cover, pixel art: a flooded city the morning after the storm.
 * The streets are gone, the sun is breaking through, and one student is
 * already out on the water in a small orange boat, building on a laptop.
 * A half-sunk street sign gives the three stages of the week. The message
 * underneath: the problem is real and nobody is waiting for permission.
 */

const COHORT = SHIFT_COHORT;
const POSTER_URL = `https://passionseed.org/shift/${COHORT.round}?utm_source=poster-pixel`;

/** Waterline and top of the dark footer band, in grid rows. */
const WATER = 140;
const BAND = 170;
const REFLECT_DEPTH = 26;

const SIGN = { x: 44, top: 112, w: 34 };
/** The boat scene is drawn at 2x so the student reads as the focal point. */
const HERO = { x: 98, scale: 2, w: 24, gunwale: 14, keel: 18, draft: 10 };
const HERO_TOP = WATER + HERO.draft - HERO.keel * HERO.scale;

const STEPS = ["DAY 1-2 PICK", "DAY 3-5 SHIP", "DAY 6-7 DEMO"];

function sky(): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [0, PX.skyTop],
      [44, PX.sky],
      [100, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    ...disc(130, 116, 11, PX.sun),
    ...cloud(104, 104, [3, 5, 4]),
    ...cloud(36, 96, [3, 4]),
    ...sprite(GULL, { W: PX.mid }, 36, 44),
    ...sprite(GULL, { W: PX.mid }, 44, 50),
    ...sprite(GULL, { W: PX.mid }, 150, 36),
  ];
}

/** Far skyline: flat haze-coloured blocks and one stepped tower as a landmark. */
function farCity(): Rect[] {
  const tops = [108, 114, 104, 118, 110, 102, 116, 106, 112, 120, 108, 114];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, WATER, { body: PX.far }));
    x += w;
  });
  // Stepped landmark tower
  out.push(
    ...building(62, 84, 10, WATER, { body: PX.far, roof: "antenna" }),
    [60, 96, 2, 6, PX.far],
    [72, 92, 2, 8, PX.far],
    [60, 108, 2, 6, PX.far],
  );
  return out;
}

function midCity(): Rect[] {
  const blocks: [number, number, number][] = [
    [28, 118, 14],
    [70, 122, 16],
    [86, 112, 12],
    [118, 120, 14],
    [132, 110, 12],
  ];
  return blocks.flatMap(([x, top, w]) =>
    building(x, top, w, WATER, { body: PX.mid, window: mix(PX.mid, PX.near, 0.5), lit: 0.12 }),
  );
}

function nearCity(): Rect[] {
  const opts = { body: PX.near, window: PX.windowDark, lit: 0.3 };
  return [
    ...building(0, 64, 26, WATER, { ...opts, roof: "tank" }),
    ...building(26, 100, 14, WATER, { ...opts, roof: "garden" }),
    ...building(154, 56, 26, WATER, { ...opts, roof: "antenna" }),
    ...building(140, 96, 14, WATER, { ...opts, roof: "garden" }),
  ];
}

/** Boat, student and bird in local cells, drawn inside a scaled group. */
function heroRects(): Rect[] {
  return [
    ...sprite(STUDENT, STUDENT_PALETTE, 6, HERO.gunwale - STUDENT.length),
    ...boat(0, HERO.gunwale, HERO.w),
    ...sprite(BIRD, BIRD_PALETTE, HERO.w - 6, HERO.gunwale - BIRD.length),
  ];
}

/** Hero rects in world cells, so they can be mirrored into the water. */
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
    ...bands(0, GRID_W, [
      [WATER, PX.waterLight],
      [WATER + 8, PX.water],
      [WATER + 20, PX.waterDeep],
      [BAND + 3, PX.waterDeep],
    ]),
    ...reflect(above, WATER, REFLECT_DEPTH),
    ...reflect(heroWorld(), hullLine, 5, 0.6),
    ...glints(WATER + 1, BAND, 34),
    // Wake along the hull
    [HERO.x - 3, hullLine, 4, 1, PX.foam],
    [HERO.x + HERO.w * HERO.scale - 1, hullLine, 5, 1, PX.foam],
    ...sprite(RING, { A: PX.accent, W: PX.cream }, 84, WATER + 12),
  ];
}

function PixelScene() {
  const above = [
    ...farCity(),
    ...midCity(),
    ...nearCity(),
    ...streetSign(SIGN.x, SIGN.top, WATER + 4, STEPS.length, SIGN.w),
  ];
  return (
    <svg
      className="absolute inset-0"
      width={GRID_W * CELL}
      height={GRID_H * CELL}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={sky()} />
      <Rects rects={above} />
      <Rects rects={water(above)} />
      <g transform={`translate(${HERO.x} ${HERO_TOP}) scale(${HERO.scale})`}>
        <Rects rects={heroRects()} />
      </g>
      <Rects rects={waveBand(BAND, PX.ink)} />
      {STEPS.map((step, i) => (
        <text
          key={step}
          x={SIGN.x + SIGN.w / 2}
          y={SIGN.top + 2 + i * 9 + 5.1}
          fontSize={4.4}
          textAnchor="middle"
          fill={PX.ink}
          style={{ fontFamily: "var(--font-tiny5)" }}
        >
          {step}
        </text>
      ))}
    </svg>
  );
}

function Title({ isPrivate }: { isPrivate?: boolean }) {
  return (
    <div className="absolute inset-x-0 top-[70px] flex flex-col items-center text-center">
      <p className="text-[34px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
        {isPrivate ? "7 DAYS · ONLINE" : "5-11 OCT · ONLINE"}
      </p>
      <span className="mt-2 h-[4px] w-[330px]" style={{ backgroundColor: PX.ink }} />
      <h1
        className="mt-3 text-[200px] leading-[0.9]"
        style={{ ...PIXEL_FONT, color: PX.ink, textShadow: `${CELL}px ${CELL}px 0 ${PX.cloudShade}` }}
      >
        {COHORT.name}
      </h1>
      <p className="mt-2 font-kodchasan text-[50px] font-bold leading-[1.3]" style={{ color: PX.ink }}>
        7 วัน ปั้น 1 โปรเจกต์จริง
      </p>
      <div
        className="mt-3 text-[30px] leading-[1.35] tracking-[0.06em]"
        style={{ ...PIXEL_FONT, color: PX.accentDark }}
      >
        <p>TECH · BUSINESS · INNOVATION</p>
        <p>CEDT · CS · CE · BBA · BAScii</p>
      </div>
    </div>
  );
}

function Band({ isPrivate }: { isPrivate?: boolean }) {
  const price = `฿${COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div className="absolute inset-x-0 bottom-0 px-[56px] pb-[34px]" style={{ top: (BAND + 5) * CELL }}>
      <div className="flex h-full flex-col">
        {!isPrivate && (
          <div className="flex items-start justify-between gap-8">
            <div>
              <p className="font-kodchasan text-[46px] font-bold leading-[1.3]" style={{ color: PX.cream }}>
                {formatThaiDateRange(COHORT.startDate, COHORT.endDate)}
              </p>
              <p className="mt-1 text-[23px] leading-[1.6]" style={{ color: `${PX.cream}bf` }}>
                <span className="font-kodchasan text-[32px] font-bold" style={{ color: PX.accentLight }}>
                  {price}
                </span>{" "}
                · รับ {COHORT.seats} คน · Discord ทุกวัน {COHORT.sessionTime} น.
              </p>
              <p className="mt-3 flex items-center gap-4 text-[23px]">
                <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
                <span className="font-kodchasan font-semibold" style={{ color: PX.accent }}>
                  ■ ปิดรับสมัคร {formatThaiDate(COHORT.applyDeadline)}
                </span>
              </p>
              <p className="mt-3 text-[18px]" style={{ color: `${PX.cream}99` }}>
                ม.4–ม.6 · โปรเจกต์ของตัวเอง มีกลุ่มเพื่อนเล็กๆ คอยช่วย · ใช้ AI ไม่ต้องมีพื้นฐาน
              </p>
            </div>
            <div className="shrink-0 text-center">
              <div className="p-2.5" style={{ backgroundColor: PX.cream }}>
                <QRCode value={POSTER_URL} size={128} fgColor={PX.ink} bgColor={PX.cream} />
              </div>
              <p className="mt-1.5 text-[14px]" style={{ color: `${PX.cream}8c` }}>
                สแกนสมัคร
              </p>
            </div>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between">
          <PassionSeedMark size={34} />
          <p className="text-[18px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
            passionseed.org/shift
          </p>
        </div>
      </div>
    </div>
  );
}

export function ShiftPixelPoster({ isPrivate }: { isPrivate?: boolean }) {
  return (
    <div
      id="shift1-pixel-1"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: GRID_W * CELL, height: GRID_H * CELL, backgroundColor: PX.sky }}
    >
      <PixelScene />
      <Title isPrivate={isPrivate} />
      <Band isPrivate={isPrivate} />
    </div>
  );
}
