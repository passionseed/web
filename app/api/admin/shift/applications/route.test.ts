/** @jest-environment node */
import { NextResponse } from "next/server";
import { GET, PATCH } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { ADMIN_SHIFT_APPLICATION_SELECT } from "@/lib/admin/queue-tools/shift-applications";
import { expireAdminOverviewKpis } from "@/lib/admin/overview/cache";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Server error" }, { status: 500 })),
}));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/admin/overview/cache", () => ({ expireAdminOverviewKpis: jest.fn() }));

const ID_A = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
const ID_B = "1c8d7e6f-2e3b-4d4c-8f9a-8b7c6d5e4f3a";

/** A chainable PostgREST stand-in that resolves to `result` when awaited. */
function queryMock(result: { data: unknown; error: unknown }) {
  const query: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ["select", "order", "eq", "in", "neq", "is", "update"]) {
    query[method] = jest.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return query;
}

let query: ReturnType<typeof queryMock>;
const from = jest.fn(() => query);

const list = (search = "") =>
  GET(new Request(`https://example.invalid/api/admin/shift/applications${search}`));
const bulk = (body: unknown) =>
  PATCH(
    new Request("https://example.invalid/api/admin/shift/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true } as never);
  jest.mocked(createAdminClient).mockReturnValue({ from } as never);
  query = queryMock({ data: [{ id: ID_A }], error: null });
});

test.each([401, 403])("refuses access with %i before using the privileged client", async (status) => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Access denied" }, { status }),
  });
  expect((await list()).status).toBe(status);
  expect((await bulk({ ids: [ID_A], action: "accept" })).status).toBe(status);
  expect(createAdminClient).not.toHaveBeenCalled();
});

describe("GET", () => {
  it("selects the browser-safe columns, never * or join_token", async () => {
    const response = await list(`?cohort=${encodeURIComponent("SHIFT[3]")}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ applications: [{ id: ID_A }] });
    expect(query.select).toHaveBeenCalledWith(ADMIN_SHIFT_APPLICATION_SELECT);
    expect(query.select.mock.calls[0][0]).not.toMatch(/\*|join_token/);
    expect(query.eq).toHaveBeenCalledWith("cohort", "SHIFT[3]");
  });

  it("looks one application up by id for deep links", async () => {
    await list(`?id=${ID_A}`);
    expect(query.eq).toHaveBeenCalledWith("id", ID_A);
  });

  it("rejects a malformed id without querying", async () => {
    expect((await list("?id=not-a-uuid")).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("reports a failed read as an error, not an empty list", async () => {
    query = queryMock({ data: null, error: { message: "boom" } });
    expect((await list()).status).toBe(500);
  });
});

describe("PATCH (bulk)", () => {
  it("accepts every id in one update, skipping rows already accepted", async () => {
    const response = await bulk({ ids: [ID_A, ID_B], action: "accept" });
    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ status: "accepted" });
    expect(query.in).toHaveBeenCalledWith("id", [ID_A, ID_B]);
    expect(query.neq).toHaveBeenCalledWith("status", "accepted");
    expect(query.select).toHaveBeenCalledWith(ADMIN_SHIFT_APPLICATION_SELECT);
    expect(from).toHaveBeenCalledTimes(1);
    // Accepting moves no revenue or seats, so the overview KPI cache stays.
    expect(expireAdminOverviewKpis).not.toHaveBeenCalled();
  });

  it("marks paid without overwriting an existing paid time", async () => {
    await bulk({ ids: [ID_A], action: "paid" });
    const [update] = query.update.mock.calls[0] as [{ paid_at: string }];
    expect(Number.isNaN(Date.parse(update.paid_at))).toBe(false);
    expect(query.is).toHaveBeenCalledWith("paid_at", null);
    expect(expireAdminOverviewKpis).toHaveBeenCalledTimes(1);
  });

  it("leaves the KPI cache alone when every row was already paid", async () => {
    query = queryMock({ data: [], error: null });
    await bulk({ ids: [ID_A], action: "paid" });
    expect(expireAdminOverviewKpis).not.toHaveBeenCalled();
  });

  it.each([
    ["no ids", { ids: [], action: "accept" }],
    ["a bad id", { ids: ["x"], action: "accept" }],
    ["an unknown action", { ids: [ID_A], action: "decline" }],
    ["extra fields", { ids: [ID_A], action: "paid", status: "declined" }],
    ["too many ids", { ids: Array(201).fill(ID_A), action: "paid" }],
  ])("rejects %s", async (_label, body) => {
    expect((await bulk(body)).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    expect((await bulk("{nope")).status).toBe(400);
  });

  it("reports a failed update", async () => {
    query = queryMock({ data: null, error: { message: "boom" } });
    expect((await bulk({ ids: [ID_A], action: "paid" })).status).toBe(500);
    expect(expireAdminOverviewKpis).not.toHaveBeenCalled();
  });
});
