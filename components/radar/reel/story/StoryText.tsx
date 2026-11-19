"use client";

/**
 * The words on a story reel: the guide's dialogue box (typewriter, name tag,
 * a tail pointing at the speaker), narration boxes for `text` lines, and huge
 * centred text for the hook and `big` lines. Everything sits inside the
 * platforms' safe zone (cast.ts SAFE) and is drawn from the frame number.
 *
 * Lines break only between phrases (lib/radar-stories/timing.ts phrases), so
 * a Thai word is never cut; a phrase too wide for its box makes the whole
 * text smaller instead (fit.ts).
 */
import { useRef, type ReactNode } from "react";

import { charCount, graphemes, phrases } from "@/lib/radar-stories/timing";
import type { Who } from "@/lib/radar-stories/types";

import { CAST_LOOK, SAFE, STORY_FRAME } from "./cast";
import { useFitText } from "./fit";
import { typedAt, type StoryBeatCue } from "./storyTimeline";

export { phrases };

export const BOX_TOP = SAFE.top + 22;
/** Text boxes run from here to SAFE.right. */
const BOX_SIDE = 22;
const BOX_RIGHT = STORY_FRAME.width - SAFE.right;
/** The dialogue tail hangs this far below its box. */
const TAIL_DROP = 22;
/** Room kept between words and the top of anyone's head. */
const HEAD_ROOM = 10;

/**
 * A line as phrases with the first `typed` characters shown and the rest
 * reserved but invisible, so the box never reflows while typing.
 */
export function phraseParts(line: string, typed: number): { shown: string; ghost: string }[] {
  let left = typed;
  return phrases(line).map((phrase, i) => {
    if (i > 0) left -= 1; // the space before it
    const g = graphemes(phrase);
    const n = Math.max(0, Math.min(g.length, left));
    left -= g.length;
    return { shown: g.slice(0, n).join(""), ghost: g.slice(n).join("") };
  });
}

/** Visible characters of a line once its spaces are normalised (what the typewriter counts). */
export function lineLength(line: string): number {
  return graphemes(line.trim().split(/\s+/).join(" ")).length;
}

/** A line as no-wrap phrases; `decorate` dresses the shown text of each phrase (the end card lights RADAR). */
export function Phrased({ line, typed = Infinity, decorate }: { line: string; typed?: number; decorate?: (text: string) => ReactNode }) {
  const parts = phraseParts(line, typed);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 ? " " : null}
          <span className="sr-phrase">
            {decorate ? decorate(p.shown) : p.shown}
            {p.ghost ? <span className="sr-ghost">{p.ghost}</span> : null}
          </span>
        </span>
      ))}
    </>
  );
}

/** Font size for huge text by length, before fitting to its plate. */
export function bigFontSize(text: string, hook = false): number {
  const n = charCount(text);
  if (n <= 10) return hook ? 52 : 50;
  if (n <= 16) return 46;
  if (n <= 22) return 42;
  if (n <= 30) return 38;
  if (n <= 44) return 32;
  return 28;
}

/**
 * The band huge text is centred in: below the top band (and its name tag),
 * above the highest head on stage (`headY`, null for an empty stage).
 */
export function bigBand(headY: number | null, hook = false): { top: number; bottom: number } {
  const top = hook ? SAFE.top + 8 : BOX_TOP;
  const bottom = headY === null ? top + 236 : Math.min(top + 236, headY - HEAD_ROOM);
  return { top, bottom: Math.max(top + 90, bottom) };
}

/**
 * The hook plate's scale at frame `f`: frame 0 (the cover) at rest, a punch
 * in over the next frames, then a slow push for the rest of the hook. Pure.
 */
const HOOK_PUNCH = [1, 1.03, 1.05, 1.04, 1.02, 1.01];
export function hookScale(f: number, hookF: number): number {
  if (f <= 0) return 1;
  const push = 0.02 * Math.min(1, f / Math.max(1, hookF));
  return Math.round(((HOOK_PUNCH[f] ?? 1) + push) * 10000) / 10000;
}

function Tail({ x, color }: { x: number; color: string }) {
  const left = Math.min(SAFE.right - 40, Math.max(BOX_SIDE + 16, x - 12));
  return (
    <span
      className="absolute block"
      aria-hidden="true"
      style={{
        left: left - BOX_SIDE,
        bottom: -TAIL_DROP,
        width: 24,
        height: 18,
        backgroundColor: color,
        clipPath: "polygon(0 0, 100% 0, 100% 22%, 83% 22%, 83% 44%, 67% 44%, 67% 67%, 50% 67%, 50% 100%, 33% 100%, 33% 44%, 17% 44%, 17% 22%, 0 22%)",
      }}
    />
  );
}

/** The most a box starting at BOX_TOP may grow before it (or its tail) reaches a head. */
function roomAbove(headY: number | null, tail: boolean): number | undefined {
  return headY === null ? undefined : headY - HEAD_ROOM - (tail ? TAIL_DROP : 0) - BOX_TOP;
}

/** A spoken line in the guide's dialogue box style. `speakerX` points the tail; null for none. */
export function DialogueLine({ cue, frame, speakerX, headY = null }: { cue: StoryBeatCue; frame: number; speakerX: number | null; headY?: number | null }) {
  const who = cue.beat.who as Exclude<Who, "text">;
  const look = CAST_LOOK[who];
  const total = lineLength(cue.beat.lineTh);
  const typed = typedAt(cue, frame, total);
  const done = typed >= total;
  const tagOnRight = speakerX !== null && speakerX > STORY_FRAME.width / 2 + 20;
  const text = useRef<HTMLParagraphElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  useFitText(text, { base: 22, min: 15, plate, maxHeight: roomAbove(headY, speakerX !== null) });
  return (
    <div className="absolute" style={{ left: BOX_SIDE, right: BOX_RIGHT, top: BOX_TOP }} data-line={cue.index}>
      <div ref={plate} className="sr-box relative px-[18px] pb-[18px] pt-[16px]" style={{ ["--sr-border" as string]: look.color, minHeight: 116 }}>
        <span className="sr-tag" style={{ backgroundColor: look.color, color: look.ink, ...(tagOnRight ? { right: 14 } : { left: 14 }) }}>
          {look.nameTh}
        </span>
        <p ref={text} className="sr-line m-0">
          <Phrased line={cue.beat.lineTh} typed={typed} />
        </p>
        {done && Math.floor(frame / 12) % 2 === 0 ? (
          <span className="absolute bottom-[6px] right-[12px] text-[12px] leading-none" style={{ color: look.color }} aria-hidden="true">
            ▼
          </span>
        ) : null}
        {speakerX !== null ? <Tail x={speakerX} color={look.color} /> : null}
      </div>
    </div>
  );
}

/** A `text` line that is not big: a quiet narration plate, no speaker. */
export function NarrationLine({ cue, frame, headY = null }: { cue: StoryBeatCue; frame: number; headY?: number | null }) {
  const typed = typedAt(cue, frame, lineLength(cue.beat.lineTh));
  const text = useRef<HTMLParagraphElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  useFitText(text, { base: 22, min: 15, plate, maxHeight: roomAbove(headY, false) });
  return (
    <div className="absolute flex justify-center" style={{ left: BOX_SIDE, right: BOX_RIGHT, top: BOX_TOP }} data-line={cue.index}>
      <div ref={plate} className="sr-box min-w-0 px-[20px] py-[14px] text-center" style={{ ["--sr-border" as string]: "#3d1f45", backgroundColor: "#0f0a12" }}>
        <p ref={text} className="sr-line m-0" style={{ color: "var(--sr-gold)" }}>
          <Phrased line={cue.beat.lineTh} typed={typed} />
        </p>
      </div>
    </div>
  );
}

/**
 * Huge centred text: the hook (cream plate, ink text: the cover frame) or a
 * big line (ink plate, gold text). A speaker's name tag sits on top. The
 * plate stays between the top band and the highest head on stage (`headY`),
 * shrinking its text to fit; the hook punches in from `scale`.
 */
export function BigLine({ text, who, hook = false, headY = null, scale = 1 }: { text: string; who: Who | null; hook?: boolean; headY?: number | null; scale?: number }) {
  const look = who && who !== "text" ? CAST_LOOK[who] : null;
  const band = bigBand(headY, hook);
  const ref = useRef<HTMLParagraphElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  // The hook's punch grows the plate by up to 6%: keep that inside the band and clear of the rail.
  const side = hook ? 10 : 0;
  useFitText(ref, { base: bigFontSize(text, hook), min: 20, plate, maxHeight: (band.bottom - band.top) / (hook ? 1.06 : 1) });
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ left: BOX_SIDE + side, right: BOX_RIGHT + side, top: band.top, height: band.bottom - band.top }}
      data-big={hook ? "hook" : "line"}
    >
      <div
        ref={plate}
        className="sr-box relative min-w-0 max-w-full px-[22px] py-[18px]"
        style={{
          ["--sr-border" as string]: hook ? "var(--sr-orange)" : look?.color ?? "var(--sr-orange)",
          backgroundColor: hook ? "var(--sr-cream)" : "var(--sr-ink)",
          transform: scale !== 1 ? `scale(${scale})` : undefined,
        }}
      >
        {look ? (
          <span className="sr-tag" style={{ left: 14, backgroundColor: look.color, color: look.ink }}>
            {look.nameTh}
          </span>
        ) : null}
        <p ref={ref} className="sr-big m-0" style={{ color: hook ? "var(--sr-ink)" : "var(--sr-gold)" }}>
          <Phrased line={text} />
        </p>
      </div>
    </div>
  );
}
