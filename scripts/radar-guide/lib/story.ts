/**
 * Pure helpers behind `pnpm radar:story`: output names, the caption file, the
 * printed timeline, and the scene-art check the lint uses.
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { StoryPlatform } from "../../../components/radar/reel/story/endCard";
import { storyEndCard } from "../../../components/radar/reel/story/endCard";
import type { StoryTimeline } from "../../../components/radar/reel/story/storyTimeline";
import type { StoryScript } from "../../../lib/radar-stories/types";
import { REPO_ROOT } from "./cli";

export const STORY_MOVIES_DIR = join(homedir(), "Movies/radar-guide/stories");

/** True when a public path such as /radar/stories/classroom.webp exists in the repo. */
export function publicFileExists(publicPath: string): boolean {
  return existsSync(join(REPO_ROOT, "public", publicPath.replace(/^\/+/, "")));
}

/** `<id>` or, for a Trial Reels hook variant, `<id>.v1`. */
export function storyBaseName(id: string, variant: 1 | 2 | null): string {
  return variant ? `${id}.v${variant}` : id;
}

export function storyOutputs(outDir: string, id: string, variant: 1 | 2 | null) {
  const base = join(outDir, storyBaseName(id, variant));
  return {
    video: (platform: StoryPlatform) => `${base}.${platform}.mp4`,
    cover: `${base}.cover.webp`,
    caption: join(outDir, `${id}.caption.txt`),
  };
}

/** What to paste when posting: both captions, the pinned comment, the Trial Reels hooks and the sources. */
export function storyCaptionText(script: StoryScript): string {
  const tt = storyEndCard(script, "tt");
  const lines = [
    `# ${script.id}: ${script.titleTh}`,
    "",
    "## Instagram",
    script.captionIgTh.trim(),
    "",
    "Pin as the first comment: คอมเมนต์ RADAR รับลิงก์ข้อมูลเต็มทาง DM",
    "",
    "## TikTok",
    script.captionTtTh.trim(),
    "",
    `End card link: ${tt.kind === "link" ? tt.url : ""}`,
    "",
    "## Trial Reels hooks",
    `main: ${script.hookTh}`,
    ...script.hookVariantsTh.map((h, i) => `v${i + 1}: ${h}  (pnpm radar:story ${script.id} --variant ${i + 1})`),
    "",
    "## Sources",
    ...(script.factRefs.length ? script.factRefs.map((f) => `- ${f.claim}\n  ${f.source}: ${f.url}`) : ["- (no numbers or outside facts in this story)"]),
    "",
  ];
  return lines.join("\n");
}

const s = (f: number, fps: number) => (f / fps).toFixed(2).padStart(6);

/** The timeline as text, one line per part. */
export function formatStoryTimeline(t: StoryTimeline): string {
  const rows = [`  ${s(0, t.fps)}s  hook   "${t.hookTh}"`];
  for (const b of t.beats) {
    const seg = t.segments[b.segment];
    const cut = seg.beats[0] === b.index && b.index > 0 ? " (wipe)" : "";
    const kind = b.beat.big ? "big " : "";
    const mood = b.beat.who === "host" && b.beat.mood ? `/${b.beat.mood}` : "";
    rows.push(
      `  ${s(b.startF, t.fps)}s  ${`${b.beat.who}${mood}`.padEnd(14)} ${seg.scene}${cut}  ${((b.endF - b.startF) / t.fps).toFixed(2)}s ${kind}"${b.beat.lineTh}"`
    );
  }
  rows.push(`  ${s(t.end.startF, t.fps)}s  end card (wipe)  ${((t.end.endF - t.end.startF) / t.fps).toFixed(2)}s`);
  rows.push(`  ${s(t.totalF, t.fps)}s  done (${t.totalF} frames)`);
  return rows.join("\n");
}
