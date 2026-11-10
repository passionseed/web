/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Server error" }, { status: 500 })),
}));

const ID = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
type Reply = { data?: unknown; error?: { message: string } | null };

let replies: Record<string, Reply> = {};
const selects: Record<string, unknown> = {};
const from = jest.fn((table: string) => {
  const b: Record<string, unknown> = {
    select: (columns: string) => {
      selects[table] = columns;
      return b;
    },
    eq: () => b,
    maybeSingle: () => Promise.resolve({ data: null, error: null, ...replies[table] }),
  };
  return b;
});

const get = (id: string) =>
  GET(new NextRequest(`https://example.invalid/api/admin/experts/${id}`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  replies = {};
  for (const key of Object.keys(selects)) delete selects[key];
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true, value: { supabase: { from } as never, userId: "admin" } });
});

test("selects named columns only, never the claim token or request metadata", async () => {
  replies = { expert_profiles: { data: { id: ID, name: "Dr. A" } } };
  const response = await get(ID);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ expert: { id: ID, name: "Dr. A" }, pathlab: null });
  // Every field the review screen (components/admin/ExpertDetail.tsx) reads is still there.
  for (const column of ["interview_data", "interview_transcript", "booking_url", "admin_notes", "status"]) {
    expect(String(selects.expert_profiles)).toContain(column);
  }
  for (const secret of ["*", "claim_token", "ip_address", "user_agent", "interview_session_id"]) {
    expect(String(selects.expert_profiles)).not.toContain(secret);
  }
  expect(String(selects.expert_pathlabs)).not.toContain("*");
});

test("a malformed id is a 404 without a query", async () => {
  expect((await get("not-a-uuid")).status).toBe(404);
  expect(from).not.toHaveBeenCalled();
});

test("a missing expert is a 404 and a database error is a 500", async () => {
  expect((await get(ID)).status).toBe(404);
  replies = { expert_profiles: { error: { message: "timeout" } } };
  expect((await get(ID)).status).toBe(500);
});
