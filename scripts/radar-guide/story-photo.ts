/**
 * pnpm radar:story-photo [--only scene,scene] [--from dir] [--grain] [--dry-run]
 *
 * Writes the story reels' photo scenes, the Elemental hackathon's look: a
 * calm, empty, faded film photo of a real place, which the pixel cast then
 * stands in (lib/radar-stories/scenes.ts STORY_PHOTOS).
 *
 *   (default)  ask OpenAI Codex's image tool (`codex exec`, normal sandbox,
 *              in a throwaway directory) for each scene in
 *              scripts/radar-guide/art-prompts/story-photos.json, then grade it.
 *   --from     grade images already generated, named like the output with
 *              "/" as "__" (classroom.png, career__ux-design__work.png).
 *   --grain    also write public/radar/stories/grain.png, the film grain tile
 *              (seeded, so byte-identical on every run).
 *
 * Grading (gradePhoto): cover-crop to 1080x1920, colour down to 82%, contrast
 * to 88%, the blacks lifted toward a warm grey (faded print), then the best
 * webp quality under 320 KB. Grain is not baked in: StoryScene's FilmGrain
 * moves it every frame. Output: public/radar/stories/<scene>.webp, or
 * career/<slug>/<page>.webp for a career scene.
 *
 * No people, no text, no logos (docs/radar-guide/art.md).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import sharp from "sharp";

import { parseScene } from "../../lib/radar-stories/scenes";
import { codexImageArgs, parseImagePath } from "./art";
import { fail, flagString, hasBinary, parseArgs, REPO_ROOT, runMain } from "./lib/cli";

const USAGE = "pnpm radar:story-photo [--only scene,scene] [--from dir] [--grain] [--dry-run]";
export const PHOTO_SIZE = { w: 1080, h: 1920 } as const;
export const MAX_PHOTO_BYTES = 320 * 1024;
/** Colour, contrast and the warm grey the blacks lift toward. */
export const GRADE = { saturation: 0.82, contrast: 0.88, lift: [40, 34, 30] as const };

/** Zoom in (`scale` over the cover size) and pick the crop's height: 0 top, 1 bottom. */
export interface PhotoFrame {
  scale: number;
  anchorY: number;
}

interface PhotoPrompts {
  style: string;
  scenes: Record<string, { prompt: string; frame?: PhotoFrame }>;
}

function loadPrompts(): PhotoPrompts {
  return JSON.parse(readFileSync(join(REPO_ROOT, "scripts/radar-guide/art-prompts/story-photos.json"), "utf8")) as PhotoPrompts;
}

/** Where a scene's photo goes, relative to public/. */
export function photoOut(scene: string): string {
  const parsed = parseScene(scene);
  if (!parsed) fail(`unknown scene "${scene}"`);
  return parsed.kind === "generic" ? `radar/stories/${parsed.scene}.webp` : `radar/stories/career/${parsed.slug}/${parsed.page}.webp`;
}

/** The file name a generated image has in a --from directory. */
export function photoSourceName(scene: string): string {
  return `${scene.replace(/^career:/, "career__").replace(/\//g, "__")}.png`;
}

/**
 * Per-channel linear grade: contrast around mid grey, then screen toward the
 * lift colour (out = x * (1 - c/255) + c), folded into one a*x + b.
 */
export function gradeLinear(contrast: number, lift: readonly number[]): { a: number[]; b: number[] } {
  const a: number[] = [];
  const b: number[] = [];
  for (const c of lift) {
    const k = 1 - c / 255;
    a.push(contrast * k);
    b.push((128 * (1 - contrast)) * k + c);
  }
  return { a, b };
}

export async function gradePhoto(path: string, frame?: PhotoFrame): Promise<Buffer> {
  const { a, b } = gradeLinear(GRADE.contrast, GRADE.lift);
  const { w, h } = PHOTO_SIZE;
  let img = sharp(path).removeAlpha();
  if (frame && frame.scale !== 1) {
    // Cover at the zoomed size, then cut the frame out at the anchor (the dinner table's edge on the stage line).
    const zw = Math.round(w * frame.scale);
    const zh = Math.round(h * frame.scale);
    const covered = await img.resize(zw, zh, { fit: "cover", position: "centre", kernel: "lanczos3" }).toBuffer();
    img = sharp(covered).extract({ left: Math.round((zw - w) / 2), top: Math.round((zh - h) * frame.anchorY), width: w, height: h });
  } else {
    img = img.resize(w, h, { fit: "cover", position: "centre", kernel: "lanczos3" });
  }
  const base = img
    .modulate({ saturation: GRADE.saturation })
    .linear(a, b);
  for (const quality of [82, 76, 70, 64, 58]) {
    const out = await base.clone().webp({ quality, smartSubsample: true, effort: 6 }).toBuffer();
    if (out.byteLength <= MAX_PHOTO_BYTES) return out;
  }
  return base.webp({ quality: 50, effort: 6 }).toBuffer();
}

/** A 256x256 grey grain tile from a seeded generator (mulberry32), soft-limited around mid grey. */
export async function grainTile(seed = 20261122): Promise<Buffer> {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const n = 256;
  const px = Buffer.alloc(n * n);
  for (let i = 0; i < px.length; i++) {
    const g = (rand() + rand() + rand()) / 3; // roughly gaussian
    px[i] = Math.max(0, Math.min(255, Math.round(128 + (g - 0.5) * 150)));
  }
  return sharp(px, { raw: { width: n, height: n, channels: 1 } }).png({ compressionLevel: 9 }).toBuffer();
}

function runCodex(args: string[], cwd: string): Promise<string> {
  return new Promise((ok, reject) => {
    const child = spawn("codex", args, { cwd, stdio: ["inherit", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString("utf8")));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? ok(out) : reject(new Error(`codex exited with code ${code}`))));
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), { bool: ["dry-run", "grain"], value: ["only", "from"] });
  const prompts = loadPrompts();
  const only = flagString(args, "only")?.split(",").map((s) => s.trim()).filter(Boolean);
  const scenes = only ?? Object.keys(prompts.scenes);
  const unknown = scenes.filter((s) => !prompts.scenes[s]);
  if (unknown.length) fail(`not in story-photos.json: ${unknown.join(", ")}. ${USAGE}`);
  const from = flagString(args, "from");
  const dryRun = args.flags["dry-run"] === true;
  if (!from && !dryRun && !hasBinary("codex")) fail("codex is not on PATH. Install the Codex CLI, or grade existing images with --from <dir>.");

  if (args.flags.grain && !dryRun) {
    const out = join(REPO_ROOT, "public/radar/stories/grain.png");
    writeFileSync(out, await grainTile());
    console.log(`grain: ${relative(REPO_ROOT, out)} ${statSync(out).size} bytes`);
  }

  for (const scene of scenes) {
    const out = join(REPO_ROOT, "public", photoOut(scene));
    const prompt = `${prompts.style}. ${prompts.scenes[scene].prompt}.`;
    if (dryRun) {
      console.log(`${scene} -> ${relative(REPO_ROOT, out)} (${PHOTO_SIZE.w}x${PHOTO_SIZE.h}, ${from ? `from ${from}` : "codex"})`);
      continue;
    }
    let source: string;
    if (from) {
      source = join(from, photoSourceName(scene));
      if (!existsSync(source)) fail(`${scene}: no ${source}`);
    } else {
      const dir = mkdtempSync(join(tmpdir(), "radar-photo-"));
      const target = join(dir, photoSourceName(scene));
      const output = await runCodex(codexImageArgs(target, prompt), dir);
      const saved = existsSync(target) ? target : parseImagePath(output);
      if (!saved || !existsSync(saved)) fail(`${scene}: codex did not save an image`);
      source = saved;
    }
    const webp = await gradePhoto(source, prompts.scenes[scene].frame);
    if (webp.byteLength > MAX_PHOTO_BYTES) fail(`${scene}: ${webp.byteLength} bytes is over the ${MAX_PHOTO_BYTES} byte budget`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, webp);
    console.log(`${scene}: ${relative(REPO_ROOT, out)} ${statSync(out).size} bytes`);
  }
}

if (process.argv[1] && /story-photo\.ts$/.test(process.argv[1])) runMain(main);
