/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Server error" }, { status: 500 })),
}));

type Reply = { data?: unknown; count?: number | null; error?: { code?: string; message: string } | null };
type Call = { method: string; args: unknown[] };

let replies: Reply[] = [];
const calls: Call[] = [];

function builder() {
  const b: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "range"]) {
    b[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown) => {
    const next = replies.shift() ?? {};
    return Promise.resolve({ data: next.data ?? null, count: next.count ?? null, error: next.error ?? null }).then(
      resolve,
    );
  };
  return b;
}

const from = jest.fn(() => builder());
const get = (query: string) => GET(new NextRequest(`https://example.invalid/api/admin/experts?${query}`));

beforeEach(() => {
  calls.length = 0;
  replies = [];
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: true,
    value: { supabase: { from } as never, userId: "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f" },
  });
});

test("pages the status filter in SQL", async () => {
  replies = [{ data: [{ id: "e1" }], count: 41 }];
  const response = await get("status=pending&page=3&limit=20");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ experts: [{ id: "e1" }], total: 41, page: 3, limit: 20 });
  expect(calls).toContainEqual({ method: "eq", args: ["status", "pending"] });
  expect(calls).toContainEqual({ method: "range", args: [40, 59] });
});

test("a page past the end returns the real total instead of a 500", async () => {
  // PostgREST answers an out-of-range page with 416 and no count.
  replies = [{ error: { code: "PGRST103", message: "Requested range not satisfiable" } }, { count: 25 }];
  const response = await get("status=all&page=9");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ experts: [], total: 25, page: 9, limit: 20 });
  const selects = calls.filter((c) => c.method === "select");
  expect(selects[1].args).toEqual(["id", { count: "exact", head: true }]);
  expect(calls.some((c) => c.method === "eq")).toBe(false);
});

test("junk paging params fall back to safe defaults", async () => {
  replies = [{ data: [], count: 0 }];
  const response = await get("page=-2&limit=abc");
  expect(await response.json()).toMatchObject({ page: 1, limit: 20 });
  expect(calls).toContainEqual({ method: "range", args: [0, 19] });
});

test("other database errors are still a 500", async () => {
  replies = [{ error: { code: "42501", message: "denied" } }];
  expect((await get("status=pending")).status).toBe(500);
});
