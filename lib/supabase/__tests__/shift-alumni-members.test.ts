/** @jest-environment node */
import { createAlumniMember, findLinkedApplication } from "../shift-alumni-members";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

function database(results: Array<{ data: unknown; error: unknown }>) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    neq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    upsert: jest.fn(),
    maybeSingle: jest.fn(),
  };
  for (const key of ["select", "eq", "not", "neq", "order", "limit", "upsert"] as const) {
    query[key].mockReturnValue(query);
  }
  results.forEach((r) => query.maybeSingle.mockResolvedValueOnce(r));
  const from = jest.fn(() => query);
  (createAdminClient as jest.Mock).mockReturnValue({ from });
  return { query, from };
}

test("findLinkedApplication only counts a paid application that was not declined", async () => {
  const app = { id: "a1", nickname: "มิ้นต์", cohort: "SHIFT[3]" };
  const { query, from } = database([{ data: app, error: null }]);
  await expect(findLinkedApplication("u1")).resolves.toEqual(app);
  expect(from).toHaveBeenCalledWith("shift_applications");
  expect(query.eq).toHaveBeenCalledWith("user_id", "u1");
  expect(query.not).toHaveBeenCalledWith("paid_at", "is", null);
  expect(query.neq).toHaveBeenCalledWith("status", "declined");
});

test("createAlumniMember stays pending when no application qualifies", async () => {
  const pending = { user_id: "u1", nickname: "มิ้นต์", cohort: "SHIFT[3]", status: "pending", application_id: null };
  const { query } = database([
    { data: null, error: null },
    { data: pending, error: null },
  ]);
  await expect(createAlumniMember("u1", { nickname: "มิ้นต์", cohort: "SHIFT[3]" })).resolves.toEqual(pending);
  expect(query.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ status: "pending", application_id: null }),
    { onConflict: "user_id", ignoreDuplicates: true },
  );
});
