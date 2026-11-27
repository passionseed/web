import { countDevices, DEVICE_ID_RE, isBotUserAgent, TRACKED_SOURCE_RE, visitHashes } from "../link-views";

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

  it("hashes the browser id and the network separately, and never stores either raw", () => {
    const id = "0123456789abcdef0123456789abcdef";
    const a = visitHashes(id, "1.2.3.4", "k");
    expect(a).toEqual(visitHashes(id, "1.2.3.4", "k"));
    expect(a.deviceHash).toMatch(/^[0-9a-f]{32}$/);
    expect(a.ipHash).toMatch(/^[0-9a-f]{32}$/);
    // Same browser on another network (airplane mode, wifi to mobile): still one device.
    expect(visitHashes(id, "5.6.7.8", "k").deviceHash).toEqual(a.deviceHash);
    expect(visitHashes("f".repeat(32), "1.2.3.4", "k").deviceHash).not.toEqual(a.deviceHash);
    expect(visitHashes(id, "1.2.3.4", "other-key").deviceHash).not.toEqual(a.deviceHash);
    expect(a.deviceHash).not.toContain("1.2.3.4");
    expect(DEVICE_ID_RE.test(id)).toBe(true);
    expect(DEVICE_ID_RE.test("not-an-id")).toBe(false);
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
