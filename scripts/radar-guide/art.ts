/**
 * pnpm exec tsx scripts/radar-guide/art.ts <slug> [--only id,id] [--source pixel|agy] [--dry-run]
 *
 * Writes the game-story art for a code guide into public/radar/guides/:
 * one scene per level (<slug>/<pageKey>.webp, 160x100), the level map
 * background (<slug>/map.webp), the profile card frame (<slug>/frame.webp)
 * and the shared host sprite (host/host-{idle,talk,cheer}.webp, 48x64).
 * Prompts and sizes: scripts/radar-guide/art-prompts/<slug>.json.
 *
 *   (no --source)   each asset uses the `source` recorded in the prompts file
 *                   (what made the committed file), "pixel" when absent.
 *   --source pixel  draw the hand-made pixel art in art-pixel.ts.
 *                   Deterministic: re-running gives byte-identical files.
 *   --source agy    ask Antigravity's image tool for each asset (normal
 *                   permission prompts; this script never passes a flag that
 *                   skips them), then crop and scale it to AGY_SCALE x the
 *                   native size, so the browser can still draw it with
 *                   image-rendering: pixelated at a whole-ish scale.
 *                   The host sprite and the card frame stay "pixel": the
 *                   host's idle/talk/cheer frames must line up pixel for
 *                   pixel (mouth flap), which separate generations cannot.
 *   --only          comma-separated asset ids from the prompts file
 *   --dry-run       print what would be written (and the agy prompts); write nothing
 *
 * Every file is a webp of at most 120KB (checked). No people, no text, no
 * logos: see docs/radar-guide/art.md before swapping any asset.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";

import sharp from "sharp";

import { GUIDE_INDEX } from "../../lib/radar-guides/index";
import { renderFrame, renderHost, renderMap, renderScene, type Canvas } from "./art-pixel";
import { mentionsPeople } from "./lib/art";
import { assertSlug, fail, flagString, hasBinary, parseArgs, REPO_ROOT, runMain } from "./lib/cli";

const USAGE = "pnpm exec tsx scripts/radar-guide/art.ts <slug> [--only id,id] [--source pixel|agy] [--dry-run]";
export const MAX_ART_BYTES = 120 * 1024;
/** Generated art is kept at this multiple of the native size (scenes 640x400, map 432x768). */
export const AGY_SCALE = 4;

export type ArtSource = "pixel" | "agy";

export interface ArtAsset {
  id: string;
  kind: "scene" | "map" | "frame" | "host";
  out: string; // relative to public/radar/guides/
  size: readonly [number, number];
  prompt: string;
  /** What made the committed file. Absent means "pixel". */
  source?: ArtSource;
}
export interface ArtPrompts {
  slug: string;
  style: string;
  suffix: string;
  assets: readonly ArtAsset[];
}

export function loadPrompts(slug: string): ArtPrompts {
  const file = join(REPO_ROOT, "scripts/radar-guide/art-prompts", `${slug}.json`);
  let parsed: ArtPrompts;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8")) as ArtPrompts;
  } catch (err) {
    fail(`cannot read ${relative(REPO_ROOT, file)}: ${(err as Error).message}`);
  }
  if (parsed.slug !== slug) fail(`${relative(REPO_ROOT, file)} is for "${parsed.slug}", not "${slug}"`);
  return parsed;
}

/** Framing per asset kind, so the crop to the native aspect keeps the subject. */
const COMPOSITION: Record<ArtAsset["kind"], string> = {
  scene: "Wide 16:10 landscape game scene, main subject centred, the bottom fifth of the image dark and calm",
  map: "Tall 9:16 portrait image",
  frame: "Tall 4:5 portrait image",
  host: "Single character sprite, centred, full body",
};

/** The full agy prompt: style, subject, then the fixed "no people, no text" suffix. */
export function fullPrompt(p: ArtPrompts, asset: ArtAsset): string {
  if (asset.kind !== "host" && mentionsPeople(asset.prompt)) {
    fail(`asset "${asset.id}" mentions people; scenes are objects and places only`);
  }
  const suffix = asset.kind === "host" ? p.suffix.replace("no people, no faces, ", "") : p.suffix;
  return `${p.style}. ${COMPOSITION[asset.kind]}. ${asset.prompt}. ${suffix}`;
}

/** agy invocation for one image. Never with a permission-skipping flag. */
export function agyImageArgs(imageName: string, prompt: string): string[] {
  const safe = prompt.replace(/'/g, "");
  return [
    "-p",
    `Use your image generation tool exactly once to make an image named '${imageName}' from this prompt: '${safe}'. Do not run commands or edit files. Reply only with the absolute path of the saved image file.`,
    "--print-timeout",
    "300s",
  ];
}

/** The last absolute image path in agy's reply (it saves png or jpg). */
export function parseImagePath(output: string): string | null {
  const all = output.match(/\/[^\s`'"()<>]+?\.(?:png|jpe?g|webp)\b/gi);
  return all ? all[all.length - 1] : null;
}

/** Output size for an asset from a given source. */
export function outputSize(asset: Pick<ArtAsset, "size">, source: ArtSource): [number, number] {
  const [w, h] = asset.size;
  return source === "agy" ? [w * AGY_SCALE, h * AGY_SCALE] : [w, h];
}

/** Host and frame are always hand-made (see the header). */
export function sourceFor(asset: Pick<ArtAsset, "kind" | "source">, override?: ArtSource): ArtSource {
  if (asset.kind === "host" || asset.kind === "frame") return "pixel";
  return override ?? asset.source ?? "pixel";
}

function runAgy(args: string[]): Promise<string> {
  return new Promise((ok, reject) => {
    // stdin stays attached so agy can ask for permission the normal way. It runs
    // outside the repo so its workspace holds nothing it could edit.
    const child = spawn("agy", args, { cwd: tmpdir(), stdio: ["inherit", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString("utf8")));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? ok(out) : reject(new Error(`agy exited with code ${code}`))));
  });
}

function drawPixel(asset: ArtAsset, accent: string): Canvas {
  switch (asset.kind) {
    case "scene":
      return renderScene(asset.id, accent);
    case "map":
      return renderMap(accent);
    case "frame":
      return renderFrame(accent);
    case "host": {
      const frame = asset.id.replace(/^host-/, "");
      if (frame !== "idle" && frame !== "talk" && frame !== "cheer") fail(`unknown host frame "${asset.id}"`);
      return renderHost(frame);
    }
  }
}

/** Lossless webp of a native-size pixel canvas (tiny, exact colours). */
export async function canvasToWebp(c: Canvas): Promise<Buffer> {
  return sharp(Buffer.from(c.data.buffer), { raw: { width: c.w, height: c.h, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
}

/**
 * A generated image cropped (centre) and scaled to `size` (lanczos: the generated pixel
 * grid is not whole-pixel aligned, so nearest sampling would make uneven
 * blocks), then the best webp quality that fits
 * the budget.
 */
export async function generatedToWebp(path: string, [w, h]: readonly [number, number]): Promise<Buffer> {
  const base = sharp(path).resize(w, h, { fit: "cover", position: "centre", kernel: "lanczos3" });
  for (const quality of [86, 80, 74, 68, 60, 52]) {
    const out = await base.clone().webp({ quality, smartSubsample: true, effort: 6 }).toBuffer();
    if (out.byteLength <= MAX_ART_BYTES) return out;
  }
  return base.webp({ quality: 44, effort: 6 }).toBuffer();
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2), { bool: ["dry-run"], value: ["only", "source"] });
  const slug = assertSlug(args.positional[0], USAGE);
  const sourceFlag = flagString(args, "source");
  if (sourceFlag !== undefined && sourceFlag !== "pixel" && sourceFlag !== "agy") fail(`--source must be pixel or agy. ${USAGE}`);
  const override = sourceFlag as ArtSource | undefined;
  const dryRun = args.flags["dry-run"] === true;
  const entry = GUIDE_INDEX[slug];
  if (!entry) fail(`no code guide "${slug}" in lib/radar-guides/index.ts`);
  const prompts = loadPrompts(slug);
  const only = flagString(args, "only")?.split(",").map((s) => s.trim()).filter(Boolean);
  const assets = only ? prompts.assets.filter((a) => only.includes(a.id)) : prompts.assets;
  if (only && assets.length !== only.length) fail(`unknown id in --only: ${only.join(", ")}`);
  if (assets.some((a) => sourceFor(a, override) === "agy") && !dryRun && !hasBinary("agy")) {
    fail("agy is not on PATH. Use --source pixel, or install Antigravity.");
  }

  const outRoot = join(REPO_ROOT, "public/radar/guides");
  for (const asset of assets) {
    const out = join(outRoot, asset.out);
    const source = sourceFor(asset, override);
    if (dryRun) {
      console.log(`${asset.id} -> ${relative(REPO_ROOT, out)} (${outputSize(asset, source).join("x")}, ${source})`);
      if (source === "agy") console.log(`  agy ${agyImageArgs(`${slug}-${asset.id}`, fullPrompt(prompts, asset)).map((a) => JSON.stringify(a)).join(" ")}`);
      continue;
    }
    let webp: Buffer;
    if (source === "pixel") {
      const canvas = drawPixel(asset, entry.accent);
      if (canvas.w !== asset.size[0] || canvas.h !== asset.size[1]) {
        fail(`${asset.id}: painter drew ${canvas.w}x${canvas.h}, prompts file says ${asset.size.join("x")}`);
      }
      webp = await canvasToWebp(canvas);
    } else {
      const output = await runAgy(agyImageArgs(`${slug}-${asset.id}`, fullPrompt(prompts, asset)));
      const saved = parseImagePath(output);
      if (!saved) fail(`${asset.id}: agy did not report a saved image. Re-run with --source pixel.`);
      console.log(`${asset.id}: agy saved ${saved}`);
      webp = await generatedToWebp(saved, outputSize(asset, "agy"));
    }
    if (webp.byteLength > MAX_ART_BYTES) fail(`${asset.id}: ${webp.byteLength} bytes is over the ${MAX_ART_BYTES} byte budget`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, webp);
    console.log(`${asset.id}: ${relative(REPO_ROOT, out)} ${statSync(out).size} bytes`);
  }
  if (!dryRun) {
    console.log("\nReview the art against skills/key-art-poster/SKILL.md section 6, record each asset's");
    console.log("`source` in the prompts file, then commit public/radar/guides/.");
  }
}

// Imported by tests for the pure helpers; runs only as a CLI.
if (/[\\/]art\.ts$/.test(process.argv[1] ?? "")) runMain(main);
