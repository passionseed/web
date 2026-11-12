import Image from "next/image";
import type { ReactNode } from "react";

import { AmHalftone, ChromeWordmark, Grain, INK, OrbitSky, Speckle } from "@/components/shift/poster/riso";
import { GroundGlow } from "@/components/shift/poster/ShiftPosterDetails";
import { FORMATS } from "@/lib/marketing/formats";
import type { StudioFormat, StudioTheme } from "@/lib/marketing/types";

import { CosmosGround, CosmosWordmark, PageChip } from "./cosmosParts";
import { LATIN, STUDIO_INKS, type StudioInks } from "./studioTheme";

/**
 * One exported sheet. Night sheets reuse the SHIFT riso print (paper margin,
 * black ink, dawn horizon); paper sheets are cream stock with a pink
 * halftone bleed; cosmos sheets are full-bleed deep space (SHIFT[3]).
 * Content sits in a flex column so the last block can `mt-auto` to the
 * foot at any format height.
 */

const MARGIN = 26;
const PAD_X = 72;

export interface SheetProps {
  id: string;
  format: StudioFormat;
  theme: StudioTheme;
  page: number;
  total: number;
  /** SHIFT wordmark in the masthead, e.g. "SHIFT[2]". */
  wordmark?: string;
  /** Dawn sky behind the top of the sheet (cover slides). */
  sky?: boolean;
  /** Override the swipe cue; null hides it. */
  cue?: string | null;
  children: ReactNode;
}

export function StudioSheet({ id, format, theme, page, total, wordmark, sky, cue, children }: SheetProps) {
  const spec = FORMATS[format];
  const inks = STUDIO_INKS[theme];
  const swipe = cue === undefined ? (page < total ? "SWIPE →" : null) : cue;
  if (inks.look === "cosmos") {
    return (
      <CosmosSheet id={id} format={format} page={page} total={total} wordmark={wordmark} sky={sky} cue={swipe} inks={inks}>
        {children}
      </CosmosSheet>
    );
  }
  const skyHorizon = Math.round((spec.height - MARGIN * 2) * 0.56);
  return (
    <div
      id={id}
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: spec.width, height: spec.height, backgroundColor: INK.paper }}
    >
      <div
        className="absolute overflow-hidden"
        style={{ inset: MARGIN, backgroundColor: inks.ground, color: inks.text, transform: "rotate(-0.18deg)" }}
      >
        {theme === "night" ? (
          sky ? <OrbitSky horizon={skyHorizon} /> : <GroundGlow />
        ) : (
          <PaperGround />
        )}
        <div
          className="relative flex h-full flex-col"
          style={{
            paddingLeft: PAD_X,
            paddingRight: PAD_X,
            paddingTop: 56 + spec.safeTop,
            paddingBottom: 44 + spec.safeBottom,
          }}
        >
          <Masthead inks={inks} wordmark={wordmark} />
          <div className="mt-10 flex flex-1 flex-col">{children}</div>
          <SheetFoot inks={inks} page={page} total={total} cue={swipe} />
        </div>
      </div>
    </div>
  );
}

/** Cream stock: pink and orange plates bleeding in from opposite corners. */
function PaperGround() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <AmHalftone
        color={INK.pink}
        cell={6}
        angle={15}
        style={{ right: 0, bottom: 0, width: 760, height: 560, opacity: 0.5 }}
        radial={{ cx: 1, cy: 1, r: 1 }}
        tone={[[0, 0.4], [0.45, 0.2], [0.8, 0]]}
      />
      <AmHalftone
        color={INK.orange}
        cell={5.5}
        angle={75}
        style={{ left: 0, top: 0, width: 520, height: 380, opacity: 0.35 }}
        radial={{ cx: 0, cy: 0, r: 1 }}
        tone={[[0, 0.36], [0.5, 0.14], [0.85, 0]]}
      />
      <Grain opacity={0.18} />
      <Speckle opacity={0.12} />
    </div>
  );
}

/** Logo and name, inked in the sheet's text colour so it reads on cream too. */
function Masthead({ inks, wordmark }: { inks: StudioInks; wordmark?: string }) {
  return (
    <div className="flex h-[72px] items-center justify-between">
      <span className="inline-flex items-center gap-3">
        <Image src="/passion-seed-logo.png" alt="PassionSeed" width={48} height={48} unoptimized />
        <span className="font-kodchasan text-[24px] font-bold tracking-tight" style={{ color: inks.text }}>
          PassionSeed
        </span>
      </span>
      {wordmark && (
        <div className="-mr-[14px]">
          <ChromeWordmark size={64} name={wordmark} />
        </div>
      )}
    </div>
  );
}

function SheetFoot({ inks, page, total, cue }: { inks: StudioInks; page: number; total: number; cue: string | null }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="mt-8 flex items-center justify-between font-mono text-[18px] uppercase tracking-[0.28em]">
      <span style={{ color: inks.faint }}>
        {total > 1 ? `${pad(page)} / ${pad(total)}` : "passionseed.org"}
      </span>
      {cue && <span style={{ color: inks.text }}>{cue}</span>}
    </div>
  );
}

/** Cosmos: no paper, no tilt. Space runs to every edge; the sheet is glass on top. */
function CosmosSheet({
  id,
  format,
  page,
  total,
  wordmark,
  sky,
  cue,
  inks,
  children,
}: Omit<SheetProps, "theme" | "cue"> & { cue: string | null; inks: StudioInks }) {
  const spec = FORMATS[format];
  return (
    <div
      id={id}
      lang="th"
      className="relative shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={{ width: spec.width, height: spec.height, backgroundColor: inks.ground, color: inks.text }}
    >
      <CosmosGround page={page} width={spec.width} height={spec.height} sky={sky} />
      <div
        className="relative flex h-full flex-col"
        style={{
          paddingLeft: PAD_X,
          paddingRight: PAD_X,
          paddingTop: 56 + spec.safeTop,
          paddingBottom: 52 + spec.safeBottom,
        }}
      >
        <div className="flex h-[72px] items-center justify-between">
          <span className="inline-flex items-center gap-3">
            <Image
              src="/passion-seed-logo.png"
              alt="PassionSeed"
              width={46}
              height={46}
              unoptimized
              className="drop-shadow-[0_2px_10px_rgba(127,227,255,0.18)]"
            />
            <span className="font-kodchasan text-[24px] font-bold tracking-tight" style={{ color: inks.text }}>
              PassionSeed
            </span>
          </span>
          {wordmark && <CosmosWordmark size={58} name={wordmark} />}
        </div>
        <div className="mt-10 flex flex-1 flex-col">{children}</div>
        <div className="mt-8 flex items-center justify-between">
          <PageChip>{total > 1 ? `${pad2(page)} / ${pad2(total)}` : "passionseed.org"}</PageChip>
          {cue && (
            <span className="text-[19px] font-medium uppercase tracking-[0.24em]" style={{ fontFamily: LATIN, color: `${inks.text}b3` }}>
              {cue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");
