import { guidePageError, LinkUpsertBody, parseReelInput, ReelUpsertBody } from "../admin-social";

describe("parseReelInput", () => {
  test("Instagram reel, post and profile-scoped links normalise to one permalink", () => {
    const expected = { platform: "instagram", shortcode: "DA1b2C3d4", permalink: "https://www.instagram.com/reel/DA1b2C3d4/" };
    expect(parseReelInput("https://www.instagram.com/reel/DA1b2C3d4/?igsh=abc")).toEqual(expected);
    expect(parseReelInput("instagram.com/p/DA1b2C3d4")).toEqual(expected);
    expect(parseReelInput("https://www.instagram.com/passion_seed.th/reel/DA1b2C3d4/")).toEqual(expected);
    expect(parseReelInput("DA1b2C3d4")).toEqual(expected);
  });

  test("TikTok and YouTube links", () => {
    expect(parseReelInput("https://www.tiktok.com/@passionseed/video/7412345678901234567?lang=th")).toEqual({
      platform: "tiktok",
      shortcode: "7412345678901234567",
      permalink: "https://www.tiktok.com/@passionseed/video/7412345678901234567",
    });
    expect(parseReelInput("https://youtube.com/shorts/abcDEF12345")).toMatchObject({ platform: "youtube", shortcode: "abcDEF12345" });
    expect(parseReelInput("https://youtu.be/abcDEF12345")).toMatchObject({
      permalink: "https://www.youtube.com/shorts/abcDEF12345",
    });
  });

  test("rejects short links and other hosts", () => {
    expect(parseReelInput("https://vm.tiktok.com/ZSabc/")).toBeNull();
    expect(parseReelInput("https://evil.example/reel/DA1b2C3d4/")).toBeNull();
    expect(parseReelInput("")).toBeNull();
  });
});

describe("ReelUpsertBody", () => {
  const base = { platform: "instagram", mediaId: "17900000000000001", shortcode: "DA1b2C3d4" };

  test("refuses a career mapping without a short label", () => {
    const result = ReelUpsertBody.safeParse({ ...base, fieldSlug: "cybersecurity", pageKey: "money" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.flatten().fieldErrors.careerLabelTh).toBeDefined();
  });

  test("accepts a labelled career reel and a hub reel without a label", () => {
    expect(ReelUpsertBody.safeParse({ ...base, fieldSlug: "cybersecurity", careerLabelTh: "ไซเบอร์" }).success).toBe(true);
    expect(ReelUpsertBody.safeParse({ ...base, fieldSlug: null }).success).toBe(true);
  });

  test("maps a reel to a page of the career's guide, and a demo reel", () => {
    const parsed = ReelUpsertBody.safeParse({
      ...base,
      fieldSlug: "cybersecurity",
      careerLabelTh: "ไซเบอร์",
      pageKey: "triage",
      videoKind: "demo",
    });
    expect(parsed.success && parsed.data).toMatchObject({ pageKey: "triage", videoKind: "demo" });
  });

  test("rejects a page that is not in the guide, and any page on a deck career", () => {
    const labelled = { ...base, fieldSlug: "cybersecurity", careerLabelTh: "ไซเบอร์" };
    const notInGuide = ReelUpsertBody.safeParse({ ...labelled, pageKey: "nope" });
    expect(notInGuide.success).toBe(false);
    if (!notInGuide.success) expect(notInGuide.error.flatten().fieldErrors.pageKey).toBeDefined();
    expect(ReelUpsertBody.safeParse({ ...labelled, pageKey: "Mythos" }).success).toBe(false);
    expect(
      ReelUpsertBody.safeParse({ ...labelled, fieldSlug: "data-scientist", careerLabelTh: "ดาต้า", pageKey: "money" }).success
    ).toBe(false);
    expect(
      ReelUpsertBody.safeParse({ ...labelled, fieldSlug: "data-scientist", careerLabelTh: "ดาต้า", pageKey: null }).success
    ).toBe(true);
  });

  test("refuses dashes in the label, a page on a hub reel, and an IG reel with no id", () => {
    expect(ReelUpsertBody.safeParse({ ...base, fieldSlug: "cybersecurity", careerLabelTh: "ไซ—เบอร์" }).success).toBe(false);
    expect(ReelUpsertBody.safeParse({ ...base, fieldSlug: null, pageKey: "money" }).success).toBe(false);
    expect(ReelUpsertBody.safeParse({ platform: "instagram", fieldSlug: null }).success).toBe(false);
  });
});

describe("LinkUpsertBody", () => {
  test("keeps bio and shared DM codes on the hub", () => {
    for (const code of ["ig", "tt", "hub-ig"]) {
      expect(
        LinkUpsertBody.safeParse({ code, fieldSlug: "cybersecurity", utmSource: "ig-bio", utmMedium: "bio" }).success
      ).toBe(false);
    }
    expect(LinkUpsertBody.safeParse({ code: "ig", fieldSlug: null, utmSource: "ig-bio", utmMedium: "bio" }).success).toBe(true);
  });

  test("sanitises utm tokens and rejects Thai text or spaces", () => {
    const ok = LinkUpsertBody.safeParse({
      code: "Cyber-Story",
      fieldSlug: "cybersecurity",
      pageKey: "money",
      utmSource: "IG-Story",
      utmMedium: "story",
      utmContent: "cybersecurity-founder-x",
    });
    expect(ok.success && ok.data).toMatchObject({ code: "cyber-story", utmSource: "ig-story", utmCampaign: "radar" });
    expect(
      LinkUpsertBody.safeParse({ code: "cyber", fieldSlug: null, utmSource: "ไอจี", utmMedium: "bio" }).success
    ).toBe(false);
    expect(
      LinkUpsertBody.safeParse({ code: "a b", fieldSlug: null, utmSource: "ig-bio", utmMedium: "bio" }).success
    ).toBe(false);
  });
});

describe("LinkUpsertBody pages", () => {
  const link = { code: "cyber-tonight-tt", utmSource: "tiktok-alias", utmMedium: "alias" };

  test("validates the page against the guide and needs null for deck careers", () => {
    expect(LinkUpsertBody.safeParse({ ...link, fieldSlug: "cybersecurity", pageKey: "tonight" }).success).toBe(true);
    expect(LinkUpsertBody.safeParse({ ...link, fieldSlug: "cybersecurity", pageKey: "hook" }).success).toBe(false);
    expect(LinkUpsertBody.safeParse({ ...link, fieldSlug: "ai-engineer", pageKey: "tonight" }).success).toBe(false);
    expect(LinkUpsertBody.safeParse({ ...link, fieldSlug: null, pageKey: "tonight" }).success).toBe(false);
  });
});

describe("guidePageError", () => {
  test("uses the injected page list", () => {
    const pages = (slug: string) => (slug === "ai-engineer" ? ["agents"] : null);
    expect(guidePageError("ai-engineer", "agents", pages)).toBeNull();
    expect(guidePageError("ai-engineer", "money", pages)).toMatch(/not in this career/);
    expect(guidePageError("data-scientist", "money", pages)).toMatch(/no code guide/);
    expect(guidePageError("data-scientist", null, pages)).toBeNull();
    expect(guidePageError("data-scientist", "", pages)).toBeNull();
  });
});
