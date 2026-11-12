import type { ReactElement } from "react";

import { formatThaiDate } from "@/lib/content/shift-cohort";
import { SHIFT3_FEATURED_SHORTS } from "@/lib/marketing/sets/shift3";

import { MarkerHighlight } from "../../riso";
import { SHIFT3 } from "../../shift3/facts";
import { LATIN } from "../../shift3/parts";
import { PIXEL_FONT } from "../PixelRects";
import { sprite, type Rect } from "../pixelKit";
import { CommentBubble } from "./CommentBubble";
import { ProjectShowcase } from "./ProjectShowcase";
import { ShiftHighInfographic } from "./ShiftHighInfographic";
import { HalloweenSlide, Marked, SLIDE_GROUND } from "./HalloweenSlide";
import { CAT, CAT_PALETTE, GHOST, GHOST_DIM_PALETTE, HX, bigSprite, lanternGlow, tombstone, witchStudent } from "./halloweenKit";
import { ShiftPixelHalloweenCover } from "./ShiftPixelHalloweenCover";

/**
 * SHIFT[3] Halloween Instagram carousel at 1080x1350, call to action
 * "คอมเมนต์ SHIFT" (no QR). The first slide is the Halloween cover, the rest
 * use HalloweenSlide, and the last is SHIFT High, the alumni community after
 * the round, with one free month of follow-up for this round. Facts come from SHIFT_COHORT_3 via SHIFT3; copy reused from
 * the launch carousel comes from lib/marketing/sets/shift3.ts.
 */

const C = SHIFT3.cohort;
const deadline = formatThaiDate(C.applyDeadline);
/** Full refund wording from the launch caption (rule in lib/content/shift-refund.ts). */
const REFUND_LINE = "ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็ม";

/** Where a slide sits in the carousel; slides are numbered by their place in SLIDES. */
interface SlidePos {
  page: number;
  total: number;
}

/** Export id for a page: "shift3-hw-01". */
const id = (page: number) => `shift3-hw-${String(page).padStart(2, "0")}`;

/** Slide 2 art: a row of headstones engraved CERT, a ghost drifting off them. */
const CERT_GRAVES = [
  { x: 18, h: 40 },
  { x: 56, h: 48 },
  { x: 96, h: 36 },
  { x: 134, h: 44 },
];
const CERT_W = 28;

function certGraveyard(): Rect[] {
  return [
    ...CERT_GRAVES.flatMap((g) => tombstone(g.x, SLIDE_GROUND + 6, CERT_W, g.h)),
    ...bigSprite(GHOST, GHOST_DIM_PALETTE, 104, 96, 3),
  ];
}

function ProblemSlide({ page, total }: SlidePos) {
  return (
    <HalloweenSlide
      id={id(page)} page={page} total={total}
      tag="Trick or ship"
      title={"เลิกสะสม\n==ใบเซอร์ค่ายนั่งฟัง=="}
      decor={certGraveyard()}
      align="top"
    >
      <p className="whitespace-pre-line font-kodchasan text-[46px] font-bold leading-[1.4]" style={{ color: HX.cream }}>
        <Marked text={`มาสร้าง**ของจริง**ใน ${SHIFT3.days} เย็น\nแล้วชวนคนนอกมาลองใช้`} />
      </p>
      {/* Engraving sits on the headstones drawn in certGraveyard(). */}
      {CERT_GRAVES.map((g) => (
        <span
          key={g.x}
          className="absolute text-[40px]"
          style={{
            ...PIXEL_FONT,
            color: HX.stoneDark,
            left: (g.x + CERT_W / 2) * 6 - 72,
            top: (SLIDE_GROUND + 6 - g.h + 6) * 6 - 80,
            transform: "translateX(-50%)",
          }}
        >
          CERT
        </span>
      ))}
    </HalloweenSlide>
  );
}

/** Days grouped the way the poster sign does: PICK, SHIP, DEMO. */
const STAGES = [
  { label: "PICK", days: [1, 2] },
  { label: "SHIP", days: [3, 4, 5] },
  { label: "DEMO", days: [6, 7] },
];

function StageBoard({ label, days }: { label: string; days: number[] }) {
  const items = C.schedule.filter((d) => days.includes(d.day));
  return (
    <div className="p-[6px]" style={{ backgroundColor: HX.woodDark }}>
      <div className="flex gap-[28px] px-[28px] py-[20px]" style={{ backgroundColor: HX.bone }}>
        <div className="w-[170px] shrink-0">
          <p className="text-[26px] font-semibold" style={{ fontFamily: LATIN, color: HX.woodDark }}>
            DAY {days[0]}-{days[days.length - 1]}
          </p>
          {/* Latin font: in Tiny5 the P of PICK reads as an F. */}
          <p className="text-[50px] font-extrabold leading-none tracking-[0.04em]" style={{ fontFamily: LATIN, color: HX.pumpkinDark }}>
            {label}
          </p>
        </div>
        <ul className="flex flex-col justify-center gap-[6px]">
          {items.map((d) => (
            <li key={d.day} className="font-kodchasan text-[27px] font-bold leading-[1.35]" style={{ color: HX.ink }}>
              {d.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScheduleSlide({ page, total }: SlidePos) {
  return (
    <HalloweenSlide id={id(page)} page={page} total={total} tag={`${SHIFT3.days} evenings · ${SHIFT3.dates}`} title={"จากโจทย์เดียว\nถึง ==Demo Day=="}>
      <div className="flex flex-col gap-[22px]">
        {STAGES.map((s) => (
          <StageBoard key={s.label} {...s} />
        ))}
      </div>
      <p className="mt-[26px] text-[26px]" style={{ color: `${HX.cream}cc` }}>
        ไลฟ์บน Discord ทุกเย็น {SHIFT3.time} น.
      </p>
    </HalloweenSlide>
  );
}

function ProofSlide({ page, total }: SlidePos) {
  return (
    <HalloweenSlide id={id(page)} page={page} total={total} tag="Shipped by past rounds" title={"รุ่นก่อน\n==ปล่อยของจริง==ไปแล้ว"}>
      <ProjectShowcase lens={SHIFT3_FEATURED_SHORTS[0]} />
    </HalloweenSlide>
  );
}

function PriceSlide({ page, total }: SlidePos) {
  const facts = [
    `รับ ${SHIFT3.seats} คน · ปิดรับสมัคร ${deadline}`,
    `${SHIFT3.dates} · ไลฟ์บน Discord ทุกเย็น ${SHIFT3.time} น.`,
    `ม.4-ม.6 · ทำเดี่ยวหรือทีม ${SHIFT3.team}`,
    "ไม่ต้องเขียนโค้ดเป็น ใช้ AI ช่วยสร้าง แต่เราเป็นคนตัดสินใจ",
  ];
  return (
    <HalloweenSlide id={id(page)} page={page} total={total} tag="Price" title="ราคาและสิ่งที่ต้องรู้">
      <p className="flex items-baseline gap-[18px]">
        <span className="text-[150px] font-bold leading-none tracking-[-0.02em]" style={{ fontFamily: LATIN, color: HX.flame }}>
          {SHIFT3.price}
        </span>
        <span className="font-kodchasan text-[40px] font-bold" style={{ color: HX.cream }}>
          ต่อคน
        </span>
      </p>
      {SHIFT3.pairPrice && (
        <p className="mt-[18px] font-kodchasan text-[36px] font-bold" style={{ color: HX.cream }}>
          สมัครคู่กับเพื่อน จ่ายคนละ <span style={{ color: HX.pumpkin }}>{SHIFT3.pairPrice}</span>
        </p>
      )}
      <ul className="mt-[34px] flex flex-col gap-[14px]">
        {facts.map((f) => (
          <li key={f} className="flex items-start gap-[18px] text-[28px] leading-[1.45]" style={{ color: `${HX.cream}d9` }}>
            <span className="mt-[14px] h-[14px] w-[14px] shrink-0" style={{ backgroundColor: HX.pumpkin }} />
            {f}
          </li>
        ))}
      </ul>
      <p className="mt-[34px] text-[28px]">
        <MarkerHighlight>{REFUND_LINE}</MarkerHighlight>
      </p>
    </HalloweenSlide>
  );
}

/** Slide 7 art: the student and the cat, big, under the comment bubble. */
function applyScene(): Rect[] {
  return [
    ...lanternGlow(90, 180, 18, HX.ground, HX.screen),
    ...tombstone(112, SLIDE_GROUND + 4, 11, 12),
    ...bigSprite(CAT, CAT_PALETTE, 110, SLIDE_GROUND + 4 - 12 - 16, 2),
    ...witchStudent(72, SLIDE_GROUND + 6, 3),
    ...sprite(GHOST, GHOST_DIM_PALETTE, 34, 150),
  ];
}

function ApplySlide({ page, total }: SlidePos) {
  return (
    <HalloweenSlide id={id(page)} page={page} total={total} tag="Apply" title={`สมัครได้ถึง\n==${deadline}==`} decor={applyScene()} align="top">
      <div className="flex flex-col items-center">
        <CommentBubble keyword={SHIFT3.keyword} scale={2} />
        <p className="mt-[10px] text-center font-kodchasan text-[36px] font-bold leading-[1.45]" style={{ color: HX.cream }}>
          รับลิงก์สมัครทาง DM
          <br />
          <span className="text-[28px] font-semibold" style={{ color: `${HX.cream}bf` }}>
            กรอกใบสมัคร 2 นาทีเสร็จ
          </span>
        </p>
      </div>
    </HalloweenSlide>
  );
}

/** Slide 8: SHIFT High, the community students join once the round ends, as an infographic. */
function ShiftHighSlide({ page, total }: SlidePos) {
  return (
    <HalloweenSlide
      id={id(page)} page={page} total={total}
      tag="After the 7 days"
      title={"ไปต่อที่ ==SHIFT High==\nดูแลต่อ**ฟรี 1 เดือน**"}
    >
      <ShiftHighInfographic />
    </HalloweenSlide>
  );
}

/** The carousel in posting order; reorder or drop a slide here and the numbers follow. */
const SLIDES: { key: string; Slide: (pos: SlidePos) => ReactElement }[] = [
  { key: "cover", Slide: ({ page }) => <ShiftPixelHalloweenCover id={id(page)} cta="comment" /> },
  { key: "problem", Slide: ProblemSlide },
  { key: "schedule", Slide: ScheduleSlide },
  { key: "proof", Slide: ProofSlide },
  { key: "price", Slide: PriceSlide },
  { key: "apply", Slide: ApplySlide },
  { key: "shift-high", Slide: ShiftHighSlide },
];

export const SHIFT3_HALLOWEEN_SLIDE_IDS = SLIDES.map((_, i) => id(i + 1));

/** Every slide rendered at its position, for the export page. */
export const SHIFT3_HALLOWEEN_SLIDES = SLIDES.map(({ key, Slide }, i) => (
  <Slide key={key} page={i + 1} total={SLIDES.length} />
));
