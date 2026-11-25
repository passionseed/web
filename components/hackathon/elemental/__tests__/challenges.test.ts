import fs from "node:fs";
import path from "node:path";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { ELEMENT_DETAILS } from "../challenges";
import { buildLearnPrompt, ELEMENT_KEYWORDS } from "../learn";
import { ELEMENT_CHAPTERS } from "../media";

const allCopy = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allCopy);
  if (value && typeof value === "object") return Object.values(value).flatMap(allCopy);
  return [];
};

describe("Elemental element details", () => {
  it("has a brief for every element on the page", () => {
    const canonical = ELEMENTAL.elements.map((e) => e.key).sort();
    expect(Object.keys(ELEMENT_DETAILS).sort()).toEqual(canonical);
    for (const chapter of ELEMENT_CHAPTERS) {
      expect(ELEMENT_DETAILS[chapter.key]).toBeDefined();
    }
  });

  it("gives every element a challenge and at least two real cases", () => {
    for (const detail of Object.values(ELEMENT_DETAILS)) {
      expect(detail.howMightWeTh.length).toBeGreaterThan(0);
      expect(detail.starterTh.length).toBeGreaterThan(0);
      expect(detail.stretchTh.length).toBeGreaterThan(0);
      expect(detail.cases.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("backs every case with numbers and an https source", () => {
    for (const detail of Object.values(ELEMENT_DETAILS)) {
      for (const item of detail.cases) {
        expect(item.impact.length).toBeGreaterThanOrEqual(2);
        // The panel shows three numbers; a fourth would be silently hidden.
        expect(item.impact.length).toBeLessThanOrEqual(3);
        expect(item.sources.length).toBeGreaterThanOrEqual(1);
        for (const source of item.sources) {
          expect(source.url).toMatch(/^https:\/\//);
        }
      }
    }
  });

  it("credits every photo and ships its file", () => {
    for (const detail of Object.values(ELEMENT_DETAILS)) {
      for (const item of detail.cases) {
        if (!item.image) continue;
        expect(item.image.credit).toMatch(/CC|Public domain/);
        expect(item.image.creditUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
        const file = path.join(process.cwd(), "public", item.image.src.replace(/^\//, ""));
        expect(fs.existsSync(file)).toBe(true);
      }
    }
  });

  it("keeps em dashes out of user-facing copy", () => {
    for (const text of allCopy(ELEMENT_DETAILS)) {
      expect(text).not.toContain("—");
    }
    for (const text of allCopy(ELEMENT_KEYWORDS)) {
      expect(text).not.toContain("—");
    }
  });

  it("gives every element keywords with an English term and a meaning", () => {
    for (const chapter of ELEMENT_CHAPTERS) {
      const keywords = ELEMENT_KEYWORDS[chapter.key];
      expect(keywords.length).toBeGreaterThanOrEqual(4);
      for (const k of keywords) {
        expect(k.th && k.en && k.meaningTh).toBeTruthy();
      }
    }
  });

  it("builds an AI prompt that carries the brief, its cases and its keywords", () => {
    for (const chapter of ELEMENT_CHAPTERS) {
      const detail = ELEMENT_DETAILS[chapter.key];
      const prompt = buildLearnPrompt(chapter.key, "ธาตุทดสอบ");
      expect(prompt).toContain("ธาตุทดสอบ");
      expect(prompt).toContain(detail.problemTh);
      expect(prompt).toContain(detail.howMightWeTh);
      for (const item of detail.cases) expect(prompt).toContain(item.titleTh);
      for (const k of ELEMENT_KEYWORDS[chapter.key]) expect(prompt).toContain(k.en);
      expect(prompt).not.toContain("—");
    }
  });
});
