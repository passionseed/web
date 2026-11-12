/** @jest-environment node */
import { NextResponse } from "next/server";

import { GET } from "./route";
import { searchAdmin } from "@/lib/supabase/admin-search";
import { requireAdmin } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/security/route-guards", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/supabase/admin-search", () => ({
  ...jest.requireActual("@/lib/supabase/admin-search"),
  searchAdmin: jest.fn(),
}));

const db = { from: jest.fn() };
const search = (query: string) => GET(new Request(`https://example.invalid/api/admin/search?${query}`));

beforeEach(() => {
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true } as never);
  jest.mocked(createAdminClient).mockReturnValue(db as never);
  jest.mocked(searchAdmin).mockResolvedValue({ q: "mint", tookMs: 3, partial: false, groups: [] });
});

test.each([401, 403])("refuses access with %i before using the privileged client", async (status) => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Access denied" }, { status }),
  });
  const response = await search("q=mint");
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(createAdminClient).not.toHaveBeenCalled();
  expect(searchAdmin).not.toHaveBeenCalled();
});

test("a too-short query is an empty answer, not an error, and never touches the database", async () => {
  // "@m" passes a plain 2-character check in the browser but is one character once the @ is dropped.
  const response = await search("q=%40m");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ q: "m", tookMs: 0, partial: false, groups: [] });
  expect(createAdminClient).not.toHaveBeenCalled();
  expect(searchAdmin).not.toHaveBeenCalled();
});

test("passes the normalized query to the search and is never cached", async () => {
  const response = await search("q=%20%40Mint%20&types=user,map&limit=3");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(searchAdmin).toHaveBeenCalledWith(db, { q: "Mint", types: ["user", "map"], limit: 3 });
  expect(await response.json()).toEqual({ q: "mint", tookMs: 3, partial: false, groups: [] });
});

test("a failure returns 500 without logging the query", async () => {
  const spies = (["log", "error", "warn", "info"] as const).map((m) =>
    jest.spyOn(console, m).mockImplementation(() => {}),
  );
  jest.mocked(searchAdmin).mockRejectedValue(new Error("db down"));
  const response = await search("q=somchai.private%40gmail.com");
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Search is unavailable" });
  for (const spy of spies) {
    expect(JSON.stringify(spy.mock.calls)).not.toContain("somchai");
    spy.mockRestore();
  }
});
