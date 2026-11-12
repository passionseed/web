import type { CSSProperties, ReactNode } from "react";

import { INK } from "@/components/shift/poster/riso";
import type { CtaSlide } from "@/lib/marketing/types";

import { CosmosNote, Eyebrow, Glass } from "./cosmosParts";
import { RichText } from "./RichText";
import type { StudioInks } from "./studioTheme";

/** Shared type and panels for studio slides, sized for a phone at 1080px. */

const THAI = /[฀-๿]/;

export const isCosmos = (inks: StudioInks) => inks.look === "cosmos";

/** Thai display face: Kodchasan on the riso print, Bai Jamjuree on cosmos. */
export const displayFont = (inks: StudioInks) => (isCosmos(inks) ? "font-bai-jamjuree" : "font-kodchasan");

/** Inline marks in the sheet's style: marker swipe on riso, glow pill on cosmos. */
export function Rich({ inks, text, accent }: { inks: StudioInks; text: string; accent?: string }) {
  return <RichText text={text} accent={accent ?? inks.kicker} mark={isCosmos(inks) ? "glow" : "marker"} />;
}

/** Section tag: spaced mono for English, Kodchasan for Thai (tracking breaks Thai). */
export function Tag({ inks, children }: { inks: StudioInks; children: string }) {
  if (isCosmos(inks)) {
    // Latin eyebrows track wide like the SHIFT[3] posters; Thai stays untracked.
    return THAI.test(children) ? (
      <p className="flex items-center gap-4 text-[28px] font-semibold" style={{ color: inks.kicker }}>
        {children}
        <span className="h-px w-16 shrink-0" style={{ background: `linear-gradient(90deg, ${inks.kicker}99, transparent)` }} />
      </p>
    ) : (
      <Eyebrow color={inks.kicker}>{children}</Eyebrow>
    );
  }
  if (THAI.test(children)) {
    return (
      <p className="font-kodchasan text-[28px] font-bold" style={{ color: inks.kicker }}>
        {children}
      </p>
    );
  }
  return (
    <p className="font-mono text-[22px] uppercase tracking-[0.28em]" style={{ color: inks.kicker }}>
      {children}
    </p>
  );
}

export function Title({ inks, text, size = 66 }: { inks: StudioInks; text: string; size?: number }) {
  const face = isCosmos(inks) ? "font-bai-jamjuree font-semibold leading-[1.3]" : "font-kodchasan font-bold leading-[1.28] tracking-tight";
  return (
    <h2 className={`mt-3 ${face}`} style={{ fontSize: size, color: inks.text, textShadow: inks.headingShadow }}>
      <Rich inks={inks} text={text} />
    </h2>
  );
}

export function Body({ inks, text, size = 30, dim = true }: { inks: StudioInks; text: string; size?: number; dim?: boolean }) {
  return (
    <p className="leading-[1.55]" style={{ fontSize: size, color: dim ? inks.dim : inks.text }}>
      <Rich inks={inks} text={text} />
    </p>
  );
}

/** Ink panel: faint outline, or solid orange for the one thing to notice.
 *  On cosmos: clear glass, sol-tinted when hot. */
export function Panel({
  inks,
  hot,
  children,
  className = "",
  style,
}: {
  inks: StudioInks;
  hot?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  if (isCosmos(inks)) {
    return (
      <Glass tone={hot ? inks.hot : undefined} className={`px-9 py-8 ${className}`} style={{ color: inks.text, ...style }}>
        {children}
      </Glass>
    );
  }
  return (
    <div
      className={`rounded-[8px] px-9 py-8 ${className}`}
      style={{
        backgroundColor: hot ? INK.orange : inks.panel,
        boxShadow: hot ? `-4px 3px 0 ${INK.pink}` : `inset 0 0 0 1.5px ${inks.panelLine}`,
        color: hot ? INK.black : inks.text,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Round number stamp with an offset plate. */
export function Stamp({ n, ink, size = 60 }: { n: number | string; ink: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-kodchasan font-bold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.48,
        backgroundColor: ink,
        color: INK.black,
        boxShadow: `-3px 2px 0 ${INK.blue}`,
      }}
    >
      {n}
    </span>
  );
}

/** Yellow margin note at a casual tilt: the quiet human aside.
 *  On cosmos it becomes a sol glass chip. */
export function MarginNote({
  text,
  tilt = -1.6,
  size = 30,
  inks,
}: {
  text: string;
  tilt?: number;
  size?: number;
  inks?: StudioInks;
}) {
  if (inks && isCosmos(inks)) return <CosmosNote text={text} tilt={tilt} size={size} />;
  return (
    <span
      className="inline-block font-kodchasan font-semibold leading-[1.45]"
      style={{
        fontSize: size,
        padding: "0.14em 0.6em 0.3em",
        color: "#4a3e3c",
        background: "linear-gradient(100deg, rgba(255,224,138,0.95), rgba(255,213,97,0.92))",
        borderRadius: "255px 18px 225px 18px / 18px 225px 18px 255px",
        transform: `rotate(${tilt}deg)`,
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
        boxShadow: "0 6px 16px rgba(8,2,20,0.18)",
      }}
    >
      {text}
    </span>
  );
}

export function Footnote({ inks, text }: { inks: StudioInks; text: string }) {
  return (
    <p className="mt-auto pt-8 text-[24px] leading-[1.55]" style={{ color: inks.faint }}>
      <Rich inks={inks} text={text} />
    </p>
  );
}

/** What the reader does on a CTA slide, in Thai. */
export const ACTION_LINE: Record<CtaSlide["action"], string> = {
  comment: "คอมเมนต์",
  save: "กดเซฟไว้",
  share: "ส่งต่อให้",
  link: "อ่านต่อ",
};
