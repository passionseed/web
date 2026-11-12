/**
 * clips.json and captions for `radar:clip` (docs/features/radar-guides-in-code.md
 * section 3). Pure apart from writeClipFiles, which takes the folder to write
 * into, so tests run it against a temp dir.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CareerGuide, ClipManifest, ClipMedia, ClipSlot, GuidePage, IsoDate } from "../../../lib/radar-guide/guide-types";
import { clipScriptHash, VTT_MAX_BYTES } from "../../../lib/radar-guide/guide-lint";
import { RADAR_GUIDE_POSTER_URL_PATTERN, RADAR_GUIDE_VIDEO_URL_PATTERN } from "../../../lib/radar-guide/types";
import { fail } from "./cli";
import { cdnUrl, guideMediaKey } from "./media";

/** The page and its cutscene slot, or a clear failure (unknown page, or a page with no clip slot). */
export function requireClipPage(guide: CareerGuide, pageKey: string): { page: GuidePage; slot: ClipSlot } {
  const page = guide.pages.find((p) => p.key === pageKey);
  if (!page) {
    fail(`The ${guide.meta.slug} guide has no page "${pageKey}". Pages: ${guide.pages.map((p) => p.key).join(", ")}.`);
  }
  if (!page.clip) {
    const withClips = guide.pages.filter((p) => p.clip).map((p) => p.key);
    fail(
      `Page "${pageKey}" has no clip slot, so there is no cutscene to record. ` +
        `Pages with a clip: ${withClips.join(", ") || "none"}. Add \`clip\` to the page in lib/radar-guides/${guide.meta.slug}/pages/ first.`
    );
  }
  return { page, slot: page.clip };
}

export interface ClipMediaInput {
  slug: string;
  pageKey: string;
  /** sha8 of the web clip bytes. Used for both keys, so video and poster share it. */
  sha8: string;
  durationS: number;
  recordedAt: IsoDate;
  scriptLinesTh: readonly string[];
}

/** The clips.json entry for a recording. Fails when the URLs would not pass the CDN patterns. */
export function buildClipMedia(input: ClipMediaInput): ClipMedia {
  const videoUrl = cdnUrl(guideMediaKey(input.slug, input.pageKey, input.sha8, "mp4"));
  const posterUrl = cdnUrl(guideMediaKey(input.slug, input.pageKey, input.sha8, "webp"));
  if (!RADAR_GUIDE_VIDEO_URL_PATTERN.test(videoUrl) || !RADAR_GUIDE_POSTER_URL_PATTERN.test(posterUrl)) {
    fail(`Media URLs do not match the CDN patterns: ${videoUrl}, ${posterUrl}`);
  }
  return {
    videoUrl,
    posterUrl,
    captionsFile: `clips/${input.pageKey}.vtt`,
    durationS: input.durationS,
    sha8: input.sha8,
    recordedAt: input.recordedAt,
    scriptHash: clipScriptHash(input.scriptLinesTh),
  };
}

const MEDIA_KEYS: readonly (keyof ClipMedia)[] = ["videoUrl", "posterUrl", "captionsFile", "durationS", "sha8", "recordedAt", "scriptHash"];

/** The manifest with `key` set to `media`, page keys sorted and each entry's fields in a fixed order. */
export function upsertManifest(manifest: ClipManifest, key: string, media: ClipMedia): ClipManifest {
  const merged: Record<string, ClipMedia> = { ...manifest, [key]: media };
  const out: Record<string, ClipMedia> = {};
  for (const k of Object.keys(merged).sort()) {
    const entry = merged[k];
    out[k] = Object.fromEntries(MEDIA_KEYS.filter((f) => entry[f] !== undefined).map((f) => [f, entry[f]])) as unknown as ClipMedia;
  }
  return out;
}

/** 2-space JSON with a trailing newline: stable diffs in PRs. */
export function serializeManifest(manifest: ClipManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** clips.json in `dir`, or {} when it does not exist yet. Fails on a broken file rather than overwriting it. */
export function readManifestFile(dir: string): ClipManifest {
  const file = join(dir, "clips.json");
  if (!existsSync(file)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as ClipManifest;
  } catch (err) {
    fail(`${file} is not valid JSON (${(err as Error).message}). Fix or revert it before recording.`);
  }
}

/**
 * Writes `<dir>/clips/<page>.vtt` and `<dir>/clips.json` (merged with what is
 * there). `dir` is lib/radar-guides/<slug>/ for a real run, and a scratch copy
 * for --dry-run. Returns the paths written.
 */
export function writeClipFiles(dir: string, pageKey: string, media: ClipMedia, vtt: string): { manifestPath: string; vttPath: string } {
  const bytes = new TextEncoder().encode(vtt).length;
  if (bytes > VTT_MAX_BYTES) fail(`The VTT is ${bytes} bytes; captions must stay under ${VTT_MAX_BYTES}.`);
  if (!vtt.startsWith("WEBVTT")) fail("The captions do not start with WEBVTT.");
  const manifest = upsertManifest(readManifestFile(dir), pageKey, media);
  mkdirSync(join(dir, "clips"), { recursive: true });
  const vttPath = join(dir, media.captionsFile);
  const manifestPath = join(dir, "clips.json");
  writeFileSync(vttPath, vtt.endsWith("\n") ? vtt : `${vtt}\n`);
  writeFileSync(manifestPath, serializeManifest(manifest));
  return { manifestPath, vttPath };
}
