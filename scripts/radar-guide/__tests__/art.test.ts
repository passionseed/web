/**
 * @jest-environment node
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { GUIDE_INDEX } from "../../../lib/radar-guides/index";
import { GUIDE_HOST } from "../../../lib/radar-guide/story";
import { FRAME_SIZE, MAP_SIZE, renderFrame, renderHost, renderMap, renderScene, SCENE_SIZE, SCENES } from "../art-pixel";
import { AGY_SCALE, agyImageArgs, fullPrompt, loadPrompts, MAX_ART_BYTES, outputSize, parseImagePath, sourceFor, type ArtPrompts } from "../art";
import { mentionsPeople } from "../lib/art";

const ROOT = join(__dirname, "../../..");
const PUBLIC = join(ROOT, "public/radar/guides");
const SLUGS = Object.keys(GUIDE_INDEX);

describe("pixel painter", () => {
  it("draws every scene at the native size, fully opaque, deterministically", () => {
    for (const key of Object.keys(SCENES)) {
      const a = renderScene(key, "#5cff5c");
      expect([a.w, a.h]).toEqual([SCENE_SIZE.w, SCENE_SIZE.h]);
      for (let i = 3; i < a.data.length; i += 4) {
        if (a.data[i] !== 255) throw new Error(`${key}: transparent pixel at ${(i - 3) / 4}`);
      }
      expect(Buffer.from(renderScene(key, "#5cff5c").data).equals(Buffer.from(a.data))).toBe(true);
    }
  });

  it("draws the map, frame and host at their sizes", () => {
    expect([renderMap("#5cff5c").w, renderMap("#5cff5c").h]).toEqual([MAP_SIZE.w, MAP_SIZE.h]);
    expect([renderFrame("#5cff5c").w, renderFrame("#5cff5c").h]).toEqual([FRAME_SIZE.w, FRAME_SIZE.h]);
    const host = renderHost("idle");
    expect([host.w, host.h]).toEqual([GUIDE_HOST.spriteSize.w, GUIDE_HOST.spriteSize.h]);
  });

  it("uses the career accent", () => {
    const c = renderScene("terminal", "#5cff5c");
    let found = false;
    for (let i = 0; i < c.data.length; i += 4) {
      if (c.data[i] === 0x5c && c.data[i + 1] === 0xff && c.data[i + 2] === 0x5c) found = true;
    }
    expect(found).toBe(true);
  });
});

describe.each(SLUGS)("art for %s", (slug) => {
  let prompts: ArtPrompts;
  beforeAll(() => {
    prompts = loadPrompts(slug);
  });

  it("has a scene and a prompt for every level", () => {
    const ids = new Set(prompts.assets.map((a) => a.id));
    for (const page of GUIDE_INDEX[slug].pages) {
      expect(ids.has(page.key)).toBe(true);
      expect(SCENES[page.key]).toBeDefined();
    }
    for (const id of ["map", "frame", "host-idle", "host-talk", "host-cheer"]) expect(ids.has(id)).toBe(true);
  });

  it("keeps people, text and logos out of scene prompts", () => {
    for (const asset of prompts.assets) {
      if (asset.kind !== "host") expect(mentionsPeople(asset.prompt)).toBe(false);
      const full = fullPrompt(prompts, asset);
      expect(full).toMatch(/no text/);
      expect(full).toMatch(/no logos/);
    }
  });

  it("committed every asset as a webp within the size budget", () => {
    for (const asset of prompts.assets) {
      const file = join(PUBLIC, asset.out);
      if (asset.source === "agy") expect(["scene", "map"]).toContain(asset.kind);
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(MAX_ART_BYTES);
      const head = readFileSync(file).subarray(0, 12).toString("latin1");
      expect(head.startsWith("RIFF") && head.endsWith("WEBP")).toBe(true);
    }
  });

  it("records the source that made each committed file (its size matches)", async () => {
    for (const asset of prompts.assets) {
      const meta = await sharp(join(PUBLIC, asset.out)).metadata();
      expect([asset.id, meta.width, meta.height]).toEqual([asset.id, ...outputSize(asset, sourceFor(asset))]);
    }
  });

  it("writes level scenes where levelSceneSrc looks for them", () => {
    for (const page of GUIDE_INDEX[slug].pages) {
      expect(prompts.assets.find((a) => a.id === page.key)?.out).toBe(`${slug}/${page.key}.webp`);
    }
  });
});

describe("agy invocation", () => {
  it("never skips agy's permission prompts", () => {
    const args = agyImageArgs("x", "a 'quoted' prompt");
    expect(args.join(" ")).not.toMatch(/dangerously|skip-permissions/);
    expect(args.join(" ")).not.toContain("'quoted'");
    expect(args).toContain("300s");
  });

  it("finds the saved image path in agy's reply (png or jpg)", () => {
    expect(parseImagePath("An image generation task has been started.\n/Users/x/brain/abc/cyber_fit_1.jpg\n")).toBe("/Users/x/brain/abc/cyber_fit_1.jpg");
    expect(parseImagePath("saved at `/tmp/a.png` then /tmp/b.PNG")).toBe("/tmp/b.PNG");
    expect(parseImagePath("no output produced")).toBeNull();
  });

  it("keeps the host and frame hand-made and scales generated art", () => {
    expect(sourceFor({ kind: "host", source: "agy" }, "agy")).toBe("pixel");
    expect(sourceFor({ kind: "frame" }, "agy")).toBe("pixel");
    expect(sourceFor({ kind: "scene", source: "agy" })).toBe("agy");
    expect(sourceFor({ kind: "scene", source: "agy" }, "pixel")).toBe("pixel");
    expect(sourceFor({ kind: "map" })).toBe("pixel");
    expect(outputSize({ size: [160, 100] }, "agy")).toEqual([160 * AGY_SCALE, 100 * AGY_SCALE]);
    expect(outputSize({ size: [160, 100] }, "pixel")).toEqual([160, 100]);
  });

  it("the host sprite paths match GUIDE_HOST", () => {
    for (const src of Object.values(GUIDE_HOST.sprites)) {
      if (src) expect(existsSync(join(ROOT, "public", src))).toBe(true);
    }
  });
});
