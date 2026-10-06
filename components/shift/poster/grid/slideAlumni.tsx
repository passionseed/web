import QRCode from "react-qr-code";

import {
  SHIFT_COHORT,
  formatThaiDate,
  teamSizeLabel,
} from "@/lib/content/shift-cohort";

import { MarkerHighlight, REFUND_PROMISE } from "../riso";
import { PIXEL_FONT } from "../pixel/PixelRects";
import { PX } from "../pixel/pixelKit";
import { HOT_GRADIENT } from "./ApplyCta";
import { deck } from "./deckCritters";
import { DeckCard, GridSlideFrame, MUTED, Plate, notch } from "./GridSlideFrame";

/**
 * SHIFT[1] comeback poster for PassionSeed alumni, broadcast on LINE.
 * One sheet that stands alone: who it is for, the alumni price, and a QR.
 * The alumni price is a broadcast-only offer, so it lives here and not in
 * the cohort data that drives the public page.
 */

const COHORT = SHIFT_COHORT;
const ALUMNI_PRICE_BAHT = 550;
export const ALUMNI_URL = `https://www.passionseed.org/shift/${COHORT.round}?utm_source=line_alumni`;

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

const PERKS = [
  `โปรเจกต์ของตัวเอง ทำเดี่ยวหรือทีม ${teamSizeLabel(COHORT)}`,
  "ปล่อยให้คนใช้จริงลองภายใน 7 วัน",
  "จบด้วยพอร์ต 1 หน้า ใช้ยื่น TCAS1 ได้",
];

const CRITTERS = [
  ...deck.weed(8, 12),
  ...deck.weed(166, 14),
];

/** A stepped 12-point burst, the pixel version of a sale sticker. */
const BURST = `polygon(${Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  const r = i % 2 === 0 ? 50 : 40;
  return `${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`;
}).join(", ")})`;

/** "ลด ฿120" sticker slapped on the card corner, deliberately off-axis. */
function SavingsBurst() {
  return (
    <div
      className="absolute -right-[18px] -top-[70px] flex h-[230px] w-[230px] rotate-[12deg] items-center justify-center"
      style={{ clipPath: BURST, backgroundColor: PX.ink }}
    >
      <div
        className="flex h-[212px] w-[212px] flex-col items-center justify-center text-center"
        style={{ clipPath: BURST, backgroundColor: "#FFE066", color: PX.ink }}
      >
        <p className="font-kodchasan text-[36px] font-bold leading-none">ลด</p>
        <p className="font-kodchasan text-[64px] font-bold leading-[1.05]">
          {baht(COHORT.priceBaht - ALUMNI_PRICE_BAHT)}
        </p>
      </div>
    </div>
  );
}

/** Old price with a thick ink slash through it, heavier than line-through. */
function SlashedPrice() {
  return (
    <span className="relative inline-block font-kodchasan text-[64px] font-bold leading-none" style={{ opacity: 0.6 }}>
      {baht(COHORT.priceBaht)}
      <span
        className="absolute left-[-6px] right-[-6px] top-1/2 h-[8px] -rotate-[10deg]"
        style={{ backgroundColor: PX.ink }}
      />
    </span>
  );
}

function AlumniPriceCard() {
  return (
    <div className="relative mt-4">
      <DeckCard hot fill={HOT_GRADIENT} className="!px-10 !pb-8 !pt-8">
        <p
          className="inline-block px-4 pb-1 pt-2 text-[26px] tracking-[0.14em]"
          style={{ ...PIXEL_FONT, backgroundColor: PX.ink, color: "#FFE066", clipPath: notch(6) }}
        >
          ALUMNI ONLY
        </p>
        <p className="mt-4 font-kodchasan text-[34px] font-bold leading-tight">ราคาพิเศษ ศิษย์เก่า PassionSeed</p>
        <div className="mt-4 flex items-end gap-6">
          <p
            className="font-kodchasan text-[220px] font-bold leading-[0.82] tracking-tight"
            style={{ textShadow: `8px 8px 0 ${PX.accentDark}` }}
          >
            {baht(ALUMNI_PRICE_BAHT)}
          </p>
          <div className="pb-6">
            <p className="text-[22px] tracking-[0.12em]" style={PIXEL_FONT}>
              FROM
            </p>
            <SlashedPrice />
          </div>
        </div>
      </DeckCard>
      <SavingsBurst />
    </div>
  );
}

function Perks() {
  return (
    <ol className="mt-10 space-y-5">
      {PERKS.map((perk, i) => (
        <li key={perk} className="flex items-center gap-6">
          <Plate label={String(i + 1)} size={50} hot={i === 1} />
          <p className="font-kodchasan text-[32px] font-bold leading-[1.35]" style={{ color: PX.cream }}>
            {perk}
          </p>
        </li>
      ))}
    </ol>
  );
}

function DeadlineAndQr() {
  return (
    <div className="mt-auto flex items-end justify-between gap-8 pb-2">
      <div>
        <p className="text-[24px] tracking-[0.12em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          DEADLINE
        </p>
        <p className="mt-2 font-kodchasan text-[84px] font-bold leading-none" style={{ color: PX.accent }}>
          {formatThaiDate(COHORT.applyDeadline)}
        </p>
        <p className="mt-4 text-[28px]" style={{ color: MUTED }}>
          รับแค่ {COHORT.seats} คน ครบแล้วปิดก่อน
        </p>
        <p className="mt-4 text-[30px]">
          <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
        </p>
      </div>
      <div className="shrink-0 text-center">
        <div className="p-4" style={{ backgroundColor: PX.cream, clipPath: notch(12) }}>
          <QRCode value={ALUMNI_URL} size={230} fgColor={PX.ink} bgColor={PX.cream} />
        </div>
        <p className="mt-3 text-[22px] tracking-[0.12em]" style={{ ...PIXEL_FONT, color: PX.cream }}>
          SCAN TO APPLY
        </p>
      </div>
    </div>
  );
}

export function ShiftAlumniPoster() {
  return (
    <GridSlideFrame
      id="shift1-alumni"
      tag="SHIFT[1] · COMEBACK"
      title="ศิษย์เก่า กลับมาสร้างอีกรอบ"
      page="5-11 OCT · ONLINE"
      critters={CRITTERS}
    >
      <AlumniPriceCard />
      <p className="mt-6 font-kodchasan text-[32px] font-bold" style={{ color: PX.accentLight }}>
        เฉพาะคนที่เคยเรียนกับเรา · ใช้ได้ถึง {formatThaiDate(COHORT.applyDeadline)} เท่านั้น
      </p>
      <Perks />
      <DeadlineAndQr />
    </GridSlideFrame>
  );
}
