import { GUIDE_INDEX, guidePageKeys } from "@/lib/radar-guides";
import {
  RADAR_LINK_ALIASES,
  guidePageForToken,
  normalizeShortCode,
  prefixSplits,
  resolveShortLink,
  slugForAlias,
  splitShortCode,
  type ShortLinkDeps,
  type ShortLinkRow,
} from "../short-links";

const PUBLISHED = new Set(Object.values(RADAR_LINK_ALIASES));
const CYBER_PAGES = guidePageKeys("cybersecurity")!;

/** Live guide pages per slug: cybersecurity from code, plus test-only pages. */
function livePages(extra: Record<string, readonly string[]> = {}) {
  return (slug: string) => extra[slug] ?? (slug === "cybersecurity" ? CYBER_PAGES : null);
}

function deps(
  rows: ShortLinkRow[] = [],
  published: Set<string> = PUBLISHED,
  pagesFor: (slug: string) => readonly string[] | null = livePages()
): ShortLinkDeps & {
  lookup: jest.Mock;
  isPublishedSlug: jest.Mock;
} {
  return {
    lookup: jest.fn(async (code: string) => rows.find((row) => row.code === code) ?? null),
    isPublishedSlug: jest.fn(async (slug: string) => published.has(slug)),
    pagesFor,
  };
}

const reelRow: ShortLinkRow = {
  code: "cyber-money-k3f9",
  field_slug: "cybersecurity",
  chapter_key: "money",
  utm_source: "ig-comment-dm",
  utm_medium: "dm",
  utm_campaign: "radar",
  utm_content: "cybersecurity-founder-DA1b2C3",
  is_active: true,
};

describe("resolveShortLink", () => {
  it("resolves a radar_links row to the guide page, with the row's utm tags", async () => {
    const result = await resolveShortLink("cyber-money-k3f9", deps([reelRow]));
    expect(result).toMatchObject({ kind: "link", logCode: "cyber-money-k3f9", fieldSlug: "cybersecurity", pageKey: "money" });
    expect(result.path).toBe(
      "/radar/cybersecurity/money?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-founder-DA1b2C3"
    );
  });

  it("maps a legacy chapter row through the page's legacyHashes", async () => {
    const legacy = { ...reelRow, code: "cyber-hook-a1b2", chapter_key: "hook" };
    const result = await resolveShortLink("cyber-hook-a1b2", deps([legacy]));
    expect(result.pageKey).toBe(CYBER_PAGES[0]);
    expect(result.path.startsWith(`/radar/cybersecurity/${CYBER_PAGES[0]}?`)).toBe(true);
  });

  it("lands on the career without a page when the guide is not visible here", async () => {
    const result = await resolveShortLink("cyber-money-k3f9", deps([reelRow], PUBLISHED, () => null));
    expect(result.pageKey).toBe("money");
    expect(result.path).toBe(
      "/radar/cybersecurity?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-founder-DA1b2C3"
    );
  });

  it("gives a deck career no page and no hash", async () => {
    const row = { ...reelRow, code: "data-money-x1y2", field_slug: "data-scientist", chapter_key: "money" };
    const result = await resolveShortLink("data-money-x1y2", deps([row]));
    expect(result).toMatchObject({ fieldSlug: "data-scientist", pageKey: null });
    expect(result.path).toBe(
      "/radar/data-scientist?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-founder-DA1b2C3"
    );
  });

  it("resolves the seeded bio rows to the hub", async () => {
    const ig: ShortLinkRow = {
      code: "ig",
      field_slug: null,
      chapter_key: null,
      utm_source: "ig-bio",
      utm_medium: "bio",
      utm_campaign: "radar",
      utm_content: "hub-bio",
      is_active: true,
    };
    const result = await resolveShortLink("ig", deps([ig]));
    expect(result.path).toBe("/radar?utm_source=ig-bio&utm_medium=bio&utm_campaign=radar&utm_content=hub-bio");
  });

  it("sends a row for an unpublished career to the hub with the row's tags", async () => {
    const result = await resolveShortLink("cyber-money-k3f9", deps([reelRow], new Set()));
    expect(result.fieldSlug).toBeNull();
    expect(result.path.startsWith("/radar?utm_source=ig-comment-dm&utm_medium=dm")).toBe(true);
    expect(result.path).not.toContain("#");
  });

  it("drops an unknown page key from a row", async () => {
    const result = await resolveShortLink("x-row", deps([{ ...reelRow, code: "x-row", chapter_key: "evil" }]));
    expect(result.pageKey).toBeNull();
    expect(result.path.startsWith("/radar/cybersecurity?")).toBe(true);
    expect(result.path).not.toContain("#");
  });

  it("maps cyber-mythos to the guide page as a TikTok alias", async () => {
    const result = await resolveShortLink("cyber-mythos", deps());
    expect(result).toMatchObject({ kind: "alias", fieldSlug: "cybersecurity", pageKey: "mythos", logCode: "cyber-mythos" });
    expect(result.path).toBe(
      "/radar/cybersecurity/mythos?utm_source=tiktok-alias&utm_medium=alias&utm_campaign=radar&utm_content=cybersecurity-mythos-alias"
    );
  });

  it("maps cyber-mythos-tt to the page with the TikTok bio channel", async () => {
    const result = await resolveShortLink("cyber-mythos-tt", deps());
    expect(result).toMatchObject({ fieldSlug: "cybersecurity", pageKey: "mythos" });
    expect(result.utm).toMatchObject({ source: "tiktok-bio", medium: "bio", content: "cybersecurity-mythos-tt" });
    expect(result.path.startsWith("/radar/cybersecurity/mythos?utm_source=tiktok-bio")).toBe(true);
  });

  it("sends cyber-nope to the career, not the hub", async () => {
    const result = await resolveShortLink("cyber-nope", deps());
    expect(result).toMatchObject({ kind: "alias", fieldSlug: "cybersecurity", pageKey: null, logCode: "cyber-nope" });
    expect(result.path).toBe(
      "/radar/cybersecurity?utm_source=tiktok-alias&utm_medium=alias&utm_campaign=radar&utm_content=cybersecurity-alias"
    );
  });

  it("sends data-proof to the deck career, with no page", async () => {
    const result = await resolveShortLink("data-proof", deps());
    expect(result).toMatchObject({ fieldSlug: "data-scientist", pageKey: null });
    expect(result.path.startsWith("/radar/data-scientist?")).toBe(true);
  });

  it("parses the longest known prefix first", async () => {
    const d = deps([], PUBLISHED, livePages({ "ai-engineer": ["agents"] }));
    const long = await resolveShortLink("ai-engineer-agents", d);
    expect(long).toMatchObject({ kind: "slug", fieldSlug: "ai-engineer", pageKey: "agents" });
    expect(long.path.startsWith("/radar/ai-engineer/agents?")).toBe(true);
    const short = await resolveShortLink("ai-agents", d);
    expect(short).toMatchObject({ kind: "alias", fieldSlug: "ai-engineer", pageKey: "agents" });
  });

  it("maps every page of every code guide through its alias", async () => {
    for (const guide of Object.values(GUIDE_INDEX)) {
      for (const page of guide.pages) {
        const result = await resolveShortLink(`${guide.alias}-${page.key.replace(/_/g, "-")}`, deps());
        expect(result.pageKey).toBe(page.key);
      }
    }
  });

  it("keeps the channel suffix ahead of a page named like one", async () => {
    const result = await resolveShortLink("cyber-story", deps());
    expect(result).toMatchObject({ fieldSlug: "cybersecurity", pageKey: null });
    expect(result.utm.source).toBe("ig-story");
  });

  it("ignores an inactive row and falls through to aliases", async () => {
    const d = deps([{ ...reelRow, code: "cyber", is_active: false }]);
    const result = await resolveShortLink("cyber", d);
    expect(result.kind).toBe("alias");
  });

  it("maps cyber-tt to cybersecurity with tiktok-bio", async () => {
    const result = await resolveShortLink("cyber-tt", deps());
    expect(result).toMatchObject({ kind: "alias", fieldSlug: "cybersecurity", logCode: "cyber-tt" });
    expect(result.utm).toMatchObject({ source: "tiktok-bio", medium: "bio", content: "cybersecurity-tt" });
    expect(result.path).toBe(
      "/radar/cybersecurity?utm_source=tiktok-bio&utm_medium=bio&utm_campaign=radar&utm_content=cybersecurity-tt"
    );
  });

  it("counts cyber-card (the profile card link) as a share on the cover", async () => {
    const result = await resolveShortLink("cyber-card", deps());
    expect(result).toMatchObject({ kind: "alias", fieldSlug: "cybersecurity", pageKey: null });
    expect(result.utm).toMatchObject({ source: "share", medium: "share", content: "cybersecurity-card" });
    expect(result.path).toBe(
      "/radar/cybersecurity?utm_source=share&utm_medium=share&utm_campaign=radar&utm_content=cybersecurity-card"
    );
  });

  it("maps a bare alias to tiktok-alias", async () => {
    const result = await resolveShortLink("cyber", deps());
    expect(result.utm).toMatchObject({ source: "tiktok-alias", medium: "alias", content: "cybersecurity-alias" });
    expect(result.fieldSlug).toBe("cybersecurity");
  });

  it.each([
    ["ai-ig", "ai-engineer", "ig-bio", "bio"],
    ["data-yt", "data-scientist", "yt-bio", "bio"],
    ["dev-story", "software-engineer", "ig-story", "story"],
  ])("maps %s", async (code, slug, source, medium) => {
    const result = await resolveShortLink(code, deps());
    expect(result.fieldSlug).toBe(slug);
    expect(result.utm).toMatchObject({ source, medium });
  });

  it("accepts a published slug directly, bare or with a suffix", async () => {
    expect((await resolveShortLink("data-scientist", deps())).path).toBe(
      "/radar/data-scientist?utm_source=tiktok-alias&utm_medium=alias&utm_campaign=radar&utm_content=data-scientist-alias"
    );
    const story = await resolveShortLink("software-engineer-story", deps());
    expect(story).toMatchObject({ kind: "slug", fieldSlug: "software-engineer" });
    expect(story.utm.source).toBe("ig-story");
  });

  it("sends an unpublished slug to the hub", async () => {
    const result = await resolveShortLink("secret-career", deps());
    expect(result.fieldSlug).toBeNull();
    expect(result.path).toBe("/radar?utm_source=shortlink&utm_medium=unknown&utm_campaign=radar");
  });

  it("sends an alias whose career is unpublished to the hub, keeping its channel", async () => {
    const result = await resolveShortLink("cyber-tt", deps([], new Set()));
    expect(result.fieldSlug).toBeNull();
    expect(result.utm.source).toBe("tiktok-bio");
  });

  it("sends an unknown code to the hub tagged shortlink", async () => {
    const result = await resolveShortLink("zzz", deps());
    expect(result).toMatchObject({ kind: "fallback", logCode: "zzz", fieldSlug: null });
    expect(result.path).toBe("/radar?utm_source=shortlink&utm_medium=unknown&utm_campaign=radar");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "%2F%2Fevil.example",
    "cyber/../../x",
    "เรดาร์",
    "",
    "a".repeat(200),
  ])("never leaves the site for %p", async (code) => {
    const d = deps();
    const result = await resolveShortLink(code, d);
    expect(result.path.startsWith("/radar")).toBe(true);
    expect(result.kind).toBe("fallback");
    expect(result.logCode).toBe("invalid");
    expect(d.lookup).not.toHaveBeenCalled();
  });

  it("is case and slash insensitive", async () => {
    expect((await resolveShortLink("Cyber-TT/", deps())).fieldSlug).toBe("cybersecurity");
  });

  it("never puts a row's odd values into the URL", async () => {
    const result = await resolveShortLink(
      "odd",
      deps([{ ...reelRow, code: "odd", utm_content: "x y", field_slug: "../admin" }])
    );
    expect(result.path).toBe("/radar?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar");
  });
});

describe("prefixSplits, slugForAlias and guidePageForToken", () => {
  it("lists prefixes longest first", () => {
    expect(prefixSplits("ai-engineer-agents")).toEqual([
      { prefix: "ai-engineer-agents", rest: null },
      { prefix: "ai-engineer", rest: "agents" },
      { prefix: "ai", rest: "engineer-agents" },
    ]);
  });

  it("knows the deck aliases and each code guide's alias", () => {
    expect(slugForAlias("dev")).toBe("software-engineer");
    for (const guide of Object.values(GUIDE_INDEX)) expect(slugForAlias(guide.alias)).toBe(guide.slug);
    expect(slugForAlias("toString")).toBeNull();
  });

  it("reads typed dashes as underscores and legacy chapters as pages", () => {
    expect(guidePageForToken("cybersecurity", "money")).toBe("money");
    expect(guidePageForToken("cybersecurity", "reality")).toBe("triage");
    expect(guidePageForToken("cybersecurity", "Mythos-1")).toBeNull();
    expect(guidePageForToken("data-scientist", "money")).toBeNull();
    expect(guidePageForToken("x", "first-job", ["first_job"])).toBe("first_job");
  });
});

describe("normalizeShortCode and splitShortCode", () => {
  it("normalises", () => {
    expect(normalizeShortCode(" CYBER ")).toBe("cyber");
    expect(normalizeShortCode("-cyber")).toBeNull();
    expect(normalizeShortCode(undefined)).toBeNull();
  });

  it("splits only a known suffix", () => {
    expect(splitShortCode("cyber-tt")).toEqual({ base: "cyber", suffix: "tt" });
    expect(splitShortCode("cyber-money-k3f9")).toEqual({ base: "cyber-money-k3f9", suffix: null });
    expect(splitShortCode("-tt")).toEqual({ base: "-tt", suffix: null });
  });
});
