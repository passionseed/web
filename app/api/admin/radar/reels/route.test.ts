/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { GET, POST } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";
import { upsertReel } from "@/lib/supabase/radar-reels";
import { ADMIN_ID, createMockDb } from "../_test/mock-db";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/meta/graph", () => ({ listInstagramMedia: jest.fn() }));
jest.mock("@/lib/supabase/radar-reels", () => {
  class RadarReelInputError extends Error {}
  return { listReels: jest.fn(async () => []), upsertReel: jest.fn(), RadarReelInputError };
});
jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Server error" }, { status: 500 })),
}));

const reelBody = { platform: "instagram", mediaId: "17900000000000001", shortcode: "DA1b2C3d4" };

function post(body: unknown) {
  return POST(new Request("https://example.invalid", { method: "POST", body: JSON.stringify(body) }));
}

function asAdmin(replies: Parameters<typeof createMockDb>[0] = {}) {
  const mock = createMockDb(replies);
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true, value: { supabase: mock.db as never, userId: ADMIN_ID } });
  return mock;
}

test("GET and POST return 403 without admin", async () => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  });
  expect((await GET(new NextRequest("https://example.invalid/api/admin/radar/reels"))).status).toBe(403);
  expect((await post(reelBody)).status).toBe(403);
  expect(upsertReel).not.toHaveBeenCalled();
});

test("refuses a career mapping without a short label", async () => {
  asAdmin();
  const response = await post({ ...reelBody, fieldSlug: "cybersecurity", pageKey: "money" });
  expect(response.status).toBe(422);
  expect(upsertReel).not.toHaveBeenCalled();
});

test("refuses a page that is not in the career's guide, and a page on a deck career", async () => {
  asAdmin();
  for (const body of [
    { ...reelBody, fieldSlug: "cybersecurity", pageKey: "hook", careerLabelTh: "ไซเบอร์" },
    { ...reelBody, fieldSlug: "data-scientist", pageKey: "money", careerLabelTh: "ดาต้า" },
  ]) {
    const response = await post(body);
    expect(response.status).toBe(422);
  }
  expect(upsertReel).not.toHaveBeenCalled();
});

test("passes a demo reel's page through to upsertReel", async () => {
  asAdmin({ radar_fields: [{ data: { id: "f1" } }] });
  jest.mocked(upsertReel).mockResolvedValue({ reel: { id: "r1", platform: "instagram" } as never, linkCode: "cyber-triage-k3f9" });
  const response = await post({
    ...reelBody,
    fieldSlug: "cybersecurity",
    pageKey: "triage",
    videoKind: "demo",
    careerLabelTh: "ไซเบอร์",
  });
  expect(response.status).toBe(200);
  expect(jest.mocked(upsertReel).mock.calls[0][0]).toMatchObject({ pageKey: "triage", videoKind: "demo" });
});

test("refuses a career that is not published", async () => {
  asAdmin({ radar_fields: [{ data: null }] });
  const response = await post({ ...reelBody, fieldSlug: "cybersecurity", careerLabelTh: "ไซเบอร์" });
  expect(response.status).toBe(422);
  expect(upsertReel).not.toHaveBeenCalled();
});

test("maps a career reel with the user client, returns its short link and revalidates the strip", async () => {
  const mock = asAdmin({ radar_fields: [{ data: { id: "f1" } }] });
  jest.mocked(upsertReel).mockResolvedValue({
    reel: { id: "r1", platform: "instagram" } as never,
    linkCode: "cyber-money-k3f9",
  });
  const response = await post({ ...reelBody, fieldSlug: "cybersecurity", pageKey: "money", careerLabelTh: "ไซเบอร์" });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ shortUrl: "https://passionseed.org/r/cyber-money-k3f9" });
  expect(jest.mocked(upsertReel).mock.calls[0][1]).toEqual({ createdBy: ADMIN_ID, db: mock.db });
  expect(revalidateTag).toHaveBeenCalledWith("radar-reels", { expire: 0 });
});
