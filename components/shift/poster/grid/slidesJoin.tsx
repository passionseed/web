import QRCode from "react-qr-code";

import {
  PAIR_DISCOUNT_BAHT,
  SHIFT_COHORT,
  SHIFT_PAYMENT,
  formatThaiDate,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
} from "@/lib/content/shift-cohort";

import { MarkerHighlight, REFUND_PROMISE } from "../riso";
import { PIXEL_FONT } from "../pixel/PixelRects";
import { PX } from "../pixel/pixelKit";
import { HOT_GRADIENT } from "./ApplyCta";
import { deck } from "./deckCritters";
import { DeckCard, GridSlideFrame, MUTED, Plate, notch } from "./GridSlideFrame";

/** Post C, how to join: price, a slide for parents, and the three steps. */

const COHORT = SHIFT_COHORT;
/** Straight to the form: /shift/1 does not forward utm_source to it. */
export const GRID_APPLY_URL = `https://passionseed.org/shift/apply?round=${COHORT.round}&utm_source=ig-grid`;

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-6 border-b-2 border-dashed pb-4"
      style={{ borderColor: `${PX.cream}26` }}
    >
      <p className="text-[28px]" style={{ color: MUTED }}>
        {k}
      </p>
      <p className="text-right font-kodchasan text-[32px] font-bold" style={{ color: PX.cream }}>
        {v}
      </p>
    </div>
  );
}

const C2_CRITTERS = [
  ...deck.school(118, 192, 6),
  ...deck.bubbles(112, 188, 4),
  ...deck.weed(10, 12),
  ...deck.weed(162, 16),
];

export function SlideC2() {
  const pair = pairPriceBaht(COHORT);
  return (
    <GridSlideFrame id="shift1-grid-c-2" tag="PRICE · SEATS" title="ราคาและรายละเอียด" page="2/4" critters={C2_CRITTERS}>
      <DeckCard hot fill={HOT_GRADIENT} className="flex items-end justify-between">
        <div>
          <p className="font-kodchasan text-[30px] font-bold">ต่อคน ตลอด 7 วัน</p>
          {COHORT.anchorPriceBaht && (
            <p className="font-kodchasan text-[36px] font-bold line-through" style={{ opacity: 0.55 }}>
              {baht(COHORT.anchorPriceBaht)}
            </p>
          )}
        </div>
        <p className="font-kodchasan text-[150px] font-bold leading-[0.9]">{priceLabel(COHORT)}</p>
      </DeckCard>
      {pair !== null && (
        <p className="mt-6 font-kodchasan text-[36px] font-bold" style={{ color: PX.accentLight }}>
          ชวนเพื่อนมาเป็นคู่ ลดคนละ {baht(PAIR_DISCOUNT_BAHT)} เหลือ {baht(pair)}
        </p>
      )}
      <div className="mt-10 space-y-5">
        <Fact k="รับ" v={`${COHORT.seats} คน · เดี่ยวหรือทีม ${teamSizeLabel(COHORT)}`} />
        <Fact k="ใครสมัครได้" v="ม.4-ม.6 ไม่ต้องมีพื้นฐาน" />
        <Fact k="เรียนที่ไหน" v={`Discord ทุกเย็น ${COHORT.sessionTime}`} />
        <Fact k="ปิดรับสมัคร" v={formatThaiDate(COHORT.applyDeadline)} />
      </div>
      <p className="mt-10 text-[36px]">
        <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
      </p>
    </GridSlideFrame>
  );
}

const PARENT_POINTS = [
  {
    title: "มีพี่เลี้ยงดูแลทุกทีม",
    body: `พี่ๆ อยู่ในห้อง Discord ทุกเย็น ติดตรงไหนถามได้ทันที ผู้ปกครองทักทีมงานทาง LINE ${SHIFT_PAYMENT.lineId} ได้ตลอด`,
  },
  { title: "เรียนจากบ้าน ทุกเย็น 1 ทุ่ม", body: `ออนไลน์ ${COHORT.sessionTime} น. ไม่ต้องเดินทาง ไม่ชนเวลาเรียน` },
  { title: "เห็นผลงานได้จริง", body: "ลูกได้ชิ้นงานที่เปิดให้ดูได้ พร้อมพอร์ต 1 หน้า ไม่ใช่แค่ใบเซอร์" },
  { title: REFUND_PROMISE, body: "ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเงินเต็มจำนวน" },
];

/** Calm water for the parents: fish only, no croc on this one. */
const C3_CRITTERS = [
  ...deck.school(140, 90, 4),
  ...deck.bigFish(142, 170, 2),
  ...deck.bubbles(158, 160, 4),
  ...deck.weed(164, 14),
];

export function SlideC3() {
  return (
    <GridSlideFrame id="shift1-grid-c-3" tag="FOR PARENTS" title="สำหรับผู้ปกครอง" page="3/4" critters={C3_CRITTERS}>
      <div className="max-w-[800px] space-y-9">
        {PARENT_POINTS.map((point, i) => (
          <div key={point.title} className="flex items-start gap-7">
            <Plate label={String(i + 1)} size={54} hot={i === 0} />
            <div>
              <p className="font-kodchasan text-[40px] font-bold leading-tight" style={{ color: PX.cream }}>
                {point.title}
              </p>
              <p className="mt-2 text-[27px] leading-[1.5]" style={{ color: MUTED }}>
                {point.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-auto pb-2 font-kodchasan text-[34px] font-semibold" style={{ color: PX.accentLight }}>
        ส่งสไลด์นี้ให้ที่บ้านดูได้เลย
      </p>
    </GridSlideFrame>
  );
}

const APPLY_STEPS = [
  "คอมเมนต์ SHIFT หรือกดลิงก์ในไบโอ",
  "กรอกใบสมัคร 2 นาที",
  `โอน PromptPay แล้วส่งสลิปใน LINE ${SHIFT_PAYMENT.lineId}`,
];

/** A croc peering up at the QR code from the bottom corner. */
const C4_CRITTERS = [...deck.croc(10, 198, 2, true), ...deck.bubbles(66, 192, 4), ...deck.weed(164, 12)];

export function SlideC4() {
  return (
    <GridSlideFrame id="shift1-grid-c-4" tag="HOW TO APPLY" title="สมัครยังไง" page="4/4" critters={C4_CRITTERS}>
      <ol className="space-y-5">
        {APPLY_STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-6">
            <Plate label={String(i + 1)} size={54} hot={i === 0} />
            <p className="font-kodchasan text-[32px] font-bold leading-[1.35]" style={{ color: PX.cream }}>
              {step}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-14 flex items-center justify-between gap-8">
        <div>
          <p className="text-[26px] tracking-[0.12em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
            DEADLINE
          </p>
          <p className="mt-2 font-kodchasan text-[92px] font-bold leading-none" style={{ color: PX.accent }}>
            {formatThaiDate(COHORT.applyDeadline)}
          </p>
          <p className="mt-5 text-[28px]" style={{ color: MUTED }}>
            รับแค่ {COHORT.seats} คน ครบแล้วปิดก่อน
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div className="p-5" style={{ backgroundColor: PX.cream, clipPath: notch(12) }}>
            <QRCode value={GRID_APPLY_URL} size={300} fgColor={PX.ink} bgColor={PX.cream} />
          </div>
          <p className="mt-3 text-[24px] tracking-[0.12em]" style={{ ...PIXEL_FONT, color: PX.cream }}>
            SCAN TO APPLY
          </p>
        </div>
      </div>
    </GridSlideFrame>
  );
}
