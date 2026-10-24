/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "./route";
import { runMetaMarketingSync } from "@/lib/meta/marketing/sync";

jest.mock("@/lib/meta/marketing/sync", () => ({
  ...jest.requireActual("@/lib/meta/marketing/sync"),
  runMetaMarketingSync: jest.fn().mockResolvedValue([]),
}));

const savedSecret = process.env.CRON_SECRET;
beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret";
  jest.mocked(runMetaMarketingSync).mockClear();
});
afterAll(() => {
  if (savedSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = savedSecret;
});

function call(query = "", secret = "test-cron-secret") {
  return GET(
    new NextRequest(`https://passionseed.org/api/cron/meta-marketing-sync${query}`, {
      headers: { authorization: `Bearer ${secret}` },
    })
  );
}

it("rejects a request without the cron secret", async () => {
  const response = await call("", "wrong");
  expect(response.status).toBe(401);
  expect(runMetaMarketingSync).not.toHaveBeenCalled();
});

it("runs the trailing window on a scheduled call", async () => {
  const response = await call();
  expect(response.status).toBe(200);
  const options = jest.mocked(runMetaMarketingSync).mock.calls[0][0];
  expect(options.trigger).toBe("cron");
  expect(options.sources).toEqual(["meta_ads", "ig_account", "ig_media"]);
  expect(options.range.since < options.range.until).toBe(true);
  expect(options.mediaSince < options.range.since).toBe(true);
});

it("runs a manual backfill for the given range and sources", async () => {
  await call("?since=2026-09-01&until=2026-09-30&sources=meta_ads");
  expect(jest.mocked(runMetaMarketingSync).mock.calls[0][0]).toMatchObject({
    trigger: "manual",
    range: { since: "2026-09-01", until: "2026-09-30" },
    mediaSince: "2026-09-01",
    sources: ["meta_ads"],
  });
});

it.each([
  ["?since=2026-09-30&until=2026-09-01", "since and until"],
  ["?since=2026-09-01", "since and until"],
  ["?since=2026-01-01&until=2026-09-30", "limited to 93 days"],
  ["?since=2026-09-01&until=2026-09-02&sources=tiktok", "sources must be"],
])("rejects %s", async (query, message) => {
  const response = await call(query);
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain(message);
  expect(runMetaMarketingSync).not.toHaveBeenCalled();
});
