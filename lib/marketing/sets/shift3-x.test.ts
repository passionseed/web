import { STUDIO_SETS } from ".";
import { SHIFT3_X_POSTS } from "./shift3-x";

/**
 * A plain re-statement of X's weighted count, independent of xText.ts so a
 * bug there cannot hide an overlong post: each link weighs 23, code points
 * up to U+10FF (Latin, Thai) and general punctuation weigh 1, the rest 2.
 */
const LINK = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:org|com|net|co|th|io|app)(?:\/\S*)?/gi;

function weighted(text: string): number {
  const links = text.match(LINK) ?? [];
  let n = links.length * 23;
  for (const ch of text.replace(LINK, "").normalize("NFC")) {
    const cp = ch.codePointAt(0) ?? 0;
    n += cp <= 0x10ff || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037) ? 1 : 2;
  }
  return n;
}

describe("SHIFT3_X_POSTS", () => {
  it("has 10 to 12 posts", () => {
    expect(SHIFT3_X_POSTS.length).toBeGreaterThanOrEqual(10);
    expect(SHIFT3_X_POSTS.length).toBeLessThanOrEqual(12);
  });

  it.each(SHIFT3_X_POSTS.map((p) => [p.slug, p] as const))("%s fits in one post", (_slug, post) => {
    expect(weighted(post.text)).toBeLessThanOrEqual(280);
  });

  it("has unique, prefixed slugs", () => {
    const slugs = SHIFT3_X_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^x-shift3-/);
  });

  it("uses no em dash and no น้อง", () => {
    for (const post of SHIFT3_X_POSTS) {
      expect(post.text).not.toMatch(/—/);
      expect(post.text).not.toMatch(/น้อง/);
    }
  });

  it("uses the canonical wordmark only", () => {
    for (const post of SHIFT3_X_POSTS) expect(post.text).not.toMatch(/SHIFT③|SHIFT 3|SHIFT\(3\)/);
  });

  it("attaches up to 4 slides from sets that exist", () => {
    const known = new Map(STUDIO_SETS.map((s) => [s.slug, s]));
    for (const post of SHIFT3_X_POSTS) {
      if (!post.images) continue;
      const set = known.get(post.images.set);
      expect(set).toBeDefined();
      expect(post.images.slides.length).toBeLessThanOrEqual(4);
      const first = (set?.pageOffset ?? 0) + 1;
      const last = (set?.slides.length ?? 0) + (set?.pageOffset ?? 0);
      for (const n of post.images.slides) {
        expect(n).toBeGreaterThanOrEqual(first);
        expect(n).toBeLessThanOrEqual(last);
      }
    }
  });
});
