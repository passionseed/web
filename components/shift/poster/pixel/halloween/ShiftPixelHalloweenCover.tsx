import QRCode from "react-qr-code";

import { SHIFT_COHORT_3, formatThaiDate, formatThaiDateRange } from "@/lib/content/shift-cohort";

import { MarkerHighlight, PassionSeedMark, REFUND_PROMISE } from "../../riso";
import { SHIFT3 } from "../../shift3/facts";
import { LATIN } from "../../shift3/parts";
import { PIXEL_FONT, Rects } from "../PixelRects";
import {
  CELL,
  GRID_H,
  GRID_W,
  bands,
  building,
  disc,
  sprite,
  streetSign,
  waveBand,
  type Rect,
} from "../pixelKit";
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
  bigSprite,
  craters,
  deadTree,
  fogWisps,
  lanternGlow,
  spire,
  stars,
  latinDateRange,
  tombstone,
  witchStudent,
} from "./halloweenKit";
import { CommentBubble } from "./CommentBubble";

/**
 * SHIFT[3] cover in SHIFT[1]'s pixel style, Halloween night. Same elements
 * and info as the SHIFT[1] pixel cover (date line, title, tracks, the
 * PICK / SHIP / DEMO sign, then date, price, seats, refund promise, deadline
 * and QR in the footer), with SHIFT[3]'s facts from SHIFT_COHORT_3.
 * The scene: a full moon behind a haunted skyline, a graveyard of lit
 * jack-o'-lanterns, and the SHIFT[1] student in a witch hat, still building
 * on a laptop while a black cat keeps watch.
 * Export: screenshot #shift3-halloween-1 (1080x1350).
 */

export const SHIFT3_HALLOWEEN_POSTER_ID = "shift3-halloween-1";

const COHORT = SHIFT_COHORT_3;
const POSTER_URL = `https://passionseed.org/shift/${COHORT.round}?utm_source=poster-halloween`;

/** Ground line and top of the dark footer band, in grid rows. */
const GROUND = 140;
const BAND = 170;
const MOON = { cx: 140, cy: 104, r: 13 };
/** Left edge lines up with the footer copy (9 cells = 54px, copy at 56px). */
const SIGN = { x: 9, top: 112, w: 34, bottom: 166 };
const SIGN_COLORS = { post: HX.wood, edge: HX.woodDark, board: HX.bone };
/** The student is the focal point: 3x, centred, lit by the laptop screen. */
const HERO = { x: 72, bottom: 168, scale: 3 };

const STEPS = ["DAY 1-2 PICK", "DAY 3-5 SHIP", "DAY 6-7 DEMO"];

function sky(): Rect[] {
  return [
    // One flat sky colour: no dithered seams across the poster.
    [0, 0, GRID_W, GROUND, HX.sky],
    ...stars(0, 112, 70, GRID_W),
    ...disc(MOON.cx, MOON.cy, MOON.r + 3, HX.moonGlow),
    ...disc(MOON.cx, MOON.cy, MOON.r, HX.moon),
    ...craters(MOON.cx, MOON.cy),
    ...sprite(BAT, BAT_PALETTE, 128, 97),
    ...sprite(BAT, BAT_PALETTE, 143, 92),
    ...sprite(BAT, BAT_PALETTE, 133, 108),
  ];
}

/** Far skyline: the lightest silhouettes, with a church spire as a landmark. */
function farCity(): Rect[] {
  const tops = [112, 108, 116, 104, 114, 110, 118, 106, 112, 116, 108, 114];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, GROUND, { body: HX.far }));
    x += w;
  });
  out.push(...building(92, 100, 10, GROUND, { body: HX.far }), ...spire(90, 100, 14, HX.far));
  return out;
}

/** Mid row: a haunted house with two gables and a few lit windows. */
function midCity(): Rect[] {
  const opts = { body: HX.mid, window: HX.windowDark, lit: 0.25 };
  return [
    ...building(60, 120, 14, GROUND, opts),
    ...building(104, 118, 22, GROUND, opts),
    ...spire(104, 118, 12, HX.mid),
    ...spire(114, 118, 12, HX.mid),
    ...building(128, 124, 12, GROUND, opts),
  ];
}

/** Near buildings frame the scene at both edges, a bare tree crosses the moon. */
function nearCity(): Rect[] {
  const opts = { body: HX.near, window: HX.windowDark, lit: 0.3 };
  return [
    ...building(0, 96, 22, GROUND, { ...opts, roof: "antenna" }),
    ...building(160, 92, 20, GROUND, { ...opts, roof: "tank" }),
    ...deadTree(150, GROUND + 1, HX.near),
  ];
}

function graveyard(): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [GROUND, HX.groundTop],
      [GROUND + 4, HX.ground],
      [BAND + 3, HX.ground],
    ]),
    ...fogWisps(GROUND + 2, GROUND + 12, 12, GRID_W),
    ...lanternGlow(59, 163, 10, HX.ground),
    ...lanternGlow(137, 164, 10, HX.ground),
    ...lanternGlow(90, 150, 16, HX.ground, HX.screen),
    ...streetSign(SIGN.x, SIGN.top, SIGN.bottom, STEPS.length, SIGN.w, SIGN_COLORS),
    ...tombstone(4, 164, 8, 10),
    ...tombstone(110, 166, 11, 12),
    ...tombstone(150, 162, 7, 9),
    ...tombstone(164, 166, 9, 11),
    ...bigSprite(CAT, CAT_PALETTE, 108, 138, 2),
    ...bigSprite(PUMPKIN, PUMPKIN_PALETTE, 50, 157, 2),
    ...bigSprite(PUMPKIN, PUMPKIN_PALETTE, 128, 157, 2),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 30, 163),
    ...sprite(PUMPKIN, PUMPKIN_PALETTE, 152, 163),
    ...sprite(GHOST, GHOST_DIM_PALETTE, 12, 90),
  ];
}

function PixelScene() {
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
      <Rects rects={[...farCity(), ...midCity(), ...nearCity()]} />
      <Rects rects={graveyard()} />
      <Rects rects={witchStudent(HERO.x, HERO.bottom, HERO.scale)} />
      <Rects rects={waveBand(BAND, HX.ink)} />
      {STEPS.map((step, i) => (
        <text
          key={step}
          x={SIGN.x + SIGN.w / 2}
          y={SIGN.top + 2 + i * 9 + 5.1}
          fontSize={4.4}
          textAnchor="middle"
          fill={HX.ink}
          style={{ fontFamily: "var(--font-tiny5)" }}
        >
          {step}
        </text>
      ))}
    </svg>
  );
}

function Title() {
  return (
    <div className="absolute inset-x-0 top-[70px] flex flex-col items-center text-center">
      {/* Not the pixel font: Tiny5 turns "9-15 NOV" into "3-15 HOY". */}
      <p className="text-[32px] font-semibold leading-none tracking-[0.12em]" style={{ fontFamily: LATIN, color: HX.cream }}>
        {latinDateRange(COHORT.startDate, COHORT.endDate)} · ONLINE
      </p>
      <span className="mt-2 h-[4px] w-[330px]" style={{ backgroundColor: HX.lavender }} />
      <h1
        className="mt-3 text-[200px] leading-[0.9]"
        style={{ ...PIXEL_FONT, color: HX.cream }}
      >
        {COHORT.name}
      </h1>
      <p className="mt-2 font-kodchasan text-[50px] font-bold leading-[1.3]" style={{ color: HX.cream }}>
        7 วัน ปั้น 1 โปรเจกต์จริง
      </p>
      {/* Latin font, not Tiny5: the pixel N and V read as H and Y. */}
      <div
        className="mt-3 text-[26px] font-semibold leading-[1.5] tracking-[0.12em]"
        style={{ fontFamily: LATIN, color: HX.lavender }}
      >
        <p>TECH · BUSINESS · INNOVATION</p>
        <p>CEDT · CS · CE · BBA · BAScii</p>
      </div>
    </div>
  );
}

/** How the cover asks people to apply: a QR code (print, screens) or "comment SHIFT" (Instagram). */
export type CoverCta = "qr" | "comment";

function ApplyQr() {
  return (
    <div className="shrink-0 text-center">
      <div className="p-2.5" style={{ backgroundColor: HX.cream }}>
        <QRCode value={POSTER_URL} size={150} fgColor={HX.ink} bgColor={HX.cream} />
      </div>
      <p className="mt-2 font-kodchasan text-[22px] font-bold" style={{ color: HX.cream }}>
        สแกนสมัคร
      </p>
    </div>
  );
}

function ApplyComment() {
  return (
    <div className="shrink-0 text-center">
      <CommentBubble keyword={SHIFT3.keyword} />
      <p className="font-kodchasan text-[20px] font-bold" style={{ color: HX.cream }}>
        รับลิงก์สมัครทาง DM
      </p>
    </div>
  );
}

function Band({ cta }: { cta: CoverCta }) {
  const price = `฿${COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div className="absolute inset-x-0 bottom-0 px-[56px] pb-[34px]" style={{ top: (BAND + 5) * CELL }}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="font-kodchasan text-[46px] font-bold leading-[1.3]" style={{ color: HX.cream }}>
              {formatThaiDateRange(COHORT.startDate, COHORT.endDate)}
            </p>
            <p className="mt-1 text-[23px] leading-[1.6]" style={{ color: `${HX.cream}bf` }}>
              <span className="font-kodchasan text-[40px] font-bold" style={{ color: HX.flame }}>
                {price}
              </span>{" "}
              · รับ {COHORT.seats} คน · Discord ทุกวัน {COHORT.sessionTime} น.
            </p>
            <p className="mt-3 flex items-center gap-4 text-[23px]">
              <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
              <span className="font-kodchasan font-semibold" style={{ color: HX.pumpkin }}>
                ■ ปิดรับสมัคร {formatThaiDate(COHORT.applyDeadline)}
              </span>
            </p>
            <p className="mt-3 text-[18px]" style={{ color: `${HX.cream}99` }}>
              ม.4–ม.6 · โปรเจกต์ของตัวเอง มีกลุ่มเพื่อนเล็กๆ คอยช่วย · ใช้ AI ไม่ต้องมีพื้นฐาน
            </p>
          </div>
          {cta === "qr" ? <ApplyQr /> : <ApplyComment />}
        </div>
        <div className="mt-auto flex items-center justify-between">
          <PassionSeedMark size={34} />
          <p className="text-[18px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${HX.cream}b3` }}>
            passionseed.org/shift
          </p>
        </div>
      </div>
    </div>
  );
}

export function ShiftPixelHalloweenCover({
  id = SHIFT3_HALLOWEEN_POSTER_ID,
  cta = "qr",
}: {
  id?: string;
  cta?: CoverCta;
}) {
  return (
    <div
      id={id}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: GRID_W * CELL, height: GRID_H * CELL, backgroundColor: HX.sky }}
    >
      <PixelScene />
      <Title />
      <Band cta={cta} />
    </div>
  );
}
