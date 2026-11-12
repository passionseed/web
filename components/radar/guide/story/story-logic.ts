/**
 * Pure helpers behind the story components (typewriter, dialogue taps,
 * cutscene states, level-map layout, XP segments, share fallbacks). No React,
 * no DOM, so every rule here is tested in __tests__/story-logic.test.ts.
 */
import { GUIDE_HOST, splitDialogue, type HostMood } from "@/lib/radar-guide/story";

// ---------------------------------------------------------------- typewriter
/** Thai marks that sit on the previous character (vowels above/below, tone marks). */
const THAI_COMBINING = /[ัิ-ฺ็-๎]/;

/**
 * Splits text into user-perceived characters, so the typewriter never shows a
 * Thai tone mark or vowel on its own. Uses Intl.Segmenter when present.
 */
export function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
  if (typeof Seg === "function") {
    try {
      return Array.from(new Seg("th", { granularity: "grapheme" }).segment(text), (s) => s.segment);
    } catch {
      // fall through
    }
  }
  const out: string[] = [];
  for (const ch of Array.from(text)) {
    if (out.length && (THAI_COMBINING.test(ch) || /\p{M}/u.test(ch))) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** Milliseconds per character. A full two-line box types in about two seconds. */
export const TYPE_MS = 28;

/** How many characters are visible `elapsedMs` after the box opened. */
export function typedCount(total: number, elapsedMs: number, msPer = TYPE_MS): number {
  if (elapsedMs <= 0) return 0;
  return Math.min(total, Math.floor(elapsedMs / msPer) + 1);
}

// ---------------------------------------------------------------- dialogue
export interface DialogueCursor {
  /** Box on screen. */
  index: number;
  /** The box finished typing (or was tapped to finish). */
  complete: boolean;
  /** The last box was dismissed. */
  done: boolean;
}

export const DIALOGUE_START: DialogueCursor = { index: 0, complete: false, done: false };

/**
 * A tap on the dialogue box: finish typing first, then advance, then close.
 * Reduced motion opens every box complete.
 */
export function dialogueTap(cur: DialogueCursor, boxes: number, reducedMotion = false): DialogueCursor {
  if (cur.done || boxes === 0) return { ...cur, done: true, complete: true };
  if (!cur.complete) return { ...cur, complete: true };
  if (cur.index < boxes - 1) return { index: cur.index + 1, complete: reducedMotion, done: false };
  return { ...cur, done: true };
}

/** Splits every line into boxes of at most about two lines (DIALOGUE_BOX_MAX_CHARS). */
export function toBoxes(lines: readonly string[]): string[] {
  return lines.flatMap((line) => splitDialogue(line));
}

/** Sprite for a mood and talking frame. "wow" uses the cheer frame; others fall back to idle. */
export const HOST_CHEER_SRC = "/radar/guides/host/host-cheer.webp";
export type HostFrameName = "idle" | "talk" | "cheer";

export function hostFrame(mood: HostMood | undefined, mouthOpen: boolean): HostFrameName {
  if (mood === "wow") return "cheer";
  return mouthOpen ? "talk" : "idle";
}

export function hostSpriteSrc(frame: HostFrameName): string {
  if (frame === "cheer") return GUIDE_HOST.sprites.wow ?? HOST_CHEER_SRC;
  if (frame === "talk") return GUIDE_HOST.sprites.talk ?? GUIDE_HOST.sprites.idle;
  return GUIDE_HOST.sprites.idle;
}

export function speakerName(speaker: "host" | "player" | "system"): string | null {
  if (speaker === "host") return GUIDE_HOST.nameTh;
  if (speaker === "player") return "เธอ";
  return null;
}

// ---------------------------------------------------------------- cutscene
export type CutscenePhase = "poster" | "loading" | "playing" | "paused" | "fallback" | "done";
export type CutsceneEvent =
  | { type: "tapPlay" }
  | { type: "playing" }
  | { type: "pause" }
  | { type: "ended" }
  | { type: "error" }
  | { type: "blocked" } // play() rejected: back to the poster with the play button
  | { type: "fallbackDone" };

/** Start state: the poster with "แตะเพื่อดู" when there is media, the NPC dialogue otherwise. */
export function cutsceneStart(hasMedia: boolean): CutscenePhase {
  return hasMedia ? "poster" : "fallback";
}

export function cutsceneStep(phase: CutscenePhase, ev: CutsceneEvent): CutscenePhase {
  if (phase === "done") return phase;
  switch (ev.type) {
    case "tapPlay":
      return phase === "poster" || phase === "paused" ? "loading" : phase === "playing" ? "paused" : phase;
    case "playing":
      return phase === "loading" || phase === "paused" || phase === "poster" ? "playing" : phase;
    case "pause":
      return phase === "playing" ? "paused" : phase;
    case "ended":
      return phase === "playing" || phase === "loading" || phase === "paused" ? "done" : phase;
    case "error":
      // A broken or blocked video never strands the student: the host says the lines instead.
      return phase === "fallback" ? phase : "fallback";
    case "blocked":
      return phase === "loading" ? "poster" : phase;
    case "fallbackDone":
      return phase === "fallback" ? "done" : phase;
  }
}

// ---------------------------------------------------------------- level map
export interface MapPoint {
  /** Percent of the map width. */
  x: number;
  /** Percent of the map height. */
  y: number;
}

/** A winding route, top to bottom, alternating sides, for `n` levels. */
export function levelMapPoints(n: number): MapPoint[] {
  const cols = [22, 50, 78, 50];
  return Array.from({ length: n }, (_, i) => ({
    x: cols[i % cols.length],
    y: n <= 1 ? 50 : 6 + (88 * i) / (n - 1),
  }));
}

/** SVG polyline points (viewBox 0 0 100 100) through the level nodes. */
export function routePath(points: readonly MapPoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

// ---------------------------------------------------------------- xp
/** Filled segments of a chunky pixel XP bar. Any XP shows at least one segment. */
export function xpSegments(xp: number, max: number, segments = 12): number {
  if (max <= 0 || xp <= 0) return 0;
  const ratio = Math.min(1, xp / max);
  return Math.max(1, Math.round(ratio * segments));
}

// ---------------------------------------------------------------- share
export type ShareRoute = "files" | "url" | "download";

/**
 * How the profile card is shared: as an image file when Web Share accepts
 * files (most phones), as a link when only URL sharing exists, otherwise a
 * PNG download.
 */
export function shareRoute(nav: { share?: unknown; canShare?: (data: { files: File[] }) => boolean } | undefined, file: File | null): ShareRoute {
  if (nav && typeof nav.share === "function") {
    if (file && typeof nav.canShare === "function") {
      try {
        if (nav.canShare({ files: [file] })) return "files";
      } catch {
        // fall through
      }
    }
    return "url";
  }
  return "download";
}

/** In-app browsers that drop `<a download>` blob downloads. */
const WEBVIEW_APPS = new Set(["instagram", "facebook", "tiktok", "line", "other"]);
/** In-app browsers where the native share sheet is unreliable (social.ts shouldUseNativeShare). */
const NO_NATIVE_SHARE_APPS = new Set(["instagram", "facebook"]);

export type ProfileShareRoute = ShareRoute | "overlay";

/**
 * The profile card's share tap, decided synchronously inside the tap:
 * - Instagram and Facebook webviews: never the native sheet, never a blob
 *   download (both are dropped there). Show the PNG to long-press instead.
 * - Web Share: the image file only when the PNG is already prepared (an await
 *   before navigator.share loses the tap on iOS); otherwise the link.
 * - No Web Share: a download in a normal browser, the long-press overlay in
 *   any other in-app browser.
 */
export function profileShareRoute({
  nav,
  file,
  uaApp,
}: {
  nav: { share?: unknown; canShare?: (data: { files: File[] }) => boolean } | undefined;
  /** The prepared PNG, or null while it is still rendering. */
  file: File | null;
  uaApp: string | null | undefined;
}): ProfileShareRoute {
  if (uaApp && NO_NATIVE_SHARE_APPS.has(uaApp)) return "overlay";
  const route = shareRoute(nav, file);
  if (route === "download" && uaApp && WEBVIEW_APPS.has(uaApp)) return "overlay";
  return route;
}

/** "บันทึกรูป": a download in a normal browser, the long-press overlay in a webview. */
export function profileSaveRoute(uaApp: string | null | undefined): "download" | "overlay" {
  return uaApp && WEBVIEW_APPS.has(uaApp) ? "overlay" : "download";
}

export function profileFileName(slug: string): string {
  return `passionseed-${slug}-profile.png`;
}
