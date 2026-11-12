/**
 * pnpm radar:cover <slug> <scene> [--prompt "subject"] [--dry-run]
 *
 * Generates one 1024x1024 background with agy's generate_image (scenery only,
 * no people, no text), uploads the PNG to B2 at radar/art/<slug>/<scene>.<sha8>.png
 * with immutable caching, and records the URL in docs/radar-guide/art.json.
 * agy runs with its normal permission prompts; this command never passes a
 * flag that skips them.
 *
 * Scenes: hook, reality, money, ai, day, study, start, cover.
 *
 *   --prompt   replace the scene's subject (style and "no people, no text" stay)
 *   --dry-run  print the prompt and the agy command; run nothing, upload nothing
 *
 * Check the result against skills/key-art-poster/SKILL.md before using it.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

import { agyArgs, ART_SCENES, buildArtPrompt, emptyArtIndex, mentionsPeople, parseSavedPath, recordArt, type ArtIndex, type ArtScene } from "./lib/art";
import { putImmutable, requireB2Env } from "./lib/b2";
import { assertSlug, capture, fail, flagString, hasBinary, parseArgs, paths, REPO_ROOT, requireBinary, runMain } from "./lib/cli";
import { readDump } from "./lib/dump";
import { artKey, sha8 } from "./lib/media";

const USAGE = `pnpm radar:cover <slug> <scene> [--prompt "subject"] [--dry-run]   (scenes: ${ART_SCENES.join(", ")})`;

function runAgy(args: string[]): Promise<string> {
  return new Promise((ok, reject) => {
    // stdin stays attached so agy can ask for permission the normal way.
    const child = spawn("agy", args, { stdio: ["inherit", "pipe", "inherit"] });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? ok(out) : reject(new Error(`agy exited with code ${code}`))));
  });
}

function readArtIndex(): ArtIndex {
  if (!existsSync(paths.artIndex)) return emptyArtIndex();
  const parsed = JSON.parse(readFileSync(paths.artIndex, "utf8")) as ArtIndex;
  return parsed?.version === 1 && parsed.fields ? parsed : emptyArtIndex();
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { bool: ["dry-run"], value: ["prompt"] });
  const slug = assertSlug(args.positional[0], USAGE);
  const scene = args.positional[1] as ArtScene | undefined;
  if (!scene || !(ART_SCENES as readonly string[]).includes(scene)) fail(`Missing or unknown <scene>.\nUsage: ${USAGE}`);
  const override = flagString(args, "prompt");
  if (override && mentionsPeople(override)) {
    fail("The prompt mentions people. Radar art is scenery and objects only: never real people next to career claims.");
  }

  const nameEn = existsSync(paths.dump(slug)) ? readDump(slug).name_en : slug.replace(/-/g, " ");
  const prompt = buildArtPrompt(scene, nameEn, override);
  const imageName = `${slug}-${scene}`;
  const agy = agyArgs(imageName, prompt);

  if (args.flags["dry-run"]) {
    if (!hasBinary("agy")) console.warn("warning: agy is not on PATH; a real run would stop here.");
    console.log(`Prompt:\n  ${prompt}\n\nWould run:\n  agy ${agy.map((a) => JSON.stringify(a)).join(" ")}`);
    console.log(`\nThen upload to radar/art/${slug}/${scene}.<sha8>.png and record it in ${relative(REPO_ROOT, paths.artIndex)}.`);
    return;
  }

  requireBinary("agy", "generating the image");
  requireBinary("ffprobe", "checking the image size");
  requireB2Env();

  console.log(`Generating ${imageName} with agy (answer its permission prompt if it asks)...`);
  const output = await runAgy(agy);
  const saved = parseSavedPath(output);
  if (!saved || !existsSync(saved)) fail(`Could not find the saved PNG in agy's reply.${saved ? ` (${saved} does not exist)` : ""}`);

  const [w, h] = capture("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", saved])
    .trim()
    .split(",")
    .map(Number);
  if (w !== 1024 || h !== 1024) console.warn(`warning: the image is ${w}x${h}, not 1024x1024.`);

  const bytes = readFileSync(saved);
  const key = artKey(slug, scene, sha8(bytes));
  const { url, skipped } = await putImmutable(key, bytes, "image/png");
  console.log(`B2: ${skipped ? "already there" : "uploaded"} ${url}`);

  const index = recordArt(readArtIndex(), slug, scene, { url, prompt, created_at: new Date().toISOString() });
  writeFileSync(paths.artIndex, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Recorded in ${relative(REPO_ROOT, paths.artIndex)}. Check it against skills/key-art-poster/SKILL.md before use.`);
}

runMain(main);
