import type { ReactNode } from "react";

import { PIXEL_FONT, PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { ICON_PALETTE } from "@/components/shift/poster/pixel/pixelIcons";
import { CELL, GRID_H, GRID_W, PX } from "@/components/shift/poster/pixel/pixelKit";
import { PassionSeedMark } from "@/components/shift/poster/riso";
import { SCHOOL_POSTERS } from "@/lib/content/shift-school";

import { SCHOOL_ICONS, type SchoolIconName } from "./schoolPixelIcons";
import { STRIP, SchoolStripScene } from "./SchoolPixelScene";

/** Notched corners, the pixel-art way to round a box (same as ShiftPixelDetails). */
export const notch = (n: number) =>
  `polygon(0 ${n}px, ${n}px ${n}px, ${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px))`;

export function Icon({ name, scale = 5, className }: { name: SchoolIconName; scale?: number; className?: string }) {
  return <PixelIcon className={className} grid={SCHOOL_ICONS[name]} palette={ICON_PALETTE} scale={scale} />;
}

/**
 * Copy with "\n" forced breaks, each line kept whole. Chrome's Thai line
 * breaker can split a word mid-syllable at poster widths, so short lines that
 * matter are broken by hand instead.
 */
export function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line) => (
        <span key={line} className="block whitespace-nowrap">
          {line}
        </span>
      ))}
    </>
  );
}

/** Pixel tag, e.g. DAY 1 or REQUIRED. */
export function Tag({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dim" }) {
  const light = tone === "light";
  return (
    <span
      className="inline-flex items-center px-[10px] py-[5px] text-[16px] leading-none tracking-[0.08em]"
      style={{
        ...PIXEL_FONT,
        color: light ? PX.ink : PX.cream,
        backgroundColor: light ? PX.accentLight : `${PX.cream}1f`,
        boxShadow: light ? `${CELL / 2}px ${CELL / 2}px 0 ${PX.accentDark}` : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** Section heading: Thai large, an orange pixel square before it. */
export function SectionLabel({ children, en }: { children: ReactNode; en?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-[12px] w-[12px] shrink-0" style={{ backgroundColor: PX.accent }} />
      <p className="font-kodchasan text-[30px] font-bold leading-none" style={{ color: PX.cream }}>
        {children}
      </p>
      {en && (
        <p className="text-[16px] leading-none tracking-[0.12em]" style={{ ...PIXEL_FONT, color: `${PX.cream}80` }}>
          {en}
        </p>
      )}
    </div>
  );
}

/** Deep-water card with notched corners. */
export function Card({ children, className = "", strong = false }: { children: ReactNode; className?: string; strong?: boolean }) {
  return (
    <div
      className={className}
      style={{ backgroundColor: strong ? PX.waterDeep : `${PX.cream}10`, clipPath: notch(strong ? CELL : CELL / 2) }}
    >
      {children}
    </div>
  );
}

/** Fixed-size sheet every poster renders into: 1080x1350. */
export function Sheet({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased [text-wrap:balance]"
      style={{ width: GRID_W * CELL, height: GRID_H * CELL, backgroundColor: PX.sky }}
    >
      {children}
    </div>
  );
}

export function Footer({ page }: { page: number }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between px-[56px]"
      style={{ top: (STRIP.band + 3) * CELL }}
    >
      <PassionSeedMark size={30} />
      <p className="text-[18px] tracking-[0.08em]" style={{ ...PIXEL_FONT, color: `${PX.cream}b3` }}>
        {SCHOOL_POSTERS.footerUrl} · {page}/{SCHOOL_POSTERS.total}
      </p>
    </div>
  );
}

/**
 * Inner page: skyline strip with the heading over the sky, content on the
 * dark deck, page number in the footer. Content is spread over the deck so
 * the sheet fills instead of leaving a gap above the footer.
 */
export function InnerPoster({
  id,
  page,
  kicker,
  heading,
  children,
}: {
  id: string;
  page: number;
  kicker: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <Sheet id={id}>
      <SchoolStripScene />
      <div className="absolute inset-x-0 top-[44px] flex flex-col items-center text-center">
        <p className="text-[24px] leading-none tracking-[0.08em]" style={{ ...PIXEL_FONT, color: PX.ink }}>
          {kicker}
        </p>
        <h2
          className="mt-1 font-kodchasan text-[54px] font-bold leading-[1.2]"
          style={{ color: PX.ink, textShadow: `${CELL / 2}px ${CELL / 2}px 0 ${PX.cloudShade}` }}
        >
          {heading}
        </h2>
      </div>
      <div
        className="absolute inset-x-0 flex flex-col justify-between px-[56px]"
        style={{ top: (STRIP.deck + 7) * CELL, height: (STRIP.band - STRIP.deck - 11) * CELL }}
      >
        {children}
      </div>
      <Footer page={page} />
    </Sheet>
  );
}
