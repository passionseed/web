import type { CSSProperties, ReactNode } from "react";

import type { ShiftVoice } from "@/lib/content/shift-voices";

import { SHIFT_COHORT_2, formatThaiDate } from "@/lib/content/shift-cohort";

import { APPLY_KEYWORD } from "../grid/ApplyCta";
import { GroundGlow } from "../ShiftPosterDetails";
import { ChromeWordmark, INK, MISREG_TEXT, PAPER_MARGIN, PaperSheet, PassionSeedMark } from "../riso";

/**
 * Inner carousel slide for the SHIFT[2] IG grid, in the same riso print as
 * the CampHub poster: black ink on paper, the dawn horizon cresting the top
 * edge, misregistered pink on the Thai headings. Sized 1080x1440 (3:4) so
 * the profile grid shows each post uncropped, with type set for a phone.
 */

export const COHORT = SHIFT_COHORT_2;
export const TILE_W = 1080;
export const TILE_H = 1440;
export const INK_W = TILE_W - PAPER_MARGIN * 2;
export const INK_H = TILE_H - PAPER_MARGIN * 2;

export const DIM = `${INK.paper}b3`;
export const FAINT = `${INK.paper}73`;

/** Spaced mono label, the riso posters' English kicker. */
export function Kicker({ children, color = INK.orange, size = 18 }: { children: ReactNode; color?: string; size?: number }) {
  return (
    <p className="font-mono uppercase tracking-[0.28em]" style={{ fontSize: size, color }}>
      {children}
    </p>
  );
}

const THAI = /[\u0E00-\u0E7F]/;

/** Thai labels can't take the spaced mono kicker: letter-spacing breaks Thai. */
export function Label({ children, color = INK.orange, size = 24 }: { children: string; color?: string; size?: number }) {
  if (!THAI.test(children)) return <Kicker color={color} size={size * 0.85}>{children}</Kicker>;
  return (
    <p className="font-kodchasan font-bold" style={{ fontSize: size, color }}>
      {children}
    </p>
  );
}

/** "02 / 06" plus a swipe cue, at the foot of every sheet. */
export function SheetFoot({ page, total, cue = "SWIPE →" }: { page: number; total: number; cue?: string | null }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center justify-between">
      <Kicker color={FAINT}>
        {pad(page)} / {pad(total)}
      </Kicker>
      {cue && <Kicker color={INK.paper}>{cue}</Kicker>}
    </div>
  );
}

export function RisoSlide({
  id,
  tag,
  title,
  page,
  total,
  brand = true,
  children,
}: {
  id: string;
  tag: string;
  title: ReactNode;
  page: number;
  total: number;
  /** Show the SHIFT wordmark. Off for the tips post, which leads with value, not the camp. */
  brand?: boolean;
  children: ReactNode;
}) {
  return (
    <PaperSheet id={id} width={TILE_W} height={TILE_H}>
      <GroundGlow />
      <div className="relative flex h-full flex-col px-[72px] pb-[48px] pt-[64px]">
        <div className="flex h-[72px] items-center justify-between">
          <PassionSeedMark size={48} />
          {brand && (
            <div className="-mr-[14px]">
              <ChromeWordmark size={68} name={COHORT.name} />
            </div>
          )}
        </div>
        <div className="mt-10">
          <Label size={28}>{tag}</Label>
          <h2 className="mt-3 font-kodchasan text-[68px] font-bold leading-[1.25]" style={MISREG_TEXT}>
            {title}
          </h2>
        </div>
        <div className="mt-10 flex flex-1 flex-col">{children}</div>
        <div className="mt-8">
          <SheetFoot page={page} total={total} cue={page === total ? null : "SWIPE →"} />
        </div>
      </div>
    </PaperSheet>
  );
}

/** A panel of ink on the black: faint outline, or solid orange for the one thing to notice. */
export function InkCard({
  children,
  hot,
  className = "",
  style,
}: {
  children: ReactNode;
  hot?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-[6px] px-8 py-7 ${className}`}
      style={{
        backgroundColor: hot ? INK.orange : `${INK.paper}0d`,
        boxShadow: hot ? `-4px 3px 0 ${INK.pink}` : `inset 0 0 0 1.5px ${INK.paper}26`,
        color: hot ? INK.black : INK.paper,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Round number stamp for steps and checks. */
export function Stamp({ n, hot, size = 60 }: { n: number | string; hot?: boolean; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-kodchasan font-bold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        backgroundColor: hot ? INK.orange : INK.paper,
        color: INK.black,
        boxShadow: `-3px 2px 0 ${hot ? INK.pink : INK.blue}`,
      }}
    >
      {n}
    </span>
  );
}

/** The keyword in a paper speech bubble, so "comment this" reads at a glance. */
export function KeywordBubble({ size }: { size: number }) {
  return (
    <span className="relative inline-block">
      <span
        className="inline-block rounded-[10px] px-5 pb-1.5 pt-2 font-kodchasan font-bold leading-none"
        style={{ fontSize: size, backgroundColor: INK.paper, color: INK.black, boxShadow: `-3px 2px 0 ${INK.pink}` }}
      >
        {APPLY_KEYWORD}
      </span>
      <span
        className="absolute left-6 top-full h-[14px] w-[14px]"
        style={{ backgroundColor: INK.paper, clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        aria-hidden="true"
      />
    </span>
  );
}

/** How to apply, the Instagram way: comment the keyword, get the link by DM. */
export function CommentCta() {
  return (
    <InkCard hot className="!px-10 !py-9">
      <Kicker color={INK.black}>How to apply</Kicker>
      <div className="mt-4 flex items-center gap-6">
        <p className="font-kodchasan text-[60px] font-bold leading-none">คอมเมนต์</p>
        <KeywordBubble size={64} />
      </div>
      <p className="mt-6 font-kodchasan text-[38px] font-bold leading-[1.35]">แล้วรับลิงก์สมัครทาง DM</p>
      <p className="mt-1 text-[26px] font-semibold leading-[1.45]" style={{ opacity: 0.75 }}>
        ปิดรับ {formatThaiDate(COHORT.applyDeadline)} · รับ {COHORT.seats} คน
      </p>
    </InkCard>
  );
}

/** A student's own words, with nickname and grade only. */
export function QuoteCard({ voice, size = 40, hot }: { voice: ShiftVoice; size?: number; hot?: boolean }) {
  return (
    <InkCard hot={hot} className="!px-10 !py-9">
      <p className="font-kodchasan font-bold leading-none" style={{ fontSize: size * 2.2, color: hot ? INK.black : INK.orange }}>
        “
      </p>
      <p className="-mt-4 font-kodchasan font-semibold leading-[1.45]" style={{ fontSize: size }}>
        {voice.quote}
      </p>
      <p className="mt-6 font-kodchasan text-[30px] font-bold">
        {voice.name}{" "}
        <span className="text-[26px] font-semibold" style={{ opacity: 0.7 }}>
          · {voice.meta}
        </span>
      </p>
    </InkCard>
  );
}
