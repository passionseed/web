/**
 * What the admin teleprompter reads: the cutscene scripts (ClipSlot) of a code
 * guide, in recording order (docs/features/radar-guides-in-code.md section 3).
 * Pure and client-safe: no node imports, so RadarTeleprompter can use the step
 * helpers. The clip status needs a hash function (clipScriptHash from
 * guide-lint, node only), which the server route passes in.
 */
import type { CareerGuide, ClipManifest, ClipSlot, GuideBlock, GuidePage } from "./guide-types";

/** missing: not recorded; recorded: clips.json matches the script; stale: the script changed after recording. */
export type TeleprompterClipStatus = "missing" | "recorded" | "stale";

export interface TeleprompterPage {
  pageKey: string;
  /** Level number (page order), 1-based. */
  order: number;
  titleTh: string;
  /** On-screen hook: shown as a cue, never read aloud. */
  hookTh: string;
  scriptLinesTh: readonly string[];
  /** Indexes into scriptLinesTh where the founder's face must stay on screen. */
  safetyLines: readonly number[];
  safety: boolean;
  required: boolean;
  seconds: number;
  status: TeleprompterClipStatus;
  recordedAt: string | null;
  /** Founder reel openers (reel.hook + variants), recorded as separate takes after the clip. */
  reelHooksTh: readonly string[];
  sendToFriendTh: string | null;
}

export interface TeleprompterStep {
  kind: "line" | "reelHook";
  say: string;
  /** Small grey cue above the line (on-screen hook, safety note). */
  cue: string | null;
  safety: boolean;
}

export interface TeleprompterClips {
  manifest: ClipManifest;
  /** clipScriptHash from lib/radar-guide/guide-lint (server only). */
  hash(lines: readonly string[]): string;
}

function safetyTexts(blocks: readonly GuideBlock[]): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    if (block.kind === "safety") out.push(block.lineTh);
    else if (block.kind === "beat") out.push(...safetyTexts(block.blocks));
  }
  return out;
}

const squash = (text: string) => text.replace(/\s+/g, "");

/**
 * Script lines that carry the page's safety line (the founder's face stays on
 * screen for them). A line counts when it contains a safety block's text, or the
 * safety block contains the line, or it says "อนุญาต" (permission). When the
 * slot is a safety clip and no line matches, every line counts: safer to keep
 * the face on screen for the whole clip than to cut away from the safety line.
 */
export function safetyLineIndexes(slot: Pick<ClipSlot, "scriptLinesTh" | "safety">, page: Pick<GuidePage, "blocks">): number[] {
  if (!slot.safety) return [];
  const safeties = safetyTexts(page.blocks).map(squash).filter(Boolean);
  const hits = slot.scriptLinesTh
    .map((line, i) => {
      const s = squash(line);
      if (!s) return -1;
      const match = safeties.some((t) => s.includes(t) || t.includes(s)) || s.includes("อนุญาต");
      return match ? i : -1;
    })
    .filter((i) => i >= 0);
  return hits.length ? hits : slot.scriptLinesTh.map((_, i) => i);
}

function clipStatus(page: GuidePage, slot: ClipSlot, clips: TeleprompterClips | undefined): {
  status: TeleprompterClipStatus;
  recordedAt: string | null;
} {
  const media = clips && Object.prototype.hasOwnProperty.call(clips.manifest, page.key) ? clips.manifest[page.key] : null;
  if (!media || !clips) return { status: "missing", recordedAt: null };
  return {
    status: media.scriptHash === clips.hash(slot.scriptLinesTh) ? "recorded" : "stale",
    recordedAt: media.recordedAt,
  };
}

/**
 * Every page with a clip slot, in recording order: required clips first, then
 * safety clips, then page order.
 */
export function teleprompterPages(guide: Pick<CareerGuide, "pages">, clips?: TeleprompterClips): TeleprompterPage[] {
  return guide.pages
    .filter((p): p is GuidePage & { clip: ClipSlot } => Boolean(p.clip))
    .map((page) => {
      const slot = page.clip;
      const reel = page.reel?.format === "founder" ? page.reel : null;
      const reelHooks: string[] = [];
      for (const take of reel ? [reel.hook.th, ...reel.variantsTh] : []) {
        const t = take.trim();
        if (t && !reelHooks.includes(t)) reelHooks.push(t);
      }
      return {
        pageKey: page.key,
        order: page.order,
        titleTh: page.titleTh,
        hookTh: slot.hookTh,
        scriptLinesTh: slot.scriptLinesTh.filter((l) => l.trim()),
        safetyLines: safetyLineIndexes(slot, page),
        safety: slot.safety,
        required: slot.required,
        seconds: slot.seconds,
        ...clipStatus(page, slot, clips),
        reelHooksTh: reelHooks,
        sendToFriendTh: page.reel?.sendToFriendTh?.trim() || null,
      };
    })
    .sort(
      (a, b) =>
        Number(b.required) - Number(a.required) || Number(b.safety) - Number(a.safety) || a.order - b.order
    );
}

/** What the teleprompter shows, one step per tap: the script lines, then the reel hook takes. */
export function teleprompterSteps(page: TeleprompterPage): TeleprompterStep[] {
  const safety = new Set(page.safetyLines);
  const lines: TeleprompterStep[] = page.scriptLinesTh.map((say, i) => ({
    kind: "line",
    say,
    cue: [i === 0 && page.hookTh ? `ขึ้นจอ: ${page.hookTh}` : null, safety.has(i) ? "หน้าอยู่ในเฟรม (safety)" : null]
      .filter(Boolean)
      .join(" · ") || null,
    safety: safety.has(i),
  }));
  const hooks: TeleprompterStep[] = page.reelHooksTh.map((say, i) => ({
    kind: "reelHook",
    say,
    cue: `ฮุกรีล ${i + 1}/${page.reelHooksTh.length} (อัดแยก ไม่อยู่ในคลิปหน้าเว็บ)`,
    safety: false,
  }));
  return [...lines, ...hooks];
}

/** The command that turns a take of this page into clips.json + VTT. */
export function clipCommand(slug: string, pageKey: string): string {
  return `pnpm radar:clip ${slug} ${pageKey} ~/Movies/take.mov --dry-run`;
}
