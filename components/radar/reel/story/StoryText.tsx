"use client";

/**
 * The words on a story reel, in the Elemental hackathon's type: speech
 * bubbles that point at whoever speaks (bubble.ts: no name tags), quiet
 * narration set straight on the photo, and huge Trirong for the hook and
 * `big` lines, with the line's stressed words (StoryBeat.stressTh) in the
 * speaker's colour. A line lands whole (no typewriter) so reading starts on
 * its first frame. Everything sits inside the platforms' safe zone (cast.ts
 * SAFE) and is drawn from the frame number.
 *
 * Lines break only between phrases (lib/radar-stories/timing.ts phrases), so
 * a Thai word is never cut; a phrase too wide for its box makes the whole
 * text smaller instead (fit.ts).
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { charCount, graphemes, phrases } from "@/lib/radar-stories/timing";
import type { Who } from "@/lib/radar-stories/types";

import { bubbleRoom, BUBBLE_SIDE, CELL, placeBubble, splitStress, steppedClip, type Rect } from "./bubble";
import { SAFE, STORY_FRAME } from "./cast";
import { useFitText } from "./fit";
import type { CastWho, StoryBeatCue } from "./storyTimeline";

export { phrases };

export const BOX_TOP = SAFE.top + 22;
/** Text boxes run from here to SAFE.right. */
const BOX_SIDE = 22;
const BOX_RIGHT = STORY_FRAME.width - SAFE.right;
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

/** Paper and ink: the bubble for people, and the guide's dark one. */
const PAPER = "#f3efe6";
const INK = "#1d211f";
const GUIDE = "#1a1618";
/** A stressed word on the bubble (dark enough on paper; P'Seed's is fire on ink). */
const STRESS_ON_BUBBLE: Record<CastWho, string> = { student: "#6c3ed6", friend: "#187a70", parent: "#c44820", host: "#f99a3a" };
/** A stressed word in huge type on the dimmed photo. */
const STRESS_ON_PHOTO: Record<Who, string> = { student: "#bc97f5", friend: "#7fe0c0", parent: "#f59a6a", host: "#ffd57a", text: "#f97834" };
const SHADOW = "rgb(20 16 14 / 38%)";
/** Widest a bubble's text column may get (two short lines read faster than one long one). */
const BUBBLE_TEXT_MAX = 300;

/** The `decorate` for Phrased that colours the stressed words. */
export function stressed(stress: string | undefined, color: string, weight?: number) {
  return function Stress(text: string) {
    return splitStress(text, stress).map((part, i) =>
      part.stress ? (
        <span key={i} style={{ color, fontWeight: weight }}>
          {part.text}
        </span>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );
  };
}

/** The last phrase of a line: what the hook stresses unless told otherwise. */
export function lastPhrase(line: string): string {
  const all = phrases(line);
  return all.length > 1 ? all[all.length - 1] : "";
}

/** Scale while a line lands: two stepped frames in, then still. */
export function landScale(frameInLine: number): number {
  return frameInLine <= 0 ? 0.9 : frameInLine === 1 ? 0.96 : 1;
}

function Cells({ cells, color, dx = 0, dy = 0 }: { cells: Rect[]; color: string; dx?: number; dy?: number }) {
  return (
    <>
      {cells.map((c, i) => (
        <span key={i} className="absolute block" style={{ left: c.x + dx, top: c.y + dy, width: c.w, height: c.h, backgroundColor: color }} />
      ))}
    </>
  );
}

/**
 * A spoken line: a paper bubble (P'Seed's is ink) over the speaker, with a
 * pixel tail down to just above their head. `speakerX` null (the speaker is
 * not on stage) centres it with no tail.
 */
export function SpeechBubble({ cue, frame, speakerX, headY }: { cue: StoryBeatCue; frame: number; speakerX: number | null; headY: number }) {
  const who = cue.beat.who as CastWho;
  const guide = who === "host";
  const content = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useFitText(text, { base: 26, min: 18, plate: content, maxHeight: bubbleRoom(headY) });
  useLayoutEffect(() => {
    const el = content.current;
    if (!el) return;
    const next = { w: el.offsetWidth, h: el.offsetHeight };
    if (!size || size.w !== next.w || size.h !== next.h) setSize(next);
  });
  const x = speakerX ?? STORY_FRAME.width / 2;
  const place = placeBubble(size ?? { w: 120, h: 60 }, x, headY);
  const { box } = place;
  const tail = speakerX === null ? [] : place.tail;
  const bg = guide ? GUIDE : PAPER;
  const k = landScale(frame - cue.startF);
  const clip = steppedClip(box.w, box.h);
  const wrap: CSSProperties = {
    visibility: size ? "visible" : "hidden",
    transform: k !== 1 ? `scale(${k})` : undefined,
    transformOrigin: `${x}px ${headY}px`,
  };
  return (
    <div className="absolute inset-0" style={wrap} data-line={cue.index} data-bubble={who}>
      {/* A hard pixel shadow lifts the bubble off any photo. */}
      <span className="absolute block" style={{ left: box.x + CELL, top: box.y + CELL, width: box.w, height: box.h, backgroundColor: SHADOW, clipPath: clip }} />
      <Cells cells={tail} color={SHADOW} dx={CELL} />
      <Cells cells={tail} color={bg} />
      <div className="absolute" style={{ left: box.x, top: box.y, width: box.w, height: box.h, backgroundColor: bg, clipPath: clip }}>
        <div
          ref={content}
          className="absolute left-0 top-0"
          style={{ width: "max-content", maxWidth: BUBBLE_TEXT_MAX + 2 * 20, padding: "13px 20px 15px", color: guide ? "var(--sr-cream)" : INK }}
        >
          <p ref={text} className="sr-say m-0">
            <Phrased line={cue.beat.lineTh} decorate={stressed(cue.beat.stressTh, STRESS_ON_BUBBLE[who], 600)} />
          </p>
        </div>
      </div>
    </div>
  );
}

/** A `text` line that is not big: quiet narration set straight on the photo, like the poster's facts. */
export function NarrationLine({ cue, frame, headY = null }: { cue: StoryBeatCue; frame: number; headY?: number | null }) {
  const text = useRef<HTMLParagraphElement>(null);
  const room = headY === null ? undefined : headY - 24 - BOX_TOP;
  useFitText(text, { base: 26, min: 18, plate: text, maxHeight: room });
  const k = landScale(frame - cue.startF);
  return (
    <div className="absolute flex justify-center" style={{ left: BOX_SIDE, right: BOX_RIGHT, top: BOX_TOP }} data-line={cue.index}>
      <div className="sr-scrim relative min-w-0" style={{ transform: k !== 1 ? `scale(${k})` : undefined }}>
        <p ref={text} className="sr-narrate m-0">
          <Phrased line={cue.beat.lineTh} decorate={stressed(cue.beat.stressTh, STRESS_ON_PHOTO.text)} />
        </p>
      </div>
    </div>
  );
}

/**
 * Huge Trirong on the dimmed photo: the hook (left aligned like the poster's
 * title, its last phrase in fire orange) or a big line (its stressed words in
 * the speaker's colour). It stays between the top band and the highest head
 * on stage (`headY`), shrinking to fit; the hook punches in from `scale`.
 */
export function BigLine({
  text,
  who,
  stress,
  hook = false,
  headY = null,
  scale = 1,
}: {
  text: string;
  who: Who | null;
  stress?: string;
  hook?: boolean;
  headY?: number | null;
  scale?: number;
}) {
  const band = bigBand(headY, hook);
  const ref = useRef<HTMLParagraphElement>(null);
  const side = hook ? 10 : 0;
  useFitText(ref, { base: bigFontSize(text, hook) + 6, min: 22, plate: ref, maxHeight: (band.bottom - band.top) / (hook ? 1.06 : 1) });
  const color = hook ? STRESS_ON_PHOTO.text : STRESS_ON_PHOTO[who ?? "text"];
  return (
    <div
      className={`absolute flex items-center ${hook ? "justify-start" : "justify-center"}`}
      style={{ left: BOX_SIDE + side, right: BOX_RIGHT + side, top: band.top, height: band.bottom - band.top }}
      data-big={hook ? "hook" : "line"}
    >
      <p
        ref={ref}
        className={`sr-big m-0 ${hook ? "text-left" : "text-center"}`}
        style={{ transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: hook ? "left center" : "center" }}
      >
        <Phrased line={text} decorate={stressed(hook ? stress ?? lastPhrase(text) : stress, color, 300)} />
      </p>
    </div>
  );
}

export { BUBBLE_SIDE };
