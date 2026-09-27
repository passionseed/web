import type { CSSProperties } from "react";
import QRCode from "react-qr-code";

import {
  POSTER_COHORT,
  pairPriceBaht,
  SHIFT_DAILY_SHOW,
  SHIFT_SDT,
  SHIFT_SKILL_CARDS,
  formatThaiDate,
} from "@/lib/content/shift-cohort";

import { RisoIcon, type RisoIconName } from "./RisoIcons";
import { POSTER_URL } from "./ShiftPosterCover";
import {
  ChromeWordmark,
  AmHalftone,
  Grain,
  INK,
  MISREG_TEXT,
  PageMark,
  PaperSheet,
  PassionSeedMark,
  Speckle,
} from "./riso";

/**
 * Poster page 2: what you walk away with, how the week runs, why it works
 * (SDT, named big so parents can look it up), and what SHIFT is not. Same planet as the cover, now seen from the ground: the horizon glow
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
    body: "ตัวเลขจากคนใช้จริง และบันทึกทุกจุดที่พังแล้วแก้ยังไง",
  },
  {
    num: "3",
    icon: "caseStudy",
    ink: INK.yellow,
    title: "1-Page Portfolio",
    body: "สรุปสิ่งที่ทำและได้เรียนรู้ใน 1 หน้า ใส่พอร์ตและใช้ตอบสัมภาษณ์ TCAS1",
  },
];

const skill = (prefix: string) =>
  SHIFT_SKILL_CARDS.find((card) => card.title.startsWith(prefix))!;

const WEEK = [
  {
    title: "Own Project",
    body: "ทุกคนทำโปรเจกต์ของตัวเอง มีกลุ่มเพื่อนเล็กๆ คอยช่วยหาคนมาลอง",
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
      <AmHalftone
        color={INK.pink}
        cell={6}
        angle={15}
        style={{ right: 0, bottom: 0, width: 700, height: 520, opacity: 0.8 }}
        radial={{ cx: 1, cy: 1, r: 1 }}
        tone={[[0, 0.42], [0.45, 0.24], [0.8, 0]]}
      />
      <Grain opacity={0.24} />
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

/** Names the theory outright: a parent can look up "SDT" and find decades of research. */
function WhyHeading() {
  return (
    <div className="flex items-baseline gap-4">
      <p className="font-kodchasan text-[32px] font-bold leading-[1.3]" style={MISREG_TEXT}>
        ทำไมถึงเวิร์ก
      </p>
      <p
        className="font-kodchasan text-[32px] font-bold leading-[1.3]"
        style={{ color: INK.paper, textShadow: `-2px 1.5px 0 ${INK.pink}, 2px -1px 0 ${INK.blue}` }}
      >
        SDT Theory
      </p>
      <p className="font-mono text-[13px] uppercase tracking-[0.24em]" style={{ color: `${INK.paper}73` }}>
        Deci &amp; Ryan · University of Rochester
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
          className="grid grid-cols-[230px_1fr] items-baseline gap-6 py-2"
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

/** One camp certificate: seal, name line, signature. Every one looks the same. */
function MiniCert({ style }: { style: CSSProperties }) {
  return (
    <div
      className="absolute flex h-[62px] w-[88px] flex-col justify-between rounded-[3px] p-2"
      style={{ backgroundColor: "#8f8a80", boxShadow: "0 3px 8px rgba(0,0,0,0.45)", ...style }}
    >
      <div className="mx-auto h-[4px] w-[44px] rounded-full" style={{ backgroundColor: "#6b665d" }} />
      <div className="mx-auto h-[3px] w-[58px] rounded-full" style={{ backgroundColor: "#6b665d" }} />
      <div className="flex items-end justify-between">
        <span className="h-[14px] w-[14px] rounded-full" style={{ backgroundColor: "#b0626f" }} />
        <span className="h-[2px] w-[28px]" style={{ backgroundColor: "#6b665d" }} />
      </div>
    </div>
  );
}

/** A pile of identical certificates: nothing in it says who you are. */
function CertPile() {
  const offsets = [
    { left: 0, top: 26, rotate: "-8deg" },
    { left: 22, top: 16, rotate: "-3deg" },
    { left: 44, top: 8, rotate: "3deg" },
    { left: 66, top: 0, rotate: "7deg" },
  ];
  return (
    <div className="relative h-[92px] w-[156px]">
      {offsets.map((o) => (
        <MiniCert key={o.left} style={o} />
      ))}
    </div>
  );
}

/** The one thing only you made: a live project with real users on it. */
function OwnProjectCard() {
  return (
    <div
      className="w-[118px] overflow-hidden rounded-[8px]"
      style={{ backgroundColor: INK.paper, rotate: "-4deg", boxShadow: `0 6px 18px rgba(0,0,0,0.5), 0 0 0 2px ${INK.orange}` }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ backgroundColor: INK.orange }}>
        <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: INK.paper }} />
        <span className="font-mono text-[10px] font-bold tracking-[0.14em]" style={{ color: INK.paper }}>
          LIVE
        </span>
      </div>
      <div className="flex h-[52px] items-end gap-[5px] px-2.5 pb-2">
        {[14, 22, 18, 30, 38].map((h) => (
          <span key={h} className="w-[14px] rounded-t-[2px]" style={{ height: h, backgroundColor: INK.blue }} />
        ))}
      </div>
    </div>
  );
}

function CompareLabel({ title, body, ink }: { title: string; body: string; ink: string }) {
  return (
    <div className="mt-2">
      <p className="font-kodchasan text-[20px] font-semibold leading-tight" style={{ color: ink }}>
        {title}
      </p>
      <p className="text-[16px] leading-[1.5]" style={{ color: `${INK.paper}99` }}>
        {body}
      </p>
    </div>
  );
}

/** Camp certificate vs your own project, shown rather than argued. */
function NotACertCamp() {
  return (
    <div>
      <p className="font-kodchasan text-[24px] font-bold" style={MISREG_TEXT}>
        ไม่ใช่ค่ายเก็บใบเซอร์
      </p>
      <div className="mt-2 flex items-start gap-4">
        <div className="w-[180px]">
          <div className="flex h-[88px] items-end">
            <CertPile />
          </div>
          <CompareLabel title="ใบเซอร์ค่าย" body="ใครไปก็ได้ใบเหมือนกันหมด" ink={`${INK.paper}8c`} />
        </div>
        <p className="mt-[30px] font-kodchasan text-[32px] font-bold" style={{ color: INK.orange }}>
          →
        </p>
        <div className="w-[180px]">
          <div className="flex h-[88px] items-end">
            <OwnProjectCard />
          </div>
          <CompareLabel title="ผลงานของเรา" body="มีชิ้นเดียว คนใช้ได้จริง" ink={INK.paper} />
        </div>
      </div>
    </div>
  );
}

/** Bring-a-friend price, shown only when the round has one. */
function FriendDeal() {
  const friend = pairPriceBaht(POSTER_COHORT);
  if (!friend) return null;
  return (
    <p
      className="mb-2 inline-block whitespace-nowrap rounded-full px-3.5 py-1 font-kodchasan text-[18px] font-semibold"
      style={{ color: INK.paper, boxShadow: `inset 0 0 0 1.5px ${INK.pink}`, backgroundColor: `${INK.pink}26` }}
    >
      ชวนเพื่อนมา เหลือคนละ ฿{friend.toLocaleString("en-US")}
    </p>
  );
}

function ApplyBlock() {
  const price = `฿${POSTER_COHORT.priceBaht.toLocaleString("en-US")}`;
  return (
    <div className="flex items-end gap-6">
      <div className="text-right">
        <p className="text-[19px]" style={{ color: `${INK.paper}b3` }}>
          คัดเลือก {POSTER_COHORT.seats} คน · ดูแลทั่วถึง
        </p>
        <p className="font-kodchasan text-[72px] font-bold leading-[1.1]" style={MISREG_TEXT}>
          {price}
        </p>
        <FriendDeal />
        <p className="text-[19px] font-semibold" style={{ color: INK.yellow }}>
          ปิดรับ {formatThaiDate(POSTER_COHORT.applyDeadline)}
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
      <div className="relative flex h-full flex-col px-[62px] pb-[40px] pt-[56px]">
        <div className="mb-6 flex items-center justify-between">
          <PassionSeedMark size={44} />
          <div className="-my-4 -mr-[14px]">
            <ChromeWordmark size={76} name={POSTER_COHORT.name} />
          </div>
        </div>
        <SectionLabel th="สิ่งที่จะได้" en="What you ship" />
        <div className="mt-5">
          <Outcomes />
        </div>

        <div className="mt-8">
          <SectionLabel th="7 วัน ทำอะไรบ้าง" en="How the week runs" />
          <div className="mt-3">
            <Week />
          </div>
        </div>

        <div className="mt-7">
          <WhyHeading />
          <div className="mt-3">
            <WhyItWorks />
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-8 pt-6">
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
