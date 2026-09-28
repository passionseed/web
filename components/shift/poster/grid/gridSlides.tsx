import QRCode from "react-qr-code";

import {
  PAIR_DISCOUNT_BAHT,
  SHIFT_COHORT,
  SHIFT_COHORT_0,
  SHIFT_DAILY_SHOW,
  SHIFT_PAYMENT,
  SHIFT_SDT,
  SHIFT_SKILL_CARDS,
  formatThaiDate,
  pairPriceBaht,
  priceLabel,
} from "@/lib/content/shift-cohort";

import { MarkerHighlight, REFUND_PROMISE } from "../riso";
import { PIXEL_FONT, PixelIcon } from "../pixel/PixelRects";
import { CHART, CREW, ICON_PALETTE, PORTFOLIO, ROCKET, SIGNPOST, TROPHY } from "../pixel/pixelIcons";
import { PX } from "../pixel/pixelKit";
import { DeckCard, DeckLabel, GridSlideFrame, MUTED, Plate } from "./GridSlideFrame";

/**
 * Inner slides for the three SHIFT[1] grid posts.
 *   A: why (certificates vs live work, SHIFT[0] proof, why it works)
 *   B: what (the 7 days, how the room runs, what you walk away with)
 *   C: how to join (price, for parents, apply steps + QR)
 */

const COHORT = SHIFT_COHORT;
/** Straight to the form: /shift/1 does not forward utm_source to it. */
export const GRID_APPLY_URL = `https://passionseed.org/shift/apply?round=${COHORT.round}&utm_source=ig-grid`;

const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

// ─── Post A: why ────────────────────────────────────────────────────────────

const CERT_SIDE = ["ทุกคนได้เหมือนกัน", "จ่ายเงินครบก็ได้มา", "สัมภาษณ์แล้วไม่มีอะไรให้เล่า"];
const LIVE_SIDE = ["คนนอกกดใช้ได้จริง", "มีตัวเลขจากคนที่ลองใช้", "เล่าได้ว่าอะไรพัง แล้วแก้ยังไง"];

function CompareColumn({ title, items, hot }: { title: string; items: string[]; hot?: boolean }) {
  return (
    <DeckCard hot={hot} className="flex-1">
      <p className="font-kodchasan text-[36px] font-bold leading-tight">{title}</p>
      <ul className="mt-6 space-y-5 text-[31px] leading-[1.4]">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span style={PIXEL_FONT}>{hot ? "+" : "×"}</span>
            {item}
          </li>
        ))}
      </ul>
    </DeckCard>
  );
}

export function SlideA2() {
  return (
    <GridSlideFrame id="shift1-grid-a-2" tag="CERT VS LIVE WORK" title="กรรมการเห็นอะไรในพอร์ต" page="2/4">
      <div className="flex gap-6">
        <CompareColumn title="ใบเซอร์ค่ายนั่งฟัง" items={CERT_SIDE} />
        <CompareColumn title="Live Project" items={LIVE_SIDE} hot />
      </div>
      <div>
        <p className="font-kodchasan text-[46px] font-bold leading-[1.35]" style={{ color: PX.cream }}>
          ของที่ลอกกันไม่ได้
          <br />
          คือของที่เราทำเอง <span style={{ color: PX.accentLight }}>แล้วมีคนใช้จริง</span>
        </p>
      </div>
    </GridSlideFrame>
  );
}

export function SlideA3() {
  const projects = SHIFT_COHORT_0.showcase ?? [];
  return (
    <GridSlideFrame id="shift1-grid-a-3" tag={`${SHIFT_COHORT_0.name} · PILOT`} title="รุ่นทดลองปล่อยของจริงแล้ว" page="3/4">
      <DeckLabel>7 วัน น้องๆ ม.ปลาย ทำสิ่งนี้</DeckLabel>
      <ol className="mt-6 space-y-4">
        {projects.map((project, i) => (
          <li key={project.url}>
            <DeckCard className="flex items-center gap-6">
              <Plate label={String(i + 1)} hot={i === 0} />
              <div className="min-w-0">
                <p className="font-kodchasan text-[36px] font-bold leading-tight">{project.title}</p>
                <p className="mt-1 truncate text-[22px]" style={{ ...PIXEL_FONT, color: MUTED }}>
                  {project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </p>
              </div>
            </DeckCard>
          </li>
        ))}
      </ol>
      <p className="font-kodchasan text-[32px] font-semibold" style={{ color: PX.accentLight }}>
        ลองพิมพ์ลิงก์เข้าไปกดเล่นได้เลย
      </p>
    </GridSlideFrame>
  );
}

const SDT_ICONS = [SIGNPOST, TROPHY, CREW];

export function SlideA4() {
  return (
    <GridSlideFrame id="shift1-grid-a-4" tag="SDT THEORY" title="ทำไมไม่ใช่ค่ายนั่งฟัง" page="4/4">
      <div className="space-y-5">
        {SHIFT_SDT.map((pillar, i) => (
          <DeckCard key={pillar.pillar} className="flex items-start gap-7">
            <PixelIcon grid={SDT_ICONS[i]} palette={ICON_PALETTE} scale={7} className="mt-2 shrink-0" />
            <div>
              <p className="font-kodchasan text-[38px] font-bold leading-tight">
                {pillar.title}{" "}
                <span className="text-[22px] tracking-[0.1em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
                  {pillar.pillar.toUpperCase()}
                </span>
              </p>
              <p className="mt-2 text-[27px] leading-[1.45]" style={{ color: MUTED }}>
                {pillar.detail}
              </p>
            </div>
          </DeckCard>
        ))}
      </div>
      <p className="font-kodchasan text-[36px] font-bold" style={{ color: PX.cream }}>
        สมัคร {COHORT.name} <span style={{ color: PX.accentLight }}>ลิงก์ในไบโอ</span>
      </p>
    </GridSlideFrame>
  );
}

// ─── Post B: what ───────────────────────────────────────────────────────────

export function SlideB2() {
  return (
    <GridSlideFrame id="shift1-grid-b-2" tag="THE WEEK" title="7 วัน ทำอะไรบ้าง" page="2/4">
      <ol className="space-y-[14px]">
        {COHORT.schedule.map((day) => (
          <li key={day.day}>
            <DeckCard hot={day.day === 7} className="flex items-center gap-6 !py-4">
              <Plate label={String(day.day)} size={60} hot={day.day !== 7 && day.day === 4} />
              <div className="min-w-0 flex-1">
                <p className="text-[22px] tracking-[0.1em]" style={{ ...PIXEL_FONT, opacity: 0.75 }}>
                  {day.label.toUpperCase()} · {formatThaiDate(day.date, false)}
                </p>
                <p className="font-kodchasan text-[32px] font-bold leading-tight">{day.title}</p>
              </div>
            </DeckCard>
          </li>
        ))}
      </ol>
      <p className="text-[26px]" style={{ color: MUTED }}>
        ออนไลน์ทาง Discord ทุกเย็น {COHORT.sessionTime} น.
      </p>
    </GridSlideFrame>
  );
}

export function SlideB3() {
  return (
    <GridSlideFrame id="shift1-grid-b-3" tag="HOW THE ROOM RUNS" title="โปรเจกต์ของเรา ทีมละ 3 คน" page="3/4">
      <DeckLabel>ทุกเย็น ทุกทีมโชว์ 3 เรื่อง</DeckLabel>
      <div className="mt-5 grid grid-cols-3 gap-4">
        {SHIFT_DAILY_SHOW.map((beat, i) => (
          <DeckCard key={beat.label} hot={i === 1} className="!px-6">
            <p className="text-[34px] tracking-[0.06em]" style={PIXEL_FONT}>
              {beat.label.toUpperCase()}
            </p>
            <p className="mt-2 text-[23px] leading-[1.45]" style={{ opacity: 0.85 }}>
              {beat.detail}
            </p>
          </DeckCard>
        ))}
      </div>
      <div className="mt-10">
        <DeckLabel>การ์ดสกิล ทีมเลือกเองวันละใบ</DeckLabel>
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5">
          {SHIFT_SKILL_CARDS.map((card) => (
            <div key={card.title}>
              <p className="text-[26px] tracking-[0.04em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
                {card.title}
              </p>
              <p className="mt-1 text-[22px] leading-[1.4]" style={{ color: MUTED }}>
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </GridSlideFrame>
  );
}

const OUTCOMES = [
  { title: "Live Project", icon: ROCKET, body: "ชิ้นงานจริงที่คนนอกกดใช้ได้ ใช้ AI ช่วยสร้าง ไม่ต้องมีพื้นฐาน" },
  { title: "Proof", icon: CHART, body: "ตัวเลขจากคนที่ลองใช้ และทุกจุดที่พังแล้วเราแก้ยังไง" },
  { title: "พอร์ต 1 หน้า", icon: PORTFOLIO, body: "สรุปทั้งหมดใน 1 หน้า ใส่พอร์ตและใช้เล่าตอนสัมภาษณ์ TCAS1" },
];

export function SlideB4() {
  return (
    <GridSlideFrame id="shift1-grid-b-4" tag="WHAT YOU SHIP" title="จบ 7 วัน ได้อะไรกลับไป" page="4/4">
      <div className="space-y-5">
        {OUTCOMES.map((o) => (
          <DeckCard key={o.title} className="flex items-center gap-7">
            <PixelIcon grid={o.icon} palette={ICON_PALETTE} scale={8} className="shrink-0" />
            <div>
              <p className="font-kodchasan text-[40px] font-bold leading-tight">{o.title}</p>
              <p className="mt-1 text-[27px] leading-[1.45]" style={{ color: MUTED }}>
                {o.body}
              </p>
            </div>
          </DeckCard>
        ))}
      </div>
      <p className="text-[34px]">
        <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
      </p>
    </GridSlideFrame>
  );
}

// ─── Post C: how to join ────────────────────────────────────────────────────

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b-2 border-dashed pb-4" style={{ borderColor: `${PX.cream}33` }}>
      <p className="text-[28px]" style={{ color: MUTED }}>
        {k}
      </p>
      <p className="text-right font-kodchasan text-[32px] font-bold" style={{ color: PX.cream }}>
        {v}
      </p>
    </div>
  );
}

export function SlideC2() {
  const pair = pairPriceBaht(COHORT);
  return (
    <GridSlideFrame id="shift1-grid-c-2" tag="PRICE · SEATS" title="ราคาและรายละเอียด" page="2/4">
      <DeckCard hot className="flex items-end justify-between">
        <div>
          <p className="font-kodchasan text-[30px] font-bold">ต่อคน ตลอด 7 วัน</p>
          {COHORT.anchorPriceBaht && (
            <p className="font-kodchasan text-[36px] font-bold line-through" style={{ opacity: 0.55 }}>
              {baht(COHORT.anchorPriceBaht)}
            </p>
          )}
        </div>
        <p className="font-kodchasan text-[140px] font-bold leading-[0.9]">
          {priceLabel(COHORT)}
        </p>
      </DeckCard>
      {pair !== null && (
        <p className="mt-5 font-kodchasan text-[34px] font-bold" style={{ color: PX.accentLight }}>
          ชวนเพื่อนมาเป็นคู่ ลดคนละ {baht(PAIR_DISCOUNT_BAHT)} เหลือ {baht(pair)}
        </p>
      )}
      <div className="mt-8 space-y-4">
        <Fact k="รับ" v={`${COHORT.seats} คน · ทีมละ ${COHORT.squadSize}`} />
        <Fact k="ใครสมัครได้" v="ม.4-ม.6 ไม่ต้องมีพื้นฐาน" />
        <Fact k="เรียนที่ไหน" v={`Discord ทุกเย็น ${COHORT.sessionTime}`} />
        <Fact k="ปิดรับสมัคร" v={formatThaiDate(COHORT.applyDeadline)} />
      </div>
      <p className="text-[34px]">
        <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
      </p>
    </GridSlideFrame>
  );
}

const PARENT_POINTS = [
  { title: "คุยกันในห้องกลุ่มเท่านั้น", body: "ไม่มีแชทส่วนตัว 1:1 ระหว่างพี่เลี้ยงกับน้อง ทุกอย่างอยู่ในห้องที่ทีมงานเห็น" },
  { title: "เรียนจากบ้าน 7 เย็น", body: `ออนไลน์ ${COHORT.sessionTime} น. ไม่ต้องเดินทาง ไม่ชนเวลาเรียน` },
  { title: "เห็นผลงานได้จริง", body: "ลูกได้ชิ้นงานที่เปิดให้ดูได้ พร้อมพอร์ต 1 หน้า ไม่ใช่แค่ใบเซอร์" },
  { title: REFUND_PROMISE, body: "ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเงินเต็มจำนวน" },
];

export function SlideC3() {
  return (
    <GridSlideFrame id="shift1-grid-c-3" tag="FOR PARENTS" title="สำหรับผู้ปกครอง" page="3/4">
      <div className="space-y-5">
        {PARENT_POINTS.map((point, i) => (
          <DeckCard key={point.title} className="flex items-start gap-6">
            <Plate label={String(i + 1)} hot={i === 0} />
            <div>
              <p className="font-kodchasan text-[36px] font-bold leading-tight">{point.title}</p>
              <p className="mt-1 text-[26px] leading-[1.45]" style={{ color: MUTED }}>
                {point.body}
              </p>
            </div>
          </DeckCard>
        ))}
      </div>
      <p className="font-kodchasan text-[30px] font-semibold" style={{ color: PX.accentLight }}>
        ส่งสไลด์นี้ให้ที่บ้านดูได้เลย
      </p>
    </GridSlideFrame>
  );
}

const APPLY_STEPS = [
  "กรอกใบสมัคร 2 นาที (ลิงก์ในไบโอ หรือสแกน QR)",
  "โอนผ่าน PromptPay ตามยอด",
  `ส่งสลิปใน LINE ${SHIFT_PAYMENT.lineId} แล้วรอพี่ยืนยันที่นั่ง`,
];

export function SlideC4() {
  return (
    <GridSlideFrame id="shift1-grid-c-4" tag="HOW TO APPLY" title="สมัครยังไง" page="4/4">
      <ol className="space-y-5">
        {APPLY_STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-6">
            <Plate label={String(i + 1)} size={64} hot={i === 0} />
            <p className="font-kodchasan text-[34px] font-bold leading-[1.35]" style={{ color: PX.cream }}>
              {step}
            </p>
          </li>
        ))}
      </ol>
      <div className="flex items-end justify-between gap-8 pb-4">
        <div>
          <p className="font-kodchasan text-[64px] font-bold leading-[1.1]" style={{ color: PX.cream }}>
            ปิดรับ
            <br />
            <span style={{ color: PX.accent }}>{formatThaiDate(COHORT.applyDeadline)}</span>
          </p>
          <p className="mt-3 text-[26px]" style={{ color: MUTED }}>
            รับแค่ {COHORT.seats} คน ครบแล้วปิดก่อน
          </p>
        </div>
        <div className="shrink-0 text-center">
          <div className="p-4" style={{ backgroundColor: PX.cream }}>
            <QRCode value={GRID_APPLY_URL} size={250} fgColor={PX.ink} bgColor={PX.cream} />
          </div>
          <p className="mt-2 text-[22px]" style={{ color: MUTED }}>
            สแกนสมัคร
          </p>
        </div>
      </div>
    </GridSlideFrame>
  );
}

export const GRID_SLIDES = {
  a: [SlideA2, SlideA3, SlideA4],
  b: [SlideB2, SlideB3, SlideB4],
  c: [SlideC2, SlideC3, SlideC4],
} as const;
