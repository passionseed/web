import type { CSSProperties, ReactNode } from "react";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import { Starfield } from "@/components/shift/poster/Starfield";

import { LATIN } from "./studioTheme";

/**
 * The SHIFT[3] cosmos kit for studio sheets: glass panes, the SHIFT lens
 * wordmark, Latin eyebrows, a glow highlight, and the deep-space ground
 * (seeded starfield, nebula light, a planet limb for covers). Values follow
 * components/shift/next (shiftNext.module.css) and the SHIFT High poster.
 */

/** Sol at an alpha, for the warm light (price, highlight, the beacon). */
const sol = (a: number) => `rgba(255,210,154,${a})`;

/**
 * Clear glass: a faint top-lit fill, a specular hairline that is bright at
 * the top-left, and a deep drop shadow. `tone` tints it with one light.
 */
export function Glass({
  tone,
  radius = 28,
  className = "",
  style,
  children,
}: {
  tone?: string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const fill = tone
    ? `radial-gradient(120% 90% at 0% 0%, ${tone}24, transparent 60%), linear-gradient(180deg, ${tone}1c 0%, ${tone}08 100%)`
    : "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.05), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 100%)";
  const edge = tone
    ? `linear-gradient(150deg, ${tone}d9, ${tone}33 34%, rgba(255,255,255,0.05) 64%, ${tone}66)`
    : "linear-gradient(150deg, rgba(255,255,255,0.36), rgba(255,255,255,0.07) 32%, rgba(255,255,255,0.04) 64%, rgba(157,140,255,0.26))";
  return (
    <div
      className={`relative ${className}`}
      style={{
        borderRadius: radius,
        background: fill,
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,0.12)",
          tone ? `inset 0 0 48px -12px ${tone}33, 0 0 80px -30px ${tone}73` : "inset 0 0 48px -16px rgba(127,227,255,0.08)",
          "0 40px 90px -50px rgba(0,0,0,0.9)",
        ].join(", "),
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          padding: tone ? 1.5 : 1,
          background: edge,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {children}
    </div>
  );
}

/** ==highlight== on cosmos: a soft sol pill that glows instead of a marker swipe. */
export function GlowMark({ children }: { children: ReactNode }) {
  return (
    <span
      className="whitespace-nowrap font-bold"
      style={{
        color: COSMOS.sol,
        padding: "0.02em 0.45em 0.08em",
        borderRadius: 999,
        background: `linear-gradient(180deg, ${sol(0.2)}, ${sol(0.07)})`,
        boxShadow: `inset 0 0 0 1.5px ${sol(0.5)}, inset 0 1px 0 rgba(255,255,255,0.2), 0 0 34px -6px ${sol(0.45)}`,
        textShadow: `0 0 18px ${sol(0.45)}`,
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}

/** Spaced Latin label, with a short aurora hairline trailing off. */
export function Eyebrow({
  children,
  color = COSMOS.aurora,
  size = 20,
  rule = true,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  rule?: boolean;
}) {
  return (
    <p
      className="flex items-center gap-4 font-semibold uppercase tracking-[0.22em]"
      style={{ fontFamily: LATIN, fontSize: size, color }}
    >
      {children}
      {rule && (
        <span className="h-px w-16 shrink-0" style={{ background: `linear-gradient(90deg, ${color}99, transparent)` }} />
      )}
    </p>
  );
}

/**
 * The cohort name in chrome-white Latin, printed exactly as the record has it
 * ("SHIFT[3]"): the bracket form is the canonical wordmark, so the round is
 * never swapped for a circled digit or a lens. The brackets sit a touch
 * dimmer so "SHIFT" leads and the round still reads.
 */
export function CosmosWordmark({ name, size }: { name: string; size: number }) {
  const match = /^(.*)\[(\d+)\]$/.exec(name);
  const chrome = {
    background: "linear-gradient(180deg, #ffffff 0%, #f1f4ff 45%, #a9b4dc 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  } as const;
  const bracket = { ...chrome, background: "linear-gradient(180deg, #c8d6ff, #7fe3ff)", fontWeight: 400 } as const;
  return (
    <span
      className="inline-flex items-baseline whitespace-nowrap font-medium"
      style={{
        fontFamily: LATIN,
        fontSize: size,
        lineHeight: 0.9,
        letterSpacing: "-0.045em",
        filter: "drop-shadow(0 0.04em 0.18em rgba(100,130,255,0.3))",
      }}
    >
      {match ? (
        <>
          <span style={{ ...chrome, paddingRight: "0.02em" }}>{match[1]}</span>
          <span style={bracket}>[</span>
          <span style={chrome}>{match[2]}</span>
          <span style={{ ...bracket, paddingRight: "0.04em" }}>]</span>
        </>
      ) : (
        <span style={chrome}>{name}</span>
      )}
    </span>
  );
}

/** Numbered stop: a glass ring in one light; `lit` fills it for step one. */
export function RingStamp({ n, ink, size, lit }: { n: number | string; ink: string; size: number; lit?: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-medium leading-none"
      style={{
        width: size,
        height: size,
        fontFamily: LATIN,
        fontSize: size * 0.44,
        color: lit ? COSMOS.void : ink,
        background: lit ? `radial-gradient(circle at 34% 28%, #fff8ec, ${ink} 72%)` : `${ink}14`,
        boxShadow: lit ? `0 0 26px -2px ${ink}aa` : `inset 0 0 0 2px ${ink}cc, 0 0 20px -6px ${ink}`,
      }}
    >
      {n}
    </span>
  );
}

/** Bullet: a ring with a glowing core, like a lit planet on the orbit. */
export function OrbDot({ ink, size = 34 }: { ink: string; size?: number }) {
  return (
    <span
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, boxShadow: `inset 0 0 0 2.5px ${ink}` }}
    >
      <span
        className="absolute rounded-full"
        style={{ inset: size * 0.28, background: ink, boxShadow: `0 0 12px ${ink}` }}
      />
    </span>
  );
}

/** The warm aside on cosmos: a sol glass chip at a slight tilt. */
export function CosmosNote({ text, tilt, size }: { text: string; tilt: number; size: number }) {
  return (
    <span
      className="inline-block font-semibold leading-[1.45]"
      style={{
        fontSize: size,
        padding: "0.16em 0.7em 0.24em",
        color: COSMOS.sol,
        borderRadius: 18,
        background: `linear-gradient(100deg, ${sol(0.16)}, ${sol(0.06)})`,
        boxShadow: `inset 0 0 0 1.5px ${sol(0.36)}, 0 12px 30px -14px rgba(0,0,0,0.7)`,
        transform: `rotate(${tilt * 0.6}deg)`,
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {text}
    </span>
  );
}

/** The starfield's native window; taller sheets scale it to cover. */
const SKY_W = 1080;
const SKY_H = 1440;

/** Nebula light over the stars: violet from the top-right, indigo low. */
const NEBULA = [
  `radial-gradient(900px 620px at 88% 0%, ${COSMOS.nebula}33, transparent 62%)`,
  `radial-gradient(700px 520px at 0% 34%, ${COSMOS.indigo}40, transparent 66%)`,
  `radial-gradient(900px 520px at 72% 100%, ${COSMOS.indigo}55, transparent 70%)`,
].join(", ");

/**
 * Full-bleed deep space. Slide n is window n of the seeded panorama, so the
 * milky-way band runs on across a swiped carousel.
 */
export function CosmosGround({ page, width, height, sky }: { page: number; width: number; height: number; sky?: boolean }) {
  const scale = Math.max(width / SKY_W, height / SKY_H);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className="absolute left-1/2 top-0"
        style={{ width: SKY_W, height: SKY_H, transform: `translateX(-50%) scale(${scale})`, transformOrigin: "50% 0" }}
      >
        <Starfield index={page - 1} />
      </div>
      <div className="absolute inset-0" style={{ background: NEBULA }} />
      {sky && <PlanetLimb width={width} height={height} />}
    </div>
  );
}

/**
 * Cover sky: the SHIFT planet rising from the foot of the sheet, aurora on
 * its rim, sunrise on the limb and Bangkok lit as a sol beacon.
 */
function PlanetLimb({ width, height }: { width: number; height: number }) {
  const R = 1150;
  const cx = 860;
  const top = Math.round(height * 0.66);
  const cy = top + R;
  // Bangkok sits just inside the limb, left of the summit.
  const a = (-104 * Math.PI) / 180;
  const beacon = { x: cx + (R - 70) * Math.cos(a), y: cy + (R - 70) * Math.sin(a) };
  return (
    <svg className="absolute inset-0" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <radialGradient id="limb-body" gradientUnits="userSpaceOnUse" cx={cx - 120} cy={top + 30} r={980}>
          <stop offset="0" stopColor="#16246a" />
          <stop offset="0.32" stopColor="#0c1640" />
          <stop offset="0.7" stopColor="#070d2a" />
          <stop offset="1" stopColor="#03061a" />
        </radialGradient>
        <radialGradient id="limb-dot-fade" gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={R}>
          <stop offset="0.84" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.95" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
        </radialGradient>
        <mask id="limb-dots" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <circle cx={cx} cy={cy} r={R - 2} fill="url(#limb-dot-fade)" />
        </mask>
        <pattern id="limb-grid" width="15" height="15" patternUnits="userSpaceOnUse">
          <circle cx="7.5" cy="7.5" r="1.6" fill={COSMOS.aurora} />
        </pattern>
        <linearGradient id="limb-rim" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
          <stop offset="0" stopColor={COSMOS.aurora} stopOpacity="0.15" />
          <stop offset="0.5" stopColor={COSMOS.aurora} stopOpacity="0.9" />
          <stop offset="0.78" stopColor="#e6fbff" />
          <stop offset="1" stopColor={COSMOS.nebula} stopOpacity="0.7" />
        </linearGradient>
        <filter id="limb-haze" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
        <filter id="limb-air" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="limb-glint" x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="limb-beacon" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Atmosphere: a wide violet haze and a tighter aurora band. */}
      <circle cx={cx} cy={cy} r={R + 50} fill="none" stroke={COSMOS.nebula} strokeWidth="140" opacity="0.22" filter="url(#limb-haze)" />
      <circle cx={cx} cy={cy} r={R + 10} fill="none" stroke={COSMOS.aurora} strokeWidth="30" opacity="0.4" filter="url(#limb-air)" />
      <circle cx={cx} cy={cy} r={R} fill="url(#limb-body)" />
      <rect x="0" y={top - 10} width={width} height={height - top + 10} fill="url(#limb-grid)" mask="url(#limb-dots)" opacity="0.34" />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#limb-rim)" strokeWidth="2.5" />

      {/* Sunrise on the limb. */}
      <ellipse cx={cx + 40} cy={top + 2} rx="300" ry="20" fill={COSMOS.sol} opacity="0.32" filter="url(#limb-glint)" />
      <ellipse cx={cx + 40} cy={top + 1} rx="120" ry="3" fill="#fff6e6" opacity="0.85" filter="url(#limb-beacon)" />

      {/* Bangkok. */}
      <circle cx={beacon.x} cy={beacon.y} r="30" fill="none" stroke={COSMOS.sol} strokeWidth="1.5" opacity="0.28" />
      <circle cx={beacon.x} cy={beacon.y} r="17" fill="none" stroke={COSMOS.sol} strokeWidth="1.5" opacity="0.55" />
      <circle cx={beacon.x} cy={beacon.y} r="14" fill={COSMOS.sol} opacity="0.7" filter="url(#limb-beacon)" />
      <circle cx={beacon.x} cy={beacon.y} r="5.5" fill={COSMOS.sol} />
    </svg>
  );
}

/** Page count in a glass chip, the way the cosmos carousels number slides. */
export function PageChip({ children }: { children: ReactNode }) {
  return (
    <span
      className="rounded-full px-5 py-2 text-[18px] font-medium tracking-[0.16em]"
      style={{
        fontFamily: LATIN,
        color: starlight("cc"),
        background: "rgba(255,255,255,0.06)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
    >
      {children}
    </span>
  );
}
