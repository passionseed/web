/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import { expireAdminOverviewKpis } from "@/lib/admin/overview/cache";
import { requireAdmin } from "@/lib/security/route-guards";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Server error" }, { status: 500 })),
}));
jest.mock("@/lib/admin/overview/cache", () => ({ expireAdminOverviewKpis: jest.fn() }));

const ADMIN = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
const STUDENT = "1C8D7E6F-2E3B-4D4C-8F9A-8B7C6D5E4F3A";

const insert = jest.fn();
const from = jest.fn(() => ({ insert }));

const post = (body: unknown) =>
  POST(
    new NextRequest("https://example.invalid/api/admin/track-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  insert.mockResolvedValue({ error: null });
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: true,
    value: { supabase: { from } as never, userId: ADMIN },
  });
});

test.each([401, 403])("refuses %i before writing anything", async (status) => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Access denied" }, { status }),
  });
  expect((await post({ user_id: STUDENT, amount: 1490 })).status).toBe(status);
  expect(from).not.toHaveBeenCalled();
});

test.each([
  ["a user_id that is not a UUID", { user_id: "ploy", amount: 1490 }],
  ["a missing user_id", { amount: 1490 }],
  ["a zero amount", { user_id: STUDENT, amount: 0 }],
  ["an amount sent as text", { user_id: STUDENT, amount: "1490" }],
  ["a made-up currency", { user_id: STUDENT, amount: 1490, currency: "baht" }],
])("rejects %s with 400", async (_label, body) => {
  expect((await post(body)).status).toBe(400);
  expect(insert).not.toHaveBeenCalled();
  expect(expireAdminOverviewKpis).not.toHaveBeenCalled();
});

test("rejects a body that is not JSON", async () => {
  expect((await post("{not json")).status).toBe(400);
});

test("records the payment as a funnel event and expires the overview KPIs", async () => {
  const response = await post({
    user_id: STUDENT,
    amount: 1490,
    payment_method: "family_round",
    product_name: "Portfolio Review",
    notes: "  ",
  });
  expect(response.status).toBe(200);
  expect(from).toHaveBeenCalledWith("funnel_events");
  expect(insert).toHaveBeenCalledWith({
    user_id: STUDENT.toLowerCase(),
    event_name: "payment_convert",
    metadata: {
      amount: 1490,
      currency: "THB",
      payment_method: "family_round",
      product_name: "Portfolio Review",
      notes: undefined,
      recorded_by: ADMIN,
    },
  });
  expect(expireAdminOverviewKpis).toHaveBeenCalledTimes(1);
});

test("does not expire the cache when the insert fails", async () => {
  insert.mockResolvedValue({ error: { message: "rls" } });
  expect((await post({ user_id: STUDENT, amount: 1490 })).status).toBe(500);
  expect(expireAdminOverviewKpis).not.toHaveBeenCalled();
});
