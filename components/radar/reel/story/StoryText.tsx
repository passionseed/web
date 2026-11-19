/**
 * The words on a story reel: the guide's dialogue box (typewriter, name tag,
 * a tail pointing at the speaker), narration boxes for `text` lines, and huge
 * centred text for the hook and `big` lines. Everything sits inside
 * Instagram's safe zone (cast.ts SAFE) and is drawn from the frame number.
 */
import { graphemes, charCount } from "@/lib/radar-stories/timing";
import type { Who } from "@/lib/radar-stories/types";

import { CAST_LOOK, SAFE, STORY_FRAME } from "./cast";
import { typedAt, type StoryBeatCue } from "./storyTimeline";

export const BOX_TOP = SAFE.top + 22;

/**
 * A line as phrases (Thai copy puts a space between phrases) with the first
 * `typed` characters shown and the rest reserved but invisible, so the box
 * never reflows while typing. Lines break only between phrases.
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

const NUMBER = /^[\d๐-๙][\d๐-๙,.%]*$/;

/** Space-separated phrases; a number stays with the words either side ("รอบ 1 คือ", "40 รายการ"). */
export function phrases(line: string): string[] {
  const out: string[] = [];
  let glueNext = false;
  for (const token of line.trim().split(/\s+/).filter(Boolean)) {
    const number = NUMBER.test(token);
    if (out.length && (number || glueNext)) out[out.length - 1] += ` ${token}`;
    else out.push(token);
    glueNext = number;
  }
  return out;
}

/** Visible characters of a line once its spaces are normalised (what the typewriter counts). */
export function lineLength(line: string): number {
  return graphemes(line.trim().split(/\s+/).join(" ")).length;
}

function Phrased({ line, typed }: { line: string; typed: number }) {
  const parts = phraseParts(line, typed);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 ? " " : null}
          <span className="sr-phrase">
            {p.shown}
            {p.ghost ? <span className="sr-ghost">{p.ghost}</span> : null}
          </span>
        </span>
      ))}
    </>
  );
}
const BOX_SIDE = 22;

/** Font size for huge text by length, so up to 60 characters stay inside the box. */
export function bigFontSize(text: string, hook = false): number {
  const n = charCount(text);
  if (n <= 10) return hook ? 52 : 50;
  if (n <= 16) return 46;
  if (n <= 22) return 42;
  if (n <= 30) return 38;
  if (n <= 44) return 32;
  return 28;
}

function Tail({ x, color }: { x: number; color: string }) {
  const left = Math.min(STORY_FRAME.width - BOX_SIDE - 40, Math.max(BOX_SIDE + 16, x - 12));
  return (
    <span
      className="absolute block"
      aria-hidden="true"
      style={{
        left: left - BOX_SIDE,
        bottom: -22,
        width: 24,
        height: 18,
        backgroundColor: color,
        clipPath: "polygon(0 0, 100% 0, 100% 22%, 83% 22%, 83% 44%, 67% 44%, 67% 67%, 50% 67%, 50% 100%, 33% 100%, 33% 44%, 17% 44%, 17% 22%, 0 22%)",
      }}
    />
  );
}

/** A spoken line in the guide's dialogue box style. `speakerX` points the tail; null for none. */
export function DialogueLine({ cue, frame, speakerX }: { cue: StoryBeatCue; frame: number; speakerX: number | null }) {
  const who = cue.beat.who as Exclude<Who, "text">;
  const look = CAST_LOOK[who];
  const total = lineLength(cue.beat.lineTh);
  const typed = typedAt(cue, frame, total);
  const done = typed >= total;
  const tagOnRight = speakerX !== null && speakerX > STORY_FRAME.width / 2 + 20;
  return (
    <div className="absolute" style={{ left: BOX_SIDE, right: BOX_SIDE, top: BOX_TOP }} data-line={cue.index}>
      <div className="sr-box relative px-[18px] pb-[18px] pt-[16px]" style={{ ["--sr-border" as string]: look.color, minHeight: 116 }}>
        <span className="sr-tag" style={{ backgroundColor: look.color, color: look.ink, ...(tagOnRight ? { right: 14 } : { left: 14 }) }}>
          {look.nameTh}
        </span>
        <p className="sr-line m-0">
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
export function NarrationLine({ cue, frame }: { cue: StoryBeatCue; frame: number }) {
  const typed = typedAt(cue, frame, lineLength(cue.beat.lineTh));
  return (
    <div className="absolute flex justify-center" style={{ left: BOX_SIDE, right: BOX_SIDE, top: BOX_TOP }} data-line={cue.index}>
      <div className="sr-box px-[20px] py-[14px] text-center" style={{ ["--sr-border" as string]: "#3d1f45", backgroundColor: "#0f0a12" }}>
        <p className="sr-line m-0" style={{ color: "var(--sr-gold)" }}>
          <Phrased line={cue.beat.lineTh} typed={typed} />
        </p>
      </div>
    </div>
  );
}

/**
 * Huge centred text: the hook (cream plate, ink text: the cover frame) or a
 * big line (ink plate, gold text). A speaker's name tag sits on top.
 */
export function BigLine({ text, who, hook = false }: { text: string; who: Who | null; hook?: boolean }) {
  const look = who && who !== "text" ? CAST_LOOK[who] : null;
  const size = bigFontSize(text, hook);
  return (
    <div className="absolute flex items-center justify-center" style={{ left: BOX_SIDE, right: BOX_SIDE, top: SAFE.top + 16, height: 236 }}>
      <div
        className="sr-box relative px-[22px] py-[18px]"
        style={{
          ["--sr-border" as string]: hook ? "var(--sr-orange)" : look?.color ?? "var(--sr-orange)",
          backgroundColor: hook ? "var(--sr-cream)" : "var(--sr-ink)",
        }}
      >
        {look ? (
          <span className="sr-tag" style={{ left: 14, backgroundColor: look.color, color: look.ink }}>
            {look.nameTh}
          </span>
        ) : null}
        <p className="sr-big m-0" style={{ fontSize: size, color: hook ? "var(--sr-ink)" : "var(--sr-gold)" }}>
          <Phrased line={text} typed={Infinity} />
        </p>
      </div>
    </div>
  );
}
