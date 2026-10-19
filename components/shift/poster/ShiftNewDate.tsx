import { POSTER_COHORT, SHIFT_PAYMENT, formatThaiDate, type ShiftCohort } from "@/lib/content/shift-cohort";

import { Footer } from "./ShiftPosterCover";
import {
  ChromeWordmark,
  CohortBadge,
  INK,
  MISREG_TEXT,
  MarkerHighlight,
  OrbitSky,
  PaperSheet,
  PassionSeedMark,
} from "./riso";

/**
 * "New date" poster for a postponed round: the old calendar page struck
 * through and the new one rising over the horizon like the sun on the
 * cover. Feed (1080x1350) and Story (1080x1920) share one layout; the Story
 * keeps text out of the top and bottom bands Instagram covers.
 * Export: #shift-moved-feed, #shift-moved-story on /shift/poster/2/moved.
 */

const EN_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const TH_WEEKDAYS = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

function dateParts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { day, month: EN_MONTHS[month - 1], weekday: TH_WEEKDAYS[weekday] };
}

/** A tear-off desk calendar page. `struck` crosses it out in pink. */
function CalendarPage({
  iso,
  width,
  struck,
  style,
}: {
  iso: string;
  width: number;
  struck?: boolean;
  style?: React.CSSProperties;
}) {
  const { day, month, weekday } = dateParts(iso);
  const height = width * 1.12;
  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-[10px]"
      style={{
        width,
        height,
        backgroundColor: INK.paper,
        boxShadow: struck
          ? "0 18px 40px rgba(8,2,20,0.35)"
          : `-7px 5px 0 ${INK.pink}, 0 30px 70px rgba(8,2,20,0.55)`,
        ...style,
      }}
    >
      <div
        className="flex items-center justify-center font-mono font-bold tracking-[0.3em]"
        style={{
          height: height * 0.2,
          fontSize: width * 0.1,
          backgroundColor: struck ? "#8a8494" : INK.orange,
          color: INK.paper,
        }}
      >
        {month}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center" style={{ color: INK.black }}>
        <span className="font-kodchasan font-bold leading-none" style={{ fontSize: width * 0.56 }}>
          {day}
        </span>
        <span className="mt-1 font-kodchasan font-semibold" style={{ fontSize: width * 0.1 }}>
          {weekday}
        </span>
      </div>
      {/* Binding holes along the top edge */}
      <div className="absolute inset-x-0 top-[10px] flex justify-around px-[18%]" aria-hidden="true">
        {[0, 1].map((i) => (
          <span key={i} className="h-[14px] w-[14px] rounded-full" style={{ backgroundColor: INK.black }} />
        ))}
      </div>
      {struck && (
        <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 100 112" aria-hidden="true">
          <path d="M8 18 L92 98" stroke={INK.pink} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <path d="M92 20 L10 96" stroke={INK.pink} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        </svg>
      )}
    </div>
  );
}

/** The old page torn off and drifting up; the new one rising from behind the planet. */
function RisingPages({ cohort, horizon, scale }: { cohort: ShiftCohort; horizon: number; scale: number }) {
  const big = 330 * scale;
  const small = 210 * scale;
  return (
    <>
      {cohort.postponedFrom && (
        <CalendarPage
          iso={cohort.postponedFrom}
          width={small}
          struck
          style={{ right: 300 * scale, top: horizon - big * 1.12 - small * 0.62, rotate: "-13deg", opacity: 0.95 }}
        />
      )}
      <CalendarPage
        iso={cohort.startDate}
        width={big}
        style={{ right: 70, top: horizon - big * 1.12 + 24, rotate: "6deg" }}
      />
    </>
  );
}

function Headline({ cohort }: { cohort: ShiftCohort }) {
  return (
    <div className="max-w-[560px]">
      <p className="font-mono text-[20px] uppercase tracking-[0.3em]" style={{ color: INK.yellow }}>
        New start date
      </p>
      <h1
        className="mt-3 font-kodchasan text-[76px] font-bold leading-[1.2] tracking-tight"
        style={MISREG_TEXT}
      >
        เลื่อนวันเริ่ม
        <br />
        เป็น {formatThaiDate(cohort.startDate)}
      </h1>
      <div className="-ml-[36px] mt-3">
        <ChromeWordmark size={120} name={cohort.name} />
      </div>
    </div>
  );
}

const SAME_WEEK = "ครบ 7 วันเท่าเดิม เวลาเรียนเดิม";

function WhatChanged({ cohort }: { cohort: ShiftCohort }) {
  const rows = [
    { k: "เริ่ม", v: `${formatThaiDate(cohort.startDate)} คลาสแรก ${cohort.sessionTime.split("–")[0]} น.` },
    { k: "จบ", v: `${formatThaiDate(cohort.endDate)} Demo Day` },
    { k: "สมัคร", v: `ได้ถึง ${formatThaiDate(cohort.applyDeadline)} ก่อนคลาสแรก` },
  ];
  return (
    <div className="space-y-5">
      <p className="font-kodchasan text-[34px] font-bold" style={{ color: INK.paper }}>
        <MarkerHighlight>{SAME_WEEK}</MarkerHighlight>
      </p>
      <div className="grid grid-cols-3 gap-4">
        {rows.map((row) => (
          <div
            key={row.k}
            className="rounded-[8px] px-6 py-5"
            style={{ backgroundColor: `${INK.paper}0f`, boxShadow: `inset 0 0 0 1.5px ${INK.paper}26` }}
          >
            <p className="font-kodchasan text-[24px] font-bold" style={{ color: INK.orange }}>
              {row.k}
            </p>
            <p className="mt-1 font-kodchasan text-[24px] font-semibold leading-[1.4]" style={{ color: INK.paper }}>
              {row.v}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[22px] leading-[1.6]" style={{ color: `${INK.paper}b3` }}>
        สมัครไว้แล้วและมีคำถามเรื่องวันใหม่ ทัก LINE {SHIFT_PAYMENT.lineId} ได้เลย
      </p>
    </div>
  );
}

const FORMAT = {
  feed: { id: "shift-moved-feed", width: 1080, height: 1350, horizon: 640, padTop: 46, padBottom: 44, scale: 1 },
  story: { id: "shift-moved-story", width: 1080, height: 1920, horizon: 1000, padTop: 210, padBottom: 250, scale: 1.12 },
} as const;

export function ShiftNewDate({ format = "feed", cohort = POSTER_COHORT }: { format?: keyof typeof FORMAT; cohort?: ShiftCohort }) {
  const f = FORMAT[format];
  return (
    <PaperSheet id={f.id} width={f.width} height={f.height}>
      <OrbitSky horizon={f.horizon} rising={<RisingPages cohort={cohort} horizon={f.horizon} scale={f.scale} />} />
      <div
        className="relative flex h-full flex-col px-[62px]"
        style={{ paddingTop: f.padTop, paddingBottom: f.padBottom }}
      >
        <div className="flex items-center justify-between">
          <PassionSeedMark size={52} />
          <CohortBadge size={24} cohort={cohort} />
        </div>
        <div className="mt-[40px]">
          <Headline cohort={cohort} />
        </div>
        <div className="mt-auto space-y-8">
          <WhatChanged cohort={cohort} />
          <Footer cohort={cohort} />
        </div>
      </div>
    </PaperSheet>
  );
}
