import type { ReactNode } from "react";

import {
  ChromeBevelFilter,
  ChromeWordmark,
  Grain,
  Halftone,
  INK,
  MISREG_TEXT,
  OrbitSky,
  PassionSeedMark,
  Speckle,
} from "@/components/shift/poster/riso";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

/**
 * Web building blocks for the riso /shift page. Same inks, sky, and chrome
 * as the posters, so the ad and the page it links to read as one print run.
 */

export { INK, MISREG_TEXT };

/** Hero horizon: tall enough for title + wordmark, never taller than the fold. */
const HERO_HORIZON = "clamp(560px, 72svh, 820px)";

export const paper = (alpha: string) => `${INK.paper}${alpha}`;

const THAI = /[\u0E00-\u0E7F]/;

/** Wide mono tracking wrecks Thai, so labels only go mono when they are Latin. */
export function labelClass(text: string) {
  return THAI.test(text)
    ? "text-sm font-semibold"
    : "font-mono text-[11px] font-bold uppercase tracking-[0.28em]";
}
/** Paper at 12%: the only line weight on the page. */
export const HAIR = "border-[rgba(242,234,217,0.12)] divide-[rgba(242,234,217,0.12)]";

/** Ink grain across the whole page, pinned to the viewport. */
export function RisoPageTexture() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[15]" aria-hidden="true">
      <Grain opacity={0.22} />
      <Speckle opacity={0.05} />
    </div>
  );
}

export function RisoHero({
  headline,
  children,
}: {
  headline: ReactNode;
  children: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden">
      <ChromeBevelFilter />
      <OrbitSky horizon={HERO_HORIZON} speckle={0} />

      <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-7">
        <PassionSeedMark size={40} />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <div
          className="flex flex-col items-center justify-center pb-10 pt-24 text-center"
          style={{ minHeight: HERO_HORIZON }}
        >
          <p
            className="font-mono text-[11px] uppercase tracking-[0.3em] sm:text-xs"
            style={{ color: paper("cc") }}
          >
            <span className="hidden sm:inline">R&amp;D Lab · </span>Cohort 01 ·{" "}
            {SHIFT_COHORT.seats} seats
          </p>
          <h1
            className="mt-8 font-kodchasan text-[clamp(40px,7vw,80px)] font-bold leading-[1.3] tracking-tight"
            style={MISREG_TEXT}
          >
            {headline}
          </h1>
          <div className="mt-4 sm:mt-6">
            <ChromeWordmark size="clamp(76px, 15vw, 188px)" />
          </div>
        </div>

        <div className="flex flex-col items-center pb-24 pt-12 text-center sm:pt-16">
          {children}
        </div>
      </div>
    </header>
  );
}

export function RisoHeading({
  eyebrow,
  children,
  align = "left",
}: {
  eyebrow: string;
  children: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : undefined}>
      <p className={labelClass(eyebrow)} style={{ color: INK.orange }}>
        {eyebrow}
      </p>
      <h2
        className="mt-3 font-kodchasan text-3xl font-bold leading-[1.35] tracking-tight sm:text-[44px]"
        style={MISREG_TEXT}
      >
        {children}
      </h2>
    </div>
  );
}

const NUMERAL_INKS = [INK.orange, INK.pink, INK.yellow];

/** Big spot-ink numeral with a soft blue plate bleeding behind it. */
export function RisoNumeral({ index, children }: { index: number; children: ReactNode }) {
  return (
    <span
      className="font-kodchasan text-6xl font-bold leading-none sm:text-7xl"
      style={{
        color: NUMERAL_INKS[index % NUMERAL_INKS.length],
        textShadow: `2px -1.5px 2px ${INK.blue}99`,
      }}
    >
      {children}
    </span>
  );
}

export function inkFor(index: number) {
  return NUMERAL_INKS[index % NUMERAL_INKS.length];
}

/** Columns split by hairlines instead of cards. Stacks on mobile. */
export function HairlineColumns({
  children,
  cols = 3,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={`grid gap-y-10 border-t pt-8 md:gap-y-0 md:divide-x ${HAIR} ${
        cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
      } md:[&>*]:px-7 md:[&>*:first-child]:pl-0 md:[&>*:last-child]:pr-0`}
    >
      {children}
    </div>
  );
}

/** Sunrise bookend for the last section: the horizon rising from below. */
export function RisoSunrise() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          bottom: -2800,
          width: 7200,
          height: 3000,
          background: `linear-gradient(180deg, ${INK.orange} 0px, #ff8fa8 36px, #d69ac4 70px, #5a9fd4 130px, ${INK.blue} 200px)`,
          boxShadow:
            "0 -2px 0 0 rgba(255,108,47,1), 0 -8px 24px 2px rgba(255,90,30,0.55), 0 -50px 130px 20px rgba(255,120,60,0.25)",
        }}
      />
      <Halftone
        color={INK.pink}
        cell={8}
        dot={1.8}
        style={{ left: 0, right: 0, bottom: 0, height: 360, opacity: 0.5 }}
        mask="linear-gradient(0deg, black 0%, transparent 100%)"
      />
    </div>
  );
}
