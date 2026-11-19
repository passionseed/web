/**
 * @jest-environment node
 *
 * Every script in lib/radar-stories/scripts is registered, lints clean of
 * errors, and every scene it uses has art in public/.
 */
import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { STORY_FILES, STORY_SCRIPTS, storyById } from "..";
import { formatProblem, lintStories } from "../lint";
import { parseScene, storySceneSrc } from "../scenes";
import { GENERIC_SCENES } from "../types";

const ROOT = join(__dirname, "../../..");
const publicExists = (p: string) => existsSync(join(ROOT, "public", p));

describe("story registry", () => {
  it("lists every file in lib/radar-stories/scripts", () => {
    const files = readdirSync(join(__dirname, "../scripts"))
      .filter((f) => /\.(ts|json)$/.test(f) && !f.endsWith(".d.ts"))
      .map((f) => basename(f).replace(/\.(ts|json)$/, ""));
    const missing = files.filter((f) => !(f in STORY_FILES));
    // Add `import x from "./scripts/x"` and `x,` to STORY_FILES in lib/radar-stories/index.ts.
    expect(missing).toEqual([]);
  });

  it("has unique ids and finds scripts by id", () => {
    const ids = STORY_SCRIPTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(storyById(id)?.id).toBe(id);
    expect(storyById("nope")).toBeNull();
  });

  it("has a lost and a round1 sample", () => {
    expect(STORY_SCRIPTS.some((s) => s.series === "lost")).toBe(true);
    expect(STORY_SCRIPTS.some((s) => s.series === "round1")).toBe(true);
  });

  it("lints every script clean of errors (scene art included)", () => {
    const errors = lintStories(STORY_SCRIPTS, { sceneExists: publicExists }).filter((p) => p.level === "error");
    expect(errors.map(formatProblem)).toEqual([]);
  });
});

describe("story scenes", () => {
  it("has art for every generic scene", () => {
    for (const scene of GENERIC_SCENES) expect(publicExists(storySceneSrc(scene)!)).toBe(true);
  });

  it("resolves every scene key in every script to a file", () => {
    const used = new Set(STORY_SCRIPTS.flatMap((s) => s.beats.map((b) => b.scene)));
    for (const scene of used) {
      const src = storySceneSrc(scene);
      expect([scene, src]).toEqual([scene, expect.any(String)]);
      expect([scene, publicExists(src!)]).toEqual([scene, true]);
    }
  });

  it("parses career scenes and rejects malformed ones", () => {
    expect(parseScene("career:ux-design/work")).toEqual({ kind: "career", slug: "ux-design", page: "work" });
    expect(storySceneSrc("career:cybersecurity/scam")).toBe("/radar/guides/cybersecurity/scam.webp");
    expect(storySceneSrc("classroom")).toBe("/radar/stories/classroom.webp");
    for (const bad of ["career:", "career:ux-design", "career:UX/work", "career:a/b/c", "kitchen"]) expect(parseScene(bad)).toBeNull();
  });
});
