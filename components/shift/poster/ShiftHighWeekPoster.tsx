import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import { ALUMNI_DEFAULT_DOC, timeRangeLabel } from "@/lib/content/shift-alumni";

import { PassionSeedMark } from "./riso";
import { Eyebrow, Glass, LATIN, Planet, Wordmark } from "./ShiftHighPoster";

/**
 * SHIFT High week 1 (Saturday 24 October 2026): the run of show and the
 * month ahead, for students, on the same planet as the SHIFT High offer.
 * 1080x1350. Export: screenshot #shift-high-week-1.
 */

export const SHIFT_HIGH_WEEK_POSTER_ID = "shift-high-week-1";
const { startTime, endTime } = ALUMNI_DEFAULT_DOC.defaults;

const RUN = [
  { at: "19:00", title: "เช็กอิน", line: "โปรเจกต์อะไร ทำให้ใคร คนละ 1 ประโยค", color: COSMOS.star },
  { at: "19:10", title: "ตั้งเป้า 3 ระยะ", line: "Vision · ของถึงมือผู้ใช้จริง · สัปดาห์หน้า (ใครเคยมาแล้ว เช็กเป้าครั้งก่อน ✅ ❌)", color: COSMOS.nebula },
  { at: "19:30", title: "ล้อมวง คนละ 7 นาที", line: "ความคืบหน้า ไอเดีย ปัญหาที่ติด เพื่อนคอมเมนต์ พี่เมนเทอร์ให้ insight", color: COSMOS.aurora },
  { at: "20:30", title: "Real-users clinic", line: "ทุกคนได้ชื่อคนนอก 1 คน ที่จะชวนมาลองใช้สัปดาห์นี้", color: COSMOS.flare },
  { at: "20:50", title: "ล็อกเป้าสัปดาห์หน้า", line: "เลือกวันอัปเดตกลางสัปดาห์ แล้วไปลุยกัน", color: COSMOS.sol },
];

const MONTH = [
  { week: "W1", line: "ตั้งเป้า + หาคนนอก", now: true },
  { week: "W2", line: "คนนอกได้ลองใช้จริง" },
  { week: "W3", line: "คนแปลกหน้าลองใช้" },
  { week: "W4", line: "Demo night" },
];

function Title() {
  return (
    <div style={{ textShadow: `0 2px 18px ${COSMOS.void}` }}>
      <div className="flex items-center gap-4">
        <Wordmark size={72} />
        <span
          className="rounded-full px-4 py-1 text-[20px] font-semibold uppercase tracking-[0.16em]"
          style={{ fontFamily: LATIN, color: starlight("dd"), boxShadow: `inset 0 0 0 1px ${starlight("33")}` }}
        >
          Week 1
        </span>
      </div>
      <h1 className="mt-9 text-[94px] font-bold leading-[1.18]">
        เสาร์นี้
        <br />
        <span style={{ color: COSMOS.aurora }}>เจอกันในวง</span>
      </h1>
      <p className="mt-3 text-[32px] font-semibold leading-tight">
        เสาร์ 24 ต.ค. <span style={{ color: COSMOS.sol }}>{timeRangeLabel(startTime, endTime)}</span>
      </p>
      <p className="text-[26px]" style={{ color: starlight("b3") }}>
        ออนไลน์ใน Discord
      </p>
      <p className="mt-4 text-[23px]" style={{ color: starlight("dd") }}>
        <span className="font-semibold" style={{ color: starlight("99") }}>
          เตรียมมา
        </span>{" "}
        📱 โปรเจกต์ที่เปิดโชว์ได้ · 🧱 ปัญหาที่ติด 1 อย่าง
      </p>
    </div>
  );
}

function RunOfShow() {
  return (
    <Glass className="px-8 pb-5 pt-6">
      <Eyebrow step="Run of show" />
      <ol className="mt-3">
        {RUN.map((item, i) => (
          <li key={item.at} className="flex gap-5">
            <span className="w-[86px] shrink-0 pt-[3px] text-[24px] font-semibold" style={{ fontFamily: LATIN, color: item.color }}>
              {item.at}
            </span>
            <span className="relative flex w-[18px] shrink-0 justify-center">
              <span className="mt-[11px] h-[14px] w-[14px] rounded-full" style={{ background: item.color, boxShadow: `0 0 12px ${item.color}` }} />
              {i < RUN.length - 1 && <span className="absolute bottom-0 top-[30px] w-px" style={{ background: starlight("33") }} />}
            </span>
            <span className="min-w-0 pb-3">
              <span className="block text-[26px] font-semibold leading-tight">{item.title}</span>
              <span className="block text-[20px] leading-snug" style={{ color: starlight("b3") }}>
                {item.line}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Glass>
  );
}

function Month() {
  return (
    <Glass className="px-8 pb-6 pt-6">
      <Eyebrow step="This month" />
      <ol className="mt-4 grid grid-cols-4 gap-3">
        {MONTH.map((week) => (
          <li
            key={week.week}
            className="rounded-[18px] px-4 py-3"
            style={{
              background: week.now ? `${COSMOS.sol}1f` : "rgba(255,255,255,0.04)",
              boxShadow: `inset 0 0 0 1px ${week.now ? `${COSMOS.sol}88` : starlight("1f")}`,
            }}
          >
            <span className="block text-[22px] font-semibold" style={{ fontFamily: LATIN, color: week.now ? COSMOS.sol : starlight("99") }}>
              {week.week}
            </span>
            <span className="block text-[20px] font-semibold leading-snug">{week.line}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[20px]" style={{ color: starlight("b3") }}>
        กลางสัปดาห์: อัปเดตในเธรดโปรเจกต์บน Discord <span style={{ color: starlight("ee") }}>ทำอะไรแล้ว · ทำอะไรต่อ · ติดตรงไหน</span>
      </p>
    </Glass>
  );
}

export function ShiftHighWeekPoster() {
  return (
    <div
      id={SHIFT_HIGH_WEEK_POSTER_ID}
      lang="th"
      className="relative h-[1350px] w-[1080px] shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{
        color: COSMOS.star,
        background: `radial-gradient(900px 600px at 85% 0%, ${COSMOS.nebula}33, transparent 60%), radial-gradient(700px 500px at 0% 30%, ${COSMOS.indigo}40, transparent 65%), radial-gradient(900px 500px at 70% 100%, ${COSMOS.indigo}55, transparent 70%), ${COSMOS.void}`,
      }}
    >
      <Planet />
      <div className="relative flex h-full flex-col px-[60px] pb-[50px] pt-[44px]">
        <div className="flex items-center justify-between">
          <PassionSeedMark size={42} />
        </div>
        <div className="mt-[34px]">
          <Title />
        </div>
        <div className="mt-auto space-y-[18px]">
          <RunOfShow />
          <Month />
        </div>
      </div>
    </div>
  );
}
