/** @jest-environment node */
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/security/route-guards";

import { POST } from "./route";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() => NextResponse.json({ error: "Failed" }, { status: 500 })),
}));

const insert = jest.fn();
const selectAll = jest.fn();

beforeEach(() => {
  insert.mockReset().mockReturnValue({
    select: () => ({ single: () => Promise.resolve({ data: { id: "test-new" }, error: null }) }),
  });
  selectAll.mockReset();
  (requireAdmin as jest.Mock).mockResolvedValue({
    ok: true,
    value: { supabase: { from: () => ({ select: selectAll, insert }) } },
  });
});

const post = (body: unknown) =>
  POST(new Request("https://example.invalid/api/admin/shift/students", { method: "POST", body: JSON.stringify(body) }));

test("returns the row marking paid already created instead of adding the same IG twice", async () => {
  selectAll.mockResolvedValue({ data: [{ id: "test-existing", ig_handle: "Test_IG" }], error: null });
  const res = await post({ full_name: "Test Applicant", ig_handle: "@test_ig" });
  expect(res.status).toBe(200);
  expect((await res.json()).student.id).toBe("test-existing");
  expect(insert).not.toHaveBeenCalled();
});

test("adds a new student when no row has that IG", async () => {
  selectAll.mockResolvedValue({ data: [{ id: "test-existing", ig_handle: "someone_else" }], error: null });
  const res = await post({ full_name: "Test Applicant", ig_handle: "test_ig" });
  expect(res.status).toBe(201);
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ ig_handle: "test_ig" }));
});
