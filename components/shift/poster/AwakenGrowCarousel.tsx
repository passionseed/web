import type { ReactNode } from "react";
import Image from "next/image";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import {
  COVER,
  CTA,
  DEEP_DIVES,
  FEELS_TRUE,
  MAP,
  MYTH,
  NEXT_MOVE,
  ONE_LINE,
  OPERATOR,
  PUNCHLINE,
  QUADRANTS,
  type QuadrantId,
} from "@/lib/content/awaken-grow";

import { PassionSeedMark } from "./riso";
import { Starfield } from "./Starfield";
import { Glass, LATIN, Planet } from "./ShiftHighPoster";

/**
 * "ตื่นรู้ vs เติบโต" organic IG carousel (10 slides, 1080x1440) in the
 * SHIFT[3] cosmos: glass over deep space, aurora / nebula / sol lights.
 * Copy lives in lib/content/awaken-grow.ts.
 * Export: screenshot #awaken-grow-1 ... #awaken-grow-10.
 */

export const AWAKEN_GROW_ID = "awaken-grow";
const TOTAL = 10;

const TONE: Record<QuadrantId, string> = {
  I: COSMOS.sol,
  II: COSMOS.nebula,
  III: COSMOS.orbit,
  IV: COSMOS.flare,
};


/** `**accent**` spans in a copy string; line breaks come from pre-line. */
function Ink({ text, accent = COSMOS.sol }: { text: string; accent?: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <span key={i} style={{ color: accent }}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Eyebrow({ children, tone = COSMOS.sol }: { children: ReactNode; tone?: string }) {
  return (
    <p className="text-[19px] font-semibold uppercase tracking-[0.22em]" style={{ fontFamily: LATIN, color: tone }}>
      {children}
    </p>
  );
}

function Slide({ n, swipe = "Swipe", children }: { n: number; swipe?: string; children: ReactNode }) {
  const last = n === TOTAL;
  const thai = swipe !== "Swipe";
  return (
    <section
      id={`${AWAKEN_GROW_ID}-${n}`}
      lang="th"
      className="relative h-[1440px] w-[1080px] shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ color: COSMOS.star, background: COSMOS.void }}
    >
      <Starfield index={n - 1} />
      <div className="relative flex h-full flex-col px-[72px] pb-[52px] pt-[52px]">
        <header className="flex items-center justify-between">
          <PassionSeedMark size={42} />
          <span
            className="rounded-full px-5 py-2 text-[18px] font-medium tracking-[0.16em]"
            style={{ fontFamily: LATIN, color: starlight("cc"), background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
          >
            {String(n).padStart(2, "0")} / {TOTAL}
          </span>
        </header>
        <div className="mt-[44px] flex min-h-0 flex-1 flex-col">{children}</div>
        {!last && (
          <footer
            className={`mt-6 flex items-center justify-end gap-3 ${thai ? "text-[34px] font-bold" : "text-[19px] font-medium uppercase tracking-[0.24em]"}`}
            style={{ fontFamily: thai ? undefined : LATIN, color: thai ? COSMOS.star : starlight("99") }}
          >
            {swipe} <span className="text-[26px] tracking-normal">→</span>
          </footer>
        )}
      </div>
    </section>
  );
}

/** A 2x2 locator: II I on top, III IV below, with `lit` filled. */
function MiniMap({ lit, size = 110 }: { lit?: QuadrantId; size?: number }) {
  const order: QuadrantId[] = ["II", "I", "III", "IV"];
  return (
    <div className="grid shrink-0 grid-cols-2" style={{ width: size, height: size, gap: size * 0.07 }}>
      {order.map((q) => (
        <span
          key={q}
          className="flex items-center justify-center rounded-[10px] font-semibold"
          style={{
            fontFamily: LATIN,
            fontSize: size * 0.17,
            background: q === lit ? TONE[q] : "rgba(255,255,255,0.05)",
            color: q === lit ? COSMOS.void : starlight("66"),
            boxShadow: q === lit ? undefined : "inset 0 0 0 1px rgba(255,255,255,0.12)",
          }}
        >
          {q}
        </span>
      ))}
    </div>
  );
}

/** Awareness up, growth right, around a 2x2 grid. */
function Axes({ children }: { children: ReactNode }) {
  const label = "text-[22px] font-semibold";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className={`${label} mb-3`} style={{ color: COSMOS.aurora }}>
        ▲ ตื่นรู้
      </p>
      <div className="flex min-h-0 flex-1 gap-[14px]">
        <span className="w-[3px] shrink-0 rounded" style={{ background: `linear-gradient(to top, ${starlight("1a")}, ${COSMOS.aurora})` }} />
        <div className="flex min-h-0 flex-1">{children}</div>
      </div>
      <div className="mt-3 flex h-[30px] items-center gap-4">
        <span className={label} style={{ color: starlight("80") }}>
          ไม่ลงมือ
        </span>
        <span className="h-[3px] flex-1 rounded" style={{ background: `linear-gradient(to right, ${starlight("1a")}, ${COSMOS.sol})` }} />
        <span className={label} style={{ color: COSMOS.sol }}>
          เติบโต / ลงมือทำ ▶
        </span>
      </div>
    </div>
  );
}

function cellStyle(q: QuadrantId, strong: boolean) {
  if (q === "I") {
    return {
      background: `${COSMOS.sol}12`,
      boxShadow: `inset 0 0 0 2px ${COSMOS.sol}`,
    };
  }
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1.5px ${strong ? `${TONE[q]}88` : "rgba(255,255,255,0.08)"}`,
  };
}

const GRID_ORDER: QuadrantId[] = ["II", "I", "III", "IV"];

/** One character per quadrant (public/shift/poster/awaken-grow). */
const CHARACTER: Record<QuadrantId, { src: string; alt: string }> = {
  I: { src: "/shift/poster/awaken-grow/quadrant-1.png", alt: "คนกำลังประกอบจรวด" },
  II: { src: "/shift/poster/awaken-grow/quadrant-2.png", alt: "คนนั่งดูอยู่บนม้านั่งข้างสนาม" },
  III: { src: "/shift/poster/awaken-grow/quadrant-3.png", alt: "คนหลับอยู่ในบีนแบ็ก" },
  IV: { src: "/shift/poster/awaken-grow/quadrant-4.png", alt: "คนปิดตาวิ่งบนลู่วิ่ง" },
};

/** A quadrant character fitted into a box, standing on its bottom edge. */
function Character({ q, width, height, className = "" }: { q: QuadrantId; width: number; height: number; className?: string }) {
  const c = CHARACTER[q];
  return (
    <div className={`pointer-events-none select-none ${className}`} style={{ width, height }}>
      <div className="relative h-full w-full">
        <Image src={c.src} alt={c.alt} fill sizes={`${width}px`} unoptimized className="object-contain object-bottom" />
      </div>
    </div>
  );
}
/** Cover numerals sit in the outer corners, clear of the centre question. */
const CORNER: Record<QuadrantId, string> = {
  II: "items-start justify-start",
  I: "items-start justify-end",
  III: "items-end justify-start",
  IV: "items-end justify-end",
};

/* ---------- 1. Cover ---------- */

function Cover() {
  return (
    <Slide n={1} swipe={COVER.ask}>
      <p className="text-[44px] font-semibold leading-[1.2]" style={{ color: starlight("ee") }}>
        {COVER.lead}
      </p>
      <div className="mt-3 space-y-1">
        {MYTH.map((line) => (
          <p
            key={line}
            className="relative inline-block text-[92px] font-bold leading-[1.22]"
            style={{ color: COSMOS.flare }}
          >
            {line}
            <span
              className="absolute left-[-10px] right-[-10px] top-[56%] h-[7px] -rotate-[1.5deg] rounded-full"
              style={{ background: COSMOS.star, opacity: 0.9 }}
            />
          </p>
        ))}
      </div>
      <p className="mt-6 text-[44px] font-semibold leading-[1.2]" style={{ color: starlight("ee") }}>
        {COVER.turn}
      </p>
      <h1
        className="whitespace-nowrap text-[124px] font-bold italic leading-[1.2]"
        style={{ color: COSMOS.sol }}
      >
        {COVER.big}
      </h1>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <Axes>
          <div className="relative grid flex-1 grid-cols-2 grid-rows-2 gap-[12px]">
            {GRID_ORDER.map((q) => (
              <div key={q} className={`relative flex rounded-[24px] p-6 ${CORNER[q]}`} style={cellStyle(q, false)}>
                <Character q={q} width={250} height={200} className="absolute bottom-[18px] left-1/2 -translate-x-1/2" />
                <span className="relative text-[56px] font-medium leading-none" style={{ fontFamily: LATIN, color: TONE[q] }}>
                  {q}
                </span>
              </div>
            ))}
          </div>
        </Axes>
      </div>
    </Slide>
  );
}

/* ---------- 2. Why it feels true ---------- */

function FeelsTrue() {
  const tones = [COSMOS.nebula, COSMOS.flare];
  return (
    <Slide n={2}>
      <Eyebrow>Why it feels true</Eyebrow>
      <h2 className="mt-3 whitespace-pre-line text-[68px] font-bold leading-[1.25]">{FEELS_TRUE.title}</h2>
      <div className="mt-10 space-y-6">
        {FEELS_TRUE.people.map((p, i) => (
          <Glass key={p.label} className="flex items-center gap-8 px-10 py-9">
            <span
              className="flex h-[96px] w-[96px] shrink-0 items-center justify-center rounded-full text-[44px] font-semibold"
              style={{ fontFamily: LATIN, color: tones[i], boxShadow: `inset 0 0 0 3px ${tones[i]}` }}
            >
              {i + 1}
            </span>
            <span>
              <span className="block text-[24px] font-semibold" style={{ color: tones[i] }}>
                {p.label}
              </span>
              <span className="block whitespace-pre-line text-[44px] font-semibold leading-[1.3]">{p.text}</span>
            </span>
          </Glass>
        ))}
      </div>
      <p className="mt-auto whitespace-pre-line text-[64px] font-bold leading-[1.3]">
        <Ink text={FEELS_TRUE.turn} />
      </p>
    </Slide>
  );
}

/* ---------- 3. One line vs two axes ---------- */

function Stamp({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span
      className="absolute right-8 top-7 rotate-[8deg] rounded-[12px] px-5 py-1 text-[34px] font-bold"
      style={{ color: tone, boxShadow: `inset 0 0 0 3px ${tone}` }}
    >
      {children}
    </span>
  );
}

function OneLine() {
  return (
    <Slide n={3}>
      <Eyebrow>The mistake</Eyebrow>
      <h2 className="mt-3 whitespace-pre-line text-[76px] font-bold leading-[1.22]">
        <Ink text={ONE_LINE.title} accent={COSMOS.flare} />
      </h2>

      <Glass className="mt-9 px-10 pb-8 pt-9">
        <Stamp tone={COSMOS.flare}>ผิด</Stamp>
        <svg width="800" height="96" viewBox="0 0 800 96" aria-hidden="true">
          <line x1="40" y1="48" x2="760" y2="48" stroke={starlight("66")} strokeWidth="4" strokeLinecap="round" />
          <path d="M40 48 l22 -14 v28 z M760 48 l-22 -14 v28 z" fill={starlight("99")} />
          <circle cx="400" cy="48" r="16" fill={COSMOS.flare} />
          <circle cx="400" cy="48" r="30" fill={COSMOS.flare} opacity="0.25" />
        </svg>
        <div className="-mt-2 flex w-[800px] justify-between text-[30px] font-semibold" style={{ color: starlight("cc") }}>
          <span>ตื่นรู้</span>
          <span>เติบโต</span>
        </div>
        <p className="mt-4 text-[34px] font-semibold" style={{ color: COSMOS.flare }}>
          {ONE_LINE.wrong}
        </p>
      </Glass>

      <Glass className="mt-6 flex items-center gap-10 px-10 py-8">
        <Stamp tone={COSMOS.aurora}>ถูก</Stamp>
        <svg width="280" height="280" viewBox="0 0 280 280" aria-hidden="true" className="shrink-0">
          <line x1="40" y1="250" x2="40" y2="20" stroke={COSMOS.aurora} strokeWidth="4" strokeLinecap="round" />
          <path d="M40 12 l-12 20 h24 z" fill={COSMOS.aurora} />
          <line x1="30" y1="240" x2="262" y2="240" stroke={COSMOS.sol} strokeWidth="4" strokeLinecap="round" />
          <path d="M270 240 l-20 -12 v24 z" fill={COSMOS.sol} />
          <path d="M70 210 C 110 200, 200 160, 225 60" fill="none" stroke={COSMOS.sol} strokeWidth="5" strokeDasharray="3 12" strokeLinecap="round" />
          <circle cx="70" cy="210" r="9" fill={starlight("88")} />
          <circle cx="228" cy="56" r="26" fill={COSMOS.sol} opacity="0.3" />
          <circle cx="228" cy="56" r="13" fill={COSMOS.sol} />
        </svg>
        <div>
          <p className="whitespace-pre-line text-[38px] font-semibold leading-[1.35]">{ONE_LINE.right}</p>
        </div>
      </Glass>

      <div className="mt-auto grid grid-cols-2 gap-5">
        {ONE_LINE.defs.map((d, i) => (
          <div key={d.axis} className="border-l-[4px] pl-5" style={{ borderColor: i ? COSMOS.sol : COSMOS.aurora }}>
            <p className="text-[34px] font-bold" style={{ color: i ? COSMOS.sol : COSMOS.aurora }}>
              {d.axis}
            </p>
            <p className="text-[28px] leading-[1.35]" style={{ color: starlight("cc") }}>
              {d.text}
            </p>
          </div>
        ))}
      </div>
    </Slide>
  );
}

/* ---------- 4. The map ---------- */

function TheMap() {
  return (
    <Slide n={4}>
      <Eyebrow>The map</Eyebrow>
      <h2 className="mt-3 whitespace-pre-line text-[68px] font-bold leading-[1.25]">
        <Ink text={MAP.title} />
      </h2>
      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <Axes>
          <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-[14px]">
            {GRID_ORDER.map((q) => {
              const quad = QUADRANTS[q];
              const seen = q === "II" || q === "IV";
              return (
                <div key={q} className="relative flex flex-col rounded-[24px] px-6 pb-6 pt-5" style={cellStyle(q, seen)}>
                  <div className="flex items-center justify-between">
                    <span className="text-[30px] font-semibold" style={{ fontFamily: LATIN, color: TONE[q] }}>
                      {q}
                    </span>
                    {seen && (
                      <span className="rounded-full px-3 py-[2px] text-[16px] font-semibold" style={{ color: COSMOS.flare, boxShadow: `inset 0 0 0 1.5px ${COSMOS.flare}` }}>
                        {MAP.seenOnly}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[38px] font-bold leading-[1.2]" style={{ color: TONE[q] }}>
                    {quad.name}
                  </p>
                  <p className="text-[19px] font-medium" style={{ fontFamily: LATIN, color: starlight("80") }}>
                    {quad.en}
                  </p>
                  <span className="mt-5 self-start rounded-full px-4 py-1 text-[22px] font-semibold" style={{ background: `${TONE[q]}1f`, color: TONE[q] }}>
                    {quad.axes}
                  </span>
                  <Character q={q} width={190} height={170} className="absolute bottom-[64px] right-[20px]" />
                  <p className="relative mt-auto text-[28px] font-medium leading-[1.35]" style={{ color: starlight("ee") }}>
                    {quad.line}
                  </p>
                </div>
              );
            })}
          </div>
        </Axes>
      </div>
      <p className="mt-6 text-[28px] font-medium leading-[1.4]" style={{ color: starlight("cc") }}>
        {MAP.note}
      </p>
    </Slide>
  );
}

/* ---------- 5, 6. Deep dives on the two quadrants the saying sees ---------- */

function DeepDive({ n, q }: { n: number; q: "IV" | "II" }) {
  const quad = QUADRANTS[q];
  const dive = DEEP_DIVES[q];
  const tone = TONE[q];
  return (
    <Slide n={n}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-6">
            <MiniMap lit={q} size={104} />
            <div>
              <Eyebrow tone={tone}>Quadrant {q}</Eyebrow>
              <p className="mt-1 text-[22px] font-medium" style={{ fontFamily: LATIN, color: starlight("99") }}>
                {quad.en}
              </p>
            </div>
          </div>
          <h2 className="mt-6 whitespace-pre-line text-[100px] font-bold leading-[1.12]" style={{ color: tone }}>
            {dive.title}
          </h2>
        </div>
        <Character q={q} width={400} height={400} className="-mb-2 shrink-0" />
      </div>
      <p className="mt-6 whitespace-pre-line text-[56px] font-semibold leading-[1.3]">
        <Ink text={dive.tagline} accent={tone} />
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="mr-1 text-[26px] font-semibold" style={{ color: starlight("99") }}>
          แรงขับ
        </span>
        {dive.drivers.map((d) => (
          <span key={d} className="rounded-full px-5 py-2 text-[28px] font-semibold" style={{ background: `${tone}1f`, boxShadow: `inset 0 0 0 1.5px ${tone}88` }}>
            {d}
          </span>
        ))}
      </div>

      <Glass className="mt-8 px-10 pb-8 pt-7">
        <p className="text-[28px] font-bold" style={{ color: tone }}>
          เช็กตัวเอง
        </p>
        <ul className="mt-4 space-y-4">
          {dive.checks.map((c) => (
            <li key={c} className="flex items-start gap-5 text-[36px] font-medium leading-[1.35]">
              <span className="mt-[10px] h-[36px] w-[36px] shrink-0 rounded-[9px]" style={{ boxShadow: `inset 0 0 0 3px ${tone}` }} />
              {c}
            </li>
          ))}
        </ul>
      </Glass>

      <div className="min-h-[24px] flex-1" />
      <div className="rounded-[24px] px-9 py-6" style={{ background: `${tone}14`, boxShadow: `inset 0 0 0 1.5px ${tone}66` }}>
        <p className="text-[28px] font-bold" style={{ color: tone }}>
          ราคาที่จ่าย
        </p>
        <p className="mt-1 text-[34px] font-medium leading-[1.4]">{dive.cost}</p>
      </div>
    </Slide>
  );
}

/* ---------- 7. Punchline ---------- */

function Punchline() {
  const tones = [COSMOS.flare, COSMOS.nebula];
  return (
    <Slide n={7}>
      <Eyebrow>So</Eyebrow>
      <div className="mt-6 flex flex-1 flex-col gap-6">
        {PUNCHLINE.map((p, i) => (
          <Glass key={p.lead} className="flex flex-1 flex-col justify-center px-12">
            <p className="text-[40px] font-semibold" style={{ color: starlight("bb") }}>
              {p.lead}
            </p>
            <p className="mt-2 whitespace-pre-line text-[104px] font-bold leading-[1.18]" style={{ color: tones[i] }}>
              {p.big}
            </p>
          </Glass>
        ))}
      </div>
    </Slide>
  );
}

/* ---------- 8. Quadrant I on the SHIFT planet ---------- */

function Operator() {
  const quad = QUADRANTS.I;
  return (
    <Slide n={8}>
      <div className="pointer-events-none absolute left-0 top-[40px] h-[1350px] w-[1080px]">
        <Planet />
      </div>
      <Character q="I" width={240} height={300} className="absolute right-[110px] top-[584px]" />
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center gap-6">
          <MiniMap lit="I" size={104} />
          <Eyebrow>Quadrant I</Eyebrow>
        </div>
        <h2 className="mt-7 text-[104px] font-bold leading-[1.15]" style={{ color: COSMOS.sol }}>
          ผู้ตื่นรู้
          <br />
          ที่ลงมือทำ
        </h2>
        <p className="mt-2 text-[22px] font-medium" style={{ fontFamily: LATIN, color: starlight("99") }}>
          {quad.en} · <span className="font-bai-jamjuree">{quad.axes}</span>
        </p>
        <p className="mt-[120px] whitespace-pre-line text-[72px] font-semibold leading-[1.28]" style={{ textShadow: `0 2px 18px ${COSMOS.void}` }}>
          <Ink text={OPERATOR.tagline} accent={COSMOS.aurora} />
        </p>
        <Glass className="mt-auto px-9 py-4">
          <ul>
            {OPERATOR.traits.map((t, i) => (
              <li key={t.lead} className="flex items-center gap-6 py-6" style={{ borderTop: i ? `1px solid ${starlight("1a")}` : undefined }}>
                <span className="relative h-[44px] w-[44px] shrink-0 rounded-full" style={{ boxShadow: `inset 0 0 0 3px ${COSMOS.sol}` }}>
                  <span className="absolute inset-[13px] rounded-full" style={{ background: COSMOS.sol }} />
                </span>
                <span>
                  <span className="block text-[38px] font-semibold leading-[1.25]">{t.lead}</span>
                  <span className="block text-[30px] leading-[1.3]" style={{ color: starlight("aa") }}>
                    {t.rest}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Glass>
      </div>
    </Slide>
  );
}

/* ---------- 9. Next move ---------- */

function NextMove() {
  return (
    <Slide n={9}>
      <Eyebrow>Next move</Eyebrow>
      <h2 className="mt-3 whitespace-pre-line text-[84px] font-bold leading-[1.2]">{NEXT_MOVE.title}</h2>
      <div className="mt-10 space-y-5">
        {NEXT_MOVE.moves.map((m) => (
          <Glass key={m.from} className="flex items-center gap-6 px-8 py-8">
            <div className="flex w-[170px] shrink-0 flex-col items-center gap-2">
              <Character q={m.from} width={170} height={140} />
              <span className="text-[20px] font-semibold" style={{ color: TONE[m.from] }}>
                อยู่ช่อง {m.from}
              </span>
            </div>
            <span className="text-[40px]" style={{ color: starlight("66") }}>
              →
            </span>
            <span>
              <span className="block text-[44px] font-bold" style={{ color: COSMOS.sol }}>
                {m.verb}
              </span>
              <span className="block text-[34px] font-medium leading-[1.35]">{m.text}</span>
            </span>
          </Glass>
        ))}
      </div>
      <p className="mt-auto text-[60px] font-bold leading-[1.25]">
        <Ink text={NEXT_MOVE.close} />
      </p>
    </Slide>
  );
}

/* ---------- 10. CTA ---------- */

function Cta() {
  return (
    <Slide n={10}>
      <div className="mt-6 space-y-12">
        {CTA.lines.map((l) => {
          const tone = l.tone === "aurora" ? COSMOS.aurora : COSMOS.sol;
          return (
            <p key={l.text} className="whitespace-pre-line border-l-[6px] pl-8 text-[84px] font-bold leading-[1.22]" style={{ borderColor: tone }}>
              <span style={{ color: tone }}>{l.text.split("\n")[0]}</span>
              {"\n"}
              {l.text.split("\n")[1]}
            </p>
          );
        })}
      </div>

      <Glass className="mt-auto px-10 pb-10 pt-9">
        <p className="text-[56px] font-bold leading-[1.2]">{CTA.ask}</p>
        <div className="mt-6 flex gap-5">
          {(["I", "II", "III", "IV"] as QuadrantId[]).map((q) => (
            <span
              key={q}
              className="flex h-[230px] flex-1 flex-col items-center justify-end gap-2 rounded-[22px] pb-3"
              style={{ background: `${TONE[q]}14`, boxShadow: `inset 0 0 0 2px ${TONE[q]}aa` }}
            >
              <Character q={q} width={180} height={150} />
              <span className="text-[40px] font-semibold leading-none" style={{ fontFamily: LATIN, color: TONE[q] }}>
                {q}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-6 text-[34px] font-semibold" style={{ color: COSMOS.aurora }}>
          {CTA.comment}
        </p>
        <p className="mt-1 text-[30px]" style={{ color: starlight("bb") }}>
          {CTA.share}
        </p>
      </Glass>
      <p className="mt-8 text-center text-[22px] font-medium tracking-[0.12em]" style={{ fontFamily: LATIN, color: starlight("80") }}>
        passionseed.org
      </p>
    </Slide>
  );
}

export function AwakenGrowCarousel() {
  return (
    <div className="flex flex-col gap-10">
      <Cover />
      <FeelsTrue />
      <OneLine />
      <TheMap />
      <DeepDive n={5} q="IV" />
      <DeepDive n={6} q="II" />
      <Punchline />
      <Operator />
      <NextMove />
      <Cta />
    </div>
  );
}
