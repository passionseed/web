/**
 * U3 checks for the cybersecurity guide (docs/features/radar-guides-in-code.md
 * 5.3, U3), on top of the guide-lint run in lib/radar-guides/__tests__:
 * - the committed mytcas snapshot has the right shape and count (f.mytcas-9)
 * - the game-story format holds: short dialogue boxes, cutscene scripts that
 *   the founder can record in 15 to 30 seconds, hooks that fit on screen
 * - the host's name is never written into copy (GUIDE_HOST is the one place)
 * - a snapshot of every Thai string, for the Thai copy review diff
 */
import type { GuideBlock, GuidePage, ProgrammeFilterData } from "@/lib/radar-guide/guide-types";
import { DIALOGUE_BOX_MAX_CHARS, GUIDE_HOST } from "@/lib/radar-guide/story";
import { cybersecurityGuide } from "@/lib/radar-guides/cybersecurity/guide";
import tcas from "@/lib/radar-guides/cybersecurity/tcas.json";
import clips from "@/lib/radar-guides/cybersecurity/clips.json";

const guide = cybersecurityGuide;

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

describe("cybersecurity guide", () => {
  it("is live with 11 levels in order, and a live guide never requires an unrecorded clip", () => {
    // `pnpm radar:check` fails a live guide whose required clip is missing.
    expect(guide.meta.status).toBe("live");
    const recorded = clips as Record<string, unknown>;
    for (const page of guide.pages) if (page.clip?.required) expect(recorded[page.key]).toBeTruthy();
    expect(guide.pages.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  describe("tcas.json (mytcas snapshot)", () => {
    const programmes = tcas.programmes;

    it("lists exactly the 9 programmes with ไซเบอร์ in the name (f.mytcas-9)", () => {
      expect(programmes).toHaveLength(9);
      for (const p of programmes) expect(p.programTh).toContain("ไซเบอร์");
      const fact = guide.facts.find((f) => f.id === "f.mytcas-9");
      expect(fact?.values).toContain(String(programmes.length));
    });

    it("uses real mytcas ids and links", () => {
      const ids = programmes.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const p of programmes) {
        expect(p.id).toMatch(/^\d{14}[A-Z]$/);
        expect(p.href).toBe(`https://course.mytcas.com/programs/${p.id}`);
        expect(["thai", "intl", "special"]).toContain(p.track);
      }
      expect(tcas.round).toMatch(/^TCAS\d{2}$/);
      expect(tcas.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("features only programmes whose link matches their id, and cyber ones from the snapshot", () => {
      const block = guide.pages
        .flatMap(pageBlocks)
        .find((b) => b.kind === "game" && b.game.engine === "ProgrammeFilter");
      expect(block).toBeDefined();
      const data = (block as Extract<GuideBlock, { kind: "game" }>).game.data as ProgrammeFilterData;
      const snapshotIds = new Set(programmes.map((p) => p.id));
      for (const card of data.programmes) {
        expect(card.href).toBe(`https://course.mytcas.com/programs/${card.id}`);
        if (card.cyberInName) expect(snapshotIds.has(card.id)).toBe(true);
        if (card.deadline) expect(card.deadline.at).toMatch(/[+-]\d{2}:\d{2}$/);
      }
    });
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
        const copyBlocks = pageBlocks(page).filter((b) => b.kind === "copy");
        expect(copyBlocks).toEqual([]);
      }
    });

    it("gives every cutscene a recordable script and a CLIP block", () => {
      for (const page of guide.pages) {
        const clipBlocks = pageBlocks(page).filter((b) => b.kind === "clip");
        if (!page.clip) {
          expect(clipBlocks).toHaveLength(0);
          continue;
        }
        expect(clipBlocks).toHaveLength(1);
        const { clip } = page;
        expect(clip.seconds).toBeGreaterThanOrEqual(15);
        expect(clip.seconds).toBeLessThanOrEqual(30);
        expect(clip.hookTh.length).toBeLessThanOrEqual(40);
        expect(clip.scriptLinesTh.length).toBeGreaterThanOrEqual(3);
        // The script doubles as the NPC fallback, one dialogue box per line.
        for (const line of clip.scriptLinesTh) expect(line.length).toBeLessThanOrEqual(DIALOGUE_BOX_MAX_CHARS);
        // Spoken Thai runs at roughly 8 to 16 characters a second.
        const chars = clip.scriptLinesTh.join("").replace(/\s/g, "").length;
        expect(chars / clip.seconds).toBeGreaterThanOrEqual(5);
        expect(chars / clip.seconds).toBeLessThanOrEqual(18);
      }
    });

    it("puts the founder on camera for every safety line it records", () => {
      for (const page of guide.pages) {
        if (!page.showsHacking) continue;
        expect(pageBlocks(page).some((b) => b.kind === "safety")).toBe(true);
      }
      expect(guide.pages.find((p) => p.key === "tonight")?.clip).toMatchObject({ safety: true });
    });

    it("never writes the host's display name into copy", () => {
      const all = guide.pages.flatMap((p) => thaiStrings(p, p.key));
      expect(all.filter((s) => s.includes(GUIDE_HOST.nameTh))).toEqual([]);
    });

    it("names only badges and traits the story can reach", () => {
      const story = guide.meta.story;
      if (!story) throw new Error("cybersecurity meta has no story");
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
