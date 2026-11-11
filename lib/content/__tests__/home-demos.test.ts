import { existsSync } from "node:fs";
import { join } from "node:path";

import { HOME_DEMOS, HOME_DEMO_COPY, HOME_SESSION_SHOT } from "@/lib/content/home";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";

const inPublic = (path: string) => existsSync(join(process.cwd(), "public", path));

describe("home demo reel", () => {
  it("has a clip and a still for every project it lists", () => {
    expect(HOME_DEMOS.length).toBeGreaterThan(0);
    for (const demo of HOME_DEMOS) {
      expect(inPublic(demo.video)).toBe(true);
      expect(inPublic(demo.poster)).toBe(true);
    }
  });

  it("only lists projects from the round's published showcase", () => {
    const published = new Map((SHIFT_COHORT.showcase ?? []).map((p) => [p.title, p.url]));
    for (const demo of HOME_DEMOS) {
      expect(published.get(demo.title)).toBe(demo.url);
      expect(demo.url).toContain(demo.host);
      expect(demo.pitch).toBeTruthy();
    }
  });

  it("counts the projects from the cohort data", () => {
    expect(HOME_DEMO_COPY.lede.startsWith(`${SHIFT_COHORT.showcase?.length} `)).toBe(true);
  });

  it("ships the session still and keeps em dashes out of the copy", () => {
    expect(inPublic(HOME_SESSION_SHOT.src)).toBe(true);
    const copy = [HOME_DEMO_COPY.heading, HOME_DEMO_COPY.lede, HOME_SESSION_SHOT.caption, HOME_SESSION_SHOT.alt];
    for (const line of copy) expect(line).not.toMatch(/—/);
  });
});
