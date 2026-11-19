/**
 * Checks for the Data Scientist guide (Level 1). It is not registered in
 * lib/radar-guides/index.ts yet, so guide-lint runs on it here directly, the
 * same way lib/radar-guides/__tests__/guides.test.ts runs it for registered
 * guides. Plus the game-story checks from cybersecurity.test.ts and a snapshot
 * of every Thai string for the Thai copy review.
 */
import type { GuideBlock, GuidePage } from "@/lib/radar-guide/guide-types";
import { formatIssues, lintErrors, lintFactIdsUnique, lintGuide } from "@/lib/radar-guide/guide-lint";
import { DIALOGUE_BOX_MAX_CHARS, GUIDE_HOST } from "@/lib/radar-guide/story";
import { GLOBAL_BANNED } from "@/lib/radar-guides/banned";
import { SHARED_FACTS } from "@/lib/radar-guides/_shared/facts";
import { CYBERSECURITY_FACTS } from "@/lib/radar-guides/cybersecurity/facts";
import { dataScientistGuide } from "@/lib/radar-guides/data-scientist/guide";

const guide = dataScientistGuide;

/** guide-lint's "asOf ... is N days old" errors (date dependent, left to `pnpm radar:check`). */
const DATE_AGE_ISSUE = /^asOf \S+ is \d+ days old/;

/** asOf dates are Bangkok calendar dates: lint against today's date in UTC+7. */
const BANGKOK_NOW = new Date(Date.now() + 7 * 3600 * 1000);

function flatBlocks(blocks: readonly GuideBlock[]): GuideBlock[] {
  return blocks.flatMap((b) => (b.kind === "beat" ? [b, ...flatBlocks(b.blocks)] : [b]));
}

function pageBlocks(page: GuidePage): GuideBlock[] {
  return flatBlocks(page.blocks);
}

const THAI = /[฀-๿]/;

/** Every Thai string in a value, as "<path>: <text>", in source order. */
function thaiStrings(value: unknown, at: string, out: string[] = []): string[] {
  if (typeof value === "string") {
    if (THAI.test(value)) out.push(`${at}: ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => thaiStrings(v, `${at}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) thaiStrings(v, `${at}.${k}`, out);
  }
  return out;
}

describe("data-scientist guide", () => {
  it("passes guide-lint", () => {
    const issues = lintGuide(guide, { sharedFacts: SHARED_FACTS, globalBanned: GLOBAL_BANNED, now: BANGKOK_NOW });
    const errors = lintErrors(issues).filter((i) => !DATE_AGE_ISSUE.test(i.message));
    expect(formatIssues(errors)).toBe("");
  });

  it("keeps fact ids unique against _shared and cybersecurity", () => {
    const lists = { _shared: SHARED_FACTS, cybersecurity: CYBERSECURITY_FACTS, "data-scientist": guide.facts };
    expect(formatIssues(lintFactIdsUnique(lists))).toBe("");
  });

  it("is a draft: Level 1 is dream, work, tonight, next; round 1 opens Level 2", () => {
    expect(guide.meta.status).toBe("draft");
    expect(guide.pages.map((p) => p.key)).toEqual(["dream", "work", "tonight", "next", "round1"]);
    expect(guide.pages.map((p) => p.order)).toEqual([1, 2, 3, 4, 5]);
    expect(guide.meta.pages.map((p) => p.tier)).toEqual([1, 1, 1, 1, 2]);
    expect(guide.meta.shareCardAfter).toBe("work");
    const work = guide.pages.find((p) => p.key === "work");
    expect(work && pageBlocks(work).some((b) => b.kind === "shareCard" && b.id === "share-work")).toBe(true);
  });

  it("sends the student to a first step that needs no age-limited AI account", () => {
    const tonight = guide.pages.find((p) => p.key === "tonight");
    if (!tonight) throw new Error("no tonight page");
    const text = thaiStrings(tonight, "tonight").join("\n");
    expect(text).toContain("เช็กเกณฑ์อายุของเว็บก่อน ถ้าต้องมีผู้ปกครอง ให้สมัครด้วยกัน");
    expect(text).not.toMatch(/ChatGPT|Claude|Gemini|Copilot|Grok/i);
  });

  describe("game-story format", () => {
    it("keeps every dialogue box short enough for two lines on a phone", () => {
      const long: string[] = [];
      for (const page of guide.pages) {
        for (const block of pageBlocks(page)) {
          if (block.kind !== "dialogue") continue;
          expect(block.lines.length).toBeGreaterThan(0);
          for (const line of block.lines) {
            if (line.text.th.length > DIALOGUE_BOX_MAX_CHARS) long.push(`${page.key}.${block.id}: ${line.text.th}`);
          }
        }
      }
      expect(long).toEqual([]);
    });

    it("opens every level with a dialogue beat or a cutscene, never a paragraph", () => {
      for (const page of guide.pages) {
        expect(["dialogue", "clip"]).toContain(page.blocks[0]?.kind);
        expect(pageBlocks(page).filter((b) => b.kind === "copy")).toEqual([]);
      }
    });

    it("has no cutscene slots (no founder time on camera for this guide)", () => {
      for (const page of guide.pages) {
        expect(page.clip).toBeUndefined();
        expect(pageBlocks(page).filter((b) => b.kind === "clip")).toEqual([]);
      }
    });

    it("never writes the host's display name into copy", () => {
      const all = guide.pages.flatMap((p) => thaiStrings(p, p.key));
      expect(all.filter((s) => s.includes(GUIDE_HOST.nameTh))).toEqual([]);
    });

    it("names only badges and traits the story can reach", () => {
      const story = guide.meta.story;
      if (!story) throw new Error("data-scientist meta has no story");
      const keys = new Set(guide.pages.map((p) => p.key));
      for (const b of story.badges) {
        if (b.trigger.on === "clear") expect(keys.has(b.trigger.pageKey)).toBe(true);
        if (b.trigger.on === "game") expect(keys.has(b.trigger.game.split(":")[0])).toBe(true);
      }
      for (const t of story.traits) {
        for (const rule of t.when) {
          if ("favourite" in rule) expect(keys.has(rule.favourite)).toBe(true);
          if ("cleared" in rule) expect(keys.has(rule.cleared)).toBe(true);
          if ("perfect" in rule) expect(keys.has(rule.perfect.split(":")[0])).toBe(true);
        }
      }
      expect(story.traits.filter((t) => t.when.some((r) => "always" in r)).length).toBeGreaterThanOrEqual(3);
    });
  });

  it("matches the Thai copy snapshot (diff this in the Thai review)", () => {
    const copy = guide.pages.map((p) => thaiStrings(p, p.key).join("\n"));
    expect(copy).toMatchSnapshot();
  });
});
