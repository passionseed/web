import QRCode from "react-qr-code";

import {
  SHIFT_COHORT,
  SHIFT_DAILY_SHOW,
  SHIFT_SDT,
  SHIFT_SKILL_CARDS,
  formatThaiDate,
} from "@/lib/content/shift-cohort";

import { RisoIcon, type RisoIconName } from "./RisoIcons";
import { POSTER_URL } from "./ShiftPosterCover";
import {
  Grain,
  Halftone,
  INK,
  MISREG_TEXT,
  PageMark,
  PaperSheet,
  PassionSeedMark,
  Speckle,
} from "./riso";

/**
 * Poster page 2: what you walk away with, how the week runs, why it works
 * (SDT, said plainly), and what SHIFT is not. Same planet as the cover, now seen from the ground: the horizon glow
 * sits at the top edge so a swipe reads as one continuous scene.
 */

const OUTCOMES: { num: string; icon: RisoIconName; ink: string; title: string; body: string }[] = [
  {
    num: "1",
    icon: "live",
    ink: INK.orange,
    title: "Live Project",
    body: "ชิ้นงานจริงที่คนนอกกดใช้ได้ ไม่ต้องมีพื้นฐาน",
  },
  {
    num: "2",
    icon: "metrics",
    ink: INK.pink,
    title: "Proof Metrics",
    body: "ตัวเลขจากคนใช้จริง และ Pivot Log ทุกจุดที่พัง",
  },
  {
    num: "3",
    icon: "caseStudy",
    ink: INK.yellow,
    title: "1-Page Case Study",
    body: "เขียนจาก Demo Day และสิ่งที่เรียนรู้ ใช้ตอบสัมภาษณ์ TCAS1",
  },
];

const skill = (prefix: string) =>
  SHIFT_SKILL_CARDS.find((card) => card.title.startsWith(prefix))!;

const WEEK = [
  {
    title: `Squads of ${SHIFT_COHORT.squadSize}`,
    body: "ทุกคนทำโปรเจกต์ของตัวเอง ทีมช่วยกันหาคนมาลอง",
  },
  { title: "AI Tools", body: skill("AI Tools").detail },
  { title: "Anti Meat Proxy", body: skill("Anti Meat Proxy").detail },
  {
    title: "Daily Show",
    body: `ทุกเย็น ${SHIFT_DAILY_SHOW.map((beat) => beat.label).join(" / ")} ให้ทั้งห้องดู`,
  },
  {
    title: "Mentor on Discord",
    body: "พี่เลี้ยงรีวิวงานทุกวันในห้องทีม ซ้อมตอบกรรมการด้วยเคสของตัวเอง",
  },
];

function GroundGlow() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* The same horizon, cresting the top edge */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: -2860,
          width: 7200,
          height: 2900,
          background: `linear-gradient(180deg, #0b3f7e 90%, #d69ac4 97%, ${INK.orange} 100%)`,
          boxShadow:
            "0 2px 0 0 rgba(255,108,47,1), 0 8px 24px 2px rgba(255,90,30,0.55), 0 40px 110px 20px rgba(255,120,60,0.22)",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{ top: -2857, width: 7200, height: 2900, boxShadow: `0 2px 3px 0 ${INK.pink}`, opacity: 0.6 }}
      />
      {/* A pink halftone field bleeding up from the bottom corner */}
      <Halftone
        color={INK.pink}
        cell={8}
        dot={1.8}
        style={{ right: 0, bottom: 0, width: 700, height: 520, opacity: 0.55 }}
        mask="radial-gradient(ellipse at 100% 100%, black 0%, transparent 70%)"
      />
      <Grain opacity={0.36} />
      <Speckle opacity={0.22} />
    </div>
  );
}

function SectionLabel({ en, th }: { en: string; th: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <p className="font-kodchasan text-[32px] font-bold leading-[1.3]" style={MISREG_TEXT}>
        {th}
      </p>
      <p className="font-mono text-[13px] uppercase tracking-[0.28em]" style={{ color: `${INK.paper}73` }}>
        {en}
      </p>
    </div>
  );
}

function Outcomes() {
  return (
    <div className="grid grid-cols-3 gap-8">
      {OUTCOMES.map((item) => (
        <div key={item.num}>
          <div className="flex items-end gap-3">
            <RisoIcon name={item.icon} ink={item.ink} size={60} />
            <span
              className="font-kodchasan text-[34px] font-bold leading-none"
              style={{ color: item.ink, textShadow: `1.5px -1px 1.5px ${INK.blue}99` }}
            >
              {item.num}
            </span>
          </div>
          <p className="mt-4 font-kodchasan text-[26px] font-semibold" style={{ color: INK.paper }}>
            {item.title}
          </p>
          <p className="mt-1 text-[18px] leading-[1.55]" style={{ color: `${INK.paper}99` }}>
            {item.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function WhyItWorks() {
  return (
    <div className="grid grid-cols-3 gap-8">
      {SHIFT_SDT.map((item, i) => (
        <div key={item.pillar}>
          <p
            className="font-mono text-[13px] uppercase tracking-[0.24em]"
            style={{ color: [INK.orange, INK.pink, INK.yellow][i] }}
          >
            {item.pillar}
          </p>
          <p className="mt-1.5 font-kodchasan text-[24px] font-semibold" style={{ color: INK.paper }}>
            {item.title}
          </p>
          <p className="mt-1 text-[17px] leading-[1.55]" style={{ color: `${INK.paper}99` }}>
            {item.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function Week() {
  return (
    <div>
      {WEEK.map((row) => (
        <div
          key={row.title}
          className="grid grid-cols-[230px_1fr] items-baseline gap-6 py-3"
          style={{ borderTop: `1px solid ${INK.paper}1a` }}
        >
          <p className="font-kodchasan text-[23px] font-semibold" style={{ color: INK.yellow }}>
            {row.title}
          </p>
          <p className="text-[18px] leading-[1.5]" style={{ color: `${INK.paper}b3` }}>
            {row.body}
          </p>
        </div>
      ))}
    </div>
  );
}

function NotACertCamp() {
  return (
    <div>
      <p className="text-[18px] font-semibold" style={{ color: `${INK.paper}8c` }}>
        สิ่งที่เราไม่ใช่
      </p>
      <p
        className="relative mt-3 inline-block font-kodchasan text-[40px] font-bold leading-[1.25]"
        style={{ color: `${INK.paper}8c` }}
      >
        Certificate ×10,000
        <span
          className="absolute left-[-6px] right-[-6px] top-[54%] h-[7px] -rotate-2"
          style={{ backgroundColor: INK.pink, mixBlendMode: "screen" }}
          aria-hidden="true"
        />
      </p>
      <p className="mt-3 max-w-[470px] text-[19px] leading-[1.6]" style={{ color: `${INK.paper}99` }}>
        ค่ายสะสมใบเซอร์ ใบประกาศเหมือนกันหมื่นคน ไม่มีผลงาน กรรมการไม่ให้น้ำหนัก
      </p>
    </div>
  );
}

function ApplyBlock() {
  const price = `฿${SHIFT_COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div className="flex items-end gap-6">
      <div className="text-right">
        <p className="text-[19px]" style={{ color: `${INK.paper}b3` }}>
          คัดเลือก {SHIFT_COHORT.seats} คน · ดูแลทั่วถึง
        </p>
        <p className="font-kodchasan text-[72px] font-bold leading-[1.1]" style={MISREG_TEXT}>
          {price}
        </p>
        <p className="text-[19px] font-semibold" style={{ color: INK.yellow }}>
          ปิดรับ {formatThaiDate(SHIFT_COHORT.applyDeadline)}
        </p>
      </div>
      <div className="shrink-0 p-3" style={{ backgroundColor: INK.paper }}>
        <QRCode value={POSTER_URL} size={128} fgColor={INK.black} bgColor={INK.paper} />
      </div>
    </div>
  );
}

export function ShiftPosterDetails() {
  return (
    <PaperSheet id="shift-poster-2">
      <GroundGlow />
      <div className="relative flex h-full flex-col px-[62px] pb-[40px] pt-[64px]">
        <div className="mb-8">
          <PassionSeedMark size={44} />
        </div>
        <SectionLabel th="สิ่งที่จะได้" en="What you ship" />
        <div className="mt-5">
          <Outcomes />
        </div>

        <div className="mt-10">
          <SectionLabel th="7 วันทำงานยังไง" en="How the week runs" />
          <div className="mt-3">
            <Week />
          </div>
        </div>

        <div className="mt-10">
          <SectionLabel th="ทำไมถึงเวิร์ก" en="Self-Determination" />
          <div className="mt-4">
            <WhyItWorks />
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-8">
          <NotACertCamp />
          <ApplyBlock />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <PageMark page={2} total={2} />
          <p className="font-kodchasan text-[20px] italic" style={{ color: `${INK.paper}b3` }}>
            เลือกทำสิ่งที่ใช่ แล้วโตไปด้วยกัน · passionseed.org/shift
          </p>
        </div>
      </div>
    </PaperSheet>
  );
}
