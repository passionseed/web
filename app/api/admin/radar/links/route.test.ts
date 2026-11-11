/** @jest-environment node */
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { GET, PUT } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";
import { ADMIN_ID, createMockDb } from "../_test/mock-db";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Server error" }, { status: 500 })),
}));

function put(body: unknown) {
  return PUT(new Request("https://example.invalid", { method: "PUT", body: JSON.stringify(body) }));
}

function asAdmin(replies: Parameters<typeof createMockDb>[0] = {}) {
  const mock = createMockDb(replies);
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true, value: { supabase: mock.db as never, userId: ADMIN_ID } });
  return mock;
}

test("GET and PUT return 403 without admin", async () => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  });
  expect((await GET()).status).toBe(403);
  expect((await put({ code: "cyber", fieldSlug: null, utmSource: "tiktok-alias", utmMedium: "alias" })).status).toBe(403);
});

test("the ig bio link cannot point at a career", async () => {
  asAdmin();
  const response = await put({ code: "ig", fieldSlug: "cybersecurity", utmSource: "ig-bio", utmMedium: "bio" });
  expect(response.status).toBe(422);
});

test("a reel's link cannot be retargeted here", async () => {
  asAdmin({
    radar_fields: [{ data: { id: "f1" } }],
    radar_links: [{ data: { code: "cyber-money-k3f9", reel_id: "r1", field_slug: "cybersecurity", chapter_key: "money" } }],
  });
  const response = await put({
    code: "cyber-money-k3f9",
    fieldSlug: "cybersecurity",
    pageKey: "firstjob",
    utmSource: "ig-comment-dm",
    utmMedium: "dm",
  });
  expect(response.status).toBe(409);
});

test("creates an alias link and revalidates the field pages", async () => {
  const saved = { code: "cyber-story" };
  const mock = asAdmin({
    radar_fields: [{ data: { id: "f1" } }],
    radar_links: [{ data: null }, { data: null }, { data: saved }],
  });
  const response = await put({ code: "cyber-story", fieldSlug: "cybersecurity", utmSource: "ig-story", utmMedium: "story" });
  expect(response.status).toBe(200);
  expect(mock.calls.find((c) => c.method === "insert")?.args[0]).toMatchObject({
    code: "cyber-story",
    utm_campaign: "radar",
    created_by: ADMIN_ID,
  });
  expect(revalidateTag).toHaveBeenCalledWith("published-radar-fields", { expire: 0 });
});
