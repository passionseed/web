/** @jest-environment node */
import { NextResponse } from "next/server";
import { GET } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Views unavailable" }, { status: 500 })),
}));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const query = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn(),
};
const from = jest.fn(() => query);
const getViews = (page?: string) => GET(new Request(
  `https://example.invalid/api/admin/shift/views${page ? `?page=${encodeURIComponent(page)}` : ""}`,
));

beforeEach(() => {
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true } as never);
  jest.mocked(createAdminClient).mockReturnValue({ from } as never);
  query.range.mockReset().mockResolvedValue({ data: [], error: null });
});

test.each([401, 403])("refuses access with %i before using the privileged client", async (status) => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Access denied" }, { status }),
  });
  expect((await getViews()).status).toBe(status);
  expect(createAdminClient).not.toHaveBeenCalled();
});

test("counts repeat views, normalizes sources, and excludes other event types", async () => {
  query.range.mockResolvedValueOnce({
    data: [
      { event_data: { source: "ig-grid" } },
      { event_data: { source: "IG-GRID" } },
      { event_data: { source: "poster" } },
      { event_data: {} },
      { event_data: null },
    ],
    error: null,
  });
  const response = await getViews();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    totalViews: 5,
    sources: [
      { source: "direct", count: 2 },
      { source: "ig-grid", count: 2 },
      { source: "poster", count: 1 },
    ],
  });
  expect(from).toHaveBeenCalledWith("hackathon_events");
  expect(query.eq).toHaveBeenCalledWith("event_type", "shift_page_view");
  expect(query.select).toHaveBeenCalledWith("event_data");
  expect(response.headers.get("cache-control")).toBe("no-store");
});

test("reads past the API row limit, even when a server page is smaller than requested", async () => {
  query.range
    .mockResolvedValueOnce({ data: Array(1000).fill({ event_data: { source: "poster" } }), error: null })
    .mockResolvedValueOnce({ data: [{ event_data: { source: "poster" } }], error: null });
  expect(await (await getViews()).json()).toEqual({
    totalViews: 1001,
    sources: [{ source: "poster", count: 1001 }],
  });
  expect(query.range.mock.calls).toEqual([[0, 999], [1000, 1999], [1001, 2000]]);
  expect(new Set(query.lte.mock.calls.map((args) => args[1])).size).toBe(1);
});

test("returns zero for an empty dataset and an error instead of partial totals on failure", async () => {
  expect(await (await getViews()).json()).toEqual({ totalViews: 0, sources: [] });
  query.range
    .mockResolvedValueOnce({ data: [{ event_data: { source: "poster" } }], error: null })
    .mockResolvedValueOnce({ data: null, error: { message: "Database unavailable" } });
  expect((await getViews()).status).toBe(500);
});

test.each(["/shift/0", "/shift/1", "/shift/2", "/shift", "/shift/apply"])("filters %s views by their exact recorded page path", async (page) => {
  expect((await getViews(page)).status).toBe(200);
  expect(query.eq).toHaveBeenCalledWith("page_path", page);
});

test("rejects unrelated pages before querying", async () => {
  expect((await getViews("/hackathon")).status).toBe(400);
  expect(createAdminClient).not.toHaveBeenCalled();
});
