import type { CSSProperties, ReactNode } from "react";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";

import { SHIFT3 } from "./facts";

/**
 * Shared pieces of the SHIFT[3] launch kit: glass, the SHIFT[3] lockup, the
 * outcome hook and the fact cards. Every size takes a scale `k` so the feed,
 * story and banner reuse one design. Facts come from ./facts (cohort record).
 */

export const LATIN = "var(--font-libre-franklin), ui-sans-serif, system-ui, sans-serif";

/** Deep space with three soft nebula lights; layer <Sky> on top. */
export function cosmosBackground(w: number, h: number): CSSProperties {
  return {
    color: COSMOS.star,
    background: [
      `radial-gradient(${w * 0.85}px ${h * 0.45}px at 88% 4%, ${COSMOS.nebula}38, transparent 62%)`,
      `radial-gradient(${w * 0.7}px ${h * 0.4}px at 0% 34%, ${COSMOS.indigo}44, transparent 66%)`,
      `radial-gradient(${w * 0.9}px ${h * 0.38}px at 70% 100%, ${COSMOS.indigo}5c, transparent 70%)`,
      COSMOS.void,
    ].join(", "),
  };
}

export function Glass({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`relative rounded-[28px] ${className}`}
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.08), 0 40px 90px -50px rgba(0,0,0,0.9)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small Latin card label in tracked caps, led by a sol word. */
export function Eyebrow({ lead, children, k = 1 }: { lead: string; children?: ReactNode; k?: number }) {
  return (
    <p className="font-medium uppercase tracking-[0.2em]" style={{ fontFamily: LATIN, fontSize: 17 * k, color: starlight("99") }}>
      <span className="font-semibold" style={{ color: COSMOS.sol }}>
        {lead}
      </span>
      {children && <> · {children}</>}
    </p>
  );
}

/** "SHIFT[3]": silver SHIFT, starlit brackets, a sol round number that glows. */
export function Lockup({ size, className = "" }: { size: number; className?: string }) {
  const name = SHIFT3.name;
  const open = name.indexOf("[");
  const word = open > 0 ? name.slice(0, open) : name;
  const round = open > 0 ? name.slice(open + 1, name.indexOf("]")) : "";
  const bracket: CSSProperties = {
    fontWeight: 400,
    color: "transparent",
    background: `linear-gradient(180deg, ${COSMOS.aurora} 0%, ${COSMOS.nebula} 100%)`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    opacity: 0.9,
  };
  return (
    <span
      className={`inline-block whitespace-nowrap font-medium leading-[0.92] tracking-[-0.045em] ${className}`}
      style={{ fontFamily: LATIN, fontSize: size }}
      aria-label={name}
    >
      <span
        aria-hidden="true"
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f1f4ff 45%, #a9b4dc 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "drop-shadow(0 0.04em 0.18em rgba(100,130,255,0.25))",
        }}
      >
        {word}
      </span>
      {round && (
        <span aria-hidden="true">
          <span style={{ ...bracket, marginLeft: "0.07em" }}>[</span>
          <span style={{ color: COSMOS.sol, textShadow: `0 0 ${size / 4}px ${COSMOS.sol}70`, margin: "0 0.02em" }}>{round}</span>
          <span style={bracket}>]</span>
        </span>
      )}
    </span>
  );
}

/** Live dot pill, e.g. "เปิดรับสมัคร". */
export function StatusPill({ children, k = 1 }: { children: ReactNode; k?: number }) {
  return (
    <span
      className="inline-flex items-center rounded-full font-semibold"
      style={{
        gap: 12 * k,
        padding: `${8 * k}px ${22 * k}px ${8 * k}px ${18 * k}px`,
        fontSize: 22 * k,
        color: starlight("e6"),
        background: "rgba(255,255,255,0.06)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      <span
        className="shrink-0 rounded-full"
        style={{ width: 10 * k, height: 10 * k, background: COSMOS.sol, boxShadow: `0 0 ${12 * k}px ${COSMOS.sol}` }}
      />
      {children}
    </span>
  );
}

/**
 * The outcome, said once: in N evenings, build something real and bring
 * outsiders in to try it, plus the 1-page portfolio for the TCAS round 1
 * interview.
 */
export function Hook({ k = 1, big = 64, small = 34 }: { k?: number; big?: number; small?: number }) {
  return (
    <div style={{ textShadow: `0 2px 24px ${COSMOS.void}` }}>
      <p className="font-semibold" style={{ fontSize: big * k, lineHeight: 1.28 }}>
        {SHIFT3.days} เย็น ลงมือสร้างของจริง
      </p>
      <p className="font-semibold" style={{ fontSize: big * k, lineHeight: 1.28, color: COSMOS.aurora }}>
        แล้วชวนคนนอกมาลองใช้
      </p>
      <p className="font-medium" style={{ fontSize: small * k, lineHeight: 1.4, marginTop: 10 * k, color: starlight("d9") }}>
        พร้อม<span style={{ color: COSMOS.star }} className="font-semibold">พอร์ต 1 หน้า</span> ไว้สัมภาษณ์ TCAS รอบ 1
      </p>
    </div>
  );
}

/** Who it is for, as quiet chips. */
export function WhoChips({ k = 1 }: { k?: number }) {
  const chips = ["ม.4-ม.6", "ไม่ต้องเขียนโค้ดเป็น", `ทำคนเดียวหรือทีม ${SHIFT3.team}`];
  return (
    <ul className="flex flex-wrap" style={{ gap: 10 * k }}>
      {chips.map((chip) => (
        <li
          key={chip}
          className="rounded-full font-medium"
          style={{
            fontSize: 21 * k,
            padding: `${6 * k}px ${18 * k}px`,
            color: starlight("cc"),
            background: "rgba(255,255,255,0.05)",
            boxShadow: `inset 0 0 0 1px ${starlight("22")}`,
          }}
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

/** Seven evenings on a dotted line, the last one Demo Day in sol. */
export function EveningTrack({ k = 1 }: { k?: number }) {
  const days = SHIFT3.weekdays;
  const dot = 14 * k;
  return (
    <div className="relative" style={{ paddingTop: 30 * k }}>
      <span
        className="absolute"
        style={{
          left: dot / 2,
          right: dot / 2,
          top: 30 * k + dot / 2 - 1,
          height: 2,
          backgroundImage: `linear-gradient(90deg, ${COSMOS.orbit} 50%, transparent 50%)`,
          backgroundSize: `${8 * k}px 2px`,
          opacity: 0.6,
        }}
      />
      <ol className="relative flex justify-between">
        {days.map((day, i) => {
          const last = i === days.length - 1;
          return (
            <li key={`${day}-${i}`} className="relative flex flex-col items-center">
              {last && (
                <span
                  className="absolute whitespace-nowrap font-semibold uppercase tracking-[0.14em]"
                  style={{ fontFamily: LATIN, fontSize: 14 * k, color: COSMOS.sol, bottom: `calc(100% + ${6 * k}px)`, right: -4 * k }}
                >
                  {SHIFT3.demoLabel}
                </span>
              )}
              <span
                className="block rounded-full"
                style={{
                  width: dot,
                  height: dot,
                  background: last ? COSMOS.sol : COSMOS.panel,
                  boxShadow: last ? `0 0 ${16 * k}px ${COSMOS.sol}` : `inset 0 0 0 1.5px ${COSMOS.aurora}88`,
                }}
              />
              <span className="font-medium" style={{ fontSize: 17 * k, marginTop: 6 * k, color: last ? COSMOS.sol : starlight("99") }}>
                {day}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function WhenCard({ k = 1, className = "" }: { k?: number; className?: string }) {
  return (
    <Glass className={`flex flex-col ${className}`} style={{ padding: `${26 * k}px ${32 * k}px ${22 * k}px` }}>
      <Eyebrow lead="When" k={k}>
        {SHIFT3.days} evenings
      </Eyebrow>
      <p className="font-semibold" style={{ fontSize: 40 * k, lineHeight: 1.3, marginTop: 8 * k }}>
        {SHIFT3.dates}
      </p>
      <p className="font-medium" style={{ fontSize: 23 * k, lineHeight: 1.4, color: COSMOS.sol }}>
        ไลฟ์บน Discord ทุกเย็น {SHIFT3.time} น.
      </p>
      <div className="mt-auto" style={{ paddingTop: 14 * k }}>
        <EveningTrack k={k} />
      </div>
    </Glass>
  );
}

/** "฿690" with the baht sign set smaller, so the Latin digits lead. */
function Baht({ amount, size, color }: { amount: number; size: number; color: string }) {
  return (
    <span className="inline-flex items-baseline whitespace-nowrap" style={{ color }}>
      <span className="font-semibold" style={{ fontSize: size * 0.56, marginRight: size * 0.04 }}>
        ฿
      </span>
      <span className="font-medium tracking-[-0.04em]" style={{ fontFamily: LATIN, fontSize: size, lineHeight: 1 }}>
        {amount.toLocaleString("en-US")}
      </span>
    </span>
  );
}

export function PriceCard({ k = 1, className = "" }: { k?: number; className?: string }) {
  const pair = SHIFT3.pairPrice;
  return (
    <Glass className={`flex flex-col ${className}`} style={{ padding: `${26 * k}px ${32 * k}px ${24 * k}px` }}>
      <Eyebrow lead="Price" k={k} />
      <div className="flex items-baseline" style={{ gap: 12 * k, marginTop: 10 * k }}>
        <Baht amount={SHIFT3.priceBaht} size={96 * k} color={COSMOS.sol} />
        <span className="whitespace-nowrap font-semibold" style={{ fontSize: 24 * k }}>
          ต่อคน
        </span>
      </div>
      {pair && (
        <p
          className="mt-auto border-t font-semibold"
          style={{ fontSize: 25 * k, lineHeight: 1.35, paddingTop: 14 * k, borderColor: starlight("22") }}
        >
          สมัครคู่ 2 คน คนละ <span style={{ color: COSMOS.aurora }}>{pair}</span>
        </p>
      )}
    </Glass>
  );
}

/** Speech bubble for the comment CTA. */
function CommentIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 6c11 0 19 7.2 19 16.5S35 39 24 39c-2.3 0-4.4-.3-6.4-.9L8 42l2.6-8.1C7.1 30.9 5 26.9 5 22.5 5 13.2 13 6 24 6Z"
        fill="none"
        stroke={COSMOS.sol}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="22.5" r="2.6" fill={COSMOS.sol} />
      <circle cx="24" cy="22.5" r="2.6" fill={COSMOS.sol} />
      <circle cx="32" cy="22.5" r="2.6" fill={COSMOS.sol} />
    </svg>
  );
}

/** The keyword set as a glowing key, never in quote marks. */
export function Keyword({ size }: { size: number }) {
  return (
    <span
      className="inline-block rounded-[0.28em] font-bold tracking-[0.02em]"
      style={{
        fontFamily: LATIN,
        fontSize: size,
        lineHeight: 1,
        padding: "0.14em 0.3em 0.12em",
        color: COSMOS.void,
        background: `linear-gradient(180deg, #fff3df 0%, ${COSMOS.sol} 100%)`,
        boxShadow: `0 0 ${size * 0.6}px ${COSMOS.sol}55`,
      }}
    >
      {SHIFT3.keyword}
    </span>
  );
}

/** Chain-link glyph for the story's link CTA. */
function LinkIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <g fill="none" stroke={COSMOS.sol} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 27.5a8 8 0 0 0 11.3 0l6.4-6.4a8 8 0 0 0-11.3-11.3l-2.6 2.6" />
        <path d="M27.5 20.5a8 8 0 0 0-11.3 0l-6.4 6.4a8 8 0 0 0 11.3 11.3l2.6-2.6" />
      </g>
    </svg>
  );
}

/** Deadline and seats, right-aligned beside a CTA. */
function Closing({ k }: { k: number }) {
  return (
    <div className="shrink-0 border-l text-right" style={{ paddingLeft: 26 * k, borderColor: starlight("26") }}>
      <p className="whitespace-nowrap font-semibold" style={{ fontSize: 24 * k, lineHeight: 1.35 }}>
        ปิดรับ {SHIFT3.deadline}
      </p>
      <p className="whitespace-nowrap font-medium" style={{ fontSize: 21 * k, lineHeight: 1.4, color: starlight("b3") }}>
        รับ {SHIFT3.seats} คน
      </p>
    </div>
  );
}

/**
 * Story CTA: stories take replies, not comments, so the link leads and a
 * reply with the keyword lands in the DM inbox.
 */
export function StoryJoinStrip({ k = 1 }: { k?: number }) {
  return (
    <Glass className="flex items-center" style={{ padding: `${24 * k}px ${32 * k}px`, gap: 24 * k }}>
      <LinkIcon size={54 * k} />
      <div className="min-w-0 flex-1">
        <p className="font-medium" style={{ fontSize: 22 * k, lineHeight: 1.3, color: starlight("b3") }}>
          กรอกใบสมัคร 2 นาทีเสร็จ ที่
        </p>
        <p className="whitespace-nowrap font-medium tracking-[-0.01em]" style={{ fontFamily: LATIN, fontSize: 33 * k, lineHeight: 1.3, color: COSMOS.aurora }}>
          {SHIFT3.link}
        </p>
        <p className="flex items-center font-medium" style={{ fontSize: 21 * k, lineHeight: 1.4, color: starlight("b3"), gap: 10 * k, marginTop: 4 * k }}>
          หรือตอบสตอรี่นี้ว่า <Keyword size={19 * k} />
        </p>
      </div>
      <Closing k={k} />
    </Glass>
  );
}

/** How to join: comment the keyword (auto-DM), or the link; deadline and seats. */
export function JoinStrip({ k = 1 }: { k?: number }) {
  return (
    <Glass className="flex items-center" style={{ padding: `${24 * k}px ${32 * k}px`, gap: 26 * k }}>
      <CommentIcon size={58 * k} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center font-semibold" style={{ fontSize: 34 * k, gap: 14 * k, lineHeight: 1.3 }}>
          คอมเมนต์ <Keyword size={30 * k} />
        </p>
        <p className="font-medium" style={{ fontSize: 21 * k, lineHeight: 1.45, color: starlight("b3"), marginTop: 4 * k }}>
          รับลิงก์สมัครทาง DM หรือเข้า{" "}
          <span style={{ fontFamily: LATIN, color: COSMOS.aurora }}>{SHIFT3.link}</span>
        </p>
      </div>
      <Closing k={k} />
    </Glass>
  );
}
