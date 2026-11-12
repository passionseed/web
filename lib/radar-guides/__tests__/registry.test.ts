/**
 * Registry behaviour, independent of the real content: the cybersecurity guide
 * module is replaced by a small fixture, and its meta is pinned to draft.
 */
import type { CareerGuide } from "@/lib/radar-guide/guide-types";

jest.mock("server-only", () => ({}));
// Pinned to draft so the status rules are tested whatever the real meta says.
jest.mock("../cybersecurity/meta", () => {
  const actual = jest.requireActual("../cybersecurity/meta");
  return { ...actual, CYBERSECURITY_META: { ...actual.CYBERSECURITY_META, status: "draft" } };
});
jest.mock(
  "../cybersecurity/guide",
  () => {
    const { CYBERSECURITY_META } = jest.requireActual("../cybersecurity/meta");
    const pages = CYBERSECURITY_META.pages.map((p: { key: string; order: number; titleTh: string; navLabelTh: string; minutes: number; legacyHashes?: string[] }) => ({
      ...p,
      questionTh: "คำถาม",
      asOf: "2026-11-11",
      factIds: ["f.fixture"],
      og: { headlineTh: p.titleTh },
      blocks:
        p.key === "mythos"
          ? [
              { kind: "dialogue", id: "intro", lines: [{ speaker: "host", text: { th: "สวัสดี" } }] },
              {
                kind: "game",
                id: "find",
                game: { engine: "FlipCards", data: { highlightTh: "x", cards: [] } },
                track: { done: "mythos:find-done", value: "attempts" },
                answersTh: ["บรรทัด 5"],
              },
              { kind: "clip", id: "clip" },
            ]
          : [],
      clip:
        p.key === "mythos"
          ? { seconds: 20, hookTh: "ฮุก", scriptLinesTh: ["หนึ่ง"], required: true, safety: false, factIds: [] }
          : undefined,
      reel:
        p.key === "money"
          ? { format: "founder", hook: { th: "เงินเดือน" }, variantsTh: ["ก", "ข"], sendToFriendTh: "ส่ง", visual: [] }
          : undefined,
    }));
    return {
      cybersecurityGuide: {
        meta: { ...CYBERSECURITY_META, status: "draft" },
        pages,
        facts: [
          {
            id: "f.fixture",
            claimEn: "fixture",
            sources: [{ outlet: "X", url: "https://example.org", publishedAt: "2026-11-01" }],
            asOf: "2026-11-11",
            badge: "confirmed",
          },
        ],
        banned: [],
      },
    };
  }
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const registry = require("@/lib/radar-guides/registry.server") as typeof import("@/lib/radar-guides/registry.server");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const index = require("@/lib/radar-guides") as typeof import("@/lib/radar-guides");

describe("radar guide registry", () => {
  it("lists every page of visible guides, and drafts only off production", () => {
    const params = registry.guideStaticParams("preview");
    expect(params[0]).toEqual({ slug: "cybersecurity", page: "mythos" });
    expect(params).toHaveLength(11);
    expect(registry.guideStaticParams("production")).toEqual([]); // cybersecurity is a draft
    expect(registry.liveGuideSlugs("development")).toEqual(["cybersecurity"]);
  });

  it("returns null for an unknown slug or page, and for drafts on production", () => {
    expect(registry.loadGuidePage("cybersecurity", "nope", "preview")).toBeNull();
    expect(registry.loadGuidePage("software-engineer", "mythos", "preview")).toBeNull();
    expect(registry.loadGuidePage("cybersecurity", "mythos", "production")).toBeNull();
  });

  it("loads a page with derived index, facts and a clip slot without media", () => {
    const hit = registry.loadGuidePage("cybersecurity", "mythos", "preview");
    expect(hit?.page.key).toBe("mythos");
    expect(hit?.facts.map((f) => f.id)).toEqual(["f.fixture"]);
    expect(hit?.clip?.media).toBeNull(); // clips.json not recorded yet: cutscene falls back to the host
    const mythos = hit?.index.pages.find((p) => p.key === "mythos");
    expect(mythos).toMatchObject({ games: 1, cutscene: true });
    expect(hit?.index.pages.find((p) => p.key === "doors")).toMatchObject({ games: 0, cutscene: false });
  });

  it("lists reel plans per page", () => {
    expect(registry.listGuideReelPlans()).toEqual([
      { slug: "cybersecurity", pageKey: "money", format: "founder", hookTh: "เงินเดือน", variantsTh: ["ก", "ข"] },
    ]);
  });

  it("never reads files outside the guide folder", () => {
    expect(registry.readGuideFile("cybersecurity", "../../../package.json")).toBeNull();
    expect(registry.readClipManifest("no-such-guide")).toEqual({});
  });

  it("answers light index questions without content", () => {
    expect(index.guidePageKeys("cybersecurity")?.slice(0, 3)).toEqual(["mythos", "doors", "triage"]);
    expect(index.guidePageKeys("software-engineer")).toBeNull();
    expect(index.isGuidePageKey("cybersecurity", "tcas")).toBe(true);
    expect(index.isGuidePageKey("cybersecurity", "toString")).toBe(false);
    expect(index.liveGuideIndex("constructor")).toBeNull();
    expect(index.liveGuideIndex("cybersecurity", "production")).toBeNull();
    expect(index.liveGuideIndex("cybersecurity", "preview")?.alias).toBe("cyber");
    expect(index.guideByAlias("cyber")?.slug).toBe("cybersecurity");
    expect(index.legacyHashPage("cybersecurity", "#reality")).toBe("triage");
    expect(index.legacyHashPage("cybersecurity", "#outro")).toBe("next");
    expect(index.legacyHashPage("cybersecurity", "#nope")).toBeNull();
  });
});

// Type-level check: the fixture shape is a CareerGuide.
export type _Check = CareerGuide;
