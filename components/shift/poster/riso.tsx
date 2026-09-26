import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

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

/**
 * Dawn seen from orbit: blue sky with pink and yellow halftone plates, a
 * black-ink planet with a burning rim, and a misregistered pink rim above it.
 * `horizon` is a length from the top of the container (px number or any CSS
 * length), so the same sky works on the fixed poster and a fluid web hero.
 */
export function OrbitSky({ horizon, speckle = 0.22 }: { horizon: number | string; speckle?: number }) {
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
      {/* Pink plate: halftone where pink overprints the blue */}
      <Halftone
        color={INK.pink}
        style={{ left: 0, right: 0, top: 0, height: h }}
        mask="linear-gradient(180deg, transparent 38%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.5) 88%, transparent 100%)"
      />
      {/* Yellow plate, coarser screen, only near the horizon */}
      <Halftone
        color={INK.yellow}
        cell={9}
        dot={2.2}
        style={{ left: 0, right: 0, top: 0, height: h, mixBlendMode: "screen" }}
        mask="linear-gradient(180deg, transparent 72%, rgba(0,0,0,0.8) 94%, transparent 100%)"
      />
      {/* Blue plate dots thinning out into the night */}
      <Halftone
        color="#2c7fd0"
        cell={6}
        dot={1.3}
        style={{ left: 0, right: 0, top: 0, height: h }}
        mask="linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 35%)"
      />
      {/* Misregistered pink rim a few px above the orange one */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          top: `calc(${h} - 3px)`,
          width: 7200,
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
          width: 7200,
          height: 3000,
          background: `radial-gradient(ellipse 12% 8% at 50% 0%, #3a1a14 0%, #1d1419 45%, ${INK.black} 100%)`,
          boxShadow:
            "0 -2px 0 0 rgba(255,108,47,1), 0 -8px 20px 2px rgba(255,90,30,0.7), 0 -40px 90px 10px rgba(255,120,60,0.3)",
        }}
      />
      <Grain opacity={0.38} />
      <Speckle opacity={speckle} />
    </div>
  );
}

/** Paper sheet with the inked area inset and fed a hair crooked. */
export function PaperSheet({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: POSTER_W, height: POSTER_H, backgroundColor: INK.paper }}
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
export function ChromeWordmark({ size }: { size: number | string }) {
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
        {SHIFT_COHORT.name}
      </p>
      <p className={`${shared} shift-wordmark--chrome relative`} style={{ fontSize: size }}>
        {SHIFT_COHORT.name}
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

export function PageMark({ page, total }: { page: number; total: number }) {
  return (
    <span className="font-mono text-[13px] tracking-[0.3em]" style={{ color: `${INK.paper}80` }}>
      {String(page).padStart(2, "0")}/{String(total).padStart(2, "0")}
    </span>
  );
}
