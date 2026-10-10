import QRCode from "react-qr-code";

import { SHIFT_PAYMENT, formatThaiDate, formatThaiDateRange, pairPriceBaht, priceLabel } from "@/lib/content/shift-cohort";
import { SHIFT_VOICES } from "@/lib/content/shift-voices";

import { faqItems, gridApplyUrl } from "../grid/slidesJoin";
import { RisoIcon, type RisoIconName } from "../RisoIcons";
import { INK, MISREG_TEXT, MarkerHighlight, REFUND_PROMISE } from "../riso";
import { COVER_TOTALS } from "./RisoGridCovers";
import { COHORT, CommentCta, DIM, InkCard, Kicker, QuoteCard, RisoSlide, Stamp } from "./RisoSlide";

/**
 * Post C, the offer. One way in: comment the keyword (the route behind most
 * SHIFT[1] applications), with the QR kept small as a fallback for parents
 * who screenshot the poster. Promises stay at "ต้นแบบ", never a finished app:
 * a student told us anything bigger reads as a scam.
 */

const sheet = (n: number) => ({ id: `shift2-grid-c-${n}`, page: n, total: COVER_TOTALS.c });

const OUTCOMES: { icon: RisoIconName; ink: string; title: string; body: string }[] = [
  { icon: "live", ink: INK.orange, title: "ต้นแบบที่คนนอกลองใช้ได้", body: "ใช้ AI ช่วยสร้าง ไม่ต้องมีพื้นฐาน ไม่ต้องสวย" },
  { icon: "metrics", ink: INK.pink, title: "หลักฐานจากคนลองใช้", body: "คำพูดจริงของคนใช้ และจุดที่พังแล้วเราแก้ยังไง" },
  { icon: "caseStudy", ink: INK.yellow, title: "พอร์ต 1 หน้า", body: "สรุปทั้งหมดใน 1 หน้า ใส่พอร์ตและใช้เล่าตอนสัมภาษณ์ TCAS1" },
];

export function OfferOutcomes() {
  return (
    <RisoSlide {...sheet(2)} tag="What you ship" title="ไม่มีพื้นฐาน ก็มีงานใส่พอร์ตได้ใน 7 วัน">
      <div className="space-y-9">
        {OUTCOMES.map((item) => (
          <div key={item.title} className="flex items-start gap-7">
            <RisoIcon name={item.icon} ink={item.ink} size={80} className="shrink-0" />
            <div>
              <p className="font-kodchasan text-[44px] font-bold leading-tight" style={{ color: item.ink }}>
                {item.title}
              </p>
              <p className="mt-1 text-[31px] leading-[1.5]" style={{ color: DIM }}>
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <InkCard className="mt-auto">
        <p className="font-kodchasan text-[36px] font-bold">
          {formatThaiDateRange(COHORT.startDate, COHORT.endDate)}
        </p>
        <p className="mt-1 text-[28px]" style={{ color: DIM }}>
          ออนไลน์บน Discord ทุกเย็น {COHORT.sessionTime} น. · ทำเดี่ยวหรือทีม 1-3 คน
        </p>
      </InkCard>
    </RisoSlide>
  );
}

export function OfferPrice() {
  const pairPrice = pairPriceBaht(COHORT);
  return (
    <RisoSlide {...sheet(3)} tag="Price · FAQ" title="ราคาและคำถามที่เจอบ่อย">
      <InkCard hot className="flex items-end justify-between">
        <p className="font-kodchasan text-[34px] font-bold leading-[1.35]">
          ต่อคน
          <br />
          ตลอด 7 วัน
        </p>
        <p className="font-kodchasan text-[124px] font-bold leading-[0.95]">{priceLabel(COHORT)}</p>
      </InkCard>
      {pairPrice !== null && (
        <p className="mt-4 font-kodchasan text-[34px] font-bold">
          <MarkerHighlight>{`ชวนเพื่อนมาด้วย จ่ายคนละ ฿${pairPrice}`}</MarkerHighlight>
        </p>
      )}
      <div className="mt-6">
        <QuoteCard voice={SHIFT_VOICES.hanaPrice} size={30} />
      </div>
      <div className="mt-5 space-y-3">
        {/* The pair price already sits under the price card, so skip its FAQ row. */}
        {faqItems(COHORT).filter((item) => pairPrice === null || !item.q.includes("เพื่อน")).map((item) => (
          <div key={item.q} className="pb-4" style={{ borderBottom: `1px dashed ${INK.paper}33` }}>
            <p className="text-[26px]" style={{ color: DIM }}>
              {item.q}
            </p>
            <p className="font-kodchasan text-[32px] font-bold leading-[1.3]" style={{ color: INK.paper }}>
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </RisoSlide>
  );
}

const PARENT_POINTS = [
  {
    title: "ดูแลโดยทีม PassionSeed",
    body: `mentor อยู่ในห้อง Discord ทุกเย็น ${COHORT.sessionTime} น. เรียนจากบ้าน ไม่ต้องเดินทาง`,
  },
  { title: "เห็นผลงานได้จริง", body: "ได้ต้นแบบที่เปิดให้ดูได้ พร้อมพอร์ต 1 หน้า ไม่ใช่แค่ใบเซอร์" },
  { title: REFUND_PROMISE, body: "ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเงินเต็มจำนวน" },
];

export function OfferParents() {
  return (
    <RisoSlide {...sheet(4)} tag="For parents" title="สำหรับผู้ปกครอง">
      <div className="space-y-9">
        {PARENT_POINTS.map((point, i) => (
          <div key={point.title} className="flex items-start gap-7">
            <Stamp n={i + 1} hot={i === 2} size={58} />
            <div>
              <p className="font-kodchasan text-[40px] font-bold leading-tight" style={{ color: INK.paper }}>
                {point.title}
              </p>
              <p className="mt-2 text-[30px] leading-[1.5]" style={{ color: DIM }}>
                {point.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-auto font-kodchasan text-[34px] font-bold" style={{ color: INK.yellow }}>
        ผู้ปกครองสอบถามได้ที่ LINE {SHIFT_PAYMENT.lineId}
      </p>
    </RisoSlide>
  );
}

/** What happens after the comment, so nobody has to ask. */
const STEPS = [
  "กรอกใบสมัครจากลิงก์ที่ได้ทาง DM",
  `โอน PromptPay ส่งสลิปใน LINE ${SHIFT_PAYMENT.lineId}`,
  "ทีมงานยืนยันที่นั่งให้",
];

export function OfferApply() {
  return (
    <RisoSlide {...sheet(5)} tag="How to apply" title="สมัครยังไง">
      <CommentCta />
      <ol className="mt-10 space-y-6">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-6">
            <Stamp n={i + 1} hot={i === 0} size={56} />
            <p className="font-kodchasan text-[32px] font-bold leading-[1.35]" style={{ color: INK.paper }}>
              {step}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-auto flex items-end justify-between gap-8">
        <div>
          <Kicker color={INK.yellow} size={20}>
            Deadline
          </Kicker>
          <p className="mt-3 font-kodchasan text-[80px] font-bold leading-none" style={MISREG_TEXT}>
            {formatThaiDate(COHORT.applyDeadline)}
          </p>
          <p className="mt-4 text-[30px]">
            <MarkerHighlight>รับ {COHORT.seats} คน ครบแล้วปิดก่อน</MarkerHighlight>
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div className="p-4" style={{ backgroundColor: INK.paper, boxShadow: `-4px 3px 0 ${INK.pink}` }}>
            <QRCode value={gridApplyUrl(COHORT)} size={170} fgColor={INK.black} bgColor={INK.paper} />
          </div>
          <p className="mt-3 text-[22px]" style={{ color: INK.paper }}>
            หรือสแกนสมัคร
          </p>
        </div>
      </div>
    </RisoSlide>
  );
}

export const OFFER_SLIDES = [OfferOutcomes, OfferPrice, OfferParents, OfferApply];
