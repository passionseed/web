/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

function database(count: number | null, error: unknown = null) {
  const query = { select: jest.fn(), eq: jest.fn(), not: jest.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.not.mockResolvedValue({ count, error });
  (createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => query) });
  return query;
}

test("counts only confirmed payments in the requested cohort", async () => {
  const query = database(4);
  const response = await GET(new NextRequest("https://passionseed.org/api/shift/seats?round=1"));
  expect(await response.json()).toEqual(expect.objectContaining({ remaining: 11 }));
  expect(query.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  expect(query.eq).toHaveBeenCalledWith("cohort", "SHIFT[1]");
  expect(query.not).toHaveBeenCalledWith("paid_at", "is", null);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});

test("does not invent availability when the query fails", async () => {
  database(null, { code: "unavailable" });
  const response = await GET(new NextRequest("https://passionseed.org/api/shift/seats?round=1"));
  expect(response.status).toBe(503);
  expect(await response.json()).not.toHaveProperty("remaining");
});

test("clamps oversubscribed cohorts at zero", async () => {
  database(16);
  const response = await GET(new NextRequest("https://passionseed.org/api/shift/seats?round=1"));
  expect(await response.json()).toEqual(expect.objectContaining({ remaining: 0 }));
});

test("rejects unknown rounds before querying applicant data", async () => {
  const response = await GET(new NextRequest("https://passionseed.org/api/shift/seats?round=99"));
  expect(response.status).toBe(400);
  expect(createAdminClient).not.toHaveBeenCalled();
});
