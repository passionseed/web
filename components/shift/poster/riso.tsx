import Image from "next/image";
import { useId, type CSSProperties, type ReactNode } from "react";

import { SHIFT_COHORT, SHIFT_TRACKS, type ShiftCohort } from "@/lib/content/shift-cohort";

/**
 * Riso print kit for the SHIFT posters.
 *
 * Risograph look, rebuilt in CSS: a small set of spot inks, paper showing
 * through as "white", halftone dots where inks blend, plates that land a few
 * pixels off each other, and grainy ink that never quite covers.
 */

export const INK = {
  paper: "#f2ead9",
  black: "#17151c",
  blue: "#0078bf",
  pink: "#ff48b0",
  orange: "#ff6c2f",
  yellow: "#ffe800",
} as const;

export const POSTER_W = 1080;
export const POSTER_H = 1350;
/** Riso can't print to the edge, so the ink sits inside a paper margin. */
export const PAPER_MARGIN = 26;

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Soft ink grain, for overlay blending. */
const GRAIN = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
);

/** Sparse paper-colored specks: spots where the drum missed. */
const SPECKLE = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='s'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0 0.85  14 0 0 0 -9.4'/></filter><rect width='100%' height='100%' filter='url(#s)'/></svg>`,
);

/** Paper fibre for the unprinted margin. */
const FIBRE = svgUrl(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.02 0.6' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0.18 0'/></filter><rect width='100%' height='100%' filter='url(#f)'/></svg>`,
);

/** A misregistered second plate: the pink run landed a touch off. */
export const MISREG_TEXT: CSSProperties = {
  color: INK.paper,
  textShadow: `-1.5px 1px 1.5px rgba(255,72,176,0.6)`,
};

export function Grain({ opacity = 0.32 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 mix-blend-overlay"
      style={{ backgroundImage: GRAIN, opacity }}
      aria-hidden="true"
    />
  );
}

export function Speckle({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: SPECKLE, opacity }}
      aria-hidden="true"
    />
  );
}

/**
 * Halftone dots in one ink, faded in and out by a mask so the dot field
 * thins out the way a real screen does.
 */
export function Halftone({
  color,
  mask,
  cell = 7,
  dot = 1.7,
  style,
}: {
  color: string;
  mask: string;
  cell?: number;
  dot?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="pointer-events-none absolute"
      aria-hidden="true"
      style={{
        backgroundImage: `radial-gradient(circle, ${color} ${dot}px, transparent ${dot + 0.6}px)`,
        backgroundSize: `${cell}px ${cell}px`,
        maskImage: mask,
        WebkitMaskImage: mask,
        ...style,
      }}
    />
  );
}

/** [offset 0..1, ink coverage 0..1] stops for a halftone tone ramp. */
export type ToneStop = [number, number];

/** Below this product of dot height and tone, paper shows. Sets the floor of the ramp. */
const AM_THRESHOLD = 0.16;

/**
 * Amplitude-modulated halftone, the way a riso drum actually screens a tint:
 * dots stay put on a rotated grid and grow or shrink with the tone instead
 * of fading out. Each dot is a soft cone; the tone ramp scales it, and a
 * hard alpha threshold cuts it into a crisp dot. A little turbulence is
 * mixed in before the cut so edges come out ragged like real ink.
 *
 * `tone` runs top to bottom, or out from `radial` when given.
 */
export function AmHalftone({
  color,
  tone,
  cell = 6,
  angle = 15,
  grit = 0.1,
  radial,
  style,
}: {
  color: string;
  tone: ToneStop[];
  cell?: number;
  angle?: number;
  grit?: number;
  radial?: { cx: number; cy: number; r: number };
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, "");
  const stops = tone.map(([offset, v]) => (
    <stop key={offset} offset={offset} stopColor="#fff" stopOpacity={v} />
  ));
  const slope = 24;
  return (
    <svg
      className="pointer-events-none absolute"
      style={style}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-cone`}>
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <pattern
          id={`${id}-dots`}
          width={cell}
          height={cell}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${angle})`}
        >
          <circle cx={cell / 2} cy={cell / 2} r={cell * 0.7071} fill={`url(#${id}-cone)`} />
        </pattern>
        {radial ? (
          <radialGradient id={`${id}-tone`} cx={radial.cx} cy={radial.cy} r={radial.r}>
            {stops}
          </radialGradient>
        ) : (
          <linearGradient id={`${id}-tone`} x1="0" y1="0" x2="0" y2="1">
            {stops}
          </linearGradient>
        )}
        <mask id={`${id}-mask`} maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill={`url(#${id}-tone)`} />
        </mask>
        <filter id={`${id}-cut`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="3" result="noise" />
          <feComposite
            in="SourceGraphic"
            in2="noise"
            operator="arithmetic"
            k2="1"
            k3={grit}
            k4={-grit / 2}
            result="rough"
          />
          <feComponentTransfer in="rough" result="cut">
            <feFuncA type="linear" slope={slope} intercept={-slope * AM_THRESHOLD} />
          </feComponentTransfer>
          <feFlood floodColor={color} />
          <feComposite in2="cut" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id}-cut)`}>
        <rect width="100%" height="100%" fill={`url(#${id}-dots)`} mask={`url(#${id}-mask)`} />
      </g>
    </svg>
  );
}

/**
 * Dawn seen from orbit: blue sky with pink and yellow halftone plates, a
 * black-ink planet with a burning rim, and a misregistered pink rim above it.
 * `horizon` is a length from the top of the container (px number or any CSS
 * length), so the same sky works on the fixed poster and a fluid web hero.
 * `rising` is drawn between the sky and the planet, so it comes up from
 * behind the horizon like the sun.
 */
export function OrbitSky({
  horizon,
  speckle = 0.22,
  rising,
  planetWidth = 7200,
}: {
  horizon: number | string;
  speckle?: number;
  rising?: ReactNode;
  /** Wider is flatter. Scenes spanning several sheets need a flatter curve,
   *  or the planet drops below the sky at the outer edges. */
  planetWidth?: number;
}) {
  const h = typeof horizon === "number" ? `${horizon}px` : horizon;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: `calc(${h} + 40px)`,
          background: `linear-gradient(180deg,
            #10183a 0%,
            #0b3f7e 24%,
            ${INK.blue} 44%,
            #5a9fd4 62%,
            #d69ac4 78%,
            #ff8fa8 86%,
            ${INK.orange} 95%,
            #ff4a1c 100%)`,
        }}
      />
      {/* Three plates, each on its own screen angle like a real drum run. */}
      {/* Pink plate: where pink overprints the blue toward dawn */}
      <AmHalftone
        color={INK.pink}
        cell={5.5}
        angle={15}
        style={{ left: 0, top: 0, width: "100%", height: h }}
        tone={[[0, 0], [0.42, 0], [0.64, 0.24], [0.8, 0.36], [0.92, 0.26], [1, 0.16]]}
      />
      {/* Yellow plate, only where the sun is about to break */}
      <AmHalftone
        color={INK.yellow}
        cell={6.5}
        angle={75}
        style={{ left: 0, top: 0, width: "100%", height: h, mixBlendMode: "screen" }}
        tone={[[0, 0], [0.74, 0], [0.93, 0.42], [1, 0.12]]}
      />
      {/* Blue plate dots thinning out into the night */}
      <AmHalftone
        color="#2c7fd0"
        cell={5}
        angle={45}
        style={{ left: 0, top: 0, width: "100%", height: h }}
        tone={[[0, 0.32], [0.16, 0.22], [0.34, 0]]}
      />
      {rising}
      {/* Misregistered pink rim a few px above the orange one */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: `calc(${h} - 3px)`,
          width: planetWidth,
          height: 3000,
          boxShadow: `0 -2px 3px 0 ${INK.pink}`,
          opacity: 0.6,
        }}
      />
      {/* The planet: black ink, a wide ellipse so only a gentle curve shows */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: h,
          width: planetWidth,
          height: 3000,
          background: `radial-gradient(ellipse 12% 8% at 50% 0%, #3a1a14 0%, #1d1419 45%, ${INK.black} 100%)`,
          boxShadow:
            "0 -2px 0 0 rgba(255,108,47,1), 0 -8px 20px 2px rgba(255,90,30,0.7), 0 -40px 90px 10px rgba(255,120,60,0.3)",
        }}
      />
      <Grain opacity={0.24} />
      <Speckle opacity={speckle} />
    </div>
  );
}

/** Paper sheet with the inked area inset and fed a hair crooked. */
export function PaperSheet({
  id,
  width = POSTER_W,
  height = POSTER_H,
  children,
}: {
  id: string;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width, height, backgroundColor: INK.paper }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: FIBRE }}
        aria-hidden="true"
      />
      <div
        className="absolute overflow-hidden"
        style={{
          inset: PAPER_MARGIN,
          backgroundColor: INK.black,
          transform: "rotate(-0.18deg)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Edge lighting for .shift-wordmark--chrome. Render once per page. */
export function ChromeBevelFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter
        id="shift-chrome-bevel"
        x="-10%"
        y="-20%"
        width="120%"
        height="140%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="height" />
        <feSpecularLighting
          in="height"
          surfaceScale="4"
          specularConstant="1.1"
          specularExponent="40"
          lightingColor="#fff6e8"
          result="spec"
        >
          <feDistantLight azimuth="225" elevation="42" />
        </feSpecularLighting>
        <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
        <feComposite
          in="SourceGraphic"
          in2="specIn"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="0.9"
          k4="0"
        />
      </filter>
    </svg>
  );
}

/** Chrome wordmark with a misregistered fluoro-pink plate behind it. */
export function ChromeWordmark({
  size,
  name = SHIFT_COHORT.name,
}: {
  size: number | string;
  name?: string;
}) {
  // Side padding keeps the italic overhang of "]" inside the box, otherwise
  // background-clip and the bevel filter both cut it at the edge.
  const shared = "shift-wordmark select-none whitespace-nowrap px-[0.14em]";
  return (
    <div className="relative inline-block" style={{ fontSize: size }}>
      <p
        className={`${shared} absolute inset-0`}
        style={{
          fontSize: size,
          color: INK.pink,
          background: "none",
          WebkitTextFillColor: INK.pink,
          translate: "3px 2px",
          opacity: 0.55,
          filter: "blur(1.5px)",
          mixBlendMode: "screen",
        }}
        aria-hidden="true"
      >
        {name}
      </p>
      <p className={`${shared} shift-wordmark--chrome relative`} style={{ fontSize: size }}>
        {name}
      </p>
    </div>
  );
}

/** PassionSeed logo + name, top-left brand mark for posters and the hero. */
export function PassionSeedMark({ size = 40, label = true }: { size?: number; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 normal-case tracking-normal">
      <Image
        src="/passion-seed-logo.png"
        alt="PassionSeed"
        width={size}
        height={size}
        unoptimized
        className="shrink-0 drop-shadow-[0_2px_6px_rgba(8,2,20,0.45)]"
      />
      {label && (
        <span
          className="font-kodchasan font-bold tracking-tight"
          style={{ fontSize: size * 0.5, color: INK.paper }}
        >
          PassionSeed
        </span>
      )}
    </span>
  );
}

/** Cohort and seat count, sized to be read from a phone feed. */
export function CohortBadge({
  size = 22,
  cohort = SHIFT_COHORT,
}: {
  size?: number;
  cohort?: ShiftCohort;
}) {
  return (
    <span
      className="inline-flex items-center gap-2.5 rounded-full font-kodchasan font-semibold"
      style={{
        fontSize: size,
        padding: `${size * 0.3}px ${size * 0.8}px`,
        color: INK.paper,
        backgroundColor: `${INK.black}59`,
        boxShadow: `inset 0 0 0 1.5px ${INK.paper}4d`,
      }}
    >
      <span className="rounded-full" style={{ width: size * 0.4, height: size * 0.4, backgroundColor: INK.orange }} />
      {cohort.name} · รับ {cohort.seats} คน
    </span>
  );
}

export function PageMark({ page, total }: { page: number; total: number }) {
  return (
    <span className="font-mono text-[13px] tracking-[0.3em]" style={{ color: `${INK.paper}80` }}>
      {String(page).padStart(2, "0")}/{String(total).padStart(2, "0")}
    </span>
  );
}

/**
 * Which tracks and programs the cohort points at, set right under the
 * wordmark at the same tilt. Paper ink with the blue and pink plates
 * slipped off register, plus a soft glow so it lifts off the bright sky.
 */
const TRACKS_INK: CSSProperties = {
  color: "#ffffff",
  textShadow: `-2px 1.5px 0 ${INK.pink}, 2px -1px 0 ${INK.blue}b3, 0 0 12px rgba(80,20,120,0.55)`,
};

export function ShiftTracks({ size = 28 }: { size?: number }) {
  return (
    <div
      className="origin-left font-kodchasan font-bold leading-[1.35]"
      style={{ ...TRACKS_INK, rotate: "-4.08deg" }}
    >
      <p style={{ fontSize: size }}>สาย {SHIFT_TRACKS.fields.join(" · ")}</p>
      <p className="tracking-[0.04em]" style={{ fontSize: size * 0.92 }}>
        {SHIFT_TRACKS.programs.join("  ·  ")}
      </p>
    </div>
  );
}

/** Marker-pen highlight for the one promise that must not be missed. */
export function MarkerHighlight({ children }: { children: ReactNode }) {
  return (
    <span
      className="whitespace-nowrap font-kodchasan font-bold"
      style={{
        color: INK.black,
        padding: "0.05em 0.35em 0.12em",
        borderRadius: "0.3em 0.15em 0.35em 0.12em",
        background: "linear-gradient(100deg, rgba(255,224,138,0.96), rgba(255,213,97,0.92))",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}

/** Refund promise, shared by every poster so the wording never drifts. */
export const REFUND_PROMISE = "ไม่ได้ชิ้นงาน คืนเงินเต็ม";
