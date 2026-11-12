import {
  RADAR_SOURCES,
  buildRadarUrl,
  isRadarUtmSource,
  radarChannel,
  radarMediumFor,
  radarUtmContent,
  sanitizeUtmToken,
} from "../utm";
import channelCases from "../__fixtures__/radar-channel-cases.json";
import type { UaApp } from "../types";

describe("RADAR_SOURCES", () => {
  it("maps every source to a medium that passes the SQL token check", () => {
    for (const [source, medium] of Object.entries(RADAR_SOURCES)) {
      expect(sanitizeUtmToken(source)).toBe(source);
      expect(sanitizeUtmToken(medium)).toBe(medium);
    }
    expect(radarMediumFor("ig-comment-dm")).toBe("dm");
    expect(isRadarUtmSource("tiktok-alias")).toBe(true);
    expect(isRadarUtmSource("toString")).toBe(false);
  });
});

describe("sanitizeUtmToken", () => {
  it("lowercases case-insensitive tokens", () => {
    expect(sanitizeUtmToken("IG-Bio")).toBe("ig-bio");
  });

  it("keeps case for case-sensitive tokens", () => {
    expect(sanitizeUtmToken("cybersecurity-founder-DA1b2C3", true)).toBe("cybersecurity-founder-DA1b2C3");
  });

  it.each([
    ["spaces", "ig bio"],
    ["Thai text", "ไอจี"],
    ["a leading dash", "-ig"],
    ["empty", ""],
    ["a URL", "https://evil.example"],
  ])("rejects %s", (_label, value) => {
    expect(sanitizeUtmToken(value)).toBeNull();
    expect(sanitizeUtmToken(value, true)).toBeNull();
  });

  it("rejects overly long values (64 case-insensitive, 100 case-sensitive)", () => {
    expect(sanitizeUtmToken("a".repeat(64))).toBe("a".repeat(64));
    expect(sanitizeUtmToken("a".repeat(65))).toBeNull();
    expect(sanitizeUtmToken("A".repeat(100), true)).toBe("A".repeat(100));
    expect(sanitizeUtmToken("A".repeat(101), true)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(sanitizeUtmToken(null)).toBeNull();
    expect(sanitizeUtmToken(42)).toBeNull();
  });
});

describe("radarUtmContent", () => {
  it("builds <slug|hub>-<kind>-<shortcode|x>", () => {
    expect(radarUtmContent({ slug: "cybersecurity", kind: "founder", shortcode: "DA1b2C3" })).toBe(
      "cybersecurity-founder-DA1b2C3"
    );
    expect(radarUtmContent({ slug: null, kind: "motion", shortcode: null })).toBe("hub-motion-x");
  });

  it("adds the guide page after the slug, never for the hub", () => {
    expect(radarUtmContent({ slug: "cybersecurity", page: "mythos", kind: "founder", shortcode: "DA1b2C3" })).toBe(
      "cybersecurity-mythos-founder-DA1b2C3"
    );
    expect(radarUtmContent({ slug: "cybersecurity", page: "triage", kind: "demo", shortcode: null })).toBe(
      "cybersecurity-triage-demo-x"
    );
    expect(radarUtmContent({ slug: null, page: "mythos", kind: "motion", shortcode: null })).toBe("hub-motion-x");
    expect(radarUtmContent({ slug: "cybersecurity", page: "Bad-Page", kind: "motion", shortcode: null })).toBe(
      "cybersecurity-motion-x"
    );
  });

  it("sanitizes the shortcode and caps the length", () => {
    expect(radarUtmContent({ slug: "data-scientist", kind: "founder", shortcode: "ab c/ไทย" })).toBe(
      "data-scientist-founder-abc"
    );
    expect(radarUtmContent({ slug: "ai-engineer", kind: "motion", shortcode: "Z".repeat(200) })).toHaveLength(100);
    expect(radarUtmContent({ slug: "Bad Slug", kind: "founder", shortcode: null })).toBe("hub-founder-x");
  });
});

describe("buildRadarUrl", () => {
  it("writes utm params in a fixed order and the chapter hash last", () => {
    expect(
      buildRadarUrl({
        slug: "cybersecurity",
        utm: { source: "ig-comment-dm", medium: "dm", content: "cybersecurity-founder-DA1b2C3" },
        hash: "money",
      })
    ).toBe(
      "https://passionseed.org/radar/cybersecurity?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-founder-DA1b2C3#money"
    );
  });

  it("builds a guide page path with params in order and no hash", () => {
    expect(
      buildRadarUrl({
        slug: "cybersecurity",
        page: "mythos",
        utm: { source: "ig-comment-dm", medium: "dm", content: "cybersecurity-mythos-founder-DA1b2C3" },
        hash: "money",
      })
    ).toBe(
      "https://passionseed.org/radar/cybersecurity/mythos?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-mythos-founder-DA1b2C3"
    );
    expect(buildRadarUrl({ slug: "cybersecurity", page: "first_job", origin: "" })).toBe("/radar/cybersecurity/first_job");
  });

  it("throws on an invalid page, or a page without a career", () => {
    expect(() => buildRadarUrl({ slug: "cybersecurity", page: "Mythos-1" })).toThrow();
    expect(() => buildRadarUrl({ slug: "cybersecurity", page: "../admin" })).toThrow();
    expect(() => buildRadarUrl({ slug: null, page: "mythos" })).toThrow();
  });

  it("builds hub links and plain links", () => {
    expect(buildRadarUrl({ slug: null, utm: { source: "tiktok-bio", medium: "bio" } })).toBe(
      "https://passionseed.org/radar?utm_source=tiktok-bio&utm_medium=bio&utm_campaign=radar"
    );
    expect(buildRadarUrl({ slug: "ai-engineer" })).toBe("https://passionseed.org/radar/ai-engineer");
  });

  it("drops invalid tokens and hashes and honours the origin", () => {
    expect(
      buildRadarUrl({
        slug: "data-scientist",
        utm: { source: "share", medium: "share", campaign: "bad campaign", content: "-x" },
        hash: "../evil",
        origin: "http://localhost:3000/",
      })
    ).toBe("http://localhost:3000/radar/data-scientist?utm_source=share&utm_medium=share");
  });

  it("only ever writes utm parameters (no username or user id fields)", () => {
    const url = new URL(
      buildRadarUrl({
        slug: "cybersecurity",
        utm: { source: "ig-comment-dm", medium: "dm", content: "x1", username: "someone" } as never,
      })
    );
    expect([...url.searchParams.keys()]).toEqual(["utm_source", "utm_medium", "utm_campaign", "utm_content"]);
  });

  it("throws on an invalid slug", () => {
    expect(() => buildRadarUrl({ slug: "../admin" })).toThrow();
  });
});

describe("radarChannel mirrors public.radar_channel", () => {
  // The same table can be checked against SQL:
  //   SELECT public.radar_channel(utm_source, referrer_host, ua_app) FROM (VALUES ...) t(...)
  it.each(channelCases as Array<{ utm_source: string | null; referrer_host: string | null; ua_app: UaApp | null; expected: string }>)(
    "%o",
    ({ utm_source, referrer_host, ua_app, expected }) => {
      expect(radarChannel({ utmSource: utm_source, referrerHost: referrer_host, uaApp: ua_app })).toBe(expected);
    }
  );
});
