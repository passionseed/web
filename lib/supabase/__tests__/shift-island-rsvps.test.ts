/** @jest-environment node */
import { addIslandRsvp, getIslandRsvp } from "../shift-island-rsvps";
import { createAdminClient } from "@/utils/supabase/admin";

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const row = { user_id: "u1", season: "Season 1", created_at: "2026-11-11T00:00:00Z" };

function database(results: Array<{ data: unknown; error: unknown }>) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    upsert: jest.fn(),
    maybeSingle: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.upsert.mockReturnValue(query);
  results.forEach((r) => query.maybeSingle.mockResolvedValueOnce(r));
  const from = jest.fn(() => query);
  (createAdminClient as jest.Mock).mockReturnValue({ from });
  return { query, from };
}

test("addIslandRsvp upserts on user_id and ignores duplicates", async () => {
  const { query, from } = database([{ data: row, error: null }]);
  await expect(addIslandRsvp("u1", "Season 1")).resolves.toEqual(row);
  expect(from).toHaveBeenCalledWith("shift_island_rsvps");
  expect(query.upsert).toHaveBeenCalledWith(
    { user_id: "u1", season: "Season 1" },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
});

test("addIslandRsvp reads the row back when a double tap lost the race", async () => {
  const { query } = database([
    { data: null, error: null },
    { data: row, error: null },
  ]);
  await expect(addIslandRsvp("u1", "Season 1")).resolves.toEqual(row);
  expect(query.eq).toHaveBeenCalledWith("user_id", "u1");
});

test("getIslandRsvp returns null when there is no row", async () => {
  database([{ data: null, error: null }]);
  await expect(getIslandRsvp("u1")).resolves.toBeNull();
});

test("throws the Supabase error", async () => {
  const error = { code: "boom" };
  database([{ data: null, error }]);
  await expect(getIslandRsvp("u1")).rejects.toBe(error);
  database([{ data: null, error }]);
  await expect(addIslandRsvp("u1", "Season 1")).rejects.toBe(error);
});
