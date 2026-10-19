import { adminPreviewPath, isLinkPreviewBot } from "@/lib/og/linkPreviewBots";
import { adminRouteFromSegments } from "@/lib/admin/metadata";

const LINE_CRAWLER = "facebookexternalhit/1.1;line-poker/1.0";
const LINE_BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari Line/14.16.0";

test("matches chat preview crawlers, not people in in-app browsers", () => {
  expect(isLinkPreviewBot(LINE_CRAWLER)).toBe(true);
  expect(isLinkPreviewBot("Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)")).toBe(true);
  expect(isLinkPreviewBot("Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)")).toBe(true);
  expect(isLinkPreviewBot(LINE_BROWSER)).toBe(false);
  expect(isLinkPreviewBot(null)).toBe(false);
});

test("sends only preview bots' admin GETs to the preview route", () => {
  expect(adminPreviewPath("GET", "/admin/shift/views", LINE_CRAWLER)).toBe("/link-preview/admin/shift/views");
  expect(adminPreviewPath("HEAD", "/admin", LINE_CRAWLER)).toBe("/link-preview/admin");
  expect(adminPreviewPath("POST", "/admin/shift/views", LINE_CRAWLER)).toBeNull();
  expect(adminPreviewPath("GET", "/admin/shift/views", LINE_BROWSER)).toBeNull();
  expect(adminPreviewPath("GET", "/administrator", LINE_CRAWLER)).toBeNull();
  expect(adminPreviewPath("GET", "/me", LINE_CRAWLER)).toBeNull();
});

test("record IDs in a pasted admin link never reach the card", () => {
  expect(adminRouteFromSegments(["maps", "3f2a9c1e-77b0-4c1a-9d2e-5b8f0a1c2d3e", "edit"])).toBe("/admin/maps/edit");
  expect(adminRouteFromSegments(undefined)).toBe("/admin");
});
