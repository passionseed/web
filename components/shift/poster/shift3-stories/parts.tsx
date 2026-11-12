import { Fragment, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import { PassionSeedMark } from "@/components/shift/poster/riso";
import { Starfield } from "@/components/shift/poster/Starfield";
import { SHIFT_COHORT_3 } from "@/lib/content/shift-cohort";

import horizon from "./horizon.png";

/**
 * Building blocks for the SHIFT[3] Stories: deep space, the SHIFT planet's
 * horizon under the IG reply bar, clear glass panes, and the empty sticker
 * slots a person fills in Instagram by hand.
 */

export const STORY_W = 1080;
export const STORY_H = 1920;
/** Instagram's own UI: the progress bar and handle on top, the reply bar below. */
export const SAFE_TOP = 220;
export const SAFE_BOTTOM = 340;
export const LATIN = "var(--font-libre-franklin), ui-sans-serif, system-ui, sans-serif";

/** Mirrors render-horizon.mjs: where the PNG starts and where Bangkok sits. */
const HORIZON_TOP = 1240;
export const BANGKOK = { x: 352, y: 1688 };

/**
 * Sets the cohort name ("SHIFT[3]") in the Latin face wherever it appears in a
 * Thai line: Bai Jamjuree draws square brackets round, so the name would
 * otherwise read as "SHIFT(3)", a wordmark variant.
 */
export function Named({ text }: { text: string }) {
  const parts = text.split(SHIFT_COHORT_3.name);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={{ fontFamily: LATIN, letterSpacing: "-0.01em" }}>{SHIFT_COHORT_3.name}</span>}
          {part}
        </Fragment>
      ))}
    </>
  );
}

/** `**accent**` spans in a copy string; line breaks come from pre-line. */
export function Ink({ text, accent = COSMOS.sol }: { text: string; accent?: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 ? (
          <span key={i} style={{ color: accent }}>
            <Named text={part} />
          </span>
        ) : (
          <Named key={i} text={part} />
        ),
      )}
    </>
  );
}

/** A specular hairline, bright where light hits the top-left (as on /shift/next). */
function Hairline({ radius }: { radius: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        borderRadius: radius,
        padding: 1.5,
        background:
          "linear-gradient(150deg, rgba(255,255,255,0.38), rgba(255,255,255,0.07) 32%, rgba(255,255,255,0.04) 64%, rgba(157,140,255,0.3))",
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
    />
  );
}

export function Glass({
  children,
  className = "",
  radius = 32,
  style,
}: {
  children?: ReactNode;
  className?: string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        borderRadius: radius,
        background: "linear-gradient(180deg, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.03) 100%)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 40px 90px -50px rgba(0,0,0,0.9)",
        ...style,
      }}
    >
      <Hairline radius={radius} />
      {children}
    </div>
  );
}

/** Small Latin label in a glass pill, led by a sol dot (the /shift/next chip). */
export function Chip({ children, tone = COSMOS.sol }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className="inline-flex items-center gap-3 rounded-full px-6 py-[10px] text-[20px] font-medium uppercase tracking-[0.18em]"
      style={{
        fontFamily: LATIN,
        color: starlight("d9"),
        background: "rgba(255,255,255,0.06)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
      }}
    >
      <span className="h-[10px] w-[10px] rounded-full" style={{ background: tone, boxShadow: `0 0 12px ${tone}` }} />
      {children}
    </span>
  );
}

/** Header row: the PassionSeed mark and the story's chip. */
export function StoryHead({ chip, tone }: { chip: string; tone?: string }) {
  return (
    <header className="flex items-center justify-between">
      <PassionSeedMark size={44} />
      <Chip tone={tone}>{chip}</Chip>
    </header>
  );
}

export const STARLIGHT_TEXT: CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f1f4ff 45%, #a9b4dc 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/**
 * The cohort name exactly as the record spells it ("SHIFT[3]"): the canonical
 * wordmark, never a lens or circled-number variant. The bracketed round takes
 * the sol accent so the number still reads first.
 */
export function Wordmark({ size, name }: { size: number; name: string }) {
  const match = /^(.*?)(\[.*\])$/.exec(name);
  const [word, round] = match ? [match[1], match[2]] : [name, ""];
  return (
    <p
      className="whitespace-nowrap font-medium"
      style={{ fontFamily: LATIN, fontSize: size, lineHeight: 1, letterSpacing: "-0.04em" }}
    >
      <span style={{ ...STARLIGHT_TEXT, filter: "drop-shadow(0 0.04em 0.18em rgba(100,130,255,0.25))" }}>{word}</span>
      {round && (
        <span style={{ color: COSMOS.sol, textShadow: `0 0 0.3em ${COSMOS.sol}44` }}>{round}</span>
      )}
    </p>
  );
}

/**
 * The empty pane a sticker is dropped on in Instagram. No words inside: the
 * sticker brings its own. A dashed aurora edge says "something goes here".
 */
export function StickerSlot({ width, height, radius = 36 }: { width: number; height: number; radius?: number }) {
  return (
    <Glass className="mx-auto shrink-0" radius={radius} style={{ width, height, boxShadow: `0 0 80px -20px ${COSMOS.aurora}55, inset 0 1px 0 rgba(255,255,255,0.12)` }}>
      <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
        <rect
          x="7"
          y="7"
          width={width - 14}
          height={height - 14}
          rx={radius - 7}
          fill="none"
          stroke={COSMOS.aurora}
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeDasharray="3 11"
          strokeLinecap="round"
        />
      </svg>
    </Glass>
  );
}

/** A short line above a sticker slot that points down at it. */
export function SlotCue({ children }: { children: ReactNode }) {
  return (
    <p className="mb-5 flex items-center justify-center gap-3 text-[34px] font-semibold leading-[1.4]" style={{ color: COSMOS.star }}>
      {children}
      <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">
        <path d="M13 2 V26 M3 17 L13 27 L23 17" fill="none" stroke={COSMOS.aurora} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </p>
  );
}

/** The rocket from the SHIFT High poster, pointing up at rotate 0. */
export function Rocket({ x, y, rotate = 0, scale = 1, flame = true }: { x: number; y: number; rotate?: number; scale?: number; flame?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`} filter="drop-shadow(0 0 22px rgba(255,210,154,0.4))">
      {flame && <path d="M-22 72 C -18 130, -6 170, 0 196 C 6 170, 18 130, 22 72 Z" fill="url(#s3s-flame)" />}
      <path d="M-30 30 L -60 86 L -28 72 Z" fill={COSMOS.flare} />
      <path d="M30 30 L 60 86 L 28 72 Z" fill={COSMOS.flare} />
      <path d="M0 -96 C 34 -64, 40 -4, 32 70 L -32 70 C -40 -4, -34 -64, 0 -96 Z" fill="url(#s3s-body)" />
      <circle cx="0" cy="-16" r="16" fill={COSMOS.sea} stroke={COSMOS.aurora} strokeWidth="6" />
      <path d="M-32 70 L 32 70 L 22 84 L -22 84 Z" fill={COSMOS.indigo} />
    </g>
  );
}

/** Full-sheet SVG layer for rockets and trails, with their gradients. */
export function Overlay({ children }: { children: ReactNode }) {
  return (
    <svg className="pointer-events-none absolute inset-0" width={STORY_W} height={STORY_H} viewBox={`0 0 ${STORY_W} ${STORY_H}`} aria-hidden="true">
      <defs>
        <linearGradient id="s3s-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a9b4dc" />
        </linearGradient>
        <linearGradient id="s3s-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COSMOS.sol} />
          <stop offset="1" stopColor={COSMOS.flare} stopOpacity="0" />
        </linearGradient>
        <filter id="s3s-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {children}
    </svg>
  );
}

/** A dotted sol trail, as the rocket's path on the SHIFT High poster. */
export function Trail({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={COSMOS.sol} strokeWidth="4" strokeDasharray="3 12" strokeLinecap="round" />;
}

/** Deep space for a 1080x1920 sheet: Starfield draws 1440 rows, a second
 *  window onto a far part of the panorama fills the last 480. */
function Sky({ index }: { index: number }) {
  return (
    <>
      <Starfield index={index} />
      <div className="absolute inset-x-0 overflow-hidden" style={{ top: 1440, height: STORY_H - 1440 }}>
        <div className="relative h-[1440px] w-[1080px]">
          <Starfield index={index + 40} />
        </div>
      </div>
    </>
  );
}

export function StoryFrame({
  id,
  sky,
  overlay,
  children,
}: {
  id: string;
  /** Starfield panorama window, so consecutive stories continue the sky. */
  sky: number;
  /** Rockets and trails, drawn over the planet and under the copy. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: STORY_W, height: STORY_H, color: COSMOS.star, background: COSMOS.void }}
    >
      <Sky index={sky} />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(900px 700px at 88% 6%, ${COSMOS.nebula}2e, transparent 62%), radial-gradient(760px 620px at 0% 42%, ${COSMOS.indigo}3a, transparent 66%), radial-gradient(1100px 520px at 50% 92%, ${COSMOS.indigo}44, transparent 70%)`,
        }}
      />
      <Image
        src={horizon}
        alt=""
        width={STORY_W}
        height={STORY_H - HORIZON_TOP}
        unoptimized
        priority
        className="absolute left-0"
        style={{ top: HORIZON_TOP, width: STORY_W, height: STORY_H - HORIZON_TOP }}
      />
      <Overlay>
        <circle cx={BANGKOK.x} cy={BANGKOK.y} r="16" fill={COSMOS.sol} opacity="0.8" filter="url(#s3s-glow)" />
        <circle cx={BANGKOK.x} cy={BANGKOK.y} r="6" fill={COSMOS.sol} />
      </Overlay>
      {overlay && <Overlay>{overlay}</Overlay>}
      <div className="relative flex h-full flex-col px-[72px]" style={{ paddingTop: SAFE_TOP + 16, paddingBottom: SAFE_BOTTOM }}>
        {children}
      </div>
    </section>
  );
}
