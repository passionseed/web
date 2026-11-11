jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));
// The registry pulls in guide content; the strip only needs clips.json.
jest.mock("@/lib/radar-guides/registry.server", () => ({ readClipManifest: jest.fn(() => ({})) }));

import { createAdminClient } from "@/utils/supabase/admin";
import { GUIDE_INDEX } from "@/lib/radar-guides";
import {
  getCachedRecentRadarReels,
  toRecentRadarReels,
  type RecentReelRow,
  type RecentReelsDeps,
} from "../recent-reels";

const FIELD = { id: "f-cyber", is_published: true };
const POSTER = "https://cdn.passionseed.org/radar/guide/cybersecurity/money.0123abcd.webp";
const MONEY_TITLE = GUIDE_INDEX.cybersecurity.pages.find((p) => p.key === "money")!.titleTh;

function reel(overrides: Partial<RecentReelRow> = {}): RecentReelRow {
  return {
    field_slug: "cybersecurity",
    chapter_key: "money",
    career_label_th: "Cyber",
    posted_at: "2026-11-10T10:00:00Z",
    created_at: "2026-11-10T09:00:00Z",
    radar_fields: FIELD,
    ...overrides,
  };
}

function deps(overrides: Partial<RecentReelsDeps> = {}): RecentReelsDeps {
  return {
    liveGuide: (slug) => (slug === "cybersecurity" ? { slug } : null),
    pageTitle: (slug, key) => GUIDE_INDEX[slug]?.pages.find((p) => p.key === key)?.titleTh ?? null,
    clips: () => ({ money: { posterUrl: POSTER } as never }),
    ...overrides,
  };
}

describe("toRecentRadarReels", () => {
  it("returns only public fields, with the page title from code and the poster from clips.json", () => {
    expect(toRecentRadarReels([reel()], deps())).toEqual([
      {
        fieldSlug: "cybersecurity",
        pageKey: "money",
        careerLabelTh: "Cyber",
        pageTitleTh: MONEY_TITLE,
        posterUrl: POSTER,
        postedAt: "2026-11-10T10:00:00Z",
        href: "/radar/cybersecurity/money",
      },
    ]);
  });

  it("has no poster until the page's clip is recorded", () => {
    const [tile] = toRecentRadarReels([reel({ chapter_key: "triage" })], deps());
    expect(tile).toMatchObject({ pageKey: "triage", posterUrl: null, href: "/radar/cybersecurity/triage" });
  });

  it("links to the career when the guide is not visible here, or the page is unknown", () => {
    const [hidden] = toRecentRadarReels([reel()], deps({ liveGuide: () => null }));
    expect(hidden).toMatchObject({ pageKey: null, pageTitleTh: null, posterUrl: null, href: "/radar/cybersecurity" });
    const [legacy] = toRecentRadarReels([reel({ chapter_key: "hook" })], deps());
    expect(legacy).toMatchObject({ pageKey: null, href: "/radar/cybersecurity" });
  });

  it("drops unpublished careers, hub reels and unlabelled reels, and de-duplicates", () => {
    const result = toRecentRadarReels(
      [
        reel(),
        reel({ posted_at: "2026-11-09T00:00:00Z" }),
        reel({ field_slug: "secret", radar_fields: { id: "f2", is_published: false } }),
        reel({ field_slug: null, radar_fields: null }),
        reel({ career_label_th: null, chapter_key: "doors" }),
        reel({ chapter_key: "bogus" }),
      ],
      deps()
    );
    expect(result.map((r) => `${r.fieldSlug}#${r.pageKey}`)).toEqual(["cybersecurity#money", "cybersecurity#null"]);
  });

  it("keeps at most six tiles", () => {
    const reels = GUIDE_INDEX.cybersecurity.pages.map((p) => reel({ chapter_key: p.key }));
    expect(toRecentRadarReels(reels, deps())).toHaveLength(6);
  });

  it("refuses a poster from outside the CDN", () => {
    const [tile] = toRecentRadarReels(
      [reel()],
      deps({ clips: () => ({ money: { posterUrl: "https://evil.example/a.webp" } as never }) })
    );
    expect(tile.posterUrl).toBeNull();
  });
});

describe("getCachedRecentRadarReels", () => {
  it("returns an empty list instead of throwing", async () => {
    (createAdminClient as jest.Mock).mockImplementation(() => {
      throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
    });
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(getCachedRecentRadarReels()).resolves.toEqual([]);
    log.mockRestore();
  });
});
