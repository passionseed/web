/** @jest-environment node */
import { NextResponse } from "next/server";
import { PUT } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Server error" }, { status: 500 })),
}));
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const ADMIN = "11111111-1111-4111-8111-111111111111";
const STUDENT = "22222222-2222-4222-8222-222222222222";

type Reply = { data?: unknown; error?: { message: string } | null };
type Call = { table: string; method: string; args: unknown[] };

let replies: Record<string, Reply[]> = {};
const calls: Call[] = [];

function fakeDb() {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {};
      for (const method of ["select", "update", "insert", "eq", "neq", "limit"]) {
        b[method] = (...args: unknown[]) => {
          calls.push({ table, method, args });
          return b;
        };
      }
      const settle = () => {
        const next = replies[table]?.shift() ?? {};
        return { data: next.data ?? null, error: next.error ?? null };
      };
      b.maybeSingle = () => Promise.resolve(settle());
      b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(settle()).then(resolve);
      return b;
    },
  };
}

const put = (body: unknown) =>
  PUT(new Request("https://example.invalid/api/admin/users", { method: "PUT", body: JSON.stringify(body) }));

beforeEach(() => {
  calls.length = 0;
  replies = {};
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true, value: { supabase: {} as never, userId: ADMIN } });
  jest.mocked(createAdminClient).mockReturnValue(fakeDb() as never);
});

test("an admin's edit to another user's profile is written to admin_activity_log", async () => {
  replies = {
    profiles: [
      { data: { username: "kid", full_name: "Somchai Jaidee", discord_uid: "111" } },
      { data: [{ id: STUDENT }] },
    ],
  };
  const response = await put({ userId: STUDENT, full_name: "Other Name", discord_uid: "222" });
  expect(response.status).toBe(200);
  const insert = calls.find((c) => c.table === "admin_activity_log" && c.method === "insert");
  expect(insert?.args[0]).toEqual({
    admin_user_id: ADMIN,
    action: "update_profile",
    target_user_id: STUDENT,
    target_resource_type: "profile",
    target_resource_id: STUDENT,
    details: { fields: ["full_name", "discord_uid"], discord_uid: { from: "111", to: "222" } },
  });
  expect(JSON.stringify(insert?.args[0])).not.toMatch(/Somchai|Other Name/);
});

test("an edit that changes nothing writes no log row", async () => {
  replies = { profiles: [{ data: { username: "kid", full_name: null, discord_uid: "111" } }, { data: [{ id: STUDENT }] }] };
  expect((await put({ userId: STUDENT, discord_uid: "111" })).status).toBe(200);
  expect(calls.some((c) => c.table === "admin_activity_log")).toBe(false);
});

test("an unknown user is a 404 before anything is written", async () => {
  replies = { profiles: [{ data: null }] };
  expect((await put({ userId: STUDENT, discord_uid: "222" })).status).toBe(404);
  expect(calls.some((c) => c.method === "update" || c.method === "insert")).toBe(false);
});

test("non-admins are refused before the service client is created", async () => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  });
  expect((await put({ userId: STUDENT, discord_uid: "222" })).status).toBe(403);
  expect(createAdminClient).not.toHaveBeenCalled();
});
