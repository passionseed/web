/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildStoryTimeline } from "../../../components/radar/reel/story/storyTimeline";
import { STORY_SCRIPTS } from "../../../lib/radar-stories";
import { GENERIC_SCENES } from "../../../lib/radar-stories/types";
import { canvasToWebp } from "../art";
import { formatStoryTimeline, storyBaseName, storyCaptionText, storyOutputs } from "../lib/story";
import { renderStoryScene, STORY_SCENE_SIZE } from "../story-art-pixel";

const ROOT = join(__dirname, "../../..");

describe("story scene art", () => {
  it.each([...GENERIC_SCENES])("%s is 108x192, opaque, and matches the committed webp", async (scene) => {
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
