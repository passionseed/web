/**
 * pnpm radar:story-art [--only scene,scene] [--dry-run]
 *
 * Writes the generic story reel scenes (lib/radar-stories GENERIC_SCENES) to
 * public/radar/stories/<scene>.webp: hand-made pixel art from
 * story-art-pixel.ts, 108x192 cells, lossless webp. Deterministic: re-running
 * gives byte-identical files. Career scenes (`career:<slug>/<page>`) reuse the
 * guide art from `pnpm radar:art <slug>`.
 *
 * No people, no text, no logos: see docs/radar-guide/art.md before swapping
 * any asset.
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { GENERIC_SCENES, type GenericScene } from "../../lib/radar-stories/types";
import { canvasToWebp, MAX_ART_BYTES } from "./art";
import { fail, flagString, parseArgs, REPO_ROOT, runMain } from "./lib/cli";
import { renderStoryScene, STORY_SCENE_SIZE } from "./story-art-pixel";

export const STORY_ART_DIR = join(REPO_ROOT, "public/radar/stories");

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), { bool: ["dry-run"], value: ["only"] });
  const only = flagString(args, "only")?.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = only?.filter((s) => !(GENERIC_SCENES as readonly string[]).includes(s)) ?? [];
  if (unknown.length) fail(`unknown scene ${unknown.join(", ")}. Scenes: ${GENERIC_SCENES.join(", ")}`);
  const scenes = (only ?? [...GENERIC_SCENES]) as GenericScene[];
  mkdirSync(STORY_ART_DIR, { recursive: true });
  for (const scene of scenes) {
    const out = join(STORY_ART_DIR, `${scene}.webp`);
    if (args.flags["dry-run"]) {
      console.log(`${scene} -> ${relative(REPO_ROOT, out)} (${STORY_SCENE_SIZE.w}x${STORY_SCENE_SIZE.h}, pixel)`);
      continue;
    }
    const webp = await canvasToWebp(renderStoryScene(scene));
    if (webp.byteLength > MAX_ART_BYTES) fail(`${scene}: ${webp.byteLength} bytes is over the ${MAX_ART_BYTES} byte budget`);
    writeFileSync(out, webp);
    console.log(`${scene}: ${relative(REPO_ROOT, out)} ${statSync(out).size} bytes`);
  }
}

if (/[\\/]story-art\.ts$/.test(process.argv[1] ?? "")) runMain(main);
