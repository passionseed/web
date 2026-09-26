import QRCode from "react-qr-code";

import {
  SHIFT_COHORT,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

import {
  ChromeWordmark,
  INK,
  MISREG_TEXT,
  PageMark,
  OrbitSky,
  PaperSheet,
  PassionSeedMark,
} from "./riso";

/**
 * Poster page 1: dawn seen from orbit, printed in four spot inks.
 * Sky on top, a curved black-ink planet below, the chrome wordmark sitting
 * on the burning horizon so it reflects the sky around it.
 */

export const POSTER_URL = "https://passionseed.org/shift?utm_source=poster";

/** Horizon, in px from the top of the inked area. */
const HORIZON_Y = 700;

const STEPS = [
  {
    num: "1",
    days: "Day 1–2",
    title: "Lock One Problem",
    body: "ล็อกสโคป 1 หน้า คุยกับคนที่เจอปัญหาจริง 3 คน",
  },
  {
    num: "2",
    days: "Day 3–5",
    title: "Ship to Strangers",
    body: "ปล่อยให้คนนอกใช้ อะไรพังจดลง Pivot Log",
  },
  {
    num: "3",
    days: "Day 6–7",
    title: "Demo Day",
    body: "โชว์ของจริงให้ทุกคนดู เล่าว่าอะไรพังและได้เรียนรู้อะไร",
  },
];

function Masthead() {
  return (
    <div
      className="flex items-center justify-between font-mono text-[14px] uppercase tracking-[0.3em]"
      style={{ color: `${INK.paper}cc` }}
    >
      <PassionSeedMark size={52} />
      <span>Cohort 01 · {SHIFT_COHORT.seats} seats</span>
    </div>
  );
}

function SkyTitle() {
  return (
    <div className="text-center">
      <h1
        className="font-kodchasan text-[74px] font-bold leading-[1.3] tracking-tight"
        style={MISREG_TEXT}
      >
        7 วัน ปั้น 1
        <br />
        โปรเจกต์จริง
      </h1>
      <div className="mt-6">
        <ChromeWordmark size={176} />
      </div>
    </div>
  );
}

function Timeline() {
  return (
    <div className="grid grid-cols-3">
      {STEPS.map((step, i) => (
        <div
          key={step.num}
          className="px-6"
          style={i > 0 ? { borderLeft: `1px solid ${INK.paper}1f` } : undefined}
        >
          <p
            className="font-mono text-[13px] uppercase tracking-[0.24em]"
            style={{ color: INK.orange }}
          >
            {step.num} · {step.days}
          </p>
          <p
            className="mt-2 whitespace-nowrap font-kodchasan text-[26px] font-semibold leading-[1.3]"
            style={{ color: INK.paper }}
          >
            {step.title}
          </p>
          <p className="mt-1.5 text-[18px] leading-[1.6]" style={{ color: `${INK.paper}99` }}>
            {step.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function Footer() {
  const price = `฿${SHIFT_COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div
      className="flex items-end justify-between gap-10 pt-7"
      style={{ borderTop: `1px solid ${INK.paper}1f` }}
    >
      <div>
        <p className="font-kodchasan text-[42px] font-bold leading-[1.3]" style={MISREG_TEXT}>
          {formatThaiDateRange(SHIFT_COHORT.startDate, SHIFT_COHORT.endDate)}
        </p>
        <p className="mt-1 text-[21px] leading-[1.6]" style={{ color: `${INK.paper}b3` }}>
          {price} · ออนไลน์บน Discord วันละ 1–2 ชม. · ไม่ได้ชิ้นงาน คืนเงินเต็ม
        </p>
        <p
          className="mt-3 inline-flex items-center gap-3 font-kodchasan text-[24px] font-semibold"
          style={{ color: INK.yellow }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK.orange }} />
          ปิดรับสมัคร {formatThaiDate(SHIFT_COHORT.applyDeadline)}
        </p>
      </div>
      <div className="shrink-0 text-center">
        <div className="p-3" style={{ backgroundColor: INK.paper }}>
          <QRCode value={POSTER_URL} size={128} fgColor={INK.black} bgColor={INK.paper} />
        </div>
        <p className="mt-2 text-[15px]" style={{ color: `${INK.paper}8c` }}>
          สแกนสมัคร
        </p>
      </div>
    </div>
  );
}

export function ShiftPosterCover() {
  return (
    <PaperSheet id="shift-poster-1">
      <OrbitSky horizon={HORIZON_Y} />
      <div className="relative flex h-full flex-col px-[62px] pb-[44px] pt-[46px]">
        <Masthead />
        <div className="mt-[40px]">
          <SkyTitle />
        </div>

        <div className="mt-auto space-y-9">
          <Timeline />
          <p className="text-center text-[19px]" style={{ color: `${INK.paper}a6` }}>
            ม.4–ม.6 · รับ {SHIFT_COHORT.seats} คน ดูแลทั่วถึง · ทีมละ {SHIFT_COHORT.squadSize} · สอนใช้ AI{" "}
            <span className="pathlab-note ml-2 !rotate-[-2.5deg] text-[17px]">
              โชว์ของจริงทุกเย็น ของพังก็โชว์ได้
            </span>
          </p>
          <Footer />
          <div className="flex items-center justify-between">
            <PageMark page={1} total={2} />
            <span className="font-mono text-[13px] tracking-[0.3em]" style={{ color: `${INK.paper}80` }}>
              SWIPE →
            </span>
          </div>
        </div>
      </div>
    </PaperSheet>
  );
}
