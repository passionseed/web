import {
  RADAR_LAST_TOUCH_KEY,
  RADAR_VISIT_IDLE_MS,
  captureRadarAttribution,
  createVisitId,
  detectUaApp,
  getLastRadarTouch,
  getOrCreateVisitId,
  parseAttribution,
  referrerHost,
  resetAttributionMemory,
  stripUtmFromUrl,
} from "../attribution";

const IG_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.4.32.98 (iPhone15,3; iOS 17_5; th_TH; th; scale=3.00; 1290x2796; 610036521)";
const TIKTOK_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_34.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/th Region/TH";
const BYTEDANCE_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36 trill_340504 BytedanceWebview/d8a21c6";
const LINE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.8.0";
const FB_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/466.0.0.40.108;FBBV/600000000]";
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("detectUaApp", () => {
  it.each([
    [IG_UA, "instagram"],
    [TIKTOK_UA, "tiktok"],
    [BYTEDANCE_UA, "tiktok"],
    [LINE_UA, "line"],
    [FB_UA, "facebook"],
    ["Mozilla/5.0 ... FBAV/400.0", "facebook"],
    ["Mozilla/5.0 ... Twitter for iPhone", "other"],
    [SAFARI_UA, null],
    ["", null],
    [null, null],
  ])("%s → %s", (ua, expected) => {
    expect(detectUaApp(ua)).toBe(expected);
  });

  it("does not read 'Line' inside other words as LINE", () => {
    expect(detectUaApp("Mozilla/5.0 Pipeline/2.0")).toBeNull();
  });
});

describe("referrerHost", () => {
  it("returns the outside host, lowercased", () => {
    expect(referrerHost("https://L.Instagram.com/?u=x")).toBe("l.instagram.com");
  });

  it.each([
    "https://passionseed.org/radar",
    "https://www.passionseed.org/",
    "https://preview.passionseed.org/x",
  ])("treats our own site %s as no referrer", (ref) => {
    expect(referrerHost(ref)).toBeNull();
  });

  it("treats the page's own host as no referrer (preview deployments)", () => {
    expect(referrerHost("https://web-abc.vercel.app/radar", "web-abc.vercel.app")).toBeNull();
    expect(referrerHost("https://www.tiktok.com/", "web-abc.vercel.app")).toBe("www.tiktok.com");
  });

  it("ignores empty and malformed referrers", () => {
    expect(referrerHost("")).toBeNull();
    expect(referrerHost("not a url")).toBeNull();
  });
});

describe("parseAttribution", () => {
  it("reads utm tokens, the referrer host and the in-app browser", () => {
    expect(
      parseAttribution(
        "?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-founder-DA1b2C3",
        "https://l.instagram.com/",
        IG_UA,
        "passionseed.org"
      )
    ).toEqual({
      utm_source: "ig-comment-dm",
      utm_medium: "dm",
      utm_campaign: "radar",
      utm_content: "cybersecurity-founder-DA1b2C3",
      referrer_host: "l.instagram.com",
      ua_app: "instagram",
    });
  });

  it("lowercases source, medium and campaign but keeps utm_content's case", () => {
    const a = parseAttribution("?utm_source=IG-Bio&utm_content=Hub-Bio", null, null);
    expect(a.utm_source).toBe("ig-bio");
    expect(a.utm_content).toBe("Hub-Bio");
  });

  it.each([
    ["spaces", "?utm_source=ig%20bio"],
    ["Thai text", "?utm_source=%E0%B9%84%E0%B8%AD%E0%B8%88%E0%B8%B5"],
    ["a leading dash", "?utm_source=-ig"],
    ["a URL", "?utm_source=https://evil.example"],
    ["too long", `?utm_source=${"a".repeat(65)}`],
  ])("sets an invalid utm token (%s) to null", (_label, search) => {
    expect(parseAttribution(search, null, null).utm_source).toBeNull();
  });

  it("sets an own-host referrer to null", () => {
    expect(parseAttribution("", "https://passionseed.org/radar", null, "passionseed.org").referrer_host).toBeNull();
  });

  it("returns all nulls for an untagged direct visit in a normal browser", () => {
    expect(parseAttribution("", "", SAFARI_UA)).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      referrer_host: null,
      ua_app: null,
    });
  });
});

describe("stripUtmFromUrl", () => {
  it("removes utm parameters and keeps `from` and the hash", () => {
    expect(
      stripUtmFromUrl(
        "https://passionseed.org/radar/cybersecurity?utm_source=ig-comment-dm&from=plan&utm_medium=dm&utm_campaign=radar&utm_content=x#day"
      )
    ).toBe("/radar/cybersecurity?from=plan#day");
  });

  it("drops the question mark when only utm parameters were present", () => {
    expect(stripUtmFromUrl("https://passionseed.org/radar?utm_source=ig-bio&utm_medium=bio#start")).toBe(
      "/radar#start"
    );
  });

  it("removes repeated and odd-case utm keys", () => {
    expect(stripUtmFromUrl("https://passionseed.org/radar?utm_source=a&UTM_Source=b&utm_source=c")).toBe("/radar");
  });

  it("returns null when there is nothing to strip", () => {
    expect(stripUtmFromUrl("https://passionseed.org/radar/cybersecurity?from=plan#money")).toBeNull();
  });
});

describe("getOrCreateVisitId", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    resetAttributionMemory();
  });

  it("creates a UUID visit id", () => {
    const { visitId, isNew } = getOrCreateVisitId("cybersecurity", 1_000);
    expect(isNew).toBe(true);
    expect(visitId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("reuses the id within 30 minutes, including after a reload", () => {
    const first = getOrCreateVisitId("cybersecurity", 1_000);
    // A reload loses module memory; sessionStorage survives.
    resetAttributionMemory();
    const again = getOrCreateVisitId("cybersecurity", 1_000 + RADAR_VISIT_IDLE_MS - 1);
    expect(again).toEqual({ visitId: first.visitId, isNew: false });
  });

  it("slides the window on each use", () => {
    const first = getOrCreateVisitId("hub", 0);
    getOrCreateVisitId("hub", RADAR_VISIT_IDLE_MS - 10);
    const later = getOrCreateVisitId("hub", 2 * RADAR_VISIT_IDLE_MS - 20);
    expect(later.visitId).toBe(first.visitId);
  });

  it("starts a new visit after 30 idle minutes", () => {
    const first = getOrCreateVisitId("cybersecurity", 0);
    const next = getOrCreateVisitId("cybersecurity", RADAR_VISIT_IDLE_MS + 1);
    expect(next.isNew).toBe(true);
    expect(next.visitId).not.toBe(first.visitId);
  });

  it("keeps separate visits per page", () => {
    const field = getOrCreateVisitId("cybersecurity", 0);
    const hub = getOrCreateVisitId("hub", 0);
    expect(hub.visitId).not.toBe(field.visitId);
  });

  it("ignores a tampered stored value", () => {
    window.sessionStorage.setItem("radar_visit:hub", JSON.stringify({ id: "'; drop", at: 0 }));
    expect(getOrCreateVisitId("hub", 1).isNew).toBe(true);
  });

  it("works when sessionStorage throws", () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const first = getOrCreateVisitId("hub", 0);
    const again = getOrCreateVisitId("hub", 10);
    expect(again.visitId).toBe(first.visitId);
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("createVisitId", () => {
  it("falls back to a v4 UUID without crypto.randomUUID", () => {
    const original = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(createVisitId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      Object.defineProperty(globalThis.crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});

describe("captureRadarAttribution", () => {
  const userAgent = jest.spyOn(window.navigator, "userAgent", "get");
  const referrer = jest.spyOn(document, "referrer", "get");

  beforeEach(() => {
    window.sessionStorage.clear();
    resetAttributionMemory();
    userAgent.mockReturnValue(IG_UA);
    referrer.mockReturnValue("");
    window.history.replaceState(null, "", "/radar/cybersecurity");
  });

  it("captures a tagged arrival, stores it as the last touch and strips the URL", () => {
    window.history.replaceState(
      null,
      "",
      "/radar/cybersecurity?utm_source=ig-comment-dm&utm_medium=dm&utm_campaign=radar&utm_content=cybersecurity-founder-x#money"
    );
    const attribution = captureRadarAttribution(1_000);
    expect(attribution).toMatchObject({ utm_source: "ig-comment-dm", ua_app: "instagram" });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      "/radar/cybersecurity#money"
    );
    expect(getLastRadarTouch(2_000)).toMatchObject({ utm_source: "ig-comment-dm", utm_content: "cybersecurity-founder-x" });
    expect(window.sessionStorage.getItem(RADAR_LAST_TOUCH_KEY)).not.toContain("instagram\"");
  });

  it("keeps the tagged touch for in-app navigation to another page", () => {
    window.history.replaceState(null, "", "/radar?utm_source=ig-bio&utm_medium=bio&utm_campaign=radar");
    referrer.mockReturnValue("https://l.instagram.com/");
    captureRadarAttribution(1_000, { firstInDocument: true });

    window.history.replaceState(null, "", "/radar/cybersecurity");
    const field = captureRadarAttribution(2_000, { firstInDocument: false });
    expect(field).toMatchObject({
      utm_source: "ig-bio",
      utm_medium: "bio",
      referrer_host: "l.instagram.com",
      ua_app: "instagram",
    });
  });

  it("does not inherit a tagged touch when a new outside referrer brings the visitor back", () => {
    window.history.replaceState(null, "", "/radar?utm_source=ig-bio&utm_medium=bio");
    captureRadarAttribution(1_000, { firstInDocument: true });

    referrer.mockReturnValue("https://www.google.com/");
    window.history.replaceState(null, "", "/radar/cybersecurity");
    const fromGoogle = captureRadarAttribution(2_000, { firstInDocument: true });
    expect(fromGoogle.utm_source).toBeNull();
    expect(fromGoogle.referrer_host).toBe("www.google.com");
    expect(getLastRadarTouch(3_000)).toBeNull();
  });

  it("returns an untagged direct visit when there is no touch", () => {
    userAgent.mockReturnValue(SAFARI_UA);
    expect(captureRadarAttribution(1_000, { firstInDocument: true })).toEqual({
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      referrer_host: null,
      ua_app: null,
    });
  });

  it("re-sanitises a tampered stored touch", () => {
    window.sessionStorage.setItem(
      RADAR_LAST_TOUCH_KEY,
      JSON.stringify({ at: 1_000, attribution: { utm_source: "<script>", utm_medium: "bio" } })
    );
    const a = captureRadarAttribution(2_000, { firstInDocument: false });
    expect(a.utm_source).toBeNull();
    expect(a.utm_medium).toBe("bio");
  });
});
