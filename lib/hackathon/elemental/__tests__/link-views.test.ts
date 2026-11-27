import { countDevices, isBotUserAgent, TRACKED_SOURCE_RE, visitHashes } from "../link-views";

const IPHONE_LINE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.19.0";

describe("link views", () => {
  it("tracks only student and teacher share links", () => {
    expect(TRACKED_SOURCE_RE.test("share-1a2b3c4d")).toBe(true);
    expect(TRACKED_SOURCE_RE.test("t-1a2b3c4d")).toBe(true);
    expect(TRACKED_SOURCE_RE.test("t-triamudom")).toBe(true);
    expect(TRACKED_SOURCE_RE.test("ig")).toBe(false);
    expect(TRACKED_SOURCE_RE.test("poster-12")).toBe(false);
    expect(TRACKED_SOURCE_RE.test("t-")).toBe(false);
  });

  it("gives the same device hash for the same address and browser, and never contains the address", () => {
    const a = visitHashes("1.2.3.4", IPHONE_LINE, "k");
    expect(a).toEqual(visitHashes("1.2.3.4", IPHONE_LINE, "k"));
    expect(a.deviceHash).toMatch(/^[0-9a-f]{32}$/);
    expect(a.ipHash).toMatch(/^[0-9a-f]{32}$/);
    expect(a.deviceHash).not.toEqual(visitHashes("1.2.3.5", IPHONE_LINE, "k").deviceHash);
    expect(a.deviceHash).not.toEqual(visitHashes("1.2.3.4", IPHONE_LINE, "other-key").deviceHash);
    expect(a.ipHash).toEqual(visitHashes("1.2.3.4", "different browser string here", "k").ipHash);
  });

  it("caps how many devices one network adds", () => {
    const rows = [
      ...Array.from({ length: 12 }, () => ({ ipHash: "school-wifi" })),
      { ipHash: "home-1" },
      { ipHash: "home-2" },
      { ipHash: "home-2" },
    ];
    expect(countDevices(rows)).toBe(5 + 1 + 2);
    expect(countDevices(rows, 1)).toBe(3);
    expect(countDevices([])).toBe(0);
  });

  it("skips crawlers and link previews", () => {
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent(IPHONE_LINE)).toBe(false);
  });
});
