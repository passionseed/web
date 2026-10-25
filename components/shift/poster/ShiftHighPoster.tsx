import type { ReactNode } from "react";
import Image from "next/image";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import { ALUMNI_DEFAULT_DOC, timeRangeLabel, weekdayName } from "@/lib/content/shift-alumni";
import { SHIFT_COHORT_2 } from "@/lib/content/shift-cohort";
import { SHIFT_2_ALUMNI_TEST_PRICE } from "@/lib/shift/feedback";

import { PassionSeedMark } from "./riso";

/**
 * SHIFT High: the one-page alumni offer for SHIFT[2] (1080x1350), on the
 * SHIFT planet (pre-rendered, so it exports without WebGL). The name plays on
 * ชิบหาย: the camp is over, the project does not have to die. The why and the
 * sign-up link go in the message that carries the poster. Price, day and time
 * come from the feedback form and alumni calendar records.
 * Export: screenshot #shift-high.
 */

export const SHIFT_HIGH_POSTER_ID = "shift-high";
const C = SHIFT_COHORT_2;
const PRICE = SHIFT_2_ALUMNI_TEST_PRICE;
const { firstDate, startTime, endTime } = ALUMNI_DEFAULT_DOC.defaults;
const DAY = weekdayName(firstDate).replace(/^วัน/, "");
export const LATIN = "var(--font-libre-franklin), ui-sans-serif, system-ui, sans-serif";

const GOALS = [
  { term: "ระยะยาว", label: "Vision", text: "โปรเจกต์นี้อยากไปถึงไหน", ring: COSMOS.nebula },
  { term: "ระยะกลาง", label: "Product", text: "ของถึงมือผู้ใช้จริงที่ไม่รู้จักเรา", ring: COSMOS.aurora },
  { term: "ระยะสั้น", label: "Next week", text: "สัปดาห์หน้าทำอะไรให้เสร็จ", ring: COSMOS.sol },
];

export function Glass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[28px] ${className}`}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.08), 0 40px 90px -50px rgba(0,0,0,0.9)",
      }}
    >
      {children}
    </div>
  );
}

/** Card label, led by its golden-circle step (WHY, HOW, WHAT). */
export function Eyebrow({ step, children }: { step: string; children?: ReactNode }) {
  return (
    <p className="text-[17px] font-medium uppercase tracking-[0.2em]" style={{ fontFamily: LATIN, color: starlight("99") }}>
      <span className="font-semibold" style={{ color: COSMOS.sol }}>
        {step}
      </span>
      {children && <> · {children}</>}
    </p>
  );
}

/** Planet and Bangkok on the pre-rendered image (scripts/render-shift-high-planet.mjs). */
const PLANET = { cx: 800, cy: 365, r: 215 };
const BANGKOK = { x: 729, y: 301 };
/** A tilted orbit around the planet: its far half passes behind the ball. */
const ORBIT = { rx: 305, ry: 70, tilt: -14 };

function OrbitArc({ half }: { half: "back" | "front" }) {
  const { rx, ry, tilt } = ORBIT;
  const d = half === "back" ? `M${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0` : `M${rx} 0 A ${rx} ${ry} 0 0 1 ${-rx} 0`;
  return (
    <svg className="absolute inset-0" width="1080" height="1350" viewBox="0 0 1080 1350" aria-hidden="true">
      <g transform={`translate(${PLANET.cx} ${PLANET.cy}) rotate(${tilt})`}>
        <path d={d} fill="none" stroke={COSMOS.orbit} strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity={half === "back" ? 0.45 : 0.8} />
      </g>
    </svg>
  );
}

/** The SHIFT planet from /shift/next, pre-rendered, with the rocket leaving Bangkok. */
export function Planet() {
  return (
    <>
      <OrbitArc half="back" />
      <Image src="/shift/poster/shift-high-planet.png" alt="" fill sizes="1080px" priority unoptimized className="object-cover" />
      <OrbitArc half="front" />
      <svg className="absolute inset-0" width="1080" height="1350" viewBox="0 0 1080 1350" aria-hidden="true">
        <defs>
          <linearGradient id="sh-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#a9b4dc" />
          </linearGradient>
          <linearGradient id="sh-flame" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COSMOS.sol} />
            <stop offset="1" stopColor={COSMOS.flare} stopOpacity="0" />
          </linearGradient>
          <filter id="sh-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <circle cx={BANGKOK.x} cy={BANGKOK.y} r="14" fill={COSMOS.sol} opacity="0.8" filter="url(#sh-glow)" />
        <circle cx={BANGKOK.x} cy={BANGKOK.y} r="5" fill={COSMOS.sol} />
        <path
          d={`M${BANGKOK.x} ${BANGKOK.y} C ${BANGKOK.x + 40} ${BANGKOK.y - 120}, 860 150, 948 196`}
          fill="none"
          stroke={COSMOS.sol}
          strokeWidth="4"
          strokeDasharray="3 12"
          strokeLinecap="round"
        />
        <g transform="translate(985 168) rotate(58) scale(0.62)" filter="drop-shadow(0 0 22px rgba(255,210,154,0.4))">
          <path d="M-22 72 C -18 130, -6 170, 0 196 C 6 170, 18 130, 22 72 Z" fill="url(#sh-flame)" />
          <path d="M-30 30 L -60 86 L -28 72 Z" fill={COSMOS.flare} />
          <path d="M30 30 L 60 86 L 28 72 Z" fill={COSMOS.flare} />
          <path d="M0 -96 C 34 -64, 40 -4, 32 70 L -32 70 C -40 -4, -34 -64, 0 -96 Z" fill="url(#sh-body)" />
          <circle cx="0" cy="-16" r="16" fill={COSMOS.sea} stroke={COSMOS.aurora} strokeWidth="6" />
          <path d="M-32 70 L 32 70 L 22 84 L -22 84 Z" fill={COSMOS.indigo} />
        </g>
      </svg>
    </>
  );
}

/** "SHIFT High": white SHIFT, italic gold High. */
export function Wordmark({ size }: { size: number }) {
  return (
    <span
      className="inline-block whitespace-nowrap font-medium leading-[0.92] tracking-[-0.045em]"
      style={{ fontFamily: LATIN, fontSize: size }}
    >
      <span
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f1f4ff 45%, #a9b4dc 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        SHIFT
      </span>{" "}
      <span className="italic" style={{ color: COSMOS.sol, textShadow: `0 0 ${size / 4}px ${COSMOS.sol}66` }}>
        High
      </span>
    </span>
  );
}

/** The joke is the headline: ชิบหาย, struck out, then the real answer. */
function Hero() {
  return (
    <div className="relative">
      <p className="text-[44px] font-semibold leading-[1.2]" style={{ color: starlight("ee") }}>
        จบค่ายแล้ว โปรเจกต์จะ...
      </p>
      <p
        className="relative inline-block -rotate-[4deg] text-[150px] font-bold leading-[1.15]"
        style={{ color: COSMOS.flare, textShadow: `0 0 60px ${COSMOS.flare}55` }}
      >
        ชิบหาย
        <span
          className="absolute left-[-14px] right-[-14px] top-[56%] h-[11px] rotate-[2deg] rounded-full"
          style={{ background: COSMOS.star, boxShadow: `0 0 18px ${COSMOS.star}99` }}
        />
      </p>
      <p className="mt-1 text-[44px] font-semibold leading-[1.2]" style={{ color: starlight("ee") }}>
        หรือจะ
      </p>
      <h1 className="-ml-1 -mt-1">
        <Wordmark size={160} />
      </h1>
    </div>
  );
}

/** Start with why: what SHIFT High is for. */
function Why() {
  return (
    <div style={{ textShadow: `0 2px 18px ${COSMOS.void}` }}>
      <Eyebrow step="Why" />
      <p className="mt-2 text-[40px] font-semibold leading-[1.3]">
        ของที่เราสร้าง ต้องไปถึง<span style={{ color: COSMOS.aurora }}>คนข้างนอกที่ใช้จริง</span>
      </p>
      <p className="text-[30px] leading-[1.35]" style={{ color: starlight("b3") }}>
        ไม่ใช่แค่เพื่อนกับคนรู้จัก
      </p>
    </div>
  );
}

function Goals() {
  return (
    <Glass className="flex-1 px-8 pb-6 pt-6">
      <Eyebrow step="How">Set goals</Eyebrow>
      <p className="mt-1 text-[30px] font-semibold">ตั้งเป้า 3 ระยะด้วยกัน</p>
      <ol className="mt-4 space-y-3">
        {GOALS.map((goal, i) => (
          <li key={goal.term} className="flex items-center gap-4">
            <span
              className="relative h-[46px] w-[46px] shrink-0 rounded-full"
              style={{ boxShadow: `inset 0 0 0 3px ${goal.ring}`, opacity: 0.95 }}
            >
              <span
                className="absolute rounded-full"
                style={{ inset: 14 - i * 4, background: goal.ring, boxShadow: `0 0 14px ${goal.ring}` }}
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[23px] font-semibold leading-tight">
                {goal.term} <span style={{ fontFamily: LATIN, color: goal.ring }}>· {goal.label}</span>
              </span>
              <span className="block text-[20px] leading-snug" style={{ color: starlight("b3") }}>
                {goal.text}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Glass>
  );
}

/** The circle: everyone around one student's project, seen in perspective like the orbit. */
function Circle() {
  const seats = 9;
  return (
    <svg width="336" height="74" viewBox="0 0 336 74" aria-hidden="true">
      <ellipse cx="168" cy="37" rx="150" ry="26" fill="none" stroke={COSMOS.orbit} strokeWidth="1.5" strokeDasharray="2 7" opacity="0.7" />
      {Array.from({ length: seats }, (_, i) => {
        const a = (i / seats) * Math.PI * 2 + 0.35;
        const y = 37 + Math.sin(a) * 26;
        const near = (Math.sin(a) + 1) / 2;
        return <circle key={i} cx={168 + Math.cos(a) * 150} cy={y} r={6 + near * 5} fill={i % 3 === 0 ? COSMOS.aurora : COSMOS.panel} opacity={0.55 + near * 0.45} />;
      })}
      <circle cx="168" cy="37" r="16" fill={COSMOS.sol} opacity="0.35" />
      <circle cx="168" cy="37" r="8" fill={COSMOS.sol} />
    </svg>
  );
}

function WorkDay() {
  return (
    <Glass className="flex w-[400px] shrink-0 flex-col px-8 pb-6 pt-6">
      <Eyebrow step="How">Work day</Eyebrow>
      <p className="mt-1 text-[30px] font-semibold">ทุก{DAY}</p>
      <p className="text-[22px]" style={{ color: COSMOS.sol }}>
        {timeRangeLabel(startTime, endTime)} ใน Discord
      </p>
      <p className="mt-4 text-[23px] font-semibold leading-tight">ล้อมวงคุยทีละคน</p>
      <p className="mt-1 text-[20px] leading-snug" style={{ color: starlight("b3") }}>
        ความคืบหน้า ไอเดีย ปัญหาที่ติด
        <br />
        เพื่อนคอมเมนต์ พี่เมนเทอร์ให้ insight
      </p>
      <div className="mt-auto pt-3">
        <Circle />
      </div>
    </Glass>
  );
}

function Offer() {
  return (
    <Glass className="px-8 pb-6 pt-5">
      <Eyebrow step="What" />
      <div className="mt-2 flex items-center gap-7">
        <div className="flex items-baseline gap-3">
          <span className="text-[92px] font-medium leading-none tracking-[-0.04em]" style={{ fontFamily: LATIN, color: COSMOS.sol }}>
            {PRICE}
          </span>
          <span className="text-[26px] font-semibold leading-tight">
            บาท
            <br />1 เดือน
          </span>
        </div>
        <span
          className="rounded-full px-4 py-1 text-[22px] font-semibold"
          style={{ color: starlight("cc"), boxShadow: `inset 0 0 0 1px ${starlight("33")}` }}
        >
          หรือ
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[28px] font-semibold leading-tight">
            ช่วยทำ<span style={{ color: COSMOS.aurora }}>วิดีโอรีวิว</span> 1 คลิป
          </p>
          <p className="mt-1 text-[19px] leading-snug" style={{ color: starlight("99") }}>
            ถ่ายเมื่อผู้ปกครองยินยอม
          </p>
        </div>
        <div className="shrink-0 border-l pl-7 text-[21px] font-semibold leading-snug" style={{ borderColor: starlight("26") }}>
          จ่ายครั้งเดียว
          <br />
          <span style={{ color: starlight("99") }}>ไม่ตัดเงินอัตโนมัติ</span>
        </div>
      </div>
    </Glass>
  );
}

export function ShiftHighPoster() {
  return (
    <div
      id={SHIFT_HIGH_POSTER_ID}
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
          <span
            className="rounded-full px-5 py-2 text-[17px] font-medium uppercase tracking-[0.16em]"
            style={{ fontFamily: LATIN, color: starlight("cc"), background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
          >
            For {C.name} alumni
          </span>
        </div>
        <div className="mt-[22px]">
          <Hero />
        </div>
        <div className="mt-[26px]">
          <Why />
        </div>
        <div className="mt-auto space-y-[18px]">
          <div className="flex gap-5">
            <Goals />
            <WorkDay />
          </div>
          <Offer />
        </div>
      </div>
    </div>
  );
}
