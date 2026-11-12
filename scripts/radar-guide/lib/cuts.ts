/**
 * The cut list `radar:clip` writes next to the master: every spoken line of a
 * cutscene with its in and out time, the on-screen hook, the safety flag and
 * the page's reel plan, so the Dusk City edit starts from timed beats instead
 * of scrubbing. Pure.
 */
import type { TimedText } from "../../../lib/radar-guide/caption-align";
import type { ClipSlot, GuidePage, ReelPlan } from "../../../lib/radar-guide/guide-types";
import { safetyLineIndexes } from "../../../lib/radar-guide/teleprompter";

export interface CutListLine {
  index: number;
  in: number;
  out: number;
  say_th: string;
  /** The on-screen hook rides on the first line. */
  on_screen_th: string | null;
  /** Safety lines stay in every cut, with the founder's face on screen. */
  safety: boolean;
}

export interface CutList {
  slug: string;
  page: string;
  title_th: string;
  hook_th: string;
  duration_s: number;
  target_s: number;
  caption_timing: "whisper" | "proportional";
  master: string;
  vtt: string;
  lines: CutListLine[];
  /** Subtitle-sized chunks with times, for the cream-on-plum strip. */
  subtitles: TimedText[];
  reel: ReelPlan | null;
}

/** The spoken lines in order: exactly the slot's script (also what the scriptHash covers). */
export function spokenLines(slot: Pick<ClipSlot, "scriptLinesTh">): string[] {
  return slot.scriptLinesTh.map((line) => line.trim()).filter(Boolean);
}

export function buildCutList(input: {
  slug: string;
  page: Pick<GuidePage, "key" | "titleTh" | "blocks" | "reel">;
  slot: ClipSlot;
  durationS: number;
  timed: TimedText[];
  subtitles: TimedText[];
  method: "whisper" | "proportional";
  masterPath: string;
  vttPath: string;
}): CutList {
  const safety = new Set(safetyLineIndexes({ ...input.slot, scriptLinesTh: spokenLines(input.slot) }, input.page));
  return {
    slug: input.slug,
    page: input.page.key,
    title_th: input.page.titleTh,
    hook_th: input.slot.hookTh,
    duration_s: input.durationS,
    target_s: input.slot.seconds,
    caption_timing: input.method,
    master: input.masterPath,
    vtt: input.vttPath,
    lines: input.timed.map((t, i) => ({
      index: i,
      in: t.start,
      out: t.end,
      say_th: t.text,
      on_screen_th: i === 0 ? input.slot.hookTh || null : null,
      safety: safety.has(i),
    })),
    subtitles: input.subtitles,
    reel: input.page.reel ?? null,
  };
}
