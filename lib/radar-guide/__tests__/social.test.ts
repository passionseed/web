import { CONTACT as PATHLAB_CONTACT } from "@/lib/content/pathlab-page";
import { findDashes } from "../thai-copy";
import {
  CONTACT,
  FOLLOW_IG_LABEL_TH,
  FOLLOW_TIKTOK_LABEL_TH,
  followTarget,
  isTikTokVisitor,
  lineShareHref,
  otherCareerCards,
  RADAR_PILOT_CAREERS,
  PASSIONSEED_TIKTOK_URL,
  radarGuideShareText,
  radarProfileShareTag,
  radarProfileShortLink,
  radarProfileShareText,
  radarShareText,
  radarShareUrl,
  shouldUseNativeShare,
} from "../social";

test("re-exports CONTACT instead of a second handle constant", () => {
  expect(CONTACT).toBe(PATHLAB_CONTACT);
  expect(FOLLOW_IG_LABEL_TH).toBe(`ติดตาม @${PATHLAB_CONTACT.handle} จะได้ไม่พลาดอาชีพถัดไป`);
});

test("the TikTok URL stays null until confirmed", () => {
  expect(PASSIONSEED_TIKTOK_URL).toBeNull();
});

describe("radarShareUrl", () => {
  test("is the canonical field URL tagged as a share", () => {
    expect(radarShareUrl("cybersecurity")).toBe(
      "https://passionseed.org/radar/cybersecurity?utm_source=share&utm_medium=share&utm_campaign=radar&utm_content=cybersecurity"
    );
  });
});

describe("radarShareUrl with a guide page", () => {
  test("opens the page the student is on, tagged <slug>-<page>", () => {
    expect(radarShareUrl("cybersecurity", "money")).toBe(
      "https://passionseed.org/radar/cybersecurity/money?utm_source=share&utm_medium=share&utm_campaign=radar&utm_content=cybersecurity-money"
    );
  });

  test("the profile card lands on the cover with its own tag", () => {
    expect(radarShareUrl("cybersecurity", null, radarProfileShareTag("cybersecurity"))).toBe(
      "https://passionseed.org/radar/cybersecurity?utm_source=share&utm_medium=share&utm_campaign=radar&utm_content=cybersecurity-card"
    );
  });
});

describe("radarProfileShortLink", () => {
  test("is the typeable -card alias link, tagged like a share", () => {
    expect(radarProfileShortLink("cybersecurity")).toEqual({
      url: "https://passionseed.org/r/cyber-card",
      label: "passionseed.org/r/cyber-card",
    });
    expect(radarProfileShortLink("data-scientist", "https://example.test/").url).toBe(
      "https://example.test/r/data-scientist-card"
    );
    expect(radarProfileShareTag("cybersecurity")).toBe("cybersecurity-card");
  });
});

describe("guide and profile share text", () => {
  test("has no dashes and no free text", () => {
    for (const text of [
      radarGuideShareText("ไซเบอร์ซีเคียวริตี้"),
      radarGuideShareText(null),
      radarProfileShareText("โปรไฟล์สายไซเบอร์ของฉัน", ["ชอบหาจุดพัง", "ทีมกันโกง", "ลงมือคืนนี้", "เกิน"]),
      radarProfileShareText("", []),
    ]) {
      expect(findDashes(text)).toEqual([]);
      expect(text).not.toMatch(/น้อง\s?ๆ/);
    }
    expect(radarProfileShareText("โปรไฟล์", ["a", "b", "c", "d"])).toBe("โปรไฟล์: a · b · c ลองเล่นแล้วดูว่าของเธอได้อะไร");
  });
});

describe("radarShareText", () => {
  test("names the career and has no dashes", () => {
    const text = radarShareText("นักวิทยาศาสตร์ข้อมูล");
    expect(text).toContain("นักวิทยาศาสตร์ข้อมูล");
    expect(findDashes(text)).toEqual([]);
    expect(findDashes(radarShareText(null))).toEqual([]);
  });
});

test("lineShareHref encodes the text and the link", () => {
  const href = lineShareHref("ดู & แชร์", "https://passionseed.org/radar/x?utm_source=share");
  expect(href.startsWith("https://line.me/R/share?text=")).toBe(true);
  expect(decodeURIComponent(href.split("text=")[1])).toBe(
    "ดู & แชร์\nhttps://passionseed.org/radar/x?utm_source=share"
  );
});

describe("shouldUseNativeShare", () => {
  test("never in Instagram's in-app browser", () => {
    expect(shouldUseNativeShare({ uaApp: "instagram", canShare: true })).toBe(false);
  });
  test("only when canShare is true", () => {
    expect(shouldUseNativeShare({ uaApp: "tiktok", canShare: true })).toBe(true);
    expect(shouldUseNativeShare({ uaApp: null, canShare: true })).toBe(true);
    expect(shouldUseNativeShare({ uaApp: null, canShare: false })).toBe(false);
  });
});

describe("followTarget", () => {
  const tiktokUrl = "https://www.tiktok.com/@example";

  test("TikTok visitors get the TikTok link when it is set", () => {
    expect(followTarget({ uaApp: "tiktok", utmSource: null, tiktokUrl })).toEqual({
      platform: "tiktok",
      href: tiktokUrl,
      labelTh: FOLLOW_TIKTOK_LABEL_TH,
    });
    expect(followTarget({ uaApp: "other", utmSource: "tiktok-alias", tiktokUrl }).platform).toBe("tiktok");
    expect(followTarget({ uaApp: null, utmSource: "tiktok-bio", tiktokUrl }).platform).toBe("tiktok");
  });

  test("TikTok visitors get the IG link while the TikTok URL is unset", () => {
    expect(followTarget({ uaApp: "tiktok", utmSource: "tiktok-alias", tiktokUrl: null })).toEqual({
      platform: "instagram",
      href: CONTACT.href,
      labelTh: FOLLOW_IG_LABEL_TH,
    });
    expect(followTarget({ uaApp: "tiktok", utmSource: null }).platform).toBe("instagram");
  });

  test("everyone else gets the IG link", () => {
    expect(followTarget({ uaApp: "instagram", utmSource: "ig-comment-dm", tiktokUrl }).href).toBe(CONTACT.href);
    expect(followTarget({ uaApp: null, utmSource: null, tiktokUrl }).platform).toBe("instagram");
  });

  test("isTikTokVisitor", () => {
    expect(isTikTokVisitor({ uaApp: "line", utmSource: "share" })).toBe(false);
    expect(isTikTokVisitor({ uaApp: "line", utmSource: "tiktok-bio" })).toBe(true);
  });
});

describe("otherCareerCards", () => {
  test("lists the other pilots, never the current career, with clean names", () => {
    const cards = otherCareerCards("cybersecurity");
    expect(cards.map((c) => c.slug)).not.toContain("cybersecurity");
    expect(cards).toHaveLength(RADAR_PILOT_CAREERS.length - 1);
    for (const card of cards) {
      expect(card.href).toBe(`/radar/${card.slug}`);
      expect(findDashes(card.nameTh)).toEqual([]);
    }
  });

  test("a career with a code guide carries its cold open", () => {
    const cyber = otherCareerCards("data-scientist").find((c) => c.slug === "cybersecurity")!;
    expect(cyber.hookTh).toBeTruthy();
    expect(otherCareerCards("data-scientist")[0].slug).toBe("cybersecurity");
  });
});
