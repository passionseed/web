import { SHIFT_VOICES } from "@/lib/content/shift-voices";

import { lintPost, lintSet, lintText } from "../copyRules";
import { LINKEDIN_POSTS, STUDIO_SETS } from "../sets";

describe("marketing studio sets", () => {
  it("pass every copy rule", () => {
    const hits = [...STUDIO_SETS.flatMap(lintSet), ...LINKEDIN_POSTS.flatMap(lintPost)];
    expect(hits.map((h) => `${h.where}: ${h.rule} (${h.text.slice(0, 60)})`)).toEqual([]);
  });

  it("have unique slugs across sets and posts", () => {
    const slugs = [...STUDIO_SETS.map((s) => s.slug), ...LINKEDIN_POSTS.map((p) => p.slug)];
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("cite sources, stay within carousel limits, and date themselves", () => {
    for (const set of STUDIO_SETS) {
      expect(set.sources.length).toBeGreaterThan(0);
      expect(set.slides.length + (set.pageOffset ?? 0)).toBeLessThanOrEqual(10);
      expect(set.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("attach only sets that exist", () => {
    const slugs = new Set(STUDIO_SETS.map((s) => s.slug));
    for (const post of LINKEDIN_POSTS) if (post.attach) expect(slugs.has(post.attach)).toBe(true);
  });

  it("quote only registered voices", () => {
    for (const set of STUDIO_SETS)
      for (const slide of set.slides) if (slide.kind === "quote") expect(SHIFT_VOICES[slide.voice]).toBeDefined();
  });
});

describe("copy rules", () => {
  it("catch the words students and the founder pushed back on", () => {
    const rules = (text: string) => lintText(text, "t", "instagram").map((h) => h.rule);
    expect(rules("Pivot Log 1 หน้า")).toContain("pivot");
    expect(rules("ส่งให้ลูกดู")).toContain("luk");
    expect(rules("น้องๆ ม.4")).toContain("nong");
    expect(rules("ทำโปรเจกต์ — ง่ายมาก")).toContain("em-dash");
    expect(rules("การันตีติดรอบ 1")).toContain("guarantee");
  });

  it("leave customers and verbatim quotes alone", () => {
    expect(lintText("คุยกับลูกค้าจริง", "t", "instagram")).toEqual([]);
    expect(lintText("“เขียนว่าทำเครื่องมือได้ในวันเดียว คนจะคิดว่าหลอก”", "t", "linkedin")).toEqual([]);
  });

  it("allow Self-Determination Theory on LinkedIn only", () => {
    expect(lintText("Self-Determination Theory", "t", "linkedin")).toEqual([]);
    expect(lintText("Self-Determination Theory", "t", "instagram")).not.toEqual([]);
  });
});
