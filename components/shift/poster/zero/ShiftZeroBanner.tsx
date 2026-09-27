import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import {
  SHIFT_COHORT_0,
  formatThaiDate,
} from "@/lib/content/shift-cohort";

import { GLASS, HEADLINE_FILL, HoloWordmark, LightBands, SKY } from "./holo";

/**
 * SHIFT[0] listing banner (1200x630) for the /shift gallery. Same look as the
 * original pilot poster (purple to orange glass, holographic wordmark), but
 * framed as a finished first edition: what the round shipped, not a pitch.
 * Titles only on the showcase, never names: the students are minors.
 */

export const ZERO_BANNER_W = 1200;
export const ZERO_BANNER_H = 630;

const COHORT = SHIFT_COHORT_0;

function Brand() {
  return (
    <div className="flex items-center gap-5">
      <Image
        src="/passion-seed-logo.png"
        alt="PassionSeed"
        width={132}
        height={132}
        unoptimized
        className="shrink-0 drop-shadow-[0_6px_14px_rgba(8,2,20,0.5)]"
      />
      <div>
        <HoloWordmark size={134} name={COHORT.name} />
        <p
          className="mt-1 pl-3 text-[34px] leading-none text-white/95"
          style={{ fontFamily: "var(--font-libre-franklin), sans-serif" }}
        >
          by <span className="font-bold">passion</span>
          <span className="font-normal text-white/80">seed</span>
        </p>
      </div>
    </div>
  );
}

function Chip({
  children,
  size = 22,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-[0.85em] py-[0.45em] font-kodchasan font-semibold leading-none"
      style={{ fontSize: size, ...style }}
    >
      {children}
    </span>
  );
}

/** Round status and the facts that stay true after it ended. */
function EditionFacts() {
  return (
    <div className="flex flex-col items-end gap-3">
      <Chip style={{ background: "#ffd23f", color: "#2a0a4a", boxShadow: "0 6px 18px rgba(20,4,40,0.35)" }}>
        จบรุ่นแล้ว
      </Chip>
      <div className="rounded-2xl px-5 py-3 text-right" style={GLASS}>
        <p className="font-kodchasan text-[30px] font-bold leading-tight text-white">
          {COHORT.seats} คน · รุ่นแรก
        </p>
        <p className="font-kodchasan text-[19px] leading-snug text-white/75">
          {dateSpan(COHORT.startDate, COHORT.endDate)}
        </p>
        <p className="font-kodchasan text-[19px] leading-snug text-white/75">Online บน Discord
        </p>
      </div>
    </div>
  );
}

/** "21 ถึง 27 ก.ย.", dropping the repeated month when both ends share it. */
function dateSpan(startIso: string, endIso: string): string {
  const start = formatThaiDate(startIso, false);
  const end = formatThaiDate(endIso, false);
  const [startDay, startMonth] = start.split(" ");
  return startMonth === end.split(" ")[1] ? `${startDay} ถึง ${end}` : `${start} ถึง ${end}`;
}

function Headline() {
  return (
    <h1 className="font-kodchasan text-[70px] font-bold leading-[1.25] tracking-tight" style={HEADLINE_FILL}>
      7 วัน ชิ้นงานจริง ปล่อยสู่โลกจริง
    </h1>
  );
}

/** The live projects the round shipped, as title chips. */
function Showcase() {
  const projects = COHORT.showcase ?? [];
  return (
    <div className="rounded-3xl px-6 py-5" style={GLASS}>
      <p className="font-kodchasan text-[22px] font-semibold leading-none text-white/85">
        <span className="text-[#ffd23f]">{projects.length} ชิ้นงาน</span> ที่ปล่อยใช้งานจริงแล้ว
      </p>
      <div className="mt-4 flex flex-nowrap gap-[10px]">
        {projects.map((p) => (
          <Chip
            key={p.url}
            size={20}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.28)",
              color: "#fff",
            }}
          >
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
            {p.title}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function ShiftZeroBanner() {
  return (
    <div
      id="shift0-banner"
      className="relative shrink-0 overflow-hidden"
      style={{ width: ZERO_BANNER_W, height: ZERO_BANNER_H, background: SKY }}
    >
      <LightBands />
      <div className="relative flex h-full flex-col justify-between px-[52px] pb-[40px] pt-[36px]">
        <div className="flex items-start justify-between">
          <Brand />
          <EditionFacts />
        </div>
        <Headline />
        <Showcase />
      </div>
    </div>
  );
}
