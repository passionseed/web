/** @jest-environment node */
import { NextResponse } from "next/server";

import { GET } from "./route";
import { getAdminQueueSnapshot } from "@/lib/admin/overview";
import { requireAdmin } from "@/lib/security/route-guards";

jest.mock("@/lib/security/route-guards", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/lib/admin/overview", () => ({ getAdminQueueSnapshot: jest.fn() }));

const snapshot = {
  generatedAt: "2026-10-26T05:00:00.000Z",
  queues: [{ key: "trials_pending", count: 2, href: "/admin/trials" }],
};

beforeEach(() => {
  jest.mocked(requireAdmin).mockResolvedValue({ ok: true } as never);
  jest.mocked(getAdminQueueSnapshot).mockResolvedValue(snapshot as never);
});

test.each([401, 403])("refuses access with %i before reading any counts", async (status) => {
  jest.mocked(requireAdmin).mockResolvedValue({
    ok: false,
    response: NextResponse.json({ error: "Access denied" }, { status }),
  });
  const response = await GET();
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(getAdminQueueSnapshot).not.toHaveBeenCalled();
});

test("returns the queue snapshot, never cached", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(snapshot);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
