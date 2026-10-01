/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";
import { requireAdmin } from "@/lib/security/route-guards";

jest.mock("@/lib/security/route-guards", () => ({
  requireAdmin: jest.fn(),
  safeServerError: jest.fn(() =>
    NextResponse.json({ error: "Camp unavailable" }, { status: 500 }),
  ),
}));
const cohort = "10000000-0000-4000-8000-000000000001";
const rpc = jest.fn();
beforeEach(() => {
  rpc
    .mockReset()
    .mockResolvedValue({ data: { cohort: { id: cohort } }, error: null });
  (requireAdmin as jest.Mock).mockResolvedValue({
    ok: true,
    value: { supabase: { rpc } },
  });
});
const post = (body: string) =>
  new NextRequest("https://example.invalid/api/admin/shift/camp", {
    method: "POST",
    body,
  });

test("rejects unauthenticated access before any RPC call", async () => {
  (requireAdmin as jest.Mock).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
  expect(
    (await GET(new NextRequest("https://example.invalid/api/admin/shift/camp")))
      .status,
  ).toBe(401);
  expect((await POST(post("{}"))).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});

test("rejects invalid identifiers and actions before querying", async () => {
  expect(
    (
      await GET(
        new NextRequest(
          "https://example.invalid/api/admin/shift/camp?cohort=invalid",
        ),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await POST(
        post(JSON.stringify({ action: "save_update", cohort_id: cohort })),
      )
    ).status,
  ).toBe(400);
  expect((await POST(post("invalid-json"))).status).toBe(400);
  expect((await POST(post(" ".repeat(40001)))).status).toBe(413);
  expect(rpc).not.toHaveBeenCalled();
});

test("passes validated cohort and moderation payload through the signed-in client", async () => {
  const response = await POST(
    post(
      JSON.stringify({
        action: "moderate_comment",
        cohort_id: cohort,
        payload: { id: "comment-id", hidden: true },
      }),
    ),
  );
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("shift_camp_action", {
    p_action: "moderate_comment",
    p_cohort_id: cohort,
    p_payload: { id: "comment-id", hidden: true },
  });
});

test("surfaces database authorization refusal without pretending the change succeeded", async () => {
  rpc.mockResolvedValue({
    data: null,
    error: { code: "42501", message: "Staff only" },
  });
  const response = await POST(
    post(
      JSON.stringify({ action: "moderate", cohort_id: cohort, payload: {} }),
    ),
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Staff only" });
});
