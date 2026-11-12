import type { CareerGuide, GuidePage } from "@/lib/radar-guide/guide-types";
import { asOfLabel, formatThaiDay, levelLabel, minutesLeftLabel, roundMinutes } from "../guide-format";
import {
  coverHref,
  deckHref,
  firstLevelKey,
  guideCoverMetadata,
  guideHookTh,
  guidePageMetadata,
  guideSitemapEntries,
  levelHref,
  shouldShowGuideCover,
} from "../guide-routes";

const DASH = /[\u2013\u2014]/;

function page(key: string, order: number, extra: Partial<GuidePage> = {}): GuidePage {
  return {
    key,
    order,
    titleTh: `ด่าน ${key}`,
    questionTh: "คำถาม",
    navLabelTh: key,
    asOf: "2026-11-01",
    minutes: 1,
    blocks: [],
    factIds: [],
    og: { headlineTh: `หัวข้อ ${key}` },
    ...extra,
  };
}

function guide(status: "draft" | "live"): CareerGuide {
  return {
    meta: {
      slug: "cybersecurity",
      alias: "cyber",
      nameTh: "ไซเบอร์",
      nameEn: "Cyber",
      accent: "#5cff5c",
      status,
      asOf: "2026-11-11",
      intentPathSlug: "interested",
      pages: [
        { key: "doors", order: 2, titleTh: "ด่าน doors", navLabelTh: "doors", minutes: 1 },
        { key: "mythos", order: 1, titleTh: "ด่าน mythos", navLabelTh: "mythos", minutes: 1 },
      ],
    },
    pages: [page("doors", 2), page("mythos", 1)],
    facts: [],
    banned: [],
  };
}

describe("hrefs", () => {
  it("builds cover, level and deck paths", () => {
    expect(coverHref("cybersecurity")).toBe("/radar/cybersecurity");
    expect(levelHref("cybersecurity", "money")).toBe("/radar/cybersecurity/money");
    expect(deckHref("cybersecurity")).toBe("/radar/cybersecurity?view=deck");
    expect(firstLevelKey(guide("live").meta)).toBe("mythos");
    expect(firstLevelKey({ pages: [] })).toBeNull();
  });
});

describe("shouldShowGuideCover", () => {
  it("shows the cover for a guide career", () => {
    expect(shouldShowGuideCover({ hasGuide: true })).toBe(true);
    expect(shouldShowGuideCover({ hasGuide: true, from: "ig", view: undefined })).toBe(true);
  });
  it("keeps the deck for ?from=plan and ?view=deck", () => {
    expect(shouldShowGuideCover({ hasGuide: true, from: "plan" })).toBe(false);
    expect(shouldShowGuideCover({ hasGuide: true, view: "deck" })).toBe(false);
    expect(shouldShowGuideCover({ hasGuide: true, view: ["deck", "x"] })).toBe(false);
  });
  it("keeps the deck for careers without a guide", () => {
    expect(shouldShowGuideCover({ hasGuide: false })).toBe(false);
  });
});

describe("metadata", () => {
  it("level: absolute title, no dashes, canonical is the level path", () => {
    const md = guidePageMetadata(guide("live").meta, page("money", 6, { titleTh: "เงินเดือนจริงในไทย" }));
    expect(md.title).toEqual({ absolute: "เงินเดือนจริงในไทย | ไซเบอร์ | Career Radar" });
    expect(md.alternates?.canonical).toBe("/radar/cybersecurity/money");
    expect(JSON.stringify(md)).not.toMatch(DASH);
  });

  it("cover: absolute title with the level count, canonical is the cover", () => {
    const g = guide("live");
    const md = guideCoverMetadata(g.meta, guideHookTh(g));
    expect(md.title).toEqual({ absolute: "ไซเบอร์ ลองเล่น 2 ด่าน | Career Radar" });
    expect(md.description).toBe("หัวข้อ mythos");
    expect(md.alternates?.canonical).toBe("/radar/cybersecurity");
    expect(JSON.stringify(md)).not.toMatch(DASH);
  });
});

describe("guideSitemapEntries", () => {
  it("lists the cover and every level in order, with lastModified from asOf", () => {
    const entries = guideSitemapEntries([guide("live")], "https://x.org", "production");
    expect(entries.map((e) => e.url)).toEqual([
      "https://x.org/radar/cybersecurity",
      "https://x.org/radar/cybersecurity/mythos",
      "https://x.org/radar/cybersecurity/doors",
    ]);
    expect((entries[1].lastModified as Date).toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("leaves draft guides out on production only", () => {
    expect(guideSitemapEntries([guide("draft")], "https://x.org", "production")).toEqual([]);
    expect(guideSitemapEntries([guide("draft")], "https://x.org", "preview")).toHaveLength(3);
  });
});

describe("guide-format", () => {
  it("formats Thai dates from parts", () => {
    expect(formatThaiDay("2026-11-11")).toBe("11 พ.ย. 2569");
    expect(formatThaiDay("2026-04")).toBe("เม.ย. 2569");
    expect(formatThaiDay("nope")).toBeNull();
    expect(asOfLabel("2026-11-11")).toBe("ข้อมูล ณ 11 พ.ย. 2569");
  });

  it("rounds minutes up and labels what is left", () => {
    expect(roundMinutes(5.5)).toBe(6);
    expect(roundMinutes(0.2)).toBe(1);
    expect(roundMinutes(0)).toBe(0);
    expect(minutesLeftLabel(6)).toBe("เหลือราว 6 นาที");
    expect(minutesLeftLabel(0)).toBe("ด่านสุดท้ายแล้ว");
    expect(levelLabel(3, 11)).toBe("LV 3/11");
  });
});
