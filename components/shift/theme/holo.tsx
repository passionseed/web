import Image from "next/image";

import {
  HEADLINE_FILL,
  HoloWordmark,
  LightBands,
  SKY,
  type LightBand,
} from "@/components/shift/poster/zero/holo";

import type { ShiftPalette } from "./tokens";
import type { ShiftHeroProps, ShiftTheme } from "./types";

/**
 * SHIFT[0]: the holographic pilot print. Deep purple page, the poster's
 * purple to orange sky across the hero, glass and a hot yellow to orange
 * headline. The round is over, so the hero reads as a first edition.
 *
 * Contrast on #1a0b33: text 18:1, text at 60% 6.7:1, orange 7.9:1,
 * magenta 6.7:1, yellow 12.8:1, cyan 12.9:1.
 */

const BG = "#1a0b33";

const PALETTE: ShiftPalette = {
  bg: BG,
  text: "#fbf7ff",
  accent1: "#ff8a3d",
  accent2: "#ff5fb8",
  accent3: "#ffd23f",
  accent4: "#7fe6ff",
  hair: "rgba(251,247,255,0.14)",
  headingShadow: "0 0 18px rgba(200,170,255,0.35), 0 3px 0 rgba(10,2,24,0.55)",
  bar: "rgba(26,11,51,0.88)",
  button: {
    bg: "linear-gradient(90deg, #ffe45c 0%, #ffb52e 45%, #ff6a1f 100%)",
    fg: "#2a0a4a",
    shadow: "0 8px 22px rgba(255,120,60,0.35), inset 0 1px 0 rgba(255,255,255,0.55)",
    shadowHover: "0 12px 30px rgba(255,120,60,0.5), inset 0 1px 0 rgba(255,255,255,0.7)",
  },
};

const HERO_BANDS: LightBand[] = [
  { top: -200, left: "30%", width: 180, opacity: 0.1 },
  { top: -240, left: "50%", width: 70, opacity: 0.08 },
  { top: -160, left: "74%", width: 260, opacity: 0.07 },
];

function Brand({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <Image
        src="/passion-seed-logo.png"
        alt="PassionSeed"
        width={132}
        height={132}
        unoptimized
        className="h-[clamp(64px,11vw,132px)] w-auto shrink-0 drop-shadow-[0_6px_14px_rgba(8,2,20,0.5)]"
      />
      <div className="text-left">
        <HoloWordmark size="clamp(58px, 12vw, 150px)" name={name} />
        <p
          className="mt-1 pl-3 text-[clamp(18px,2.6vw,34px)] leading-none text-white/95"
          style={{ fontFamily: "var(--font-libre-franklin), sans-serif" }}
        >
          by <span className="font-bold">passion</span>
          <span className="font-normal text-white/80">seed</span>
        </p>
      </div>
    </div>
  );
}

function HoloHero({ cohort, children }: ShiftHeroProps) {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: SKY }} aria-hidden="true" />
      <LightBands bands={HERO_BANDS} />
      {/* Sky fades into the page so the body continues the same print. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%]"
        style={{ background: `linear-gradient(180deg, transparent, ${BG})` }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-24 pt-20 text-center sm:px-8 sm:pt-28">
        <span
          className="rounded-full px-4 py-1.5 font-kodchasan text-sm font-semibold sm:text-base"
          style={{ background: "#ffd23f", color: "#2a0a4a" }}
        >
          จบรุ่นแล้ว · รุ่นแรก · {cohort.seats} คน
        </span>
        <div className="mt-8">
          <Brand name={cohort.name} />
        </div>
        <h1
          className="mt-10 font-kodchasan text-[clamp(34px,5.6vw,68px)] font-bold leading-[1.3]"
          style={HEADLINE_FILL}
        >
          <span className="whitespace-nowrap">7 วัน ชิ้นงานจริง</span>{" "}
          <span className="whitespace-nowrap">ปล่อยสู่โลกจริง</span>
        </h1>
        <div className="mt-10 flex flex-col items-center">{children}</div>
      </div>
    </header>
  );
}

/** Warm glow rising behind the final CTA, the poster's orange corner. */
function HoloBookend() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(255,106,31,0.45), rgba(208,48,111,0.3) 45%, transparent 75%)",
      }}
      aria-hidden="true"
    />
  );
}

export const HOLO_THEME: ShiftTheme = {
  kind: "riso",
  palette: PALETTE,
  Hero: HoloHero,
  Bookend: HoloBookend,
};
