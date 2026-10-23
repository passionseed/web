import { SHIFT_COHORT_3 } from "@/lib/content/shift-cohort";

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

describe("SHIFT[3] publish slots", () => {
  const C = SHIFT_COHORT_3;
  const slotsFor = (slugs: string[]) => PUBLISH_PLAN.filter((s) => slugs.includes(s.post));
  const shift3X = X_POSTS.filter((p) => p.slug.startsWith("x-shift3-")).map((p) => p.slug);
  const shift3Li = ["li-post-three-rounds", "li-post-30-seats", "li-post-interview-fear"];
  const day = (slot: { at: string }) => slot.at.slice(0, 10);

  it("schedules every SHIFT[3] X post and founder post exactly once", () => {
    const planned = PUBLISH_PLAN.map((s) => s.post);
    for (const slug of [...shift3X, ...shift3Li]) expect(planned.filter((p) => p === slug)).toHaveLength(1);
  });

  it("keeps X at 12:15 or 20:00 and LinkedIn at 08:30 on weekdays", () => {
    for (const slot of slotsFor(shift3X)) expect(slot.at.slice(11, 16)).toMatch(/^(12:15|20:00)$/);
    for (const slot of slotsFor(shift3Li)) {
      expect(slot.at.slice(11, 16)).toBe("08:30");
      const weekday = new Date(`${day(slot)}T12:00:00+07:00`).getUTCDay();
      expect(weekday).toBeGreaterThanOrEqual(1);
      expect(weekday).toBeLessThanOrEqual(5);
    }
  });

  it("asks for applications only while they are open, and posts day 1 on the start date", () => {
    for (const slot of slotsFor([...shift3X, ...shift3Li])) {
      if (slot.post === "x-shift3-day-1") continue;
      expect(day(slot) <= C.applyDeadline).toBe(true);
    }
    const [deadline] = slotsFor(["x-shift3-deadline-day"]);
    const [lastCall] = slotsFor(["x-shift3-last-call"]);
    const [day1] = slotsFor(["x-shift3-day-1"]);
    expect(day(deadline)).toBe(C.applyDeadline);
    expect(day(lastCall) < C.applyDeadline).toBe(true);
    expect(day(day1)).toBe(C.startDate);
    expect(day1.at.slice(11, 16) < C.sessionTime.slice(0, 5)).toBe(true);
  });
});
