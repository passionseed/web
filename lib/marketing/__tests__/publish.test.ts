import { lintText } from "../copyRules";
import { LINKEDIN_POSTS, PUBLISH_PLAN, STUDIO_SETS, X_POSTS } from "../sets";
import { X_MAX_WEIGHT, xWeightedLength } from "../xText";

describe("X posts", () => {
  it.each(X_POSTS.map((p) => [p.slug, p] as const))("%s fits in one post and passes copy rules", (_slug, post) => {
    expect(xWeightedLength(post.text)).toBeLessThanOrEqual(X_MAX_WEIGHT);
    expect(lintText(post.text, post.slug, "story").map((h) => h.rule)).toEqual([]);
  });

  it("attach at most 4 slides that exist", () => {
    for (const post of X_POSTS) {
      if (!post.images) continue;
      const set = STUDIO_SETS.find((s) => s.slug === post.images?.set);
      expect(set).toBeDefined();
      expect(post.images.slides.length).toBeLessThanOrEqual(4);
      const last = (set?.slides.length ?? 0) + (set?.pageOffset ?? 0);
      for (const n of post.images.slides) expect(n).toBeLessThanOrEqual(last);
    }
  });
});

describe("weighted length", () => {
  it("counts Thai as 1, emoji as 2, links as 23", () => {
    expect(xWeightedLength("สวัสดี")).toBe(6);
    expect(xWeightedLength("🧵")).toBe(2);
    expect(xWeightedLength("passionseed.org/shift/2")).toBe(23);
  });
});

describe("publish plan", () => {
  const known = new Set([...LINKEDIN_POSTS.map((p) => p.slug), ...X_POSTS.map((p) => p.slug)]);

  it("only schedules posts that exist, once each", () => {
    for (const slot of PUBLISH_PLAN) expect(known.has(slot.post)).toBe(true);
    const slugs = PUBLISH_PLAN.map((s) => s.post);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses Bangkok times in order, within daily caps", () => {
    const perDay = new Map<string, number>();
    let prev = "";
    for (const slot of PUBLISH_PLAN) {
      expect(slot.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/);
      expect(slot.at >= prev).toBe(true);
      prev = slot.at;
      const key = `${slot.platform} ${slot.at.slice(0, 10)}`;
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    for (const [key, n] of perDay) expect(n).toBeLessThanOrEqual(key.startsWith("linkedin") ? 1 : 2);
  });
});
