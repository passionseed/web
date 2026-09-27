import QRCode from "react-qr-code";

import {
  POSTER_COHORT,
  type ShiftCohort,
  formatThaiDate,
  formatThaiDateRange,
} from "@/lib/content/shift-cohort";

import {
  ChromeWordmark,
  CohortBadge,
  INK,
  MISREG_TEXT,
  PageMark,
  OrbitSky,
  PaperSheet,
  MarkerHighlight,
  PassionSeedMark,
  REFUND_PROMISE,
  ShiftTracks,
} from "./riso";
import { PHONE_W, PosterPhone, StickerNote } from "./PosterPhone";

/**
 * Poster page 1: dawn seen from orbit, printed in four spot inks.
 * Sky on top, a curved black-ink planet below, the chrome wordmark sitting
 * on the burning horizon so it reflects the sky around it.
 */

export const POSTER_URL = `https://passionseed.org/shift/${POSTER_COHORT.round}?utm_source=poster`;

/** Horizon, in px from the top of the inked area. */
const HORIZON_Y = 700;
/** Inked area width: poster minus the paper margin on both sides. */
const INKED_W = 1028;
/** How much of the phone clears the horizon. */
const PHONE_RISE = 470;

const STEPS = [
  {
    num: "1",
    days: "Day 1–2",
    title: "Pick One Problem",
    body: "เลือกปัญหาเดียว ไปคุยกับคนที่เจอปัญหานี้จริง 3 คน",
  },
  {
    num: "2",
    days: "Day 3–5",
    title: "Let People Try It",
    body: "ทำเวอร์ชันแรกให้คนจริงลองใช้ อะไรไม่เวิร์กก็จดไว้แล้วแก้",
  },
  {
    num: "3",
    days: "Day 6–7",
    title: "Demo Day",
    body: "โชว์งานที่ใช้ได้จริง เล่าว่าเจอปัญหาอะไร แล้วแก้ยังไง",
  },
];

function Masthead() {
  return (
    <div className="flex items-center justify-between">
      <PassionSeedMark size={52} />
      <CohortBadge size={24} cohort={POSTER_COHORT} />
    </div>
  );
}

function SkyTitle() {
  return (
    <div className="max-w-[580px]">
      <h1
        className="font-kodchasan text-[72px] font-bold leading-[1.3] tracking-tight"
        style={MISREG_TEXT}
      >
        7 วัน ปั้น 1
        <br />
        โปรเจกต์จริง
      </h1>
      <div className="-ml-[40px] mt-4">
        <ChromeWordmark size={140} name={POSTER_COHORT.name} />
      </div>
      <div className="mt-8">
        <ShiftTracks size={34} />
      </div>
    </div>
  );
}

/** The phone rises from behind the planet. */
function RisingProject() {
  return (
    <PosterPhone
      style={{ left: INKED_W - 45 - PHONE_W, top: HORIZON_Y - PHONE_RISE }}
    />
  );
}

function StudentNote() {
  return <StickerNote style={{ left: 595, top: 150 }} size={32} />;
}

function Audience() {
  return (
    <p className="text-center text-[20px]" style={{ color: `${INK.paper}b3` }}>
      ม.4–ม.6 · โปรเจกต์ของตัวเอง มีกลุ่มเพื่อนเล็กๆ คอยช่วย · ใช้ AI ไม่ต้องมีพื้นฐาน
    </p>
  );
}

export function Timeline() {
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

export function Footer({ cohort = POSTER_COHORT }: { cohort?: ShiftCohort }) {
  const price = `฿${cohort.priceBaht.toLocaleString("en-US")}`;
  return (
    <div
      className="flex items-end justify-between gap-10 pt-7"
      style={{ borderTop: `1px solid ${INK.paper}1f` }}
    >
      <div>
        <p className="font-kodchasan text-[42px] font-bold leading-[1.3]" style={MISREG_TEXT}>
          {formatThaiDateRange(cohort.startDate, cohort.endDate)}
        </p>
        <p className="mt-1 text-[21px] leading-[1.6]" style={{ color: `${INK.paper}b3` }}>
          {price} · ออนไลน์บน Discord ทุกวัน {cohort.sessionTime} น.{" "}
          <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
        </p>
        <p
          className="mt-3 inline-flex items-center gap-3 font-kodchasan text-[24px] font-semibold"
          style={{ color: INK.yellow }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: INK.orange }} />
          ปิดรับสมัคร {formatThaiDate(cohort.applyDeadline)}
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
      <OrbitSky horizon={HORIZON_Y} rising={<RisingProject />} />
      <div className="relative flex h-full flex-col px-[62px] pb-[44px] pt-[46px]">
        <Masthead />
        <div className="mt-[40px]">
          <SkyTitle />
        </div>

        <div className="mt-auto space-y-7">
          <Timeline />
          <Audience />
          <Footer />
          <div className="flex items-center justify-between">
            <PageMark page={1} total={2} />
            <span className="font-mono text-[13px] tracking-[0.3em]" style={{ color: `${INK.paper}80` }}>
              SWIPE →
            </span>
          </div>
        </div>
      </div>
      <StudentNote />
    </PaperSheet>
  );
}
