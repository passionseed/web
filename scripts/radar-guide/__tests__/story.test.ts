/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildStoryTimeline } from "../../../components/radar/reel/story/storyTimeline";
import { STORY_SCRIPTS } from "../../../lib/radar-stories";
import { STORY_PHOTOS } from "../../../lib/radar-stories/scenes";
import { GENERIC_SCENES } from "../../../lib/radar-stories/types";
import sharp from "sharp";
import { gradeLinear, MAX_PHOTO_BYTES, PHOTO_SIZE, photoOut, photoSourceName } from "../story-photo";
import { canvasToWebp } from "../art";
import { formatStoryTimeline, storyBaseName, storyCaptionText, storyOutputs } from "../lib/story";
import { renderStoryScene, STORY_SCENE_SIZE } from "../story-art-pixel";

const ROOT = join(__dirname, "../../..");

describe("story scene art", () => {
  // Photo scenes come from story-photo.ts (checked below); the rest are hand-made pixel art.
  it.each(GENERIC_SCENES.filter((s) => !STORY_PHOTOS[s]))("%s is 108x192, opaque, and matches the committed webp", async (scene) => {
    const c = renderStoryScene(scene);
    expect([c.w, c.h]).toEqual([STORY_SCENE_SIZE.w, STORY_SCENE_SIZE.h]);
    for (let i = 3; i < c.data.length; i += 4) {
      if (c.data[i] !== 255) throw new Error(`${scene}: transparent pixel at ${(i - 3) / 4}`);
    }
    expect(Buffer.from(renderStoryScene(scene).data).equals(Buffer.from(c.data))).toBe(true);
    const committed = readFileSync(join(ROOT, "public/radar/stories", `${scene}.webp`));
    // Re-run `pnpm radar:story-art` after changing a painter.
    expect((await canvasToWebp(c)).equals(committed)).toBe(true);
  });
});

describe("story photo scenes", () => {
  it.each(Object.keys(STORY_PHOTOS))("%s is a 1080x1920 webp within budget", async (scene) => {
    const file = join(ROOT, "public", photoOut(scene));
    const meta = await sharp(file).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", PHOTO_SIZE.w, PHOTO_SIZE.h]);
    expect(readFileSync(file).byteLength).toBeLessThanOrEqual(MAX_PHOTO_BYTES);
  });

  it("names outputs and generated sources from the scene key", () => {
    expect(photoOut("classroom")).toBe("radar/stories/classroom.webp");
    expect(photoOut("career:ux-design/work")).toBe("radar/stories/career/ux-design/work.webp");
    expect(photoSourceName("career:ux-design/work")).toBe("career__ux-design__work.png");
  });

  it("fades the print: contrast toward mid grey, blacks lifted, white stays near white", () => {
    const { a, b } = gradeLinear(0.88, [40, 34, 30]);
    const at = (x: number, i: number) => a[i] * x + b[i];
    for (let i = 0; i < 3; i++) {
      expect(at(0, i)).toBeGreaterThan(30); // no true black
      expect(at(255, i)).toBeLessThanOrEqual(255);
      expect(at(255, i)).toBeGreaterThan(230);
    }
  });
});

describe("radar:story outputs", () => {
  const script = STORY_SCRIPTS.find((s) => s.series === "round1")!;

  it("names files by id, platform and hook variant", () => {
    const out = storyOutputs("/m", script.id, null);
    expect(out.video("ig")).toBe(`/m/${script.id}.ig.mp4`);
    expect(out.video("tt")).toBe(`/m/${script.id}.tt.mp4`);
    expect(out.cover).toBe(`/m/${script.id}.cover.webp`);
    expect(out.caption).toBe(`/m/${script.id}.caption.txt`);
    expect(storyBaseName(script.id, 2)).toBe(`${script.id}.v2`);
    expect(storyOutputs("/m", script.id, 1).video("ig")).toBe(`/m/${script.id}.v1.ig.mp4`);
  });

  it("writes both captions, the pinned comment, the hooks and the sources", () => {
    const text = storyCaptionText(script);
    expect(text).toContain(script.captionIgTh);
    expect(text).toContain(script.captionTtTh);
    expect(text).toContain("คอมเมนต์ RADAR");
    for (const h of script.hookVariantsTh) expect(text).toContain(h);
    for (const f of script.factRefs) expect(text).toContain(f.url);
    expect(text).not.toMatch(/[–—]/);
  });

  it("prints one timeline row per beat", () => {
    const rows = formatStoryTimeline(buildStoryTimeline(script)).split("\n");
    expect(rows).toHaveLength(script.beats.length + 3);
    expect(rows[0]).toContain(script.hookTh);
  });
});
