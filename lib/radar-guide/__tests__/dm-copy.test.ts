import {
  RADAR_DM_MAX_CHARS,
  RADAR_HUB_DM_LINK_CODE,
  RADAR_PUBLIC_REPLIES,
  RADAR_THREAD_REPLY,
  assertRadarCopy,
  buildRadarDm,
  buildRadarPublicReply,
  buildRadarQuickReplyPrompt,
  buildReelLinkCode,
  isRadarFixedTemplate,
  parseRadarQuickReplyPayload,
  radarLinkAlias,
  radarLinkRowForReel,
  radarQuickReplyPayload,
  radarShortUrl,
} from "../dm-copy";
import { GUIDE_INDEX } from "@/lib/radar-guides";
import { resolveShortLink } from "../short-links";
import { findDashes } from "../thai-copy";
import { RADAR_LINK_CODE_PATTERN } from "../types";
import { buildRadarUrl } from "../utm";

const CAREER = { fieldSlug: "cybersecurity", careerLabelTh: "ไซเบอร์", linkCode: "cyber-money-k3f9" };
const HUB = { fieldSlug: null, careerLabelTh: null, linkCode: RADAR_HUB_DM_LINK_CODE };

/** Seeded generator so link codes are reproducible. */
function seeded(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

describe("radarShortUrl", () => {
  it("builds the passionseed.org/r/<code> link", () => {
    expect(radarShortUrl("cyber-money-k3f9")).toBe("https://passionseed.org/r/cyber-money-k3f9");
    expect(radarShortUrl("hub-ig")).toBe("https://passionseed.org/r/hub-ig");
  });

  it("refuses a code the SQL CHECK would reject", () => {
    expect(() => radarShortUrl("Cyber")).toThrow();
    expect(() => radarShortUrl("-x")).toThrow();
    expect(() => radarShortUrl("a".repeat(33))).toThrow();
    expect(() => radarShortUrl("https://evil.com")).toThrow();
  });
});

describe("buildRadarDm", () => {
  it("uses the career template with the label and the short link", () => {
    const { message, link, variant } = buildRadarDm(CAREER);
    expect(variant).toBe("career");
    expect(link).toBe("https://passionseed.org/r/cyber-money-k3f9");
    expect(message).toContain("นี่คือลิงก์ Career Radar สาย ไซเบอร์ ที่ขอไว้");
    expect(message.split("\n")[1]).toBe(link);
    expect(message).toContain("@passion_seed.th");
  });

  it("uses the hub template and the shared hub-ig link for unmapped posts", () => {
    const { message, link, variant } = buildRadarDm(HUB);
    expect(variant).toBe("hub");
    expect(link).toBe("https://passionseed.org/r/hub-ig");
    expect(message).toContain("รวมทุกอาชีพที่เราทำไว้");
    expect(message).not.toContain("สาย ");
  });

  it("names the guide page from code, never from input text", () => {
    const { message } = buildRadarDm({ ...CAREER, pageKey: "money" });
    const title = GUIDE_INDEX.cybersecurity.pages.find((p) => p.key === "money")!.titleTh;
    expect(message.split("\n")[2]).toBe(`เริ่มที่ด่าน "${title}"`);
    expect(findDashes(message)).toEqual([]);
    expect(message.length).toBeLessThanOrEqual(RADAR_DM_MAX_CHARS);
    // Unknown pages and deck careers get the plain career DM.
    expect(buildRadarDm({ ...CAREER, pageKey: "nope" }).message).toBe(buildRadarDm(CAREER).message);
    expect(buildRadarDm({ ...CAREER, fieldSlug: "data-scientist", pageKey: "money" }).message).not.toContain("ด่าน");
  });

  it("keeps every page DM within the house rules", () => {
    for (const guide of Object.values(GUIDE_INDEX)) {
      for (const page of guide.pages) {
        const { message } = buildRadarDm({
          fieldSlug: guide.slug,
          careerLabelTh: "ไซเบอร์",
          linkCode: "cyber-x-k3f9",
          pageKey: page.key,
        });
        expect(findDashes(message)).toEqual([]);
        expect(message.length).toBeLessThanOrEqual(RADAR_DM_MAX_CHARS);
        expect(message).not.toMatch(/น้อง\s?ๆ|ทัก|แชท/);
        expect(isRadarFixedTemplate(message)).toBe(true);
      }
    }
  });

  it("requires a label for a career", () => {
    expect(() => buildRadarDm({ ...CAREER, careerLabelTh: null })).toThrow(/career_label_th/);
    expect(() => buildRadarDm({ ...CAREER, careerLabelTh: "  " })).toThrow(/career_label_th/);
  });

  it.each([
    ["career", CAREER],
    ["hub", HUB],
  ] as const)("keeps the %s DM within the house rules", (_name, input) => {
    const { message } = buildRadarDm(input);
    expect(findDashes(message)).toEqual([]);
    expect(message).not.toMatch(/[—–]/);
    expect(message.length).toBeLessThanOrEqual(RADAR_DM_MAX_CHARS);
    // One link, ours, short; no long tagged URL and nothing personal.
    expect(message.match(/https?:\/\//g)).toHaveLength(1);
    expect(message).not.toMatch(/utm_|igsid|username/i);
    // Never invites a private chat or uses น้องๆ.
    expect(message).not.toMatch(/ทัก|DM พี่|แชท|น้องๆ|ถามในนี้/);
  });
});

describe("radar link rows carry the utm tags", () => {
  const reel = {
    id: "11111111-1111-4111-8111-111111111111",
    fieldSlug: "cybersecurity",
    pageKey: "money",
    videoKind: "founder" as const,
    shortcode: "DA1b2C3dE",
  };

  it("builds a radar_links row tagged ig-comment-dm / dm / radar", () => {
    const row = radarLinkRowForReel(reel, seeded());
    expect(row).toMatchObject({
      field_slug: "cybersecurity",
      chapter_key: "money",
      reel_id: reel.id,
      utm_source: "ig-comment-dm",
      utm_medium: "dm",
      utm_campaign: "radar",
      utm_content: "cybersecurity-money-founder-DA1b2C3dE",
      is_active: true,
    });
    expect(row.code).toMatch(/^cyber-money-[a-z0-9]{4}$/);
  });

  it("tags demo reels and drops a page on a hub reel", () => {
    expect(radarLinkRowForReel({ ...reel, pageKey: "triage", videoKind: "demo" }, seeded()).utm_content).toBe(
      "cybersecurity-triage-demo-DA1b2C3dE"
    );
    const hub = radarLinkRowForReel({ ...reel, fieldSlug: null }, seeded());
    expect(hub).toMatchObject({ chapter_key: null, utm_content: "hub-founder-DA1b2C3dE" });
  });

  it("redirects to a tagged URL that lands on the guide page", async () => {
    const row = radarLinkRowForReel(reel, seeded());
    const url = buildRadarUrl({
      slug: row.field_slug,
      page: row.chapter_key,
      utm: { source: row.utm_source, medium: row.utm_medium, campaign: row.utm_campaign, content: row.utm_content },
    });
    expect(url).toBe(
      "https://passionseed.org/radar/cybersecurity/money?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-money-founder-DA1b2C3dE"
    );
    const resolved = await resolveShortLink(row.code, {
      lookup: async () => ({ ...row }),
      isPublishedSlug: async () => true,
      pagesFor: (slug) => (slug === "cybersecurity" ? GUIDE_INDEX.cybersecurity.pages.map((p) => p.key) : null),
    });
    expect(`https://passionseed.org${resolved.path}`).toBe(url);
  });
});

describe("buildReelLinkCode", () => {
  it("is alias-page-4 random chars and always passes the SQL CHECK", () => {
    const random = seeded(7);
    for (let i = 0; i < 200; i += 1) {
      const code = buildReelLinkCode({ slug: "data-scientist", pageKey: "start" }, random);
      expect(code).toMatch(RADAR_LINK_CODE_PATTERN);
      expect(code.length).toBeLessThanOrEqual(32);
      expect(code.startsWith("data-start-")).toBe(true);
    }
  });

  it("works without a page and for unknown slugs", () => {
    expect(buildReelLinkCode({ slug: "cybersecurity", pageKey: null }, seeded())).toMatch(/^cyber-[a-z0-9]{4}$/);
    expect(buildReelLinkCode({ slug: "ux-designer", pageKey: "ai" }, seeded())).toMatch(/^ux-ai-[a-z0-9]{4}$/);
    expect(
      buildReelLinkCode({ slug: "veryveryverylongcareername-x", pageKey: "reality" }, seeded())
    ).toMatch(RADAR_LINK_CODE_PATTERN);
    expect(buildReelLinkCode({ slug: "cybersecurity", pageKey: "a_very_long_page_key_for_testing_x" }, seeded())).toMatch(
      RADAR_LINK_CODE_PATTERN
    );
    expect(buildReelLinkCode({ slug: null, pageKey: "money" }, seeded())).toMatch(/^hub-[a-z0-9]{4}$/);
  });

  it("fits 32 chars and the SQL pattern for every alias and page in GUIDE_INDEX", () => {
    const random = seeded(3);
    for (const guide of Object.values(GUIDE_INDEX)) {
      for (const page of guide.pages) {
        const code = buildReelLinkCode({ slug: guide.slug, pageKey: page.key }, random);
        expect(code.length).toBeLessThanOrEqual(32);
        expect(code).toMatch(RADAR_LINK_CODE_PATTERN);
        expect(code.startsWith(`${guide.alias}-`)).toBe(true);
      }
    }
  });

  it("maps the pilot careers to their aliases", () => {
    expect(radarLinkAlias("cybersecurity")).toBe("cyber");
    expect(radarLinkAlias("ai-engineer")).toBe("ai");
    expect(radarLinkAlias("data-scientist")).toBe("data");
    expect(radarLinkAlias("software-engineer")).toBe("dev");
    expect(radarLinkAlias(null)).toBe("hub");
  });
});

describe("buildRadarPublicReply", () => {
  it("tags the commenter and picks a stable variant", () => {
    const reply = buildRadarPublicReply("mind.m5", "17900000000000001");
    expect(reply.startsWith("@mind.m5 ")).toBe(true);
    expect(RADAR_PUBLIC_REPLIES).toContain(reply.slice("@mind.m5 ".length));
    expect(buildRadarPublicReply("mind.m5", "17900000000000001")).toBe(reply);
  });

  it("uses all three variants across comments", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) seen.add(buildRadarPublicReply("a", `1790000000000${i}`));
    expect(seen.size).toBe(3);
  });

  it("strips a leading @ and works without a username", () => {
    expect(buildRadarPublicReply("@mind", "1").startsWith("@mind ")).toBe(true);
    expect(RADAR_PUBLIC_REPLIES).toContain(buildRadarPublicReply(null, "1"));
  });

  it("never carries a link, a dash or a chat invite", () => {
    for (const variant of RADAR_PUBLIC_REPLIES) {
      expect(findDashes(variant)).toEqual([]);
      expect(variant).not.toMatch(/https?:|ทัก|แชท|น้องๆ/);
    }
  });
});

describe("thread reply and quick-reply copy", () => {
  it("points to public comments and invites no chat", () => {
    expect(() => assertRadarCopy(RADAR_THREAD_REPLY)).not.toThrow();
    expect(RADAR_THREAD_REPLY).toContain("คอมเมนต์ไว้ใต้คลิป");
    expect(RADAR_THREAD_REPLY).not.toMatch(/ทักมาได้|แชท|https?:/);
  });

  it("round-trips the quick-reply payload and rejects anything else", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    expect(parseRadarQuickReplyPayload(radarQuickReplyPayload(id))).toBe(id);
    expect(parseRadarQuickReplyPayload("radar:not-a-uuid")).toBeNull();
    expect(parseRadarQuickReplyPayload("grade:m4")).toBeNull();
    expect(parseRadarQuickReplyPayload(null)).toBeNull();
  });

  it("builds a prompt with no link", () => {
    expect(buildRadarQuickReplyPrompt("ไซเบอร์")).toContain("สาย ไซเบอร์");
    expect(buildRadarQuickReplyPrompt(null)).not.toMatch(/https?:/);
  });

  it("rejects copy with a dash or over the length limit", () => {
    expect(() => assertRadarCopy("ลิงก์ — นี่")).toThrow(/dash/);
    expect(() => assertRadarCopy("ก".repeat(1001))).toThrow(/1000/);
    expect(() => assertRadarCopy("  ")).toThrow(/empty/);
  });
});

describe("isRadarFixedTemplate", () => {
  it("accepts every fixed template", () => {
    expect(isRadarFixedTemplate(buildRadarDm(CAREER).message)).toBe(true);
    expect(isRadarFixedTemplate(buildRadarDm({ ...CAREER, careerLabelTh: "Data Scientist" }).message)).toBe(true);
    expect(isRadarFixedTemplate(buildRadarDm(HUB).message)).toBe(true);
    expect(isRadarFixedTemplate(RADAR_THREAD_REPLY)).toBe(true);
    expect(isRadarFixedTemplate(buildRadarQuickReplyPrompt("ไซเบอร์"))).toBe(true);
    expect(isRadarFixedTemplate(buildRadarQuickReplyPrompt(null))).toBe(true);
  });

  it("rejects free text and edited templates", () => {
    expect(isRadarFixedTemplate("สวัสดีครับ สนใจคอร์สไหม")).toBe(false);
    expect(isRadarFixedTemplate(`${RADAR_THREAD_REPLY} ทักมาคุยได้นะ`)).toBe(false);
    const edited = buildRadarDm(CAREER).message.replace("ข้างในมี", "ข้างในมีราคาคอร์ส");
    expect(isRadarFixedTemplate(edited)).toBe(false);
    const otherLink = buildRadarDm(CAREER).message.replace(
      "https://passionseed.org/r/cyber-money-k3f9",
      "https://evil.example/x"
    );
    expect(isRadarFixedTemplate(otherLink)).toBe(false);
    expect(isRadarFixedTemplate("")).toBe(false);
    // The page line only takes page titles from code.
    const forged = buildRadarDm(CAREER).message.replace(
      "https://passionseed.org/r/cyber-money-k3f9",
      'https://passionseed.org/r/cyber-money-k3f9\nเริ่มที่ด่าน "ทักมาคุยส่วนตัวได้เลย"'
    );
    expect(isRadarFixedTemplate(forged)).toBe(false);
  });
});
