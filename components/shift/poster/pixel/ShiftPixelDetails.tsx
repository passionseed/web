import QRCode from "react-qr-code";

import {
  SHIFT_COHORT,
  SHIFT_SDT,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

import { MarkerHighlight, PassionSeedMark, REFUND_PROMISE } from "../riso";
import { PIXEL_FONT, PixelIcon, Rects } from "./PixelRects";
import {
  CHART,
  CREW,
  FLAG,
  ICON_PALETTE,
  PORTFOLIO,
  QUESTION,
  ROCKET,
  SCREEN,
  SIGNPOST,
  SPARK,
  SPROUT,
  TROPHY,
} from "./pixelIcons";
import {
  CELL,
  GRID_H,
  GRID_W,
  GULL,
  PX,
  bands,
  building,
  cloud,
  glints,
  mix,
  reflect,
  sprite,
  waveBand,
  type Rect,
} from "./pixelKit";

/**
 * SHIFT[1] page 2: what you walk away with, how the week runs, and why it
 * works. Same flooded city as the cover, seen later in the week with the water
 * dropped, so the skyline compresses to a strip and the content owns the rest.
 *
 * Content mirrors the riso page 2 (ShiftPosterDetails) so both rounds promise
 * the same things, rendered in this round's pixel style.
 */

const COHORT = SHIFT_COHORT;
const POSTER_URL = `https://passionseed.org/shift/${COHORT.round}?utm_source=poster-pixel`;

/** Waterline and top of the footer band, in grid rows. */
const WATER = 34;
const DECK = WATER + 11;
const BAND = 191;
const REFLECT_DEPTH = 9;

const OUTCOMES = [
  { num: "1", title: "Live Project", icon: ROCKET, body: "ชิ้นงานจริงที่คนนอกกดใช้ได้ ไม่ต้องมีพื้นฐาน" },
  { num: "2", title: "Proof Metrics", icon: CHART, body: "ตัวเลขจากคนใช้จริง และทุกจุดที่พังแล้วแก้ยังไง" },
  { num: "3", title: "1-Page Portfolio", icon: PORTFOLIO, body: "สรุปใน 1 หน้า ใส่พอร์ตและใช้ตอบสัมภาษณ์ TCAS1" },
];

/** The week in three stages, the same split as the cover's street sign. */
const PHASES = [
  { label: "PICK", days: 2 },
  { label: "SHIP", days: 3 },
  { label: "DEMO", days: 2 },
];

/** How the week runs, cut to one line each so it reads at poster distance. */
const TOOLKIT = [
  { title: "Own Project", icon: SPROUT, body: "โปรเจกต์ของเราเอง" },
  { title: "AI Tools", icon: SPARK, body: "สร้างต้นแบบด้วย AI" },
  { title: "Anti Meat Proxy", icon: QUESTION, body: "คิดและตัดสินเอง" },
  { title: "Daily Show", icon: SCREEN, body: "โชว์ผลงานทุกเย็น" },
];

const SDT_ICONS = [SIGNPOST, TROPHY, CREW];

/** Notched corners, the pixel-art way to round a box. */
const notch = (n: number) =>
  `polygon(0 ${n}px, ${n}px ${n}px, ${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px))`;

function sky(): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [0, PX.skyTop],
      [12, PX.sky],
      [26, PX.skyHaze],
      [WATER, PX.skyHaze],
    ]),
    ...cloud(120, 20, [2, 3]),
    ...cloud(24, 16, [2, 3]),
    ...sprite(GULL, { W: PX.mid }, 34, 5),
    ...sprite(GULL, { W: PX.mid }, 160, 4),
  ];
}

/** A low skyline: far blocks, with three nearer towers as landmarks. */
function skyline(): Rect[] {
  const tops = [22, 27, 19, 29, 24, 25, 28, 26, 25, 30, 22, 26];
  const out: Rect[] = [];
  let x = 0;
  tops.forEach((top, i) => {
    const w = 10 + ((i * 7) % 8);
    out.push(...building(x, top, w, WATER, { body: PX.far }));
    x += w;
  });
  // Landmarks are kept to the outer thirds: the title sits over the middle,
  // and an antenna poking into it is the one collision this strip can make.
  out.push(
    ...building(150, 13, 12, WATER, { body: PX.mid, window: PX.windowDark, lit: 0.25, roof: "antenna" }),
    ...building(126, 19, 14, WATER, { body: PX.mid, window: PX.windowDark, lit: 0.2, roof: "garden" }),
    ...building(16, 18, 12, WATER, { body: PX.mid, window: PX.windowDark, lit: 0.2, roof: "tank" }),
  );
  return out;
}

function water(above: Rect[]): Rect[] {
  return [
    ...bands(0, GRID_W, [
      [WATER, PX.waterLight],
      [WATER + 4, PX.water],
      [WATER + 9, PX.waterDeep],
      [DECK + 3, PX.waterDeep],
    ]),
    ...reflect(above, WATER, REFLECT_DEPTH),
    ...glints(WATER + 1, WATER + 12, 16),
  ];
}

function PixelScene() {
  const above = skyline();
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
      {/* The deep water the content sits on, so the type has a flat ground. */}
      <Rects rects={waveBand(DECK, PX.ink)} />
      <Rects rects={waveBand(BAND, mix(PX.ink, "#000000", 0.35))} />
    </svg>
  );
}

function Header() {
  return (
    <div className="absolute inset-x-0 top-[48px] flex flex-col items-center text-center">
      <p
        className="text-[24px] leading-none tracking-[0.08em]"
        style={{ ...PIXEL_FONT, color: PX.ink }}
      >
        {COHORT.name} · 7 DAYS
      </p>
      <h2
        className="mt-1 font-kodchasan text-[54px] font-bold leading-[1.15]"
        style={{ color: PX.ink, textShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}` }}
      >
        ได้อะไรกลับไป
      </h2>
    </div>
  );
}

/** Section heading: Thai large, English pixel tag beside it. */
function SectionLabel({ th, en }: { th: string; en: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[12px] w-[12px] shrink-0" style={{ backgroundColor: PX.accent }} />
      <p className="font-kodchasan text-[30px] font-bold leading-none" style={{ color: PX.cream }}>
        {th}
      </p>
      <p
        className="text-[16px] leading-none tracking-[0.12em]"
        style={{ ...PIXEL_FONT, color: `${PX.cream}80` }}
      >
        {en}
      </p>
    </div>
  );
}

/** Pixel number plate, reused wherever a step is numbered. */
function Plate({ label, size = 42 }: { label: string; size?: number }) {
  return (
    <span
      className="relative z-10 flex shrink-0 items-center justify-center leading-none"
      style={{
        ...PIXEL_FONT,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.57),
        color: PX.ink,
        backgroundColor: PX.accentLight,
        boxShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.accentDark}`,
      }}
    >
      {label}
    </span>
  );
}

/** What you ship, as three inventory cards: icon first, words second. */
function Outcomes() {
  return (
    <ul className="mt-6 grid grid-cols-3 gap-[22px]">
      {OUTCOMES.map((o) => (
        <li
          key={o.num}
          className="relative flex flex-col px-[22px] pb-[20px] pt-[18px]"
          style={{ backgroundColor: PX.waterDeep, clipPath: notch(CELL) }}
        >
          <span className="absolute right-[18px] top-[18px]">
            <Plate label={o.num} size={34} />
          </span>
          <span className="flex h-[72px] items-end">
            <PixelIcon grid={o.icon} palette={ICON_PALETTE} scale={5} />
          </span>
          <span
            className="mt-[14px] block text-[19px] leading-none tracking-[0.06em]"
            style={{ ...PIXEL_FONT, color: PX.accentLight }}
          >
            {o.title}
          </span>
          <span
            className="mt-[8px] block font-kodchasan text-[20px] font-semibold leading-[1.35]"
            style={{ color: PX.cream }}
          >
            {o.body}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The 7 days as a route of buoys on a rope, bracketed into the three stages.
 * Each column is 1/7 of the width, so the rope runs centre to centre.
 */
function Week() {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-7">
        {PHASES.map((p) => (
          <div key={p.label} className="px-[10px]" style={{ gridColumn: `span ${p.days}` }}>
            <p
              className="text-center text-[16px] leading-none tracking-[0.14em]"
              style={{ ...PIXEL_FONT, color: PX.waterLight }}
            >
              {p.label}
            </p>
            <div
              className="mt-[6px] h-[8px]"
              style={{
                borderTop: `${CELL / 2}px solid ${PX.water}`,
                borderLeft: `${CELL / 2}px solid ${PX.water}`,
                borderRight: `${CELL / 2}px solid ${PX.water}`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="relative mt-[20px] grid grid-cols-7">
        <div
          className="absolute top-[18px] h-[6px]"
          style={{
            left: `${100 / 14}%`,
            right: `${100 / 14}%`,
            backgroundImage: `repeating-linear-gradient(90deg, ${PX.water} 0 12px, transparent 12px 18px)`,
          }}
        />
        {COHORT.schedule.map((d) => (
          <div key={d.day} className="relative flex flex-col items-center px-[6px] text-center">
            <Plate label={String(d.day)} />
            {d.day === COHORT.schedule.length && (
              <PixelIcon
                className="absolute -top-[22px] left-1/2 ml-[18px]"
                grid={FLAG}
                palette={ICON_PALETTE}
                scale={5}
              />
            )}
            <p
              className="mt-[12px] text-[14px] leading-[1.1] tracking-[0.04em]"
              style={{ ...PIXEL_FONT, color: PX.accentLight }}
            >
              {d.label}
            </p>
            <p
              className="mt-[6px] font-kodchasan text-[16px] font-semibold leading-[1.3]"
              style={{ color: PX.cream }}
            >
              {d.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** How each day runs, as four tools on the belt. */
function Toolkit() {
  return (
    <ul className="mt-[24px] grid grid-cols-4 gap-[14px]">
      {TOOLKIT.map((t) => (
        <li
          key={t.title}
          className="flex items-center gap-[12px] px-[14px] py-[13px]"
          style={{ backgroundColor: `${PX.cream}10`, clipPath: notch(CELL / 2) }}
        >
          <PixelIcon className="shrink-0" grid={t.icon} palette={ICON_PALETTE} scale={4} />
          <span className="min-w-0">
            <span
              className="block text-[14px] leading-none tracking-[0.04em]"
              style={{ ...PIXEL_FONT, color: PX.accentLight }}
            >
              {t.title}
            </span>
            <span
              className="mt-[5px] block text-[15px] leading-[1.25]"
              style={{ color: `${PX.cream}d9` }}
            >
              {t.body}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Self-Determination Theory, named so a parent can look it up. */
function WhyItWorks() {
  return (
    <div className="mt-6 grid grid-cols-3 gap-[20px]">
      {SHIFT_SDT.map((p, i) => (
        <div key={p.pillar} className="flex items-center gap-[16px]">
          <span
            className="flex h-[76px] w-[76px] shrink-0 items-center justify-center"
            style={{ backgroundColor: PX.waterDeep, clipPath: notch(CELL) }}
          >
            <PixelIcon grid={SDT_ICONS[i]} palette={ICON_PALETTE} scale={4} />
          </span>
          <span className="min-w-0">
            <span
              className="block text-[15px] leading-none tracking-[0.08em]"
              style={{ ...PIXEL_FONT, color: PX.accentLight }}
            >
              {p.pillar}
            </span>
            <span
              className="mt-[7px] block font-kodchasan text-[23px] font-bold leading-[1.2]"
              style={{ color: PX.cream }}
            >
              {p.title}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Band({ isPrivate }: { isPrivate?: boolean }) {
  const price = `฿${COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div
      className="absolute inset-x-0 bottom-0 px-[56px] pb-[22px]"
      style={{ top: (BAND + 3) * CELL }}
    >
      <div className={`flex h-full ${isPrivate ? "items-center" : "items-start"} justify-between gap-7`}>
        <div className="min-w-0">
          {!isPrivate && (
            <>
              <div className="flex items-baseline gap-3.5">
                <p
                  className="font-kodchasan text-[33px] font-bold leading-[1.2]"
                  style={{ color: PX.cream }}
                >
                  {formatThaiDateRange(COHORT.startDate, COHORT.endDate)}
                </p>
                <span
                  className="font-kodchasan text-[28px] font-bold"
                  style={{ color: PX.accentLight }}
                >
                  {price}
                </span>
              </div>
              <p className="mt-0.5 text-[19px] leading-[1.5]" style={{ color: `${PX.cream}bf` }}>
                รับ {COHORT.seats} คน · Discord ทุกวัน {COHORT.sessionTime} น.
              </p>
              <p className="mt-2 flex items-center gap-3.5 text-[19px]">
                <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
                <span className="font-kodchasan font-semibold" style={{ color: PX.accent }}>
                  ■ ปิดรับสมัคร {formatThaiDate(COHORT.applyDeadline)}
                </span>
              </p>
            </>
          )}
          <div className={`${isPrivate ? "" : "mt-2.5 "}flex items-center gap-4`}>
            <PassionSeedMark size={26} />
            <p
              className="text-[16px] tracking-[0.08em]"
              style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}
            >
              passionseed.org/shift
            </p>
          </div>
        </div>
        {!isPrivate && (
          <div className="shrink-0 text-center">
            <div className="p-2" style={{ backgroundColor: PX.cream }}>
              <QRCode value={POSTER_URL} size={96} fgColor={PX.ink} bgColor={PX.cream} />
            </div>
            <p className="mt-1 text-[13px]" style={{ color: `${PX.cream}8c` }}>
              สแกนสมัคร
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ShiftPixelDetails({ isPrivate }: { isPrivate?: boolean }) {
  return (
    <div
      id="shift1-pixel-2"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: GRID_W * CELL, height: GRID_H * CELL, backgroundColor: PX.sky }}
    >
      <PixelScene />
      <Header />
      {/* The three sections share the deck evenly, so the page fills rather
          than leaving a gap above the footer. */}
      <div
        className="absolute inset-x-0 flex flex-col justify-between px-[56px]"
        style={{ top: (DECK + 6) * CELL, height: (BAND - DECK - 11) * CELL }}
      >
        <section>
          <SectionLabel th="สิ่งที่จะได้" en="What you ship" />
          <Outcomes />
        </section>

        <section>
          <SectionLabel th="7 วัน ทำอะไรบ้าง" en="How the week runs" />
          <Week />
          <Toolkit />
        </section>

        <section>
          <SectionLabel th="ทำไมถึงได้ผล" en="Self-Determination Theory" />
          <WhyItWorks />
        </section>
      </div>
      <Band isPrivate={isPrivate} />
    </div>
  );
}
